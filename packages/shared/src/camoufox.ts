import { rm } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { Camoufox } from "camoufox-js";
import type { BrowserContext, Cookie, Page } from "playwright-core";
export type { Cookie } from "playwright-core";

export const SUPPORTED_PLATFORMS = [
  "LINKEDIN",
  "FACEBOOK",
  "TWITTER",
  "THREADS",
  "PEOPLEPERHOUR",
] as const;

export type BrowserPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export interface CamoufoxConfig {
  profileId: string;
  profilePath?: string;
  proxyUrl?: string;
  headless?: boolean;
  startUrl?: string;
}

export interface BrowserHealth {
  running: boolean;
  platform: BrowserPlatform;
  profilePath: string;
  pages: number;
  lastActive: string | null;
}

const LOGIN_URLS: Record<BrowserPlatform, string> = {
  LINKEDIN: "https://www.linkedin.com/login",
  FACEBOOK: "https://www.facebook.com/login",
  TWITTER: "https://x.com/i/flow/login",
  THREADS: "https://www.threads.net/login",
  PEOPLEPERHOUR: "https://www.peopleperhour.com/",
};

const PLATFORM_HOSTS: Record<BrowserPlatform, string[]> = {
  LINKEDIN: ["linkedin.com"],
  FACEBOOK: ["facebook.com"],
  TWITTER: ["x.com", "twitter.com"],
  THREADS: ["threads.net", "instagram.com"],
  PEOPLEPERHOUR: ["peopleperhour.com"],
};

function normalizePlatform(value: string): BrowserPlatform {
  const platform = value.toUpperCase() as BrowserPlatform;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(`Unsupported browser platform: ${value}`);
  }
  return platform;
}

export class CamoufoxManager {
  private readonly profilesDir: string;
  private readonly contexts = new Map<BrowserPlatform, BrowserContext>();
  private readonly lastActive = new Map<BrowserPlatform, string>();
  private readonly launches = new Map<BrowserPlatform, Promise<BrowserContext>>();

  constructor(profilesDir = process.env.PROFILES_DIR || "./profiles") {
    this.profilesDir = isAbsolute(profilesDir) ? profilesDir : resolve(process.cwd(), profilesDir);
  }

  profilePath(platformValue: string): string {
    const platform = normalizePlatform(platformValue);
    return join(this.profilesDir, platform.toLowerCase());
  }

  async launch(config: CamoufoxConfig): Promise<BrowserContext> {
    const platform = normalizePlatform(config.profileId);
    const existing = this.contexts.get(platform);
    if (existing) {
      this.lastActive.set(platform, new Date().toISOString());
      return existing;
    }

    const pending = this.launches.get(platform);
    if (pending) return pending;

    const launch = this.createContext(platform, config);
    this.launches.set(platform, launch);
    try {
      return await launch;
    } finally {
      this.launches.delete(platform);
    }
  }

  private async createContext(platform: BrowserPlatform, config: CamoufoxConfig): Promise<BrowserContext> {
    const profilePath = config.profilePath || this.profilePath(platform);
    const context = await Camoufox({
      user_data_dir: profilePath,
      headless: config.headless ?? process.env.CAMOUFOX_HEADLESS === "true",
      proxy: config.proxyUrl,
      humanize: true,
      enable_cache: true,
      os: process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux",
      locale: "en-US",
      window: [1440, 900],
    });

    this.contexts.set(platform, context);
    this.lastActive.set(platform, new Date().toISOString());
    context.on("close", () => this.contexts.delete(platform));

    const pages = context.pages();
    const page = pages[0] || (await context.newPage());
    if (page.url() === "about:blank") {
      await page.goto(config.startUrl || LOGIN_URLS[platform], { waitUntil: "domcontentloaded" });
    }
    return context;
  }

  async getContext(platformValue: string, autoLaunch = false): Promise<BrowserContext> {
    const platform = normalizePlatform(platformValue);
    const context = this.contexts.get(platform);
    if (context) return context;
    if (autoLaunch) return this.launch({ profileId: platform });
    throw new Error(`${platform} browser is not running. Launch it in Settings and sign in first.`);
  }

  async getPage(platformValue: string, autoLaunch = false): Promise<Page> {
    const platform = normalizePlatform(platformValue);
    const context = await this.getContext(platform, autoLaunch);
    const hosts = PLATFORM_HOSTS[platform];
    const page = context.pages().find((candidate) => hosts.some((host) => candidate.url().includes(host)));
    this.lastActive.set(platform, new Date().toISOString());
    return page || context.pages()[0] || context.newPage();
  }

  async close(platformValue: string): Promise<void> {
    const platform = normalizePlatform(platformValue);
    const context = this.contexts.get(platform);
    if (!context) return;
    this.contexts.delete(platform);
    await context.close();
  }

  async closeAll(): Promise<void> {
    await Promise.allSettled([...this.contexts.keys()].map((platform) => this.close(platform)));
  }

  async resetProfile(platformValue: string): Promise<void> {
    const platform = normalizePlatform(platformValue);
    await this.close(platform);
    await rm(this.profilePath(platform), { recursive: true, force: true });
    this.lastActive.delete(platform);
  }

  async healthCheck(platformValue: string): Promise<BrowserHealth> {
    const platform = normalizePlatform(platformValue);
    const context = this.contexts.get(platform);
    return {
      running: Boolean(context),
      platform,
      profilePath: this.profilePath(platform),
      pages: context?.pages().length ?? 0,
      lastActive: this.lastActive.get(platform) ?? null,
    };
  }

  async getCookies(platformValue: string): Promise<Cookie[]> {
    const context = await this.getContext(platformValue);
    return context.cookies();
  }

  async cookieHeader(platformValue: string): Promise<string> {
    const cookies = await this.getCookies(platformValue);
    return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
  }

  async setCookies(platformValue: string, cookies: Cookie[]): Promise<void> {
    const context = await this.getContext(platformValue, true);
    await context.addCookies(cookies);
  }
}

export const camoufox = new CamoufoxManager();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void camoufox.closeAll().finally(() => process.exit(0));
  });
}
