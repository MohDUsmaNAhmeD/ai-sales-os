import { spawn, ChildProcess } from "child_process";
import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { join } from "path";

export interface BrowserProfile {
  id: string;
  name: string;
  platform: string;
  profilePath: string;
  proxyUrl?: string;
  status: string;
}

export interface ScrapedProfile {
  externalId: string;
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  profileUrl: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
}

export interface ScrapedMessage {
  externalId: string;
  content: string;
  senderId: string;
  senderName?: string;
  sentAt: string;
}

export class CamoufoxManager {
  private profilesDir: string;
  private processes: Map<string, ChildProcess> = new Map();

  constructor(profilesDir: string = "./profiles") {
    this.profilesDir = profilesDir;
  }

  async getProfile(profileId: string): Promise<BrowserProfile | null> {
    try {
      const configPath = join(this.profilesDir, profileId, "config.json");
      const data = await readFile(configPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async createProfile(data: {
    id: string;
    name: string;
    platform: string;
    proxyUrl?: string;
  }): Promise<BrowserProfile> {
    const profileDir = join(this.profilesDir, data.id);
    await mkdir(profileDir, { recursive: true });

    const profile: BrowserProfile = {
      id: data.id,
      name: data.name,
      platform: data.platform,
      profilePath: profileDir,
      proxyUrl: data.proxyUrl,
      status: "active",
    };

    await writeFile(join(profileDir, "config.json"), JSON.stringify(profile, null, 2));
    await writeFile(join(profileDir, "cookies.json"), "[]");
    await writeFile(join(profileDir, "storage.json"), "{}");

    return profile;
  }

  async saveCookies(profileId: string, cookies: unknown[]): Promise<void> {
    const profileDir = join(this.profilesDir, profileId);
    await writeFile(join(profileDir, "cookies.json"), JSON.stringify(cookies, null, 2));
  }

  async getCookies(profileId: string): Promise<unknown[]> {
    try {
      const data = await readFile(join(this.profilesDir, profileId, "cookies.json"), "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveStorage(profileId: string, storage: Record<string, unknown>): Promise<void> {
    const profileDir = join(this.profilesDir, profileId);
    await writeFile(join(profileDir, "storage.json"), JSON.stringify(storage, null, 2));
  }

  async listProfiles(): Promise<BrowserProfile[]> {
    try {
      const entries = await readdir(this.profilesDir, { withFileTypes: true });
      const profiles: BrowserProfile[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const profile = await this.getProfile(entry.name);
          if (profile) profiles.push(profile);
        }
      }

      return profiles;
    } catch {
      return [];
    }
  }
}

export const camoufox = new CamoufoxManager(process.env.PROFILES_DIR || "./profiles");
