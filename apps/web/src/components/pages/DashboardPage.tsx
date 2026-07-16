"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, formatCurrency, timeAgo } from "@/lib/utils";
import type { DashboardStats } from "@ai-sales-os/shared";

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch(() => {
        setStats({
          totalLeads: 0,
          newLeadsThisWeek: 0,
          activeConversations: 0,
          openDeals: 0,
          dealValue: 0,
          responseRate: 0,
          avgResponseTime: 0,
          conversionRate: 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Leads",
      value: stats?.totalLeads ?? 0,
      change: `+${stats?.newLeadsThisWeek ?? 0} this week`,
      icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Active Conversations",
      value: stats?.activeConversations ?? 0,
      change: "Open threads",
      icon: "M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z",
      color: "bg-green-500",
      bgColor: "bg-green-50",
    },
    {
      label: "Open Deals",
      value: stats?.openDeals ?? 0,
      change: formatCurrency(stats?.dealValue ?? 0) + " total value",
      icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      label: "Conversion Rate",
      value: `${stats?.conversionRate ?? 0}%`,
      change: `${stats?.responseRate ?? 0}% response rate`,
      icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
      color: "bg-amber-500",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your AI Sales OS at a glance</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                <svg className={`h-6 w-6 ${card.color.replace("bg-", "text-")}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">{card.change}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pipeline Overview</h3>
            <Link href="/crm" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {[
              { stage: "Qualification", color: "#6366f1" },
              { stage: "Proposal", color: "#a855f7" },
              { stage: "Negotiation", color: "#d946ef" },
              { stage: "Closed Won", color: "#22c55e" },
            ].map((s, i) => (
              <div key={s.stage} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="w-32 text-sm text-gray-600">{s.stage}</span>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(10, 90 - i * 22)}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right text-sm font-medium text-gray-900">
                  {Math.max(1, 12 - i * 3)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/leads" className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Discover Leads</div>
                <div className="text-xs text-gray-500">Find new prospects</div>
              </div>
            </Link>
            <Link href="/inbox" className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Open Inbox</div>
                <div className="text-xs text-gray-500">View conversations</div>
              </div>
            </Link>
            <Link href="/crm" className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">View Pipeline</div>
                <div className="text-xs text-gray-500">Manage deals</div>
              </div>
            </Link>
            <Link href="/campaigns" className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Campaigns</div>
                <div className="text-xs text-gray-500">Outreach at scale</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <Link href="/monitoring" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</Link>
        </div>
        <div className="space-y-3">
          {[
            { icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", text: "New lead discovered via LinkedIn", time: "2 hours ago", color: "bg-blue-100 text-blue-600" },
            { icon: "M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z", text: "AI drafted reply for conversation", time: "3 hours ago", color: "bg-green-100 text-green-600" },
            { icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941", text: "Deal moved to Proposal stage", time: "5 hours ago", color: "bg-purple-100 text-purple-600" },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${activity.color}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={activity.icon} />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.text}</p>
              </div>
              <span className="text-xs text-gray-400">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
