import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";
import { getMistralAI } from "@/lib/mistral";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId } = body;

    const settings = await prisma.userSettings.findFirst();
    const mistral = getMistralAI(settings?.mistralKey || undefined);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { conversations: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const result = await mistral.scoreLead({
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company,
      jobTitle: lead.jobTitle,
      bio: lead.bio,
      platform: lead.platform,
      hasConversations: lead.conversations.length > 0,
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { score: result.score, aiScoreReason: result.reason },
    });

    await prisma.activity.create({
      data: {
        type: "SCORE_CHANGE",
        title: `Lead scored ${result.score}/100`,
        description: result.reason,
        leadId,
        metadata: JSON.stringify({ score: result.score, reason: result.reason }),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
