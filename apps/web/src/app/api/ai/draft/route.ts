import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";
import { getMistralAI } from "@/lib/mistral";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, leadId } = body;

    // Get API key
    const settings = await prisma.userSettings.findFirst();
    const mistral = getMistralAI(settings?.mistralKey || undefined);

    let lead = null;
    let conversationHistory: { sender: string; content: string }[] = [];

    if (leadId) {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });
    }

    if (conversationId) {
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { sentAt: "asc" },
        take: 20,
      });
      conversationHistory = messages.map((m) => ({
        sender: m.senderType,
        content: m.content,
      }));
    }

    const draft = await mistral.draftMessage({
      leadName: `${lead?.firstName || ""} ${lead?.lastName || ""}`.trim() || "there",
      company: lead?.company || undefined,
      jobTitle: lead?.jobTitle || undefined,
      platform: lead?.platform || "LINKEDIN",
      context: conversationHistory.length > 0
        ? `Previous messages:\n${conversationHistory.map((m) => `${m.sender}: ${m.content}`).join("\n")}`
        : undefined,
    });

    return NextResponse.json({ body: draft });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
