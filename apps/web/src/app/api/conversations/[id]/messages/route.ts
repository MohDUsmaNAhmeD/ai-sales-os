import { NextRequest, NextResponse } from "next/server";
import { sendMessage, handleApiError } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const message = await sendMessage(id, {
      content: body.content,
      contentType: body.contentType,
      senderType: body.senderType,
      isDraft: body.isDraft,
      isAiGenerated: body.isAiGenerated,
    });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
