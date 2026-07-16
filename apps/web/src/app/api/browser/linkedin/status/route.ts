import { NextResponse } from "next/server";
import { isLinkedInBrowserRunning } from "@ai-sales-os/shared";

export async function GET() {
  try {
    const running = await isLinkedInBrowserRunning();
    return NextResponse.json({ running });
  } catch {
    return NextResponse.json({ running: false });
  }
}
