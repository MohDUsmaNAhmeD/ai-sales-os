import { CamoufoxManager, Cookie } from "./camoufox";
import {
  scrapeLinkedInSearch,
  scrapeLinkedInMessages,
  sendLinkedInMessageViaCDP,
  scrapeFacebookGroup,
  scrapeFacebookMessages,
  sendFacebookMessageViaCDP,
  scrapeTwitterSearch,
  scrapeTwitterMessages,
  sendTwitterMessageViaCDP,
  scrapePeoplePerHour,
} from "./scrapers";

export interface ConnectorConfig {
  platform: string;
  profileId: string;
  camoufox: CamoufoxManager;
}

export interface ScrapedLead {
  externalId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  profileUrl?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
}

export interface ScrapedMessage {
  externalId: string;
  content: string;
  senderId: string;
  senderName?: string;
  sentAt: Date;
  attachments?: { type: string; url: string; name: string }[];
}

export interface PlatformConnector {
  platform: string;
  search(query: string): Promise<ScrapedLead[]>;
  getMessages(conversationId: string): Promise<ScrapedMessage[]>;
  sendMessage(conversationId: string, content: string): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}

export class LinkedInConnector implements PlatformConnector {
  platform = "LINKEDIN";
  private camoufox: CamoufoxManager;
  private profileId: string;
  private cookies: string = "";

  constructor(config: ConnectorConfig) {
    this.camoufox = config.camoufox;
    this.profileId = config.profileId;
  }

  async search(query: string): Promise<ScrapedLead[]> {
    console.log(`[LinkedIn] Searching for: ${query}`);
    const profiles = await scrapeLinkedInSearch(query, this.cookies || undefined);
    return profiles.map(p => ({
      externalId: p.externalId,
      firstName: p.firstName,
      lastName: p.lastName,
      company: p.company,
      jobTitle: p.jobTitle,
      profileUrl: p.profileUrl,
      avatarUrl: p.avatarUrl,
      bio: p.bio,
      location: p.location,
    }));
  }

  async getMessages(conversationId: string): Promise<ScrapedMessage[]> {
    console.log(`[LinkedIn] Getting messages for conversation: ${conversationId}`);
    const conversations = await scrapeLinkedInMessages(this.cookies);
    const conv = conversations.find(c => c.conversationId === conversationId);
    return (conv?.messages || []).map(m => ({
      externalId: m.externalId,
      content: m.content,
      senderId: m.senderId,
      senderName: m.senderName,
      sentAt: new Date(m.sentAt),
    }));
  }

  async sendMessage(conversationId: string, content: string): Promise<boolean> {
    console.log(`[LinkedIn] Sending message to conversation: ${conversationId}`);
    return sendLinkedInMessageViaCDP(conversationId, content);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const profiles = await this.search("test");
      return true;
    } catch {
      return false;
    }
  }
}

export class FacebookConnector implements PlatformConnector {
  platform = "FACEBOOK";
  private camoufox: CamoufoxManager;
  private profileId: string;
  private cookies: string = "";

  constructor(config: ConnectorConfig) {
    this.camoufox = config.camoufox;
    this.profileId = config.profileId;
  }

  async search(query: string): Promise<ScrapedLead[]> {
    console.log(`[Facebook] Searching for: ${query}`);
    const profiles = await scrapeFacebookGroup(query, this.cookies || undefined);
    return profiles.map(p => ({
      externalId: p.externalId,
      firstName: p.firstName,
      lastName: p.lastName,
      profileUrl: p.profileUrl,
      avatarUrl: p.avatarUrl,
      bio: p.bio,
    }));
  }

  async getMessages(conversationId: string): Promise<ScrapedMessage[]> {
    console.log(`[Facebook] Getting messages for conversation: ${conversationId}`);
    const conversations = await scrapeFacebookMessages(this.cookies);
    const conv = conversations.find(c => c.conversationId === conversationId);
    return (conv?.messages || []).map(m => ({
      externalId: m.externalId,
      content: m.content,
      senderId: m.senderId,
      senderName: m.senderName,
      sentAt: new Date(m.sentAt),
    }));
  }

  async sendMessage(conversationId: string, content: string): Promise<boolean> {
    console.log(`[Facebook] Sending message to conversation: ${conversationId}`);
    return sendFacebookMessageViaCDP(conversationId, content);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.search("test");
      return true;
    } catch {
      return false;
    }
  }
}

export class TwitterConnector implements PlatformConnector {
  platform = "TWITTER";
  private camoufox: CamoufoxManager;
  private profileId: string;
  private cookies: string = "";

  constructor(config: ConnectorConfig) {
    this.camoufox = config.camoufox;
    this.profileId = config.profileId;
  }

  async search(query: string): Promise<ScrapedLead[]> {
    console.log(`[Twitter] Searching for: ${query}`);
    const profiles = await scrapeTwitterSearch(query, this.cookies || undefined);
    return profiles.map(p => ({
      externalId: p.externalId,
      firstName: p.firstName,
      lastName: p.lastName,
      profileUrl: p.profileUrl,
      avatarUrl: p.avatarUrl,
      bio: p.bio,
    }));
  }

  async getMessages(conversationId: string): Promise<ScrapedMessage[]> {
    console.log(`[Twitter] Getting messages for conversation: ${conversationId}`);
    const conversations = await scrapeTwitterMessages(this.cookies);
    const conv = conversations.find(c => c.conversationId === conversationId);
    return (conv?.messages || []).map(m => ({
      externalId: m.externalId,
      content: m.content,
      senderId: m.senderId,
      senderName: m.senderName,
      sentAt: new Date(m.sentAt),
    }));
  }

  async sendMessage(conversationId: string, content: string): Promise<boolean> {
    console.log(`[Twitter] Sending message to conversation: ${conversationId}`);
    return sendTwitterMessageViaCDP(conversationId, content);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.search("test");
      return true;
    } catch {
      return false;
    }
  }
}

export class PeoplePerHourConnector implements PlatformConnector {
  platform = "PEOPLEPERHOUR";
  private camoufox: CamoufoxManager;
  private profileId: string;
  private cookies: string = "";

  constructor(config: ConnectorConfig) {
    this.camoufox = config.camoufox;
    this.profileId = config.profileId;
  }

  async search(query: string): Promise<ScrapedLead[]> {
    console.log(`[PeoplePerHour] Searching for: ${query}`);
    const profiles = await scrapePeoplePerHour(query, this.cookies || undefined);
    return profiles.map(p => ({
      externalId: p.externalId,
      firstName: p.firstName,
      lastName: p.lastName,
      jobTitle: p.jobTitle,
      profileUrl: p.profileUrl,
      avatarUrl: p.avatarUrl,
      bio: p.bio,
      location: p.location,
    }));
  }

  async getMessages(conversationId: string): Promise<ScrapedMessage[]> {
    console.log(`[PeoplePerHour] Messages not supported via scraping`);
    return [];
  }

  async sendMessage(conversationId: string, content: string): Promise<boolean> {
    console.log(`[PeoplePerHour] Sending via browser not yet supported`);
    throw new Error("PeoplePerHour messaging requires manual browser interaction");
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.search("test");
      return true;
    } catch {
      return false;
    }
  }
}

export function createConnector(platform: string, config: ConnectorConfig): PlatformConnector {
  switch (platform) {
    case "LINKEDIN":
      return new LinkedInConnector(config);
    case "FACEBOOK":
      return new FacebookConnector(config);
    case "TWITTER":
      return new TwitterConnector(config);
    case "PEOPLEPERHOUR":
      return new PeoplePerHourConnector(config);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
