import { NextResponse } from "next/server";
import { prisma } from "@ai-sales-os/db";

export async function GET() {
  try {
    const jobs = await prisma.backgroundJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Jobs fetch failed:", error);
    return NextResponse.json({ jobs: [] }, { status: 500 });
  }
}
