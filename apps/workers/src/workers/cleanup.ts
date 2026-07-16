import { prisma } from "@ai-sales-os/db";

export async function cleanupWorker() {
  console.log("[Cleanup] Starting cleanup job");

  const now = new Date();

  // Clean up old metric snapshots (keep 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const deletedMetrics = await prisma.metricSnapshot.deleteMany({
    where: { recordedAt: { lt: sevenDaysAgo } },
  });
  console.log(`[Cleanup] Deleted ${deletedMetrics.count} old metric snapshots`);

  // Clean up old health records (keep 24 hours)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const deletedHealth = await prisma.systemHealth.deleteMany({
    where: { checkedAt: { lt: twentyFourHoursAgo } },
  });
  console.log(`[Cleanup] Deleted ${deletedHealth.count} old health records`);

  // Clean up completed jobs older than 7 days
  const deletedJobs = await prisma.backgroundJob.deleteMany({
    where: {
      status: { in: ["COMPLETED", "FAILED", "CANCELLED"] },
      createdAt: { lt: sevenDaysAgo },
    },
  });
  console.log(`[Cleanup] Deleted ${deletedJobs.count} old background jobs`);

  // Clean up old analytics events (keep 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const deletedEvents = await prisma.analyticsEvent.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } },
  });
  console.log(`[Cleanup] Deleted ${deletedEvents.count} old analytics events`);

  // Reset stuck jobs (running for more than 30 minutes)
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const stuckJobs = await prisma.backgroundJob.updateMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: thirtyMinutesAgo },
    },
    data: {
      status: "RETRYING",
      error: "Job timed out - reset by cleanup worker",
    },
  });
  console.log(`[Cleanup] Reset ${stuckJobs.count} stuck jobs`);

  // Check for browser profiles with too many crashes
  const crashyProfiles = await prisma.browserProfile.findMany({
    where: { crashCount: { gte: 5 } },
  });

  for (const profile of crashyProfiles) {
    await prisma.browserProfile.update({
      where: { id: profile.id },
      data: { status: "ERROR" },
    });
    console.log(`[Cleanup] Marked profile ${profile.id} as ERROR (too many crashes)`);
  }

  console.log("[Cleanup] Cleanup job completed");
}
