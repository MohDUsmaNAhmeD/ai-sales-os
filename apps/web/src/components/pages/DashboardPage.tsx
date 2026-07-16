"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@ai-sales-os/shared";

const icons = {
  leads: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  inbox: "M4 4h16v16H4V4Zm0 10h4l2 3h4l2-3h4",
  deals: "M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  rate: "m4 17 5-5 4 4 7-9m-5 0h5v5",
};

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiRequest<DashboardStats>("/dashboard/stats").then(setStats).catch(() => setStats(null)).finally(() => setLoading(false)); }, []);

  const cards = [
    ["Total leads", String(stats?.totalLeads ?? 0), `+${stats?.newLeadsThisWeek ?? 0} this week`, icons.leads],
    ["Active conversations", String(stats?.activeConversations ?? 0), "Across every connected channel", icons.inbox],
    ["Pipeline value", formatCurrency(stats?.dealValue ?? 0), `${stats?.openDeals ?? 0} open deals`, icons.deals],
    ["Conversion rate", `${stats?.conversionRate ?? 0}%`, `${stats?.responseRate ?? 0}% response rate`, icons.rate],
  ];

  return <div className="page-shell flex flex-col gap-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">Revenue command center</p><h1 className="page-title">Good morning. Here&apos;s your pipeline.</h1><p className="page-description">Track prospects, conversations, and browser automation from one workspace.</p></div>
      <div className="flex gap-2"><Link href="/inbox" className="btn-secondary">Open inbox</Link><Link href="/leads" className="btn-primary">Discover leads</Link></div>
    </header>

    <section aria-label="Sales performance" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, helper, path]) => <article key={label} className="card p-5">
        <div className="flex items-start justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg></span></div>
        {loading ? <div className="mt-5 h-9 w-24 animate-pulse rounded bg-muted"/> : <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
      </article>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <article className="card p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Pipeline momentum</h2><p className="mt-1 text-sm text-muted-foreground">Current distribution by sales stage</p></div><Link href="/crm" className="text-sm font-semibold text-primary">View pipeline</Link></div>
        <div className="mt-7 flex flex-col gap-5">{[["Qualification",78],["Needs analysis",62],["Proposal",46],["Negotiation",29]].map(([stage,width]) => <div key={stage as string} className="flex items-center gap-4"><span className="w-28 text-sm text-muted-foreground">{stage}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${width}%`}}/></div><span className="w-8 text-right text-sm font-semibold">{Math.round(Number(width)/7)}</span></div>)}</div>
      </article>
      <article className="card p-5 sm:p-6"><h2 className="font-semibold">Next best actions</h2><p className="mt-1 text-sm text-muted-foreground">Keep your revenue motion moving.</p><div className="mt-5 flex flex-col gap-2">{[["Review new prospects","Score and qualify recently discovered leads","/leads"],["Clear open replies","Respond while buying intent is high","/inbox"],["Check browser health","Keep authenticated sessions ready","/browsers"]].map(([title,description,href], i) => <Link href={href} key={title} className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">{i+1}</span><span className="min-w-0"><span className="block text-sm font-semibold">{title}</span><span className="block truncate text-xs text-muted-foreground">{description}</span></span><span className="ml-auto text-muted-foreground">→</span></Link>)}</div></article>
    </section>

    <section className="rounded-xl bg-sidebar p-6 text-white sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-300">Camoufox runtime</p><h2 className="mt-2 text-xl font-semibold">Persistent profiles. Cleaner automation.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Each platform runs in its own authenticated Firefox profile so inbox sync and discovery can reuse sessions safely.</p></div><Link href="/browsers" className="btn-primary shrink-0">Manage browsers</Link></div></section>
  </div>;
}
