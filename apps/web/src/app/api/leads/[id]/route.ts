import { NextRequest, NextResponse } from "next/server";
import { getLead, updateLead, handleApiError } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(lead);
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
    const lead = await updateLead(id, body);
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
