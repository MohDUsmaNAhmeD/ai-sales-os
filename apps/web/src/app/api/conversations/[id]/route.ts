import { NextRequest, NextResponse } from "next/server";
import { getConversation, handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await getConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json(conversation);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const conversation = await prisma.conversation.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(conversation);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
