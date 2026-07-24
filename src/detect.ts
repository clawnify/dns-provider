// DNS provider detection via DNS-over-HTTPS.
//
// Given a hostname the user wants to point at us (e.g. "new.example.com"),
// find the authoritative nameservers of its enclosing zone and match them to a
// known provider. NS records live at the zone apex, so a query for the full
// hostname usually returns no Answer — the resolver's Authority section then
// carries an SOA whose owner name IS the zone, which we query next. That
// avoids needing a public-suffix list ("foo.co.uk" walks correctly).
//
// DoH JSON has no RFC (only wireformat, RFC 8484), so we only rely on fields
// both Cloudflare and Google agree on: Status, Answer[]/Authority[] with
// {name, type, data}.

import {
  matchProvider,
  isInfraNameserver,
  matchProviderByApexIp,
  type DnsProviderInfo,
} from "./providers";

export interface DetectionResult {
  /** The delegated zone the nameservers belong to (e.g. "example.com"). */
  zone: string | null;
  /** Authoritative nameservers, lowercased, no trailing dot. */
  nameservers: string[];
  provider: DnsProviderInfo | null;
}

const RESOLVERS: {
  url: (name: string, type: string) => string;
  headers: Record<string, string>;
}[] = [
  {
    url: (name, type) =>
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    headers: { Accept: "application/dns-json" },
  },
  {
    url: (name, type) =>
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    headers: {},
  },
];

const TYPE_A = 1;
const TYPE_NS = 2;
const TYPE_SOA = 6;

interface DohRecord {
  name: string;
  type: number;
  data: string;
}

interface DohResponse {
  Status: number;
  Answer?: DohRecord[];
  Authority?: DohRecord[];
}

const HOSTNAME_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\.$/, "");
}

async function queryDns(
  name: string,
  type: "NS" | "A",
  fetchFn: typeof fetch,
): Promise<DohResponse | null> {
  for (const resolver of RESOLVERS) {
    try {
      const res = await fetchFn(resolver.url(name, type), {
        headers: resolver.headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      return (await res.json()) as DohResponse;
    } catch {
      // Timeout or network error — try the next resolver.
    }
  }
  return null;
}

/**
 * Detect which DNS provider manages `hostname`'s zone.
 *
 * Never throws on lookup failure — returns `{ zone: null, nameservers: [],
 * provider: null }` so callers can degrade to generic instructions.
 */
export async function detectDnsProvider(
  hostname: string,
  opts?: { fetch?: typeof fetch },
): Promise<DetectionResult> {
  const fetchFn = opts?.fetch ?? fetch;
  let name = normalizeName(hostname.trim());
  if (!HOSTNAME_RE.test(name)) {
    return { zone: null, nameservers: [], provider: null };
  }

  // At most: hostname itself → SOA-named zone (or one label stripped), a few
  // hops. Bounded so a weird delegation chain can't loop.
  for (let hop = 0; hop < 4; hop++) {
    const res = await queryDns(name, "NS", fetchFn);
    if (!res) break;

    const answers = (res.Answer ?? []).filter((r) => r.type === TYPE_NS);
    if (answers.length > 0) {
      const zone = normalizeName(answers[0].name);
      // Walked past every registrable zone up to the TLD itself (nonexistent
      // domain) — the gTLD servers are not a useful answer.
      if (!zone.includes(".")) break;
      const nameservers = answers.map((r) => normalizeName(r.data));
      let provider = matchProvider(nameservers);
      // White-label infra (e.g. Squarespace domains hosted on NS1): the NS
      // name alone can't say where the user logs in — the zone's apex A
      // records can. No apex match → no provider, never a wrong deep link.
      if (!provider && isInfraNameserver(nameservers)) {
        const apex = await queryDns(zone, "A", fetchFn);
        const ips = (apex?.Answer ?? [])
          .filter((r) => r.type === TYPE_A)
          .map((r) => r.data);
        provider = matchProviderByApexIp(ips);
      }
      return { zone, nameservers, provider };
    }

    // No NS at this name — the Authority SOA names the enclosing zone.
    const soa = (res.Authority ?? []).find((r) => r.type === TYPE_SOA);
    const soaZone = soa ? normalizeName(soa.name) : null;
    if (soaZone && soaZone !== name && name.endsWith(soaZone)) {
      name = soaZone;
      continue;
    }

    // Last resort: strip the leftmost label and retry.
    const labels = name.split(".");
    if (labels.length <= 2) break;
    name = labels.slice(1).join(".");
  }

  return { zone: null, nameservers: [], provider: null };
}
