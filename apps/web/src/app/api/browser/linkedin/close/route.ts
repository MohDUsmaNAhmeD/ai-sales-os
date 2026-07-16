import { NextResponse } from "next/server";
import { killLinkedInBrowser } from "@ai-sales-os/shared";

export async function POST() {
  try {
    killLinkedInBrowser();
    return NextResponse.json({ success: true, message: "Browser closed" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to close browser" },
      { status: 500 }
    );
  }
}
