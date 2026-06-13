import { ArrowUpRight } from "lucide-react";
import { Dot } from "./ui";
import { cn } from "@/lib/utils";
import type { ChangeKind, Confidence, CoverageStatus, SourceKind } from "@/lib/types";

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: Confidence;
  className?: string;
}) {
  const map = {
    high: { label: "high", color: "text-olive" },
    medium: { label: "medium", color: "text-amber" },
    low: { label: "low", color: "text-muted" },
  } as const;
  const item = map[confidence];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", item.color, className)}>
      <Dot />
      {item.label}
    </span>
  );
}

export function CoverageBadge({
  status,
  className,
}: {
  status: CoverageStatus;
  className?: string;
}) {
  const map = {
    direct: { label: "direct", tone: "border-olive/25 bg-olive-soft text-olive" },
    broad: { label: "parent tag", tone: "border-amber/30 bg-amber-soft text-amber" },
    gap: { label: "no rule", tone: "border-rust/25 bg-rust-soft text-rust" },
  } as const;
  const item = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase leading-4 tracking-[0.08em]",
        item.tone,
        className,
      )}
    >
      {item.label}
    </span>
  );
}

export function ChangeBadge({
  kind,
  className,
}: {
  kind: ChangeKind;
  className?: string;
}) {
  const map = {
    new: { label: "new", tone: "border-rust/25 bg-rust-soft text-rust" },
    refined: { label: "refined", tone: "border-amber/30 bg-amber-soft text-amber" },
    shared: { label: "shared", tone: "border-olive/25 bg-olive-soft text-olive" },
    "not-redocumented": { label: "not re-doc", tone: "border-line bg-paper-deep text-muted" },
  } as const;
  const item = map[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase leading-4 tracking-[0.08em]",
        item.tone,
        className,
      )}
    >
      {item.label}
    </span>
  );
}

export function SourceKindBadge({ kind }: { kind: SourceKind }) {
  const map: Record<SourceKind, { label: string; tone: string }> = {
    government: { label: "gov", tone: "border-ink/20 bg-ink text-paper" },
    mitre: { label: "att&ck", tone: "border-slate/20 bg-slate-soft text-slate" },
    vendor: { label: "vendor", tone: "border-line bg-paper-deep text-muted" },
    community: { label: "community", tone: "border-line bg-paper-deep text-muted" },
  };
  const item = map[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase leading-4 tracking-[0.08em]",
        item.tone,
      )}
    >
      {item.label}
    </span>
  );
}

export function TechniqueCode({
  id,
  href,
  className,
}: {
  id: string;
  href?: string;
  className?: string;
}) {
  const content = <code className={cn("font-mono text-[11px] font-medium text-ink-soft", className)}>{id}</code>;
  if (!href) return content;
  return (
    <a href={href} target="_blank" rel="noreferrer" title={`Open ${id} on attack.mitre.org`} className="group inline-flex items-center gap-0.5 hover:text-rust">
      {content}
      <ArrowUpRight className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </a>
  );
}
