import { prisma } from "@ai-sales-os/db";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);

const PROFILES_DIR = process.env.PROFILES_DIR || "./profiles";

interface BrowserProfileJobData {
  profileId?: string;
  platform?: string;
  proxyUrl?: string;
  jobId?: string;
}

export async function browserProfileWorker(data: BrowserProfileJobData) {
  const { profileId, platform, proxyUrl } = data;

  if (!profileId) {
    throw new Error("profileId is required");
  }

  const profile = await prisma.browserProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  console.log(`[BrowserProfile] Processing profile ${profileId} for ${profile.platform}`);

  try {
    await prisma.browserProfile.update({
      where: { id: profileId },
      data: { status: "CREATING" },
    });

    // Create profile directory
    const profileDir = join(PROFILES_DIR, profile.platform.toLowerCase(), profileId);
    await mkdir(profileDir, { recursive: true });

    // Create Camoufox profile configuration
    const config = {
      profileId,
      platform: profile.platform,
      proxyUrl: profile.proxyUrl,
      createdAt: new Date().toISOString,
      fingerprint: {
        userAgent: generateUserAgent(),
        viewport: { width: 1920, height: 1080 },
        locale: "en-US",
        timezone: "America/New_York",
      },
      cookies: [],
      localStorage: {},
      sessionStorage: {},
    };

    await writeFile(join(profileDir, "config.json"), JSON.stringify(config, null, 2));

    // Create initial cookie jar
    await writeFile(join(profileDir, "cookies.json"), "[]");

    // Create initial storage
    await writeFile(join(profileDir, "local-storage.json"), "{}");

    console.log(`[BrowserProfile] Profile ${profileId} created at ${profileDir}`);

    await prisma.browserProfile.update({
      where: { id: profileId },
      data: {
        status: "ACTIVE",
        profilePath: profileDir,
        lastHealthCheck: new Date(),
        crashCount: 0,
      },
    });

    // Start health check heartbeat
    await startHealthCheck(profileId);
  } catch (error) {
    console.error(`[BrowserProfile] Failed to create profile ${profileId}:`, error);

    await prisma.browserProfile.update({
      where: { id: profileId },
      data: {
        status: "ERROR",
        metadata: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      },
    });

    throw error;
  }
}

async function startHealthCheck(profileId: string) {
  // Health check is done by the monitoring worker
  // This just ensures the profile is trackable
  const interval = setInterval(async () => {
    try {
      const profile = await prisma.browserProfile.findUnique({
        where: { id: profileId },
      });

      if (!profile || profile.status === "INACTIVE" || profile.status === "ERROR") {
        clearInterval(interval);
        return;
      }

      await prisma.browserProfile.update({
        where: { id: profileId },
        data: { lastHealthCheck: new Date() },
      });
    } catch {
      clearInterval(interval);
    }
  }, 60000); // Check every minute
}

function generateUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}
