import { spawn, ChildProcess, execSync } from "child_process";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const CDP_PORT = 9222;
const PROFILES_DIR = join(process.cwd(), "profiles");

// Edge/Chrome paths to try
const BROWSER_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\EdgeCore\\150.0.4078.65\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

let browserProcess: ChildProcess | null = null;

function findBrowser(): string | null {
  try {
    const result = execSync("where msedge 2>nul", { encoding: "utf-8", timeout: 5000 }).trim();
    if (result) return result.split("\n")[0].trim();
  } catch {}
  try {
    const result = execSync("where chrome 2>nul", { encoding: "utf-8", timeout: 5000 }).trim();
    if (result) return result.split("\n")[0].trim();
  } catch {}
  for (const p of BROWSER_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

const PLATFORM_LOGIN_URLS: Record<string, string> = {
  LINKEDIN: "https://www.linkedin.com/login",
  FACEBOOK: "https://www.facebook.com/login",
  TWITTER: "https://x.com/login",
  THREADS: "https://www.threads.net/login",
  PEOPLEPERHOUR: "https://www.peopleperhour.com/#login",
};

const PLATFORM_COOKIE_DOMAINS: Record<string, string[]> = {
  LINKEDIN: ["linkedin.com"],
  FACEBOOK: ["facebook.com", ".facebook.com"],
  TWITTER: ["x.com", ".x.com", "twitter.com", ".twitter.com"],
  THREADS: ["threads.net", ".threads.net", "instagram.com", ".instagram.com"],
  PEOPLEPERHOUR: ["peopleperhour.com", ".peopleperhour.com"],
};

export async function launchBrowserForPlatform(
  platform: string
): Promise<{ port: number; profileDir: string; message: string }> {
  const browserPath = findBrowser();
  if (!browserPath) {
    throw new Error("No browser found. Install Edge or Chrome.");
  }

  const profileDir = join(PROFILES_DIR, `${platform.toLowerCase()}-browser`);
  await mkdir(profileDir, { recursive: true });

  // Check if already running
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    if (res.ok) {
      return { port: CDP_PORT, profileDir, message: "Browser already running" };
    }
  } catch {}

  killBrowser();

  const loginUrl = PLATFORM_LOGIN_URLS[platform] || PLATFORM_LOGIN_URLS.LINKEDIN;

  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    loginUrl,
  ];

  browserProcess = spawn(browserPath, args, {
    detached: true,
    stdio: "ignore",
  });

  browserProcess.unref();

  // Wait for CDP to be ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    throw new Error("Browser launched but CDP not ready. Check if port 9222 is available.");
  }

  const platformName = platform.charAt(0) + platform.slice(1).toLowerCase();
  return { port: CDP_PORT, profileDir, message: `Browser launched. Log in to ${platformName}.` };
}

export function killBrowser(): void {
  if (browserProcess) {
    try {
      browserProcess.kill();
    } catch {}
    browserProcess = null;
  }
  try {
    if (process.platform === "win32") {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${CDP_PORT} ^| findstr LISTENING') do taskkill /F /PID %a 2>nul`, {
        timeout: 5000,
      });
    }
  } catch {}
}

export async function isBrowserRunning(): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function extractCookiesForPlatform(
  platform: string
): Promise<{ cookies: string; cookieCount: number; domains: string[] }> {
  let puppeteer: typeof import("puppeteer-core");
  try {
    puppeteer = await import("puppeteer-core");
  } catch {
    throw new Error("puppeteer-core not installed. Run: npm install puppeteer-core");
  }

  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${CDP_PORT}`,
    defaultViewport: null,
  });

  try {
    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    const client = await page.createCDPSession();
    const { cookies } = await client.send("Network.getAllCookies");

    const targetDomains = PLATFORM_COOKIE_DOMAINS[platform] || [];
    const platformCookies = cookies.filter(
      (c: { domain: string }) =>
        targetDomains.some((d) => c.domain.includes(d)) ||
        c.domain.includes(platform.toLowerCase())
    );

    const cookieStr = platformCookies
      .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
      .join("; ");

    const domains = [...new Set(platformCookies.map((c: { domain: string }) => c.domain))];

    return { cookies: cookieStr, cookieCount: platformCookies.length, domains };
  } finally {
    browser.disconnect();
  }
}

export async function saveCookiesForPlatform(platform: string, cookies: string): Promise<void> {
  const profileDir = join(PROFILES_DIR, `${platform.toLowerCase()}-browser`);
  await mkdir(profileDir, { recursive: true });
  const cookiePath = join(profileDir, "cookies.txt");
  await writeFile(cookiePath, cookies, "utf-8");
}

export async function loadCookiesForPlatform(platform: string): Promise<string | null> {
  try {
    const profileDir = join(PROFILES_DIR, `${platform.toLowerCase()}-browser`);
    const cookiePath = join(profileDir, "cookies.txt");
    const cookies = await readFile(cookiePath, "utf-8");
    return cookies.trim() || null;
  } catch {
    return null;
  }
}

// Backward-compatible aliases
export async function launchLinkedInBrowser() {
  return launchBrowserForPlatform("LINKEDIN");
}

export function killLinkedInBrowser() {
  killBrowser();
}

export async function isLinkedInBrowserRunning() {
  return isBrowserRunning();
}

export async function extractLinkedInCookies() {
  return extractCookiesForPlatform("LINKEDIN");
}

export async function saveLinkedInCookies(cookies: string) {
  return saveCookiesForPlatform("LINKEDIN", cookies);
}

export async function loadLinkedInCookies() {
  return loadCookiesForPlatform("LINKEDIN");
}
