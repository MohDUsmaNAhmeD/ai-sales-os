import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function GET() {
  try {
    const profiles = await prisma.browserProfile.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ profiles });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = await prisma.browserProfile.create({
      data: {
        name: body.name,
        platform: body.platform,
        profilePath: `/profiles/${body.platform.toLowerCase()}/${Date.now()}`,
        proxyUrl: body.proxyUrl || null,
        userId: body.userId || "system",
      },
    });

    // Queue background job to create the actual Camoufox profile
    await prisma.backgroundJob.create({
      data: {
        type: "BROWSER_PROFILE_CREATE",
        payload: JSON.stringify({ profileId: profile.id, platform: body.platform, proxyUrl: body.proxyUrl }),
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
