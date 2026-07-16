import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Cookie } from "playwright-core";
import { camoufox, type BrowserPlatform } from "./camoufox";

const LOGIN_URLS: Record<BrowserPlatform, string> = {
  LINKEDIN: "https://www.linkedin.com/login",
  FACEBOOK: "https://www.facebook.com/login",
  TWITTER: "https://x.com/i/flow/login",
  THREADS: "https://www.threads.net/login",
  PEOPLEPERHOUR: "https://www.peopleperhour.com/",
};

function platformName(value: string): BrowserPlatform {
  return value.toUpperCase() as BrowserPlatform;
}

export async function launchBrowserForPlatform(platformValue: string) {
  const platform = platformName(platformValue);
  const profileDir = camoufox.profilePath(platform);
  await camoufox.launch({ profileId: platform, profilePath: profileDir, startUrl: LOGIN_URLS[platform] });
  return {
    platform,
    profileDir,
    message: `Camoufox launched for ${platform}. Complete sign in in the browser window.`,
  };
}

export async function killBrowser(platform = "LINKEDIN"): Promise<void> {
  await camoufox.close(platform);
}

export async function isBrowserRunning(platform = "LINKEDIN"): Promise<boolean> {
  return (await camoufox.healthCheck(platform)).running;
}

export async function extractCookiesForPlatform(platformValue: string) {
  const platform = platformName(platformValue);
  const cookies = await camoufox.getCookies(platform);
  const cookieHeader = cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
  const domains = [...new Set(cookies.map(({ domain }) => domain))];
  await saveCookieState(platform, cookies);
  return { cookies: cookieHeader, cookieCount: cookies.length, domains };
}

async function saveCookieState(platform: BrowserPlatform, cookies: Cookie[]): Promise<void> {
  const profileDir = camoufox.profilePath(platform);
  await mkdir(profileDir, { recursive: true });
  await writeFile(join(profileDir, "cookies.json"), JSON.stringify(cookies, null, 2), "utf-8");
}

export async function saveCookiesForPlatform(platformValue: string, cookieHeader: string): Promise<void> {
  const platform = platformName(platformValue);
  const page = await camoufox.getPage(platform, true);
  const hostname = new URL(LOGIN_URLS[platform]).hostname;
  const cookies: Cookie[] = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      return {
        name: separator < 0 ? part : part.slice(0, separator),
        value: separator < 0 ? "" : part.slice(separator + 1),
        domain: `.${hostname.replace(/^www\./, "")}`,
        path: "/",
        expires: -1,
        secure: true,
        httpOnly: false,
        sameSite: "Lax" as const,
      };
    });
  await page.context().addCookies(cookies);
  await saveCookieState(platform, cookies);
}

export async function loadCookiesForPlatform(platformValue: string): Promise<string | null> {
  const platform = platformName(platformValue);
  try {
    const value = await readFile(join(camoufox.profilePath(platform), "cookies.json"), "utf-8");
    const cookies = JSON.parse(value) as Cookie[];
    return cookies.map(({ name, value: cookieValue }) => `${name}=${cookieValue}`).join("; ") || null;
  } catch {
    return null;
  }
}

export const launchLinkedInBrowser = () => launchBrowserForPlatform("LINKEDIN");
export const killLinkedInBrowser = () => killBrowser("LINKEDIN");
export const isLinkedInBrowserRunning = () => isBrowserRunning("LINKEDIN");
export const extractLinkedInCookies = () => extractCookiesForPlatform("LINKEDIN");
export const saveLinkedInCookies = (cookies: string) => saveCookiesForPlatform("LINKEDIN", cookies);
export const loadLinkedInCookies = () => loadCookiesForPlatform("LINKEDIN");
