import { NextResponse } from "next/server";
import { prisma } from "@ai-sales-os/db";
import {
  extractCookiesForPlatform,
  isBrowserRunning,
  scrapeFacebookMessages,
  scrapeLinkedInMessages,
  scrapeTwitterMessages,
} from "@ai-sales-os/shared";

type Platform = "LINKEDIN" | "FACEBOOK" | "TWITTER";
type Conversation = {
  conversationId: string;
  messages: { externalId: string; content: string; senderId: string; senderName?: string; sentAt: string }[];
};

const scrapers: Record<Platform, (cookies: string) => Promise<Conversation[]>> = {
  LINKEDIN: scrapeLinkedInMessages,
  FACEBOOK: scrapeFacebookMessages,
  TWITTER: scrapeTwitterMessages,
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const requested = typeof body.platform === "string" ? body.platform.toUpperCase() : null;
  const connectors = await prisma.connectorState.findMany({
    where: requested ? { platform: requested as never } : { platform: { in: Object.keys(scrapers) as never } },
  });

  if (!connectors.length) {
    return NextResponse.json({ error: "No messaging platforms are configured. Connect one in Settings first." }, { status: 400 });
  }

  const settled = await Promise.allSettled(
    connectors.map(async (connector: { id: string; platform: string; accessToken: string | null; userId: string }) => {
      const platform = connector.platform as Platform;
      const scraper = scrapers[platform];
      if (!scraper) throw new Error(`${platform} does not support inbox sync.`);

      let cookies = connector.accessToken;
      if (await isBrowserRunning(platform)) {
        const extracted = await extractCookiesForPlatform(platform);
        if (extracted.cookies) {
          cookies = extracted.cookies;
          await prisma.connectorState.update({ where: { id: connector.id }, data: { accessToken: cookies } });
        }
      }
      if (!cookies) throw new Error(`${platform} is not connected. Launch its Camoufox profile and sign in.`);

      const conversations = await scraper(cookies);
      const saved = await persistConversations(platform, conversations, connector.userId);
      await prisma.connectorState.update({
        where: { id: connector.id },
        data: { lastSyncAt: new Date(), syncStatus: "idle", lastError: null },
      });
      return { platform, conversations: conversations.length, messagesSaved: saved };
    }),
  );

  const results = settled.map((result, index) => {
    const platform = connectors[index].platform;
    if (result.status === "fulfilled") return result.value;
    return {
      platform,
      conversations: 0,
      messagesSaved: 0,
      error: result.reason instanceof Error ? result.reason.message : "Unknown sync error",
    };
  });

  await Promise.all(
    results
      .filter((result) => "error" in result)
      .map((result) => {
        const connector = connectors.find((item: { platform: string }) => item.platform === result.platform);
        if (!connector) return Promise.resolve();
        return prisma.connectorState.update({
          where: { id: connector.id },
          data: { syncStatus: "error", errorCount: { increment: 1 }, lastError: result.error },
        });
      }),
  );

  return NextResponse.json({
    success: results.some((result) => !("error" in result)),
    results,
    syncedAt: new Date().toISOString(),
  });
}

async function persistConversations(platform: Platform, items: Conversation[], userId: string) {
  let saved = 0;
  for (const item of items) {
    if (!item.conversationId) continue;
    const conversation =
      (await prisma.conversation.findFirst({ where: { platform, externalId: item.conversationId } })) ||
      (await prisma.conversation.create({ data: { platform, externalId: item.conversationId, userId } }));

    for (const message of item.messages) {
      if (!message.externalId || !message.content) continue;
      const exists = await prisma.message.findFirst({
        where: { conversationId: conversation.id, externalId: message.externalId },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          externalId: message.externalId,
          content: message.content,
          senderId: message.senderId,
          senderType: "CONTACT",
          sentAt: new Date(message.sentAt),
        },
      });
      saved += 1;
    }

    const last = item.messages.at(-1);
    if (last) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(last.sentAt), lastMessagePreview: last.content.slice(0, 200) },
      });
    }
  }
  return saved;
}
