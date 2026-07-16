export * from "./types";
export { CamoufoxManager, camoufox } from "./browser";
export type { BrowserProfile, ScrapedProfile, ScrapedMessage } from "./browser";
export {
  scrape,
  scrapeLinkedInSearch,
  scrapeLinkedInMessages,
  sendLinkedInMessageViaCDP,
  scrapeFacebookGroup,
  scrapeFacebookMessages,
  sendFacebookMessageViaCDP,
  scrapeTwitterSearch,
  scrapeTwitterMessages,
  sendTwitterMessageViaCDP,
  scrapeThreadsSearch,
  scrapePeoplePerHour,
} from "./scrapers";
export {
  LinkedInConnector,
  FacebookConnector,
  TwitterConnector,
  PeoplePerHourConnector,
  createConnector,
} from "./connectors";
export type { ConnectorConfig, PlatformConnector } from "./connectors";
export { scoreLead, generateDraft, detectIntent, summarizeConversation } from "./ai";
export type { AIProvider, LeadScore, ConversationSummary, IntentDetection } from "./ai";
export {
  launchBrowserForPlatform,
  killBrowser,
  isBrowserRunning,
  extractCookiesForPlatform,
  saveCookiesForPlatform,
  loadCookiesForPlatform,
  launchLinkedInBrowser,
  killLinkedInBrowser,
  isLinkedInBrowserRunning,
  extractLinkedInCookies,
  saveLinkedInCookies,
  loadLinkedInCookies,
} from "./browser-launcher";
