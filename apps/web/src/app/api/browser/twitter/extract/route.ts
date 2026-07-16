import { NextResponse } from "next/server";
import { extractCookiesForPlatform, saveCookiesForPlatform } from "@ai-sales-os/shared";
import { prisma } from "@ai-sales-os/db";

export async function POST() {
  try {
    const result = await extractCookiesForPlatform("TWITTER");

    if (result.cookieCount === 0) {
      return NextResponse.json(
        { error: "No Twitter/X cookies found. Make sure you are logged in." },
        { status: 400 }
      );
    }

    await saveCookiesForPlatform("TWITTER", result.cookies);

    const existing = await prisma.connectorState.findFirst({
      where: { platform: "TWITTER", userId: "default" },
    });

    if (existing) {
      await prisma.connectorState.update({
        where: { id: existing.id },
        data: {
          accessToken: result.cookies,
          syncStatus: "idle",
          lastSyncAt: new Date(),
          errorCount: 0,
          lastError: null,
        },
      });
    } else {
      await prisma.connectorState.create({
        data: {
          platform: "TWITTER",
          accessToken: result.cookies,
          syncStatus: "idle",
          userId: "default",
        },
      });
    }

    return NextResponse.json({
      success: true,
      cookieCount: result.cookieCount,
      domains: result.domains,
      message: `Extracted ${result.cookieCount} Twitter cookies from ${result.domains.length} domains`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract cookies" },
      { status: 500 }
    );
  }
}
