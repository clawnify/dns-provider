export { detectDnsProvider, type DetectionResult } from "./detect";
export {
  discoverDomainConnect,
  controlPanelUrlFor,
  buildSyncApplyUrl,
  type DomainConnectSettings,
} from "./domain-connect";
export {
  DNS_PROVIDERS,
  INFRA_NS_SUFFIXES,
  matchProvider,
  matchProviderByApexIp,
  isInfraNameserver,
  dashboardUrlFor,
  type DnsProviderInfo,
} from "./providers";
