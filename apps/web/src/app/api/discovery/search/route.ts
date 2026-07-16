import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ai-sales-os/db";
import { scrape, type ScrapedProfile } from "@ai-sales-os/shared";

const SUPPORTED = ["LINKEDIN", "FACEBOOK", "TWITTER", "PEOPLEPERHOUR"] as const;
type Platform = (typeof SUPPORTED)[number];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2 || query.length > 160) {
    return NextResponse.json({ error: "Enter a search query between 2 and 160 characters." }, { status: 400 });
  }

  const requested: string[] = Array.isArray(body.platforms)
    ? body.platforms
    : body.platform
      ? [body.platform]
      : [...SUPPORTED];
  const platforms = [...new Set(requested.map((value) => String(value).toUpperCase()))].filter(
    (value): value is Platform => SUPPORTED.includes(value as Platform),
  );
  if (!platforms.length) {
    return NextResponse.json({ error: "Select at least one supported platform." }, { status: 400 });
  }

  const connectors = await prisma.connectorState.findMany({
    where: { platform: { in: platforms as never } },
  });
  const byPlatform = new Map(connectors.map((connector: { platform: string; accessToken: string | null }) => [connector.platform, connector]));

  const settled = await Promise.allSettled(
    platforms.map(async (platform) => {
      const connector = byPlatform.get(platform);
      const profiles = await scrape(platform, query, connector?.accessToken || undefined);
      const leads = await Promise.all(profiles.filter((profile) => profile.externalId).map((profile) => saveLead(platform, query, profile)));
      return { platform, results: profiles.length, saved: leads.length, leads };
    }),
  );

  const results = settled.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : {
          platform: platforms[index],
          results: 0,
          saved: 0,
          leads: [],
          error: result.reason instanceof Error ? result.reason.message : "Platform search failed",
        },
  );

  await prisma.analyticsEvent.create({
    data: {
      event: "lead_discovery",
      properties: JSON.stringify({
        query,
        platforms,
        resultsFound: results.reduce((sum, result) => sum + result.results, 0),
        leadsSaved: results.reduce((sum, result) => sum + result.saved, 0),
      }),
    },
  });

  return NextResponse.json({
    success: results.some((result) => !("error" in result)),
    query,
    results,
    totalResults: results.reduce((sum, result) => sum + result.results, 0),
    leadsSaved: results.reduce((sum, result) => sum + result.saved, 0),
  });
}

async function saveLead(platform: Platform, query: string, profile: ScrapedProfile) {
  return prisma.lead.upsert({
    where: { platform_externalId: { platform, externalId: profile.externalId } },
    update: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email || null,
      company: profile.company || null,
      jobTitle: profile.jobTitle || null,
      profileUrl: profile.profileUrl,
      avatarUrl: profile.avatarUrl || null,
      bio: profile.bio || null,
      location: profile.location || null,
    },
    create: {
      platform,
      externalId: profile.externalId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email || null,
      company: profile.company || null,
      jobTitle: profile.jobTitle || null,
      profileUrl: profile.profileUrl,
      avatarUrl: profile.avatarUrl || null,
      bio: profile.bio || null,
      location: profile.location || null,
      source: `search:${query}`,
      tags: JSON.stringify([query.toLowerCase(), platform.toLowerCase()]),
      score: initialScore(profile),
    },
  });
}

function initialScore(profile: ScrapedProfile) {
  return Math.min(
    100,
    10 + (profile.email ? 15 : 0) + (profile.company ? 15 : 0) + (profile.jobTitle ? 10 : 0) +
      (profile.bio && profile.bio.length > 20 ? 10 : 0) + (profile.location ? 5 : 0),
  );
}
