// Domain Connect (domainconnect.org) — the open standard for configuring DNS
// at a supporting DNS provider on the user's behalf.
//
// Two pieces, both spec-driven (Domain Connect 2.3, CC0):
//
// 1. Discovery: a TXT record at `_domainconnect.{zone}` names the provider's
//    Domain Connect host; `GET https://{host}/v2/{domain}/settings` returns
//    the provider's capabilities. Works for ANY domain at a supporting
//    provider — no template registration required. Even without applying a
//    template, `urlControlPanel` is a provider-authoritative deep link to the
//    domain's DNS editor and `providerDisplayName` beats any curated guess.
//
// 2. Sync-flow apply URL: a plain GET the user is redirected to, where the
//    provider authenticates them, shows the record changes from the named
//    template, applies them, and redirects back. Requires the service
//    provider's template to be onboarded with the DNS provider.

export interface DomainConnectSettings {
  providerId: string;
  providerName?: string;
  providerDisplayName?: string;
  urlSyncUX?: string;
  urlAsyncUX?: string;
  urlAPI: string;
  urlControlPanel?: string;
  nameServers?: string[];
  width?: number;
  height?: number;
}

const TYPE_TXT = 16;

interface DohRecord {
  name: string;
  type: number;
  data: string;
}

async function queryTxt(
  name: string,
  fetchFn: typeof fetch,
): Promise<string[]> {
  const resolvers = [
    {
      url: `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
      headers: { Accept: "application/dns-json" } as Record<string, string>,
    },
    {
      url: `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`,
      headers: {} as Record<string, string>,
    },
  ];
  for (const resolver of resolvers) {
    try {
      const res = await fetchFn(resolver.url, {
        headers: resolver.headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { Answer?: DohRecord[] };
      return (json.Answer ?? [])
        .filter((r) => r.type === TYPE_TXT)
        .map((r) => r.data.replace(/^"|"$/g, ""));
    } catch {
      // Try the next resolver.
    }
  }
  return [];
}

/**
 * Discover Domain Connect support for a zone (the registered domain, e.g.
 * "example.com" — NOT a subdomain; per spec, discovery works on the zone).
 *
 * Returns the provider's settings, or null when the zone's DNS provider
 * doesn't support Domain Connect. Never throws.
 */
export async function discoverDomainConnect(
  zone: string,
  opts?: { fetch?: typeof fetch },
): Promise<DomainConnectSettings | null> {
  const fetchFn = opts?.fetch ?? fetch;
  const txts = await queryTxt(`_domainconnect.${zone}`, fetchFn);
  // Spec: the record contains the Domain Connect host, e.g.
  // "domainconnect.api.godaddy.com". Take the first plausible hostname.
  const host = txts.find((t) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(t.trim()));
  if (!host) return null;

  try {
    const res = await fetchFn(
      `https://${host.trim()}/v2/${encodeURIComponent(zone)}/settings`,
      { signal: AbortSignal.timeout(5000) },
    );
    // 404 = provider answers Domain Connect but doesn't have this zone
    // (e.g. a stale TXT record after a provider switch).
    if (!res.ok) return null;
    const settings = (await res.json()) as DomainConnectSettings;
    if (!settings.providerId || !settings.urlAPI) return null;
    return settings;
  } catch {
    return null;
  }
}

/** Resolve the control-panel deep link (fills the `%domain%` placeholder). */
export function controlPanelUrlFor(
  settings: DomainConnectSettings,
  domain: string,
): string | null {
  if (!settings.urlControlPanel) return null;
  return settings.urlControlPanel.replace(/%domain%/g, domain);
}

/**
 * Build the synchronous-flow apply URL: a GET the user is redirected to at
 * their DNS provider to review + apply the service provider's template.
 *
 * `params` are the template's `%variable%` values, passed as query params.
 * Only meaningful once the (providerId, serviceId) template is onboarded
 * with the DNS provider — otherwise the provider returns an error page.
 */
export function buildSyncApplyUrl(
  settings: DomainConnectSettings,
  opts: {
    providerId: string;
    serviceId: string;
    domain: string;
    host?: string;
    params?: Record<string, string>;
    redirectUri?: string;
    state?: string;
  },
): string | null {
  if (!settings.urlSyncUX) return null;
  const base = settings.urlSyncUX.replace(/\/$/, "");
  const url = new URL(
    `${base}/v2/domainTemplates/providers/${encodeURIComponent(opts.providerId)}/services/${encodeURIComponent(opts.serviceId)}/apply`,
  );
  url.searchParams.set("domain", opts.domain);
  if (opts.host) url.searchParams.set("host", opts.host);
  for (const [key, value] of Object.entries(opts.params ?? {})) {
    url.searchParams.set(key, value);
  }
  if (opts.redirectUri) url.searchParams.set("redirect_uri", opts.redirectUri);
  if (opts.state) url.searchParams.set("state", opts.state);
  return url.toString();
}
