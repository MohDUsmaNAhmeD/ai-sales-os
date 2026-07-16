import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET() {
  try {
    const connectors = await prisma.connectorState.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ connectors });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, accessToken, refreshToken } = body;

    let cookieString = accessToken || "";

    if (cookieString.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(cookieString);
        if (Array.isArray(parsed)) {
          cookieString = parsed
            .filter((c: any) => c.name && c.value)
            .map((c: any) => `${c.name}=${c.value}`)
            .join("; ");
        }
      } catch {}
    }

    const connector = await prisma.connectorState.upsert({
      where: { platform_userId: { platform, userId: "default" } },
      update: {
        accessToken: cookieString || null,
        refreshToken: refreshToken || null,
        syncStatus: "idle",
        errorCount: 0,
      },
      create: {
        platform,
        userId: "default",
        accessToken: cookieString || null,
        refreshToken: refreshToken || null,
      },
    });

    return NextResponse.json(connector, { status: 201 });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    }

    await prisma.connectorState.deleteMany({
      where: { platform: platform as never, userId: "default" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
