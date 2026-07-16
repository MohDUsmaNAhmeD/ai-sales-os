"use client";

import { useEffect, useState } from "react";
import { cn, apiRequest } from "@/lib/utils";
import type { HealthData, JobData } from "@ai-sales-os/shared";

export function MonitoringPage() {
  const [health, setHealth] = useState<HealthData[]>([]);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [healthData, jobsData] = await Promise.all([
          apiRequest<{ health: HealthData[] }>("/monitoring/health").catch(() => ({ health: [] })),
          apiRequest<{ jobs: JobData[] }>("/monitoring/jobs").catch(() => ({ jobs: [] })),
        ]);
        setHealth(healthData.health);
        setJobs(jobsData.jobs);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const components = [
    { name: "API Server", icon: "🌐" },
    { name: "Worker Pool", icon: "⚙️" },
    { name: "Browser Engine", icon: "🌍" },
    { name: "AI Service", icon: "🤖" },
    { name: "Message Queue", icon: "📨" },
    { name: "Database", icon: "🗄️" },
  ];

  const getHealth = (name: string) =>
    health.find((h) => h.component === name);

  return (
    <div className="page-shell">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
        <p className="text-sm text-gray-500">Real-time system health and job status</p>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {components.map((comp) => {
            const h = getHealth(comp.name);
            return (
              <div key={comp.name} className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{comp.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{comp.name}</h3>
                      <p className="text-xs text-gray-500">
                        {h ? `Checked ${new Date(h.checkedAt).toLocaleTimeString()}` : "No data"}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "badge",
                    h?.status === "healthy" ? "badge-green" :
                    h?.status === "degraded" ? "badge-yellow" :
                    "badge-gray"
                  )}>
                    {h?.status || "Unknown"}
                  </span>
                </div>

                {h && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {h.cpuUsage != null && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">CPU</p>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                          <div
                            className={cn(
                              "h-1.5 rounded-full",
                              h.cpuUsage > 80 ? "bg-red-500" : h.cpuUsage > 50 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${h.cpuUsage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{h.cpuUsage.toFixed(1)}%</p>
                      </div>
                    )}
                    {h.memoryUsage != null && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Memory</p>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                          <div
                            className={cn(
                              "h-1.5 rounded-full",
                              h.memoryUsage > 80 ? "bg-red-500" : h.memoryUsage > 50 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${h.memoryUsage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{h.memoryUsage.toFixed(1)}%</p>
                      </div>
                    )}
                    {h.activeJobs != null && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Active Jobs</p>
                        <p className="text-lg font-bold text-gray-900">{h.activeJobs}</p>
                      </div>
                    )}
                    {h.queueDepth != null && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Queue Depth</p>
                        <p className="text-lg font-bold text-gray-900">{h.queueDepth}</p>
                      </div>
                    )}
                    {h.errorRate != null && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Error Rate</p>
                        <p className={cn("text-lg font-bold", h.errorRate > 5 ? "text-red-600" : "text-gray-900")}>
                          {h.errorRate.toFixed(1)}%
                        </p>
                      </div>
                    )}
                    {h.responseTimeMs != null && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Response</p>
                        <p className="text-lg font-bold text-gray-900">{h.responseTimeMs.toFixed(0)}ms</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Jobs</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 w-64 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-500">No recent jobs</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{job.type}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "badge text-[10px]",
                        job.status === "COMPLETED" && "badge-green",
                        job.status === "RUNNING" && "badge-blue",
                        job.status === "FAILED" && "badge-red",
                        job.status === "PENDING" && "badge-yellow",
                        job.status === "RETRYING" && "badge-yellow",
                      )}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {job.attempts}/{job.maxAttempts}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
