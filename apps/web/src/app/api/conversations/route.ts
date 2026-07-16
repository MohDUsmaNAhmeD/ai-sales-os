import { NextRequest, NextResponse } from "next/server";
import { getConversations, handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getConversations({
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
      status: searchParams.get("status") || undefined,
      platform: searchParams.get("platform") || undefined,
      leadId: searchParams.get("leadId") || undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const conversation = await prisma.conversation.create({
      data: {
        leadId: body.leadId || null,
        platform: body.platform,
        subject: body.subject || null,
        status: "OPEN",
      },
    });
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
