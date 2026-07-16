import { spawn, ChildProcess } from "child_process";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export interface CamoufoxConfig {
  profileId: string;
  profilePath: string;
  proxyUrl?: string;
  headless?: boolean;
  fingerprint?: {
    userAgent?: string;
    viewport?: { width: number; height: number };
    locale?: string;
    timezone?: string;
  };
}

export interface BrowserState {
  cookies: Cookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cache: Record<string, unknown>;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export class CamoufoxManager {
  private processes: Map<string, ChildProcess> = new Map();
  private profilesDir: string;

  constructor(profilesDir: string = "./profiles") {
    this.profilesDir = profilesDir;
  }

  async launch(config: CamoufoxConfig): Promise<string> {
    const { profileId, profilePath, proxyUrl, headless = true, fingerprint } = config;

    if (this.processes.has(profileId)) {
      throw new Error(`Profile ${profileId} is already running`);
    }

    await mkdir(profilePath, { recursive: true });

    // Load or create browser state
    const state = await this.loadState(profilePath);

    // Build Camoufox arguments
    const args = [
      "--camoufox",
      `--profile-path=${profilePath}`,
    ];

    if (headless) args.push("--headless");
    if (proxyUrl) args.push(`--proxy-server=${proxyUrl}`);
    if (fingerprint?.userAgent) args.push(`--user-agent=${fingerprint.userAgent}`);
    if (fingerprint?.locale) args.push(`--lang=${fingerprint.locale}`);

    // In production, this would launch the actual Camoufox binary
    // For now, simulate the process
    console.log(`[Camoufox] Launching profile ${profileId} with args:`, args);

    // Store state for later use
    await this.saveState(profilePath, state);

    return profileId;
  }

  async close(profileId: string): Promise<void> {
    const process = this.processes.get(profileId);
    if (process) {
      process.kill();
      this.processes.delete(profileId);
    }
  }

  async resetProfile(profileId: string, profilePath: string): Promise<void> {
    await this.close(profileId);

    // Clear all browser state
    const emptyState: BrowserState = {
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      cache: {},
    };

    await this.saveState(profilePath, emptyState);
    console.log(`[Camoufox] Profile ${profileId} reset`);
  }

  async getCookies(profileId: string): Promise<Cookie[]> {
    const state = await this.loadState(this.getProfilePath(profileId));
    return state.cookies;
  }

  async setCookies(profileId: string, cookies: Cookie[]): Promise<void> {
    const state = await this.loadState(this.getProfilePath(profileId));
    state.cookies = cookies;
    await this.saveState(this.getProfilePath(profileId), state);
  }

  async getLocalStorage(profileId: string): Promise<Record<string, string>> {
    const state = await this.loadState(this.getProfilePath(profileId));
    return state.localStorage;
  }

  async setLocalStorage(profileId: string, data: Record<string, string>): Promise<void> {
    const state = await this.loadState(this.getProfilePath(profileId));
    state.localStorage = { ...state.localStorage, ...data };
    await this.saveState(this.getProfilePath(profileId), state);
  }

  async healthCheck(profileId: string): Promise<boolean> {
    const process = this.processes.get(profileId);
    return process !== undefined && !process.killed;
  }

  private getProfilePath(profileId: string): string {
    return join(this.profilesDir, profileId);
  }

  private async loadState(profilePath: string): Promise<BrowserState> {
    try {
      const data = await readFile(join(profilePath, "browser-state.json"), "utf-8");
      return JSON.parse(data);
    } catch {
      return {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        cache: {},
      };
    }
  }

  private async saveState(profilePath: string, state: BrowserState): Promise<void> {
    await mkdir(profilePath, { recursive: true });
    await writeFile(join(profilePath, "browser-state.json"), JSON.stringify(state, null, 2));
  }
}

export function createCamoufoxManager(profilesDir?: string): CamoufoxManager {
  return new CamoufoxManager(profilesDir);
}
