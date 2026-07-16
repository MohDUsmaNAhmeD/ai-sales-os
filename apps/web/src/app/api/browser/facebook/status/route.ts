import { NextResponse } from "next/server";
import { isBrowserRunning } from "@ai-sales-os/shared";

export async function GET() {
  const running = await isBrowserRunning();
  return NextResponse.json({ running });
}
