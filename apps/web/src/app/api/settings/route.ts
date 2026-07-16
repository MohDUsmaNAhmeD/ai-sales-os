import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@ai-sales-os/db";

export async function GET() {
  try {
    let settings = await prisma.userSettings.findFirst();
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: "default" },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    let settings = await prisma.userSettings.findFirst();
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: "default" },
      });
    }

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(body.mistralKey !== undefined && { mistralKey: body.mistralKey }),
        ...(body.defaultModel && { defaultModel: body.defaultModel }),
        ...(body.timezone && { timezone: body.timezone }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(await handleApiError(error), { status: 500 });
  }
}
