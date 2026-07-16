import { NextResponse } from "next/server";
import { extractLinkedInCookies, saveLinkedInCookies } from "@ai-sales-os/shared";
import { prisma } from "@ai-sales-os/db";

export async function POST() {
  try {
    const result = await extractLinkedInCookies();

    if (result.cookieCount === 0) {
      return NextResponse.json(
        { error: "No LinkedIn cookies found. Navigate to linkedin.com in the browser and log in, then try again." },
        { status: 400 }
      );
    }

    // Save cookies to file for the worker
    await saveLinkedInCookies(result.cookies);

    // Also save to ConnectorState in DB
    const existing = await prisma.connectorState.findFirst({
      where: { platform: "LINKEDIN", userId: "default" },
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
          platform: "LINKEDIN",
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
      message: `Extracted ${result.cookieCount} LinkedIn cookies from ${result.domains.length} domains`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract cookies" },
      { status: 500 }
    );
  }
}
