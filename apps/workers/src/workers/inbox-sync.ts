import { prisma } from "@ai-sales-os/db";
import {
  extractCookiesForPlatform,
  isBrowserRunning,
  scrapeFacebookMessages,
  scrapeLinkedInMessages,
  scrapeTwitterMessages,
} from "@ai-sales-os/shared";

interface InboxSyncJobData {
  profileId?: string;
  platform?: string;
  jobId?: string;
}

type Platform = "LINKEDIN" | "FACEBOOK" | "TWITTER";
type ScrapedConversation = {
  conversationId: string;
  messages: { externalId: string; content: string; senderId: string; senderName?: string; sentAt: string }[];
};

const scrapers: Record<Platform, (cookies: string) => Promise<ScrapedConversation[]>> = {
  LINKEDIN: scrapeLinkedInMessages,
  FACEBOOK: scrapeFacebookMessages,
  TWITTER: scrapeTwitterMessages,
};

export async function inboxSyncWorker(data: InboxSyncJobData) {
  const connectors = await prisma.connectorState.findMany({
    where: data.platform ? { platform: data.platform as never } : { platform: { in: Object.keys(scrapers) as never } },
  });

  if (!connectors.length) throw new Error("No messaging connectors are configured.");

  return Promise.allSettled(
    connectors.map(async (connector: { id: string; platform: string; accessToken: string | null; userId: string }) => {
      const platform = connector.platform as Platform;
      if (!scrapers[platform]) return { platform, count: 0, skipped: true };
      try {
        let cookies = connector.accessToken;
        if (await isBrowserRunning(platform)) {
          const extracted = await extractCookiesForPlatform(platform);
          if (extracted.cookies) {
            cookies = extracted.cookies;
            await prisma.connectorState.update({
              where: { id: connector.id },
              data: { accessToken: cookies },
            });
          }
        }
        if (!cookies) throw new Error(`${platform} is not connected. Launch its browser profile and sign in.`);

        const conversations = await scrapers[platform](cookies);
        await saveConversationsToDb(platform, conversations, connector.userId);
        await prisma.connectorState.update({
          where: { id: connector.id },
          data: { lastSyncAt: new Date(), syncStatus: "idle", lastError: null },
        });
        return { platform, count: conversations.length };
      } catch (error) {
        await prisma.connectorState.update({
          where: { id: connector.id },
          data: {
            syncStatus: "error",
            errorCount: { increment: 1 },
            lastError: error instanceof Error ? error.message : "Unknown inbox sync error",
          },
        });
        throw error;
      }
    }),
  );
}

async function saveConversationsToDb(
  platform: Platform,
  conversations: ScrapedConversation[],
  userId: string,
) {
  for (const item of conversations) {
    if (!item.conversationId) continue;
    const conversation =
      (await prisma.conversation.findFirst({ where: { externalId: item.conversationId, platform } })) ||
      (await prisma.conversation.create({
        data: { externalId: item.conversationId, platform, status: "OPEN", userId },
      }));

    for (const message of item.messages) {
      if (!message.externalId || !message.content) continue;
      const exists = await prisma.message.findFirst({
        where: { externalId: message.externalId, conversationId: conversation.id },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.message.create({
        data: {
          externalId: message.externalId,
          conversationId: conversation.id,
          content: message.content,
          senderType: "CONTACT",
          senderId: message.senderId,
          sentAt: new Date(message.sentAt),
        },
      });
    }

    const lastMessage = item.messages.at(-1);
    if (lastMessage) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(lastMessage.sentAt),
          lastMessagePreview: lastMessage.content.slice(0, 200),
        },
      });
    }
  }
}
