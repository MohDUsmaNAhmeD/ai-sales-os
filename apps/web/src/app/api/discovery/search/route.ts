import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";
import { scrape, type ScrapedProfile } from "@ai-sales-os/shared";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, platform } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    }

    console.log(`[Discovery] Searching ${platform} for: ${query}`);

    // Get cookies for this platform if available
    const connector = await prisma.connectorState.findUnique({
      where: { platform_userId: { platform: platform as never, userId: "default" } },
    });

    const cookies = connector?.accessToken || undefined;

    // Run real scraper
    let scrapedLeads: ScrapedProfile[];
    try {
      scrapedLeads = await scrape(platform, query, cookies);
    } catch (scrapeError) {
      console.error(`[Discovery] Scrape failed for ${platform}:`, scrapeError);
      // If scrape fails, return error rather than fake data
      return NextResponse.json(
        {
          error: `Failed to scrape ${platform}. Make sure you have browser cookies configured for this platform.`,
          details: scrapeError instanceof Error ? scrapeError.message : "Unknown error",
        },
        { status: 502 }
      );
    }

    if (scrapedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        leadsFound: 0,
        message: `No results found for "${query}" on ${platform}. Try different search terms or check your browser cookies.`,
        query,
        platform,
      });
    }

    // Store scraped leads in database
    const createdLeads = [];
    for (const scraped of scrapedLeads) {
      // Skip leads without external IDs
      if (!scraped.externalId) continue;

      // Check for duplicate
      const existing = await prisma.lead.findFirst({
        where: {
          platform: platform as never,
          externalId: scraped.externalId,
        },
      });

      if (existing) continue;

      const lead = await prisma.lead.create({
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
          source: `search:${query}`,
          tags: JSON.stringify([query.toLowerCase(), platform.toLowerCase()]),
          score: calculateInitialScore(scraped),
        },
      });

      createdLeads.push(lead);
    }

    // Log the activity
    await prisma.analyticsEvent.create({
      data: {
        event: "lead_discovery",
        properties: JSON.stringify({
          platform,
          query,
          resultsFound: scrapedLeads.length,
          leadsCreated: createdLeads.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      leadsFound: createdLeads.length,
      totalResults: scrapedLeads.length,
      query,
      platform,
    });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

function calculateInitialScore(profile: ScrapedProfile): number {
  let score = 10; // base score for being found
  if (profile.email) score += 15;
  if (profile.company) score += 15;
  if (profile.jobTitle) score += 10;
  if (profile.bio && profile.bio.length > 20) score += 10;
  if (profile.location) score += 5;
  return Math.min(100, score);
}
