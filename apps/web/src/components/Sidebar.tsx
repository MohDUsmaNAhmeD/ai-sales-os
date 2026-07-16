"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  ["Overview", "/", "M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"],
  ["Leads", "/leads", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87m-2-12a4 4 0 0 1 0 7.75"],
  ["Inbox", "/inbox", "M4 4h16v16H4V4Zm0 10h4l2 3h4l2-3h4"],
  ["Pipeline", "/crm", "M4 5h16M4 12h10M4 19h6"],
  ["Campaigns", "/campaigns", "M3 11v2h3l7 5V6l-7 5H3Zm10-2h4a4 4 0 0 1 0 8h-4"],
  ["Browsers", "/browsers", "M3 5h18v14H3V5Zm0 4h18M7 7h.01M10 7h.01"],
  ["Monitoring", "/monitoring", "M3 12h4l2-7 4 14 2-7h6"],
  ["Settings", "/settings", "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.8 3h-4l-.4 2.9a8 8 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2.2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 2.9h4l.4-2.9a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"],
] as const;

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <>
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">OS</div>
      <div><p className="font-semibold tracking-tight text-white">Sales OS</p><p className="text-xs text-slate-400">AI revenue workspace</p></div>
    </div>
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary navigation">
      <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[.16em] text-slate-500">Workspace</p>
      {navigation.map(([name, href, path]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return <Link key={href} href={href} onClick={onNavigate} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
          <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path}/></svg>{name}
        </Link>;
      })}
    </nav>
    <div className="border-t border-white/10 p-4"><div className="rounded-xl bg-white/5 p-3"><p className="text-xs font-medium text-white">System ready</p><p className="mt-1 text-xs leading-5 text-slate-400">Camoufox profiles stay isolated and persistent.</p></div></div>
  </>;
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return <>
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:hidden">
      <Link href="/" className="flex items-center gap-2 font-semibold"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs text-primary-foreground">OS</span>Sales OS</Link>
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border p-2 text-foreground" aria-label="Open navigation"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </header>
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar md:flex"><NavContent /></aside>
    {open && <div className="fixed inset-0 z-50 md:hidden"><button className="absolute inset-0 bg-sidebar/70" onClick={() => setOpen(false)} aria-label="Close navigation"/><aside className="relative flex h-full w-72 flex-col bg-sidebar shadow-2xl"><button onClick={() => setOpen(false)} className="absolute right-4 top-5 rounded-lg p-2 text-slate-300" aria-label="Close navigation"><svg className="size-5" viewBox="0 0 24 24" stroke="currentColor"><path d="m6 6 12 12M18 6 6 18"/></svg></button><NavContent onNavigate={() => setOpen(false)}/></aside></div>}
  </>;
}
