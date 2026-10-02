"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Crosshair,
  FileOutput,
  GitCompareArrows,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav: Array<{ href: string; label: string; icon: LucideIcon; note: string }> = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, note: "Case overview" },
  { href: "/diff", label: "Intelligence diff", icon: GitCompareArrows, note: "26 → 34 mappings" },
  { href: "/evidence", label: "Evidence explorer", icon: Search, note: "60 findings" },
  { href: "/detections", label: "Detection coverage", icon: ShieldCheck, note: "15 public Sigma rules" },
  { href: "/hunts", label: "Hunt planner", icon: Crosshair, note: "5 hypotheses" },
  { href: "/reports", label: "Reports", icon: FileOutput, note: "Markdown / JSON" },
];

const sectionNames: Record<string, string> = {
  "/": "Dashboard",
  "/diff": "Intelligence diff",
  "/evidence": "Evidence explorer",
  "/detections": "Detection coverage",
  "/hunts": "Hunt planner",
  "/reports": "Reports",
  "/method": "Method & sources",
};

function CaseCard() {
  return (
    <div className="border border-sidebar-line bg-white/[0.03] px-3 py-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-sidebar-muted">Active case</p>
      <p className="mt-2 font-display text-[22px] leading-none tracking-[-0.02em] text-paper">
        LockBit, <span className="text-rust">2.0 → 3.0</span>
      </p>
      <p className="mt-2 text-[11px] leading-4 text-sidebar-muted">
        26 baseline mappings · 34 target mappings · cut-off 14 Jun 2023
      </p>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="mt-6 space-y-0.5" aria-label="Main navigation">
      {nav.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 border-l-2 px-3 py-2.5 transition-colors duration-150",
              active
                ? "border-rust bg-white/[0.055] text-paper"
                : "border-transparent text-sidebar-text hover:border-sidebar-line hover:bg-white/[0.03] hover:text-paper",
            )}
          >
            <Icon className={cn("size-[15px] shrink-0", active ? "text-rust" : "text-sidebar-muted")} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium leading-4">{item.label}</span>
              <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.08em] text-sidebar-muted">
                {item.note}
              </span>
            </span>
          </Link>
        );
      })}
      <Link
        href="/method"
        onClick={onNavigate}
        className={cn(
          "mt-4 flex items-center gap-3 border-l-2 px-3 py-2.5 text-[12px] transition-colors",
          pathname === "/method"
            ? "border-rust bg-white/[0.055] text-paper"
            : "border-transparent text-sidebar-muted hover:bg-white/[0.03] hover:text-paper",
        )}
      >
        <BookOpen className="size-[15px]" aria-hidden />
        Method & sources
      </Link>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const section = sectionNames[pathname] ?? "Case";

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-sidebar-line bg-sidebar px-4 py-5 lg:flex">
        <Link href="/" className="flex items-center gap-3 px-1">
          <span className="grid size-9 place-items-center border border-sidebar-line font-display text-[24px] leading-none text-rust">
            Δ
          </span>
          <span>
            <span className="block font-display text-[25px] leading-none tracking-[-0.02em] text-paper">ThreatDelta</span>
            <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-sidebar-muted">
              CTI analysis workbench
            </span>
          </span>
        </Link>

        <div className="mt-7">
          <CaseCard />
        </div>
        <NavLinks />
        <div className="mt-auto border-t border-sidebar-line pt-4">
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-sidebar-muted">
            <span>ATT&CK v18</span>
            <span>Local JSON</span>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-sidebar-muted">
            Public-source analysis. No telemetry, credentials or live customer data.
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-sidebar-line bg-sidebar px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center border border-sidebar-line font-display text-lg leading-none text-rust">Δ</span>
          <span className="font-display text-xl leading-none text-paper">ThreatDelta</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="grid size-8 place-items-center border border-sidebar-line text-sidebar-text hover:text-paper"
        >
          <Menu className="size-4" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/55"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-[85%] max-w-[320px] flex-col border-r border-sidebar-line bg-sidebar px-4 py-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center border border-sidebar-line font-display text-xl leading-none text-rust">Δ</span>
                <span className="font-display text-2xl leading-none text-paper">ThreatDelta</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="grid size-8 place-items-center border border-sidebar-line text-sidebar-text hover:text-paper"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-6">
              <CaseCard />
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-sidebar-line pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-sidebar-muted">
              ATT&CK v18 · Local JSON
            </div>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[264px]">
        <div className="sticky top-0 z-10 hidden h-12 items-center justify-between border-b border-line bg-paper/92 px-8 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            <span>Case</span>
            <span className="text-line-strong">/</span>
            <span>LockBit lineage</span>
            <span className="text-line-strong">/</span>
            <span className="text-ink">{section}</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            <span>Snapshot 14 Jun 2023</span>
            <span className="h-3 w-px bg-line-strong" />
            <span>ATT&CK v18</span>
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-7 lg:px-9 lg:py-10">{children}</main>

        <footer className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 border-t border-line px-4 py-5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-9">
          <span>ThreatDelta · documentation is not adoption</span>
          <span>Public sources only · local JSON data</span>
        </footer>
      </div>
    </div>
  );
}
