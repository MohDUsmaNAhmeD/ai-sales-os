import { prisma } from "@ai-sales-os/db";
import { leadDiscoveryWorker } from "./workers/lead-discovery";
import { browserProfileWorker } from "./workers/browser-profile";
import { inboxSyncWorker } from "./workers/inbox-sync";
import { aiWorker } from "./workers/ai-jobs";
import { outreachWorker } from "./workers/outreach";
import { monitoringWorker } from "./workers/monitoring";
import { cleanupWorker } from "./workers/cleanup";

const POLL_INTERVAL = 5000; // 5 seconds

const workerMap: Record<string, (data: Record<string, unknown>) => Promise<void>> = {
  LEAD_DISCOVERY: leadDiscoveryWorker as unknown as (data: Record<string, unknown>) => Promise<void>,
  BROWSER_PROFILE_CREATE: browserProfileWorker as unknown as (data: Record<string, unknown>) => Promise<void>,
  BROWSER_PROFILE_RESET: browserProfileWorker as unknown as (data: Record<string, unknown>) => Promise<void>,
  INBOX_SYNC: inboxSyncWorker as unknown as (data: Record<string, unknown>) => Promise<void>,
  AI_JOB: aiWorker as unknown as (data: Record<string, unknown>) => Promise<void>,
  OUTREACH_SEND: outreachWorker as unknown as (data: Record<string, unknown>) => Promise<void>,
};

async function processPendingJobs() {
  try {
    const pendingJobs = await prisma.backgroundJob.findMany({
      where: {
        status: "PENDING",
        runAt: { lte: new Date() },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 5,
    });

    for (const job of pendingJobs) {
      // Mark as running
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      const workerFn = workerMap[job.type];
      if (!workerFn) {
        console.warn(`Unknown job type: ${job.type}`);
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: { status: "FAILED", error: `Unknown job type: ${job.type}` },
        });
        continue;
      }

      try {
        const payload = typeof job.payload === "string"
          ? JSON.parse(job.payload)
          : job.payload;

        await workerFn({ ...payload, jobId: job.id });

        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        const attempts = job.attempts + 1;
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: attempts >= job.maxAttempts ? "FAILED" : "PENDING",
            attempts,
            error: error instanceof Error ? error.message : "Unknown error",
            runAt: new Date(Date.now() + attempts * 5000),
          },
        });
      }
    }
  } catch (error) {
    console.error("Job poll error:", error);
  }
}

async function runScheduledTasks() {
  // Run monitoring every 30 seconds
  setInterval(async () => {
    try {
      await monitoringWorker();
    } catch (error) {
      console.error("Monitoring error:", error);
    }
  }, 30000);

  // Run cleanup every hour
  setInterval(async () => {
    try {
      await cleanupWorker();
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }, 3600000);

  // Run inbox sync every minute
  setInterval(async () => {
    try {
      await inboxSyncWorker({});
    } catch (error) {
      console.error("Inbox sync error:", error);
    }
  }, 60000);
}

async function main() {
  console.log("Starting AI Sales OS Workers (database-polling mode)...");

  // Run initial monitoring
  try {
    await monitoringWorker();
    console.log("Initial health check complete");
  } catch (error) {
    console.error("Initial health check failed:", error);
  }

  // Start scheduled tasks
  await runScheduledTasks();

  // Start polling for jobs
  setInterval(processPendingJobs, POLL_INTERVAL);
  processPendingJobs();

  console.log("All workers started successfully!");
  console.log(`Polling for jobs every ${POLL_INTERVAL / 1000}s`);
  console.log("Scheduled: monitoring (30s), cleanup (1h), inbox-sync (1m)");
}

main().catch(console.error);
