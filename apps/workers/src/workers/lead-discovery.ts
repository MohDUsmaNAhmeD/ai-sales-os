import { prisma } from "@ai-sales-os/db";
import { scrape, type ScrapedProfile } from "@ai-sales-os/shared";

interface DiscoveryJobData {
  query: string;
  platform: string;
  jobId: string;
  cookies?: string;
}

export async function leadDiscoveryWorker(data: DiscoveryJobData) {
  const { query, platform, jobId, cookies } = data;

  console.log(`[LeadDiscovery] Searching ${platform} for: ${query}`);

  // Update connector status
  const connector = await prisma.connectorState.findUnique({
    where: { platform_userId: { platform: platform as never, userId: "default" } },
  });

  if (connector) {
    await prisma.connectorState.update({
      where: { id: connector.id },
      data: { syncStatus: "syncing" },
    });
  }

  try {
    // Run real scraper
    const scrapedLeads = await scrape(platform, query, cookies);

    let createdCount = 0;

    for (const scraped of scrapedLeads) {
      if (!scraped.externalId) continue;

      const existing = await prisma.lead.findFirst({
        where: {
          platform: platform as never,
          externalId: scraped.externalId,
        },
      });

      if (existing) continue;

      await prisma.lead.create({
        data: {
          platform: platform as never,
          externalId: scraped.externalId,
          firstName: scraped.firstName,
          lastName: scraped.lastName,
          email: scraped.email || null,
          company: scraped.company || null,
          jobTitle: scraped.jobTitle || null,
          profileUrl: scraped.profileUrl,
          avatarUrl: scraped.avatarUrl || null,
          bio: scraped.bio || null,
          location: scraped.location || null,
          source: `worker:${query}`,
          tags: JSON.stringify([query.toLowerCase(), platform.toLowerCase()]),
          score: calculateScore(scraped),
        },
      });

      createdCount++;
    }

    console.log(`[LeadDiscovery] Found ${scrapedLeads.length} results, created ${createdCount} new leads`);

    if (connector) {
      await prisma.connectorState.update({
        where: { id: connector.id },
        data: { syncStatus: "idle", lastSyncAt: new Date(), errorCount: 0 },
      });
    }
  } catch (error) {
    console.error(`[LeadDiscovery] ${platform} search failed:`, error);

    if (connector) {
      await prisma.connectorState.update({
        where: { id: connector.id },
        data: {
          syncStatus: "error",
          errorCount: connector.errorCount + 1,
          lastError: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    throw error;
  }
}

function calculateScore(profile: ScrapedProfile): number {
  let score = 10;
  if (profile.email) score += 15;
  if (profile.company) score += 15;
  if (profile.jobTitle) score += 10;
  if (profile.bio && profile.bio.length > 20) score += 10;
  if (profile.location) score += 5;
  return Math.min(100, score);
}
