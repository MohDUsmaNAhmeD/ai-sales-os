import { NextRequest, NextResponse } from "next/server";
import { getDeals, handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getDeals({
      stage: searchParams.get("stage") || undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const deal = await prisma.deal.create({
      data: {
        title: body.title,
        value: body.value || 0,
        contactId: body.contactId || undefined,
        leadId: body.leadId || undefined,
        stage: body.stage || "QUALIFICATION",
        notes: body.notes || undefined,
      },
    });
    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
