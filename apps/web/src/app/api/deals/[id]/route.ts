import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const deal = await prisma.deal.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(deal);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
