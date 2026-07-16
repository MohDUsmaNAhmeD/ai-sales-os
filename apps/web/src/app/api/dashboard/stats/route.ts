import { NextResponse } from "next/server";
import { getDashboardStats, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
