import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.browserProfile.update({
      where: { id },
      data: { status: "RESETTING" },
    });

    await prisma.backgroundJob.create({
      data: {
        type: "BROWSER_PROFILE_RESET",
        payload: JSON.stringify({ profileId: id }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
