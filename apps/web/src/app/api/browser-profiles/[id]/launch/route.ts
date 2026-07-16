import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const profile = await prisma.browserProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.browserProfile.update({
      where: { id },
      data: {
        status: "ACTIVE",
        lastHealthCheck: new Date(),
      },
    });

    await prisma.activity.create({
      data: {
        type: "SYSTEM_EVENT",
        title: `Browser profile "${profile.name}" launched`,
        description: `Profile ${profile.platform} status set to ACTIVE`,
        metadata: JSON.stringify({ profileId: id, platform: profile.platform }),
      },
    });

    return NextResponse.json({ success: true, profileId: id });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
