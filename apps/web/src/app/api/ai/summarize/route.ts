import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";
import { getMistralAI } from "@/lib/mistral";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId } = body;

    const settings = await prisma.userSettings.findFirst();
    const mistral = getMistralAI(settings?.mistralKey || undefined);

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: "asc" },
    });

    if (messages.length === 0) {
      return NextResponse.json({ summary: "No messages in this conversation." });
    }

    const summary = await mistral.summarizeConversation(
      messages.map((m) => ({
        sender: m.senderType,
        content: m.content,
      }))
    );

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
