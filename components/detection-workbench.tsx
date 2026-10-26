"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { Badge, Empty, Input, SectionLabel, Select } from "./ui";
import { CoverageBadge } from "./signals";
import { TechniqueCell } from "./technique-meta";
import type { CaseFile, CoverageResult, SigmaRule } from "@/lib/types";
import { cn, matchesQuery } from "@/lib/utils";

const levelTone: Record<SigmaRule["level"], "rust" | "amber" | "neutral"> = {
  critical: "rust",
  high: "rust",
  medium: "amber",
  low: "neutral",
};

function RuleCard({ rule }: { rule: SigmaRule }) {
  return (
    <article className="border border-line bg-surface px-2 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={levelTone[rule.level]}>{rule.level}</Badge>
            <Badge tone="neutral">{rule.status}</Badge>
          </div>
          <h3 className="mt-1.5 text-[12px] font-medium leading-4 text-ink">{rule.title}</h3>
        </div>
        <a
          href={rule.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 shrink-0 text-muted hover:text-rust"
          aria-label={`Open ${rule.title} on SigmaHQ`}
        >
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-muted">{rule.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-2">
        <span className="font-mono text-[8px] uppercase tracking-[0.04em] text-muted">{rule.logsource}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {rule.techniqueIds.map((id) => (
          <span key={id} className="border border-line bg-paper-deep/50 px-1 py-0.5 font-mono text-[8px] text-muted">{id}</span>
        ))}
        <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.04em] text-muted">{rule.license}</span>
      </div>
    </article>
  );
}

export function DetectionWorkbench({
  caseFile,
  coverageBySnapshot,
  sigmaRules,
  initialSnapshotId,
}: {
  caseFile: CaseFile;
  coverageBySnapshot: Record<string, CoverageResult>;
  sigmaRules: SigmaRule[];
  initialSnapshotId?: string;
}) {
  const [snapshotId, setSnapshotId] = useState(
    caseFile.snapshots.some((snapshot) => snapshot.id === initialSnapshotId)
      ? initialSnapshotId!
      : caseFile.snapshots[1]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"coverage" | "rules">("coverage");

  const coverage = coverageBySnapshot[snapshotId] ?? coverageBySnapshot[caseFile.snapshots[1]?.id];

  const filtered = useMemo(
    () =>
      coverage.techniques.filter((item) => {
        if (status !== "all" && item.status !== status) return false;
        if (!query.trim()) return true;
        const ruleText = item.matches.map((match) => `${match.rule.title} ${match.rule.level}`).join(" ");
        return matchesQuery([item.technique.id, item.technique.name, ruleText], query);
      }),
    [coverage, query, status],
  );

  return (
    <div>
      <div className="flex flex-col gap-4 border border-line bg-surface px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <SectionLabel>Snapshot</SectionLabel>
          <div className="mt-2 inline-flex border border-line">
            {caseFile.snapshots.map((snapshot) => (
              <button
                key={snapshot.id}
                type="button"
                onClick={() => setSnapshotId(snapshot.id)}
                aria-pressed={snapshotId === snapshot.id}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-medium transition-colors",
                  snapshotId === snapshot.id ? "bg-ink text-paper" : "bg-surface text-muted hover:bg-paper-deep/60 hover:text-ink",
                )}
              >
                {snapshot.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
          <span><span className="text-olive">{coverage.summary.direct}</span> direct</span>
          <span><span className="text-amber">{coverage.summary.broad}</span> parent-tagged</span>
          <span><span className="text-rust">{coverage.summary.gap}</span> no rule</span>
          <span className="h-4 w-px bg-line-strong" />
          <span className="text-ink">{coverage.summary.percent}% exact coverage</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-l-2 border-amber/50 bg-amber-soft/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-[11px] leading-4 text-ink-soft">
          <span className="font-medium">This is a catalogue check, not your detection stack.</span> If a rule is not here, it does not mean you are blind. Parent-tagged rules are shown for review, not counted as exact coverage. Gaps first.
        </p>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">{sigmaRules.length} SigmaHQ rules</span>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-0">
          <button
            type="button"
            onClick={() => setView("coverage")}
            className={cn(
              "-mb-[13px] border-b-2 px-3 py-2 text-[12px] font-medium",
              view === "coverage" ? "border-rust text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            Coverage by technique <span className="ml-1 font-mono text-[9px] text-muted">{coverage.summary.total}</span>
          </button>
          <button
            type="button"
            onClick={() => setView("rules")}
            className={cn(
              "-mb-[13px] border-b-2 px-3 py-2 text-[12px] font-medium",
              view === "rules" ? "border-rust text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            Rule catalogue <span className="ml-1 font-mono text-[9px] text-muted">{sigmaRules.length}</span>
          </button>
        </div>

        {view === "coverage" ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Search techniques or rules</span>
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search technique or rule"
                className="h-8 w-[220px] pl-8 text-xs"
              />
            </label>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="h-8" aria-label="Filter coverage status">
              <option value="all">All statuses</option>
              <option value="direct">Direct rule</option>
              <option value="broad">Parent-tagged</option>
              <option value="gap">No rule</option>
            </Select>
          </div>
        ) : (
          <p className="text-[10px] text-muted">SigmaHQ metadata · source links open the original YAML</p>
        )}
      </div>

      {view === "rules" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sigmaRules.map((rule) => <RuleCard key={rule.id} rule={rule} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4"><Empty>No techniques match this filter.</Empty></div>
      ) : (
        <div className="mt-4 border border-line bg-surface">
          <div className="hidden grid-cols-[minmax(0,1.25fr)_86px_minmax(0,1.6fr)] gap-4 border-b border-line bg-paper-deep/40 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted md:grid">
            <span>Technique</span>
            <span>Coverage</span>
            <span>Matching rules</span>
          </div>
          {filtered.map((item) => (
            <div key={item.technique.id} className="grid gap-2 border-b border-line px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.25fr)_86px_minmax(0,1.6fr)] md:items-start md:gap-4">
              <TechniqueCell technique={item.technique} />
              <div className="flex items-center gap-2 md:pt-0.5">
                <CoverageBadge status={item.status} />
              </div>
              <div>
                {item.matches.length > 0 ? (
                  <div className="space-y-1.5">
                    {item.matches.map((match) => (
                      <a
                        key={match.rule.id}
                        href={match.rule.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-2 text-[11px] leading-4 text-ink-soft hover:text-rust"
                      >
                        <span className="mt-0.5 size-1 shrink-0 rounded-full bg-current" />
                        <span className="flex-1">
                          {match.rule.title}
                          <span className="ml-2 font-mono text-[8px] uppercase tracking-[0.04em] text-muted">
                            {match.match === "exact" ? "exact tag" : "parent tag"}
                          </span>
                        </span>
                        <ArrowUpRight className="mt-0.5 size-3 shrink-0 text-line-strong group-hover:text-rust" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] leading-4 text-muted">Nothing in this catalogue.</p>
                    {item.related.length > 0 ? (
                      <p className="mt-1 text-[10px] leading-4 text-amber">
                        {item.related.length} sub-technique-only rule{item.related.length === 1 ? "" : "s"} related but not counted.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 border-t border-line pt-5 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <SectionLabel>How matching works</SectionLabel>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-muted">
            Exact rule tags count as coverage. A rule tagged with a parent technique is shown as parent-tagged and requires review. A rule tagged only with a sub-technique is related but cannot cover the whole parent. The catalogue is a deliberately small sample of real public SigmaHQ rules, not an inventory of any organisation&apos;s detections.
          </p>
        </div>
        <div className="flex items-start gap-3 border border-line bg-paper-deep/30 px-4 py-3">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-muted" />
          <div>
            <p className="text-[11px] font-medium text-ink">SigmaHQ attribution</p>
            <p className="mt-1 text-[10px] leading-4 text-muted">
              Rule titles, IDs, tags and source links are reproduced from the public SigmaHQ repository. Rule text remains under the Detection Rule License 1.1.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
