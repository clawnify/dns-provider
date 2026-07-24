# @clawnify/dns-provider

Detect which DNS provider manages a domain, so your "add this CNAME/TXT record"
UI can say **"You're on GoDaddy — open your DNS settings here"** instead of
showing a generic table and hoping.

- **Zero dependencies** — plain `fetch`, runs in Cloudflare Workers, browsers,
  and Node 18+.
- **DNS-over-HTTPS** NS lookup (Cloudflare resolver, Google as fallback) with
  correct zone walking via the Authority SOA — no public-suffix list needed,
  `shop.example.co.uk` resolves to the right zone.
- **Curated nameserver registry** for 50 providers (Cloudflare, GoDaddy, Wix,
  Squarespace, Namecheap, Route 53, Azure, Shopify, Webflow, WordPress.com,
  Vercel, IONOS, OVH, Gandi, Porkbun, Hover, DigitalOcean, Hostinger, Hetzner,
  Aruba, TransIP, one.com, SiteGround, DNSPod, Alibaba, …) with a deep link to
  each provider's DNS dashboard and provider-specific gotchas. Every pattern is
  independently verified against live DNS before inclusion.
- **White-label infra disambiguation** — some platforms resell managed-DNS
  infrastructure, so the NS name alone is a trap: a Squarespace-managed domain
  sits on `dns1-4.pNN.nsone.net`, and "your DNS is NS1" would send the user to
  an enterprise console they've never seen. Nameservers on known infra
  (`nsone.net`) trigger a second lookup of the zone's apex A records, which
  identify the actual platform (Squarespace's four apex IPs have been stable
  for a decade). No apex match → no provider — never a wrong deep link.

## Usage

```ts
import { detectDnsProvider, dashboardUrlFor } from "@clawnify/dns-provider";

const result = await detectDnsProvider("new.example.com");
// {
//   zone: "example.com",
//   nameservers: ["ns2.wixdns.net", "ns3.wixdns.net"],
//   provider: { id: "wix", name: "Wix", dashboardUrl: "…", note: "…" }
// }

if (result.provider) {
  console.log(`Detected ${result.provider.name}`);
  console.log(`Edit DNS at ${dashboardUrlFor(result.provider, result.zone ?? undefined)}`);
}
```

Detection never throws on lookup failure — an unknown or unreachable domain
returns `{ zone: null, nameservers: [], provider: null }` so you can fall back
to generic instructions.

If you already have the nameservers (e.g. from your own resolver), match
directly:

```ts
import { matchProvider } from "@clawnify/dns-provider";

matchProvider(["ns-199.awsdns-24.com"]); // → Amazon Route 53
```

## Domain Connect

The package also speaks [Domain Connect](https://www.domainconnect.org/) — the
open standard where supporting DNS providers (GoDaddy, IONOS, …) apply your
record template themselves after user consent, via plain GET redirects:

```ts
import {
  discoverDomainConnect,
  controlPanelUrlFor,
  buildSyncApplyUrl,
} from "@clawnify/dns-provider";

const settings = await discoverDomainConnect("example.com");
if (settings) {
  // Provider-authoritative identity + deep link, even with no template:
  settings.providerDisplayName;            // "GoDaddy"
  controlPanelUrlFor(settings, "example.com"); // their DNS editor

  // With your template onboarded at the provider, send the user here to
  // review + apply your records in one click:
  const url = buildSyncApplyUrl(settings, {
    providerId: "yourservice.example",
    serviceId: "website",
    domain: "example.com",
    host: "app",
    params: { ip: "192.0.2.1" },
    redirectUri: "https://yourservice.example/callback",
    state: "abc123",
  });
}
```

Discovery is best-effort like everything else: providers without Domain
Connect (or with a stale `_domainconnect` record) return `null`.

## Notes

- NS suffixes identify the **DNS host**, not the registrar. A domain bought at
  GoDaddy but served by Cloudflare is (correctly) detected as Cloudflare —
  that's where the records must be added.
- The registry is best-effort by design: a miss just means "no provider
  detected", never a wrong instruction. PRs adding or correcting nameserver
  patterns are welcome.

## License

MIT
