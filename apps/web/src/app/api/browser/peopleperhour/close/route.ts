import { NextResponse } from "next/server";
import { killBrowser } from "@ai-sales-os/shared";

export async function POST() {
  killBrowser();
  return NextResponse.json({ success: true });
}
