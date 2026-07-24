// Nameserver → DNS provider registry.
//
// Matching is against the domain's authoritative NS hostnames:
//   - `nsSuffixes`: entry matches when an NS equals the suffix or ends with
//     `.` + suffix (e.g. "ns.cloudflare.com" matches "kiki.ns.cloudflare.com").
//   - `nsContains`: substring match, for providers whose NS names embed a
//     variable shard (e.g. Route 53's "ns-199.awsdns-24.com").
//
// `dashboardUrl` may contain a `{domain}` placeholder — use dashboardUrlFor()
// to resolve it. Unknown nameservers simply return no provider; callers should
// fall back to generic instructions.

export interface DnsProviderInfo {
  id: string;
  name: string;
  nsSuffixes?: string[];
  nsContains?: string[];
  /**
   * Apex A-record IPs that identify this provider when the nameservers are
   * white-label infrastructure (see INFRA_NS_SUFFIXES). Only list IPs that
   * are stable and documented — a wrong match is worse than no match.
   */
  apexIps?: string[];
  /** Where the user edits DNS records. May contain `{domain}`. */
  dashboardUrl: string;
  /** One-line, provider-specific tip worth showing next to the records. */
  note?: string;
}

// Managed-DNS infrastructure that platforms resell white-label. An NS match
// here identifies the infrastructure, NOT where the user logs in — e.g.
// Squarespace-managed domains sit on dns1-4.pNN.nsone.net, and pointing a
// Squarespace user at NS1's enterprise console is actively misleading.
// These are disambiguated by the zone's apex A records (apexIps above);
// anything unresolved stays "no provider" so the UI falls back to generic
// instructions instead of a wrong deep link.
export const INFRA_NS_SUFFIXES = ["nsone.net"];

export const DNS_PROVIDERS: DnsProviderInfo[] = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    nsSuffixes: ["ns.cloudflare.com"],
    dashboardUrl: "https://dash.cloudflare.com",
    note: "In the dashboard pick your zone → DNS → Records. Set new records to “DNS only” (grey cloud), not proxied.",
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    nsSuffixes: ["domaincontrol.com"],
    dashboardUrl: "https://dcc.godaddy.com/manage/{domain}/dns",
  },
  {
    id: "wix",
    name: "Wix",
    nsSuffixes: ["wixdns.net"],
    dashboardUrl: "https://www.wix.com/my-account/domains",
    note: "Open your domain → Advanced → Edit DNS. Enter only the subdomain part in the record's Host field.",
  },
  {
    id: "squarespace",
    name: "Squarespace",
    nsSuffixes: ["squarespacedns.com"],
    // Squarespace's long-stable apex IPs — identifies Squarespace-managed
    // domains hosted on NS1 infrastructure (incl. ex-Google-Domains).
    apexIps: ["198.185.159.144", "198.185.159.145", "198.49.23.144", "198.49.23.145"],
    dashboardUrl: "https://account.squarespace.com/domains",
  },
  {
    id: "namecheap",
    name: "Namecheap",
    nsSuffixes: ["registrar-servers.com"],
    dashboardUrl:
      "https://ap.www.namecheap.com/Domains/DomainControlPanel/{domain}/advancedns",
    note: "Enter only the subdomain part in the record's Host field (use @ for the root domain).",
  },
  {
    id: "route53",
    name: "Amazon Route 53",
    nsContains: [".awsdns-"],
    dashboardUrl: "https://console.aws.amazon.com/route53/v2/hostedzones",
  },
  {
    id: "google-cloud-dns",
    name: "Google Cloud DNS",
    nsSuffixes: ["googledomains.com"],
    dashboardUrl: "https://console.cloud.google.com/net-services/dns/zones",
  },
  {
    id: "vercel",
    name: "Vercel",
    nsSuffixes: ["vercel-dns.com"],
    dashboardUrl: "https://vercel.com/dashboard/domains",
  },
  {
    id: "ionos",
    name: "IONOS",
    nsSuffixes: ["ui-dns.com", "ui-dns.de", "ui-dns.org", "ui-dns.biz"],
    dashboardUrl: "https://my.ionos.com",
  },
  {
    id: "ovh",
    name: "OVH",
    nsSuffixes: ["ovh.net", "ovh.ca"],
    dashboardUrl: "https://www.ovh.com/manager",
  },
  {
    id: "gandi",
    name: "Gandi",
    nsSuffixes: ["gandi.net", "gandi-ns.fr"],
    dashboardUrl: "https://admin.gandi.net",
  },
  {
    id: "porkbun",
    name: "Porkbun",
    nsSuffixes: ["porkbun.com"],
    dashboardUrl: "https://porkbun.com/account/domainsSpeedy",
  },
  {
    id: "hover",
    name: "Hover",
    nsSuffixes: ["hover.com"],
    dashboardUrl: "https://hover.com/control_panel",
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    nsSuffixes: ["digitalocean.com"],
    dashboardUrl: "https://cloud.digitalocean.com/networking/domains",
  },
  {
    id: "hostinger",
    name: "Hostinger",
    nsSuffixes: ["dns-parking.com", "hostinger.com"],
    dashboardUrl: "https://hpanel.hostinger.com",
  },
  {
    id: "aruba",
    name: "Aruba",
    nsSuffixes: ["technorail.com", "arubadns.net", "arubadns.cz", "aruba.it"],
    dashboardUrl: "https://admin.aruba.it",
  },
  {
    id: "bluehost",
    name: "Bluehost",
    nsSuffixes: ["bluehost.com"],
    dashboardUrl: "https://my.bluehost.com",
  },
  {
    id: "dnsimple",
    name: "DNSimple",
    nsSuffixes: ["dnsimple.com"],
    dashboardUrl: "https://dnsimple.com/dashboard",
  },
  {
    id: "azure-dns",
    name: "Microsoft Azure DNS",
    nsSuffixes: ["azure-dns.com", "azure-dns.net", "azure-dns.org", "azure-dns.info"],
    dashboardUrl: "https://portal.azure.com",
  },
  {
    id: "shopify",
    name: "Shopify",
    nsSuffixes: ["shopify.com"],
    dashboardUrl: "https://admin.shopify.com",
    note: "In your Shopify admin go to Settings → Domains → your domain → Edit DNS settings.",
  },
  {
    id: "webflow",
    name: "Webflow",
    nsSuffixes: ["webflow.com"],
    dashboardUrl: "https://webflow.com/dashboard",
  },
  {
    id: "wordpress-com",
    name: "WordPress.com",
    nsSuffixes: ["wordpress.com"],
    dashboardUrl: "https://wordpress.com/domains/manage",
  },
  {
    id: "weebly",
    name: "Weebly (Square)",
    nsSuffixes: ["weebly.com"],
    dashboardUrl: "https://www.weebly.com/app",
  },
  {
    id: "jimdo",
    name: "Jimdo",
    nsSuffixes: ["jimdo.com"],
    dashboardUrl: "https://account.jimdo.com",
  },
  {
    id: "strikingly",
    name: "Strikingly",
    nsSuffixes: ["strikingly.com"],
    dashboardUrl: "https://www.strikingly.com",
  },
  {
    id: "tilda",
    name: "Tilda",
    nsSuffixes: ["tildadns.com"],
    dashboardUrl: "https://tilda.cc",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    nsSuffixes: ["bigcommerce.com"],
    dashboardUrl: "https://login.bigcommerce.com",
  },
  {
    id: "linode",
    name: "Linode (Akamai)",
    nsSuffixes: ["linode.com"],
    dashboardUrl: "https://cloud.linode.com/domains",
  },
  {
    id: "akamai",
    name: "Akamai Edge DNS",
    nsSuffixes: ["akam.net", "akamai.com"],
    dashboardUrl: "https://control.akamai.com",
  },
  {
    id: "vultr",
    name: "Vultr",
    nsSuffixes: ["vultr.com"],
    dashboardUrl: "https://my.vultr.com/dns/",
  },
  {
    id: "hetzner",
    name: "Hetzner",
    nsSuffixes: [
      "hetzner.com",
      "hetzner.de",
      "your-server.de",
      "first-ns.de",
      "second-ns.de",
      "second-ns.com",
    ],
    dashboardUrl: "https://dns.hetzner.com",
  },
  {
    id: "name-com",
    name: "Name.com",
    nsSuffixes: ["name.com"],
    dashboardUrl: "https://www.name.com/account",
  },
  {
    id: "namesilo",
    name: "NameSilo",
    nsSuffixes: ["namesilo.com", "dnsowl.com"],
    dashboardUrl: "https://www.namesilo.com/account_domains.php",
  },
  {
    id: "network-solutions",
    name: "Network Solutions",
    nsSuffixes: ["worldnic.com"],
    dashboardUrl: "https://www.networksolutions.com",
  },
  {
    id: "scaleway",
    name: "Scaleway (Online.net)",
    nsSuffixes: ["online.net", "scaleway.com"],
    dashboardUrl: "https://console.scaleway.com",
  },
  {
    id: "123-reg",
    name: "123 Reg",
    nsSuffixes: ["123-reg.co.uk"],
    dashboardUrl: "https://www.123-reg.co.uk",
  },
  {
    id: "hostgator",
    name: "HostGator",
    nsSuffixes: ["hostgator.com"],
    dashboardUrl: "https://portal.hostgator.com",
  },
  {
    id: "siteground",
    name: "SiteGround",
    nsSuffixes: ["siteground.net", "siteground.biz", "siteground.eu", "siteground.com"],
    dashboardUrl: "https://my.siteground.com",
  },
  {
    id: "dns-made-easy",
    name: "DNS Made Easy",
    nsSuffixes: ["dnsmadeeasy.com"],
    dashboardUrl: "https://cp.dnsmadeeasy.com",
  },
  {
    id: "easydns",
    name: "easyDNS",
    nsSuffixes: ["easydns.com", "easydns.net", "easydns.ca"],
    dashboardUrl: "https://cp.easydns.com",
  },
  {
    id: "hurricane-electric",
    name: "Hurricane Electric",
    nsSuffixes: ["he.net"],
    dashboardUrl: "https://dns.he.net",
  },
  {
    id: "no-ip",
    name: "No-IP",
    nsSuffixes: ["no-ip.com"],
    dashboardUrl: "https://my.noip.com",
  },
  {
    id: "dynu",
    name: "Dynu",
    nsSuffixes: ["dynu.com"],
    dashboardUrl: "https://www.dynu.com/ControlPanel",
  },
  {
    id: "dnspod",
    name: "Tencent Cloud (DNSPod)",
    nsSuffixes: ["dnspod.net", "dnspod.com"],
    dashboardUrl: "https://console.dnspod.com",
  },
  {
    id: "alibaba",
    name: "Alibaba Cloud DNS",
    nsSuffixes: ["alidns.com"],
    dashboardUrl: "https://dns.console.aliyun.com",
  },
  {
    id: "oracle",
    name: "Oracle Cloud DNS",
    nsSuffixes: ["oraclecloud.com"],
    dashboardUrl: "https://cloud.oracle.com",
  },
  {
    id: "ultradns",
    name: "UltraDNS (Vercara)",
    nsSuffixes: ["ultradns.com", "ultradns.net", "ultradns.org", "ultradns.biz"],
    dashboardUrl: "https://portal.ultradns.com",
  },
  {
    id: "openprovider",
    name: "Openprovider",
    nsSuffixes: ["openprovider.nl", "openprovider.be", "openprovider.eu"],
    dashboardUrl: "https://cp.openprovider.eu",
  },
  {
    id: "transip",
    name: "TransIP",
    nsSuffixes: ["transip.net", "transip.nl", "transip.eu"],
    dashboardUrl: "https://www.transip.nl/cp/",
  },
  {
    id: "one-com",
    name: "one.com",
    nsSuffixes: ["one.com"],
    dashboardUrl: "https://www.one.com/admin",
  },
];

/** Resolve the dashboard URL for a domain (fills the `{domain}` placeholder). */
export function dashboardUrlFor(provider: DnsProviderInfo, domain?: string): string {
  if (!provider.dashboardUrl.includes("{domain}")) return provider.dashboardUrl;
  if (!domain) return provider.dashboardUrl.split("/{domain}")[0];
  return provider.dashboardUrl.replace("{domain}", domain);
}

/** Match a set of authoritative nameservers to a known provider. */
export function matchProvider(nameservers: string[]): DnsProviderInfo | null {
  for (const raw of nameservers) {
    const ns = raw.toLowerCase().replace(/\.$/, "");
    for (const provider of DNS_PROVIDERS) {
      if (
        provider.nsSuffixes?.some((s) => ns === s || ns.endsWith(`.${s}`)) ||
        provider.nsContains?.some((s) => ns.includes(s))
      ) {
        return provider;
      }
    }
  }
  return null;
}

/** True when the nameservers are white-label infra (see INFRA_NS_SUFFIXES). */
export function isInfraNameserver(nameservers: string[]): boolean {
  return nameservers.some((raw) => {
    const ns = raw.toLowerCase().replace(/\.$/, "");
    return INFRA_NS_SUFFIXES.some((s) => ns === s || ns.endsWith(`.${s}`));
  });
}

/** Match a zone's apex A-record IPs to a provider (infra disambiguation). */
export function matchProviderByApexIp(ips: string[]): DnsProviderInfo | null {
  for (const ip of ips) {
    for (const provider of DNS_PROVIDERS) {
      if (provider.apexIps?.includes(ip)) return provider;
    }
  }
  return null;
}
