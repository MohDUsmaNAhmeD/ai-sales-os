import { prisma } from "@ai-sales-os/db";
import {
  scrapeLinkedInMessages,
  scrapeFacebookMessages,
  scrapeTwitterMessages,
  loadLinkedInCookies,
  saveLinkedInCookies,
  isLinkedInBrowserRunning,
  extractLinkedInCookies,
} from "@ai-sales-os/shared";

interface InboxSyncJobData {
  profileId?: string;
  platform?: string;
  jobId?: string;
}

export async function inboxSyncWorker(data: InboxSyncJobData) {
  const { profileId, platform } = data;

  console.log(`[InboxSync] Syncing inbox for platform: ${platform || "all"}`);

  const where: Record<string, unknown> = {};
  if (platform) where.platform = platform;

  const connectors = await prisma.connectorState.findMany({
    where: {
      ...where,
      accessToken: { not: null },
    },
  });

  if (connectors.length === 0) {
    console.log("[InboxSync] No connectors with cookies found. Connect a platform first.");
    return;
  }

  for (const connector of connectors) {
    try {
      await syncConnector(connector);
    } catch (error) {
      console.error(`[InboxSync] Failed to sync ${connector.platform}:`, error);

      await prisma.connectorState.update({
        where: { id: connector.id },
        data: {
          syncStatus: "error",
          errorCount: connector.errorCount + 1,
          lastError: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }
}

async function syncConnector(connector: {
  id: string;
  platform: string;
  accessToken: string | null;
  userId: string;
}) {
  console.log(`[InboxSync] Syncing ${connector.platform} for user ${connector.userId}`);

  switch (connector.platform) {
    case "LINKEDIN":
      await syncLinkedIn(connector.id, connector.accessToken);
      break;
    case "FACEBOOK":
      await syncFacebook(connector.id, connector.accessToken);
      break;
    case "TWITTER":
      await syncTwitter(connector.id, connector.accessToken);
      break;
    default:
      console.log(`[InboxSync] No sync implementation for ${connector.platform}`);
  }

  await prisma.connectorState.update({
    where: { id: connector.id },
    data: { lastSyncAt: new Date(), syncStatus: "idle" },
  });
}

async function syncLinkedIn(connectorId: string, dbCookies: string | null) {
  console.log("[InboxSync] Syncing LinkedIn messages...");

  let cookies = dbCookies;

  // 1. Try loading from saved file
  const fileCookies = await loadLinkedInCookies();
  if (fileCookies) {
    cookies = fileCookies;
    console.log("[InboxSync] Using cookies from saved file");
  }

  // 2. If no cookies, try extracting from running browser via CDP
  if (!cookies) {
    const running = await isLinkedInBrowserRunning();
    if (running) {
      try {
        console.log("[InboxSync] Browser running, extracting cookies via CDP...");
        const result = await extractLinkedInCookies();
        if (result.cookieCount > 0) {
          cookies = result.cookies;
          await saveLinkedInCookies(cookies);
          await prisma.connectorState.update({
            where: { id: connectorId },
            data: { accessToken: cookies },
          });
          console.log(`[InboxSync] Extracted ${result.cookieCount} cookies from browser`);
        }
      } catch (err) {
        console.warn("[InboxSync] CDP extraction failed:", err);
      }
    }
  }

  if (!cookies) {
    console.log("[InboxSync] No LinkedIn cookies available. Launch browser and log in first.");
    return;
  }

  const conversations = await scrapeLinkedInMessages(cookies);
  await saveConversationsToDb("LINKEDIN", conversations);
  console.log(`[InboxSync] Synced ${conversations.length} LinkedIn conversations`);
}

async function syncFacebook(connectorId: string, cookies: string | null) {
  console.log("[InboxSync] Syncing Facebook messages...");

  if (!cookies) {
    // Try to extract cookies from running browser via CDP
    try {
      const puppeteer = await import("puppeteer-core");
      const versionRes = await fetch("http://127.0.0.1:9222/json/version");
      if (versionRes.ok) {
        const versionInfo = await versionRes.json();
        const browser = await puppeteer.connect({
          browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
          defaultViewport: null,
        });

        try {
          const pages = await browser.pages();
          const fbPage = pages.find((p: any) => p.url().includes('facebook.com'));
          if (fbPage) {
            const client = await fbPage.createCDPSession();
            const { cookies: allCookies } = await client.send("Network.getAllCookies");
            const fbCookies = allCookies
              .filter((c: any) => c.domain.includes("facebook.com"))
              .map((c: any) => `${c.name}=${c.value}`)
              .join("; ");

            if (fbCookies) {
              cookies = fbCookies;
              await prisma.connectorState.update({
                where: { id: connectorId },
                data: { accessToken: cookies },
              });
              console.log("[InboxSync] Extracted Facebook cookies from browser via CDP");
            }
          }
        } finally {
          browser.disconnect();
        }
      }
    } catch (err) {
      console.warn("[InboxSync] Facebook CDP cookie extraction failed:", err);
    }
  }

  if (!cookies) {
    console.log("[InboxSync] No Facebook cookies available. Log in to Facebook in the browser first.");
    return;
  }

  try {
    const conversations = await scrapeFacebookMessages(cookies);
    await saveConversationsToDb("FACEBOOK", conversations);
    console.log(`[InboxSync] Synced ${conversations.length} Facebook conversations`);
  } catch (error) {
    console.error("[InboxSync] Facebook message sync failed:", error);
    throw error;
  }
}

async function syncTwitter(connectorId: string, cookies: string | null) {
  console.log("[InboxSync] Syncing Twitter/X messages...");

  if (!cookies) {
    // Try to extract cookies from running browser via CDP
    try {
      const puppeteer = await import("puppeteer-core");
      const versionRes = await fetch("http://127.0.0.1:9222/json/version");
      if (versionRes.ok) {
        const versionInfo = await versionRes.json();
        const browser = await puppeteer.connect({
          browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
          defaultViewport: null,
        });

        try {
          const pages = await browser.pages();
          const xPage = pages.find((p: any) => p.url().includes('x.com') || p.url().includes('twitter.com'));
          if (xPage) {
            const client = await xPage.createCDPSession();
            const { cookies: allCookies } = await client.send("Network.getAllCookies");
            const xCookies = allCookies
              .filter((c: any) => c.domain.includes("x.com") || c.domain.includes("twitter.com"))
              .map((c: any) => `${c.name}=${c.value}`)
              .join("; ");

            if (xCookies) {
              cookies = xCookies;
              await prisma.connectorState.update({
                where: { id: connectorId },
                data: { accessToken: cookies },
              });
              console.log("[InboxSync] Extracted Twitter/X cookies from browser via CDP");
            }
          }
        } finally {
          browser.disconnect();
        }
      }
    } catch (err) {
      console.warn("[InboxSync] Twitter CDP cookie extraction failed:", err);
    }
  }

  if (!cookies) {
    console.log("[InboxSync] No Twitter/X cookies available. Log in to X in the browser first.");
    return;
  }

  try {
    const conversations = await scrapeTwitterMessages(cookies);
    await saveConversationsToDb("TWITTER", conversations);
    console.log(`[InboxSync] Synced ${conversations.length} Twitter conversations`);
  } catch (error) {
    console.error("[InboxSync] Twitter message sync failed:", error);
    throw error;
  }
}

// ─── Shared DB Helper ──────────────────────────────────────

async function saveConversationsToDb(
  platform: string,
  conversations: { conversationId: string; messages: { externalId: string; content: string; senderId: string; senderName?: string; sentAt: string }[] }[]
) {
  for (const conv of conversations) {
    if (!conv.conversationId) continue;

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { externalId: conv.conversationId, platform: platform as never },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          externalId: conv.conversationId,
          platform: platform as never,
          status: "OPEN",
        },
      });
    }

    // Sync messages
    for (const msg of conv.messages) {
      const existing = await prisma.message.findFirst({
        where: { externalId: msg.externalId },
      });

      if (existing) continue;

      await prisma.message.create({
        data: {
          externalId: msg.externalId,
          conversationId: conversation.id,
          content: msg.content,
          senderType: "CONTACT",
          senderId: msg.senderId,
          sentAt: new Date(msg.sentAt),
        },
      });
    }

    // Update conversation last message
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (lastMsg) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(lastMsg.sentAt),
          lastMessagePreview: lastMsg.content.slice(0, 200),
        },
      });
    }
  }
}
