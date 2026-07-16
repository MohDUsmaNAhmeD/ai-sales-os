import { NextResponse } from "next/server";
import { prisma } from "@ai-sales-os/db";
import {
  scrapeLinkedInMessages,
  scrapeFacebookMessages,
  scrapeTwitterMessages,
  loadCookiesForPlatform,
  saveCookiesForPlatform,
  isBrowserRunning,
  extractCookiesForPlatform,
} from "@ai-sales-os/shared";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const platformFilter = body.platform as string | undefined;

    const where: Record<string, unknown> = {};
    if (platformFilter) where.platform = platformFilter;

    const connectors = await prisma.connectorState.findMany({
      where: {
        ...where,
        OR: [
          { accessToken: { not: null } },
          { accessToken: { not: "" } },
        ],
      },
    });

    if (connectors.length === 0) {
      return NextResponse.json(
        { error: "No connected platforms found. Go to Settings and connect a platform first." },
        { status: 400 }
      );
    }

    const results: { platform: string; conversations: number; error?: string }[] = [];

    for (const connector of connectors) {
      try {
        const count = await syncPlatform(connector.platform, connector.id, connector.accessToken);
        results.push({ platform: connector.platform, conversations: count });

        await prisma.connectorState.update({
          where: { id: connector.id },
          data: { lastSyncAt: new Date(), syncStatus: "idle" },
        });
      } catch (error) {
        console.error(`[InboxSync] Failed to sync ${connector.platform}:`, error);
        results.push({
          platform: connector.platform,
          conversations: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        await prisma.connectorState.update({
          where: { id: connector.id },
          data: {
            syncStatus: "error",
            errorCount: { increment: 1 },
            lastError: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

async function syncPlatform(platform: string, connectorId: string, dbCookies: string | null): Promise<number> {
  let cookies = dbCookies;

  // Try loading from file
  const fileCookies = await loadCookiesForPlatform(platform);
  if (fileCookies) cookies = fileCookies;

  // Try extracting from browser via CDP
  if (!cookies || cookies.length === 0) {
    const running = await isBrowserRunning();
    if (running) {
      try {
        const result = await extractCookiesForPlatform(platform);
        if (result.cookieCount > 0) {
          cookies = result.cookies;
          await saveCookiesForPlatform(platform, cookies);
          await prisma.connectorState.update({
            where: { id: connectorId },
            data: { accessToken: cookies },
          });
        }
      } catch {
        // CDP extraction failed, continue without cookies
      }
    }
  }

  if (!cookies || cookies.length === 0) {
    throw new Error(`No ${platform} cookies. Open the browser, log in to ${platform}, then click "Extract Cookies" in Settings.`);
  }

  let rawConversations: { conversationId: string; messages: { externalId: string; content: string; senderId: string; senderName?: string; sentAt: string }[] }[] = [];

  switch (platform) {
    case "LINKEDIN":
      rawConversations = await scrapeLinkedInMessages(cookies);
      break;
    case "FACEBOOK":
      rawConversations = await scrapeFacebookMessages(cookies);
      break;
    case "TWITTER":
      rawConversations = await scrapeTwitterMessages(cookies);
      break;
    default:
      console.log(`[InboxSync] No message sync for ${platform}`);
      return 0;
  }

  // Save to DB
  let count = 0;
  for (const conv of rawConversations) {
    if (!conv.conversationId) continue;

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
      count++;
    }

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

  return count;
}
