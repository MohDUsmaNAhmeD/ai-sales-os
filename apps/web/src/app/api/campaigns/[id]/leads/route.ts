import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: body.leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const existingEntry = await prisma.outreachLead.findFirst({
      where: {
        campaignId: id,
        leadId: body.leadId,
      },
    });

    if (existingEntry) {
      return NextResponse.json({ error: "Lead already in campaign" }, { status: 409 });
    }

    const entry = await prisma.outreachLead.create({
      data: {
        campaignId: id,
        leadId: body.leadId,
        status: "PENDING",
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
