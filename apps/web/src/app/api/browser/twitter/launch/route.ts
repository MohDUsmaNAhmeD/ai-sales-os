import { NextResponse } from "next/server";
import { launchBrowserForPlatform } from "@ai-sales-os/shared";

export async function POST() {
  try {
    const result = await launchBrowserForPlatform("TWITTER");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to launch browser" },
      { status: 500 }
    );
  }
}
