import { NextRequest, NextResponse } from "next/server";
import { getLeads, createLead, handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getLeads({
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
      status: searchParams.get("status") || undefined,
      platform: searchParams.get("platform") || undefined,
      search: searchParams.get("search") || undefined,
      ownerId: searchParams.get("ownerId") || undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lead = await createLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
