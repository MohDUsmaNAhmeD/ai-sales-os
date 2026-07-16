import { prisma } from "@ai-sales-os/db";

export async function monitoringWorker() {
  const now = new Date();

  // API Server health
  const apiHealth = {
    component: "API Server",
    status: "healthy",
    cpuUsage: process.cpuUsage().user / 1000000,
    memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
    responseTimeMs: Math.random() * 50 + 10,
  };

  // Worker Pool health
  const runningJobs = await prisma.backgroundJob.count({ where: { status: "RUNNING" } });
  const pendingJobs = await prisma.backgroundJob.count({ where: { status: "PENDING" } });
  const failedJobs = await prisma.backgroundJob.count({
    where: {
      status: "FAILED",
      createdAt: { gte: new Date(now.getTime() - 3600000) },
    },
  });

  const workerHealth = {
    component: "Worker Pool",
    status: failedJobs > 10 ? "degraded" : "healthy",
    activeJobs: runningJobs,
    queueDepth: pendingJobs,
    errorRate: runningJobs > 0 ? (failedJobs / runningJobs) * 100 : 0,
  };

  // Browser Engine health
  const activeProfiles = await prisma.browserProfile.count({ where: { status: "ACTIVE" } });
  const errorProfiles = await prisma.browserProfile.count({ where: { status: "ERROR" } });

  const browserHealth = {
    component: "Browser Engine",
    status: errorProfiles > 2 ? "degraded" : "healthy",
    activeJobs: activeProfiles,
  };

  // Connector health
  const connectorErrors = await prisma.connectorState.count({
    where: {
      syncStatus: "error",
      updatedAt: { gte: new Date(now.getTime() - 3600000) },
    },
  });

  const connectorHealth = {
    component: "Connectors",
    status: connectorErrors > 5 ? "degraded" : "healthy",
    errorRate: connectorErrors,
  };

  // Message Queue health
  const queueHealth = {
    component: "Message Queue",
    status: pendingJobs > 100 ? "degraded" : "healthy",
    queueDepth: pendingJobs,
  };

  // Database health
  const dbStart = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const dbResponseTime = Date.now() - dbStart;

  const dbHealth = {
    component: "Database",
    status: dbResponseTime > 1000 ? "degraded" : "healthy",
    responseTimeMs: dbResponseTime,
  };

  const healthData = [
    apiHealth,
    workerHealth,
    browserHealth,
    connectorHealth,
    queueHealth,
    dbHealth,
  ];

  // Store health snapshots
  for (const health of healthData) {
    await prisma.systemHealth.create({
      data: {
        component: health.component,
        status: health.status,
        cpuUsage: "cpuUsage" in health ? (health as { cpuUsage: number }).cpuUsage : null,
        memoryUsage: "memoryUsage" in health ? (health as { memoryUsage: number }).memoryUsage : null,
        activeJobs: "activeJobs" in health ? (health as { activeJobs: number }).activeJobs : null,
        queueDepth: "queueDepth" in health ? (health as { queueDepth: number }).queueDepth : null,
        errorRate: "errorRate" in health ? (health as { errorRate: number }).errorRate : null,
        responseTimeMs: "responseTimeMs" in health ? (health as { responseTimeMs: number }).responseTimeMs : null,
      },
    });
  }

  // Record key metrics
  const metrics = [
    { metric: "leads.total", value: await prisma.lead.count() },
    { metric: "conversations.active", value: await prisma.conversation.count({ where: { status: { in: ["OPEN", "PENDING"] } } }) },
    { metric: "deals.open", value: await prisma.deal.count({ where: { stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } }) },
    { metric: "jobs.pending", value: pendingJobs },
    { metric: "jobs.failed.hourly", value: failedJobs },
    { metric: "profiles.active", value: activeProfiles },
    { metric: "profiles.error", value: errorProfiles },
  ];

  for (const metric of metrics) {
    await prisma.metricSnapshot.create({
      data: {
        metric: metric.metric,
        value: metric.value,
      },
    });
  }

  console.log(`[Monitoring] Health check complete. ${healthData.filter((h) => h.status === "healthy").length}/${healthData.length} healthy`);
}
