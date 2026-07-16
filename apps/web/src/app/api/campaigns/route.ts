import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function GET() {
  try {
    const campaigns = await prisma.outreachCampaign.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const campaign = await prisma.outreachCampaign.create({
      data: {
        name: body.name,
        template: body.template,
        platform: body.platform || null,
        createdBy: body.userId || "system",
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
