"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, GitCompareArrows, Info, ShieldCheck } from "lucide-react";
import { Badge, ButtonLink, Panel, SectionLabel } from "./ui";
import { ChangeBadge, ConfidenceBadge, CoverageBadge, SourceKindBadge, TechniqueCode } from "./signals";
import { TechniqueCell, TacticLine } from "./technique-meta";
import type {
  CaseFile,
  Comparison,
  Conflict,
  CoverageResult,
  Observation,
  Source,
  TechniqueChange,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type TabId = "added" | "shared" | "dropped" | "conflicts";

function SourceLine({ source }: { source: Source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft hover:text-rust"
    >
      <span className="truncate">{source.publisher}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

function ObservationBlock({
  observation,
  label,
  sources,
}: {
  observation: Observation;
  label: string;
  sources: Source[];
}) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return (
    <div className="border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-deep/40 px-4 py-2.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">{label}</span>
        <ConfidenceBadge confidence={observation.confidence} />
      </div>
      <div className="px-4 py-4">
        <p className="text-[13px] leading-5 text-ink">{observation.claim}</p>
        <p className="mt-3 text-[10px] leading-4 text-muted">{observation.confidenceRationale}</p>
        <div className="mt-4 space-y-3">
          {observation.evidence.map((evidence) => {
            const source = sourceById.get(evidence.sourceId);
            return (
              <div key={evidence.id} className="border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={evidence.kind === "direct" ? "olive" : "neutral"}>{evidence.kind}</Badge>
                  {evidence.citedAs ? <span className="font-mono text-[9px] text-muted">cited as {evidence.citedAs}</span> : null}
                </div>
                <blockquote className="mt-2 border-l border-line-strong pl-3 font-display text-[16px] leading-[1.35] tracking-[-0.01em] text-ink-soft">
                  “{evidence.quote}”
                </blockquote>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-muted">{evidence.locator}</span>
                  {source ? <SourceLine source={source} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CoverageLine({
  techniqueId,
  targetCoverage,
  baselineCoverage,
  snapshot,
}: {
  techniqueId: string;
  targetCoverage: CoverageResult;
  baselineCoverage: CoverageResult;
  snapshot: "baseline" | "target";
}) {
  const source = snapshot === "target" ? targetCoverage : baselineCoverage;
  const item = source.techniques.find((entry) => entry.technique.id === techniqueId);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
        {snapshot === "target" ? "3.0 coverage" : "2.0 coverage"}
      </span>
      {item ? <CoverageBadge status={item.status} /> : <Badge>not observed</Badge>}
      {item?.matches.length ? (
        <span className="truncate text-[10px] text-muted">{item.matches.map((match) => match.rule.title).join(" · ")}</span>
      ) : null}
    </div>
  );
}

function ChangeDetail({
  change,
  sources,
  targetCoverage,
  baselineCoverage,
}: {
  change: TechniqueChange;
  sources: Source[];
  targetCoverage: CoverageResult;
  baselineCoverage: CoverageResult;
}) {
  return (
    <div className="border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TechniqueCode id={change.technique.id} href={change.technique.url} />
            <ChangeBadge kind={change.kind} />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            {change.technique.subtechniqueOf ? `child of ${change.technique.subtechniqueOf}` : "technique"}
          </span>
        </div>
        <h2 className="mt-2 font-display text-[30px] leading-[0.98] tracking-[-0.02em]">{change.technique.name}</h2>
        <TacticLine labels={change.technique.tacticLabels} max={6} className="mt-2" />
        <p className="mt-3 text-[11px] leading-5 text-muted">{change.technique.description}</p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <CoverageLine
            techniqueId={change.techniqueId}
            targetCoverage={targetCoverage}
            baselineCoverage={baselineCoverage}
            snapshot="target"
          />
          {change.kind !== "new" ? (
            <CoverageLine
              techniqueId={change.baselineObservation?.techniqueId ?? change.techniqueId}
              targetCoverage={targetCoverage}
              baselineCoverage={baselineCoverage}
              snapshot="baseline"
            />
          ) : null}
        </div>

        {change.kind === "new" ? (
          <div className="flex gap-2 border border-line bg-paper-deep/40 px-3 py-2.5 text-[11px] leading-4 text-ink-soft">
            <Info className="mt-0.5 size-3.5 shrink-0 text-amber" />
            No matching baseline observation in the ATT&CK software mapping. This is a documentation delta, not proof of adoption.
          </div>
        ) : null}

        {change.kind === "refined" ? (
          <div className="flex gap-2 border border-amber/25 bg-amber-soft/60 px-3 py-2.5 text-[11px] leading-4 text-ink-soft">
            <GitCompareArrows className="mt-0.5 size-3.5 shrink-0 text-amber" />
            This sub-technique refines the shared parent {change.baselineObservation?.techniqueId}; it is not counted as a separate new technique.
          </div>
        ) : null}

        {change.kind === "not-redocumented" ? (
          <div className="flex gap-2 border border-line bg-paper-deep/40 px-3 py-2.5 text-[11px] leading-4 text-ink-soft">
            <Info className="mt-0.5 size-3.5 shrink-0 text-muted" />
            Present in 2.0 but absent from the 3.0 mapping. Absence from a later public mapping is not evidence that the technique was removed.
          </div>
        ) : null}

        <div className="grid gap-4">
          <ObservationBlock observation={change.observation} label={`${change.observation.snapshotId} · target claim`} sources={sources} />
          {change.baselineObservation && change.kind !== "new" ? (
            <ObservationBlock
              observation={change.baselineObservation}
              label={`${change.baselineObservation.snapshotId} · baseline claim`}
              sources={sources}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-[10px] leading-4 text-muted">
            Source count is evidence breadth, not independent corroboration.
          </p>
          <a
            href={change.technique.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-rust hover:underline"
          >
            ATT&CK page <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function ConflictCards({ conflicts, sources }: { conflicts: Conflict[]; sources: Source[] }) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return (
    <div className="space-y-5">
      {conflicts.map((conflict) => (
        <Panel key={conflict.id}>
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={conflict.nature === "capability" ? "rust" : "amber"}>{conflict.nature}</Badge>
                <Badge tone="neutral">{conflict.status}</Badge>
                {conflict.techniqueIds.map((id) => (
                  <TechniqueCode key={id} id={id} />
                ))}
              </div>
              <h2 className="mt-2 font-display text-[30px] leading-none tracking-[-0.02em]">{conflict.title}</h2>
            </div>
          </div>

          <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {conflict.claims.map((claim, index) => {
              const source = sourceById.get(claim.sourceId);
              return (
                <div key={`${conflict.id}-${claim.sourceId}-${index}`} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      Claim {String(index + 1).padStart(2, "0")} · {claim.snapshotId}
                    </span>
                    {source ? <SourceKindBadge kind={source.kind} /> : null}
                  </div>
                  <p className="mt-3 text-[13px] leading-5 text-ink-soft">{claim.text}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-muted">{claim.locator}</span>
                    {source ? <SourceLine source={source} /> : null}
                  </div>
                  {claim.citedAs ? (
                    <p className="mt-2 font-mono text-[9px] text-amber">Source cited as {claim.citedAs}; normalised to current ATT&CK.</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 border-t border-line bg-paper-deep/30 px-5 py-4 lg:grid-cols-2">
            <div>
              <SectionLabel>Interpretation</SectionLabel>
              <p className="mt-1.5 text-[12px] leading-5 text-ink-soft">{conflict.interpretation}</p>
            </div>
            <div>
              <SectionLabel>Analyst action</SectionLabel>
              <p className="mt-1.5 text-[12px] leading-5 text-ink-soft">{conflict.analystAction}</p>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

export function DiffWorkbench({
  caseFile,
  comparison,
  sources,
  targetCoverage,
  baselineCoverage,
}: {
  caseFile: CaseFile;
  comparison: Comparison;
  sources: Source[];
  targetCoverage: CoverageResult;
  baselineCoverage: CoverageResult;
}) {
  const [tab, setTab] = useState<TabId>("added");
  const [selectedId, setSelectedId] = useState<string>(comparison.newlyDocumented[0]?.techniqueId ?? "");

  const items =
    tab === "added"
      ? [...comparison.newlyDocumented, ...comparison.refinements]
      : tab === "shared"
        ? comparison.shared
        : tab === "dropped"
          ? comparison.notRedocumented
          : [];

  const selected = items.find((item) => item.techniqueId === selectedId) ?? items[0];

  const tabs: Array<{ id: TabId; label: string; count: number }> = [
    { id: "added", label: "Newly documented", count: comparison.counts.addedMappings },
    { id: "shared", label: "Shared", count: comparison.counts.shared },
    { id: "dropped", label: "Not re-documented", count: comparison.counts.notRedocumented },
    { id: "conflicts", label: "Conflicts", count: comparison.counts.conflicts },
  ];

  return (
    <div>
      <div className="grid gap-px border border-line-strong bg-line md:grid-cols-[1fr_auto_1fr]">
        <div className="bg-surface px-5 py-4">
          <SectionLabel>Baseline A · historical</SectionLabel>
          <p className="mt-1 font-display text-[32px] leading-none tracking-[-0.02em]">{comparison.baseline.label}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">{formatDate(comparison.baseline.releasedAt)} · {comparison.counts.baseline} mappings</p>
          <p className="mt-3 max-w-lg text-[11px] leading-5 text-muted">{comparison.baseline.summary}</p>
        </div>
        <div className="grid place-items-center bg-surface px-4 py-2 md:py-0">
          <GitCompareArrows className="size-5 text-rust" aria-hidden />
        </div>
        <div className="bg-surface px-5 py-4">
          <SectionLabel>Target B · historical</SectionLabel>
          <p className="mt-1 font-display text-[32px] leading-none tracking-[-0.02em]">{comparison.target.label}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">{formatDate(comparison.target.releasedAt)} · {comparison.counts.target} mappings</p>
          <p className="mt-3 max-w-lg text-[11px] leading-5 text-muted">{comparison.target.summary}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-l-2 border-amber/50 bg-amber-soft/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-4 text-ink-soft">
          <span className="font-medium">Universe.</span> {caseFile.universeNote}
        </p>
        <Link href="/method" className="shrink-0 text-[10px] font-medium text-rust hover:underline">
          Read the method
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
        {[
          ["Added mappings", comparison.counts.addedMappings, `${comparison.counts.newlyDocumented} new · ${comparison.counts.refinements} refinement`],
          ["Shared", comparison.counts.shared, "in both mappings"],
          ["Not re-documented", comparison.counts.notRedocumented, "not proof of removal"],
          ["Claim tensions", comparison.counts.conflicts, "source disagreement"],
          ["Exact coverage", `${targetCoverage.summary.covered}/${targetCoverage.summary.total}`, `${targetCoverage.summary.broad} parent-tagged`],
        ].map(([label, value, note], index) => (
          <div key={label} className={cn("bg-surface px-4 py-3", index === 4 && "col-span-2 sm:col-span-1")}>
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{label}</p>
            <p className="mt-1 font-display text-[28px] leading-none tabular">{value}</p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.04em] text-muted">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 border-b border-line">
        <div className="flex gap-0 overflow-x-auto scroll-thin" role="tablist" aria-label="Diff categories">
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => {
                setTab(item.id);
                setSelectedId("");
              }}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors sm:px-4",
                tab === item.id
                  ? "border-rust text-ink"
                  : "border-transparent text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {item.label}
              <span className={cn("font-mono text-[9px]", tab === item.id ? "text-rust" : "text-muted")}>{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "conflicts" ? (
        <div className="mt-5">
          <div className="mb-4 flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>Source disagreement</SectionLabel>
              <h2 className="mt-1 font-display text-[30px] leading-none tracking-[-0.02em]">Conflicting and unresolved claims</h2>
            </div>
            <p className="max-w-md text-[10px] leading-4 text-muted">
              Claims are shown side by side, not ranked. Source silence is not contradiction; a mapping difference is not automatically an error.
            </p>
          </div>
          <ConflictCards conflicts={comparison.conflicts} sources={sources} />
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="border border-line bg-surface">
            <div className="hidden grid-cols-[minmax(0,1.35fr)_88px_88px_76px_24px] gap-3 border-b border-line bg-paper-deep/40 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted md:grid">
              <span>Technique</span>
              <span>Status</span>
              <span>Tactic</span>
              <span>Coverage</span>
              <span />
            </div>
            <div>
              {items.map((change) => {
                const active = selected?.techniqueId === change.techniqueId;
                const coverage =
                  change.kind === "not-redocumented"
                    ? baselineCoverage.techniques.find((item) => item.technique.id === change.techniqueId)
                    : targetCoverage.techniques.find((item) => item.technique.id === change.techniqueId);
                return (
                  <div key={change.techniqueId} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setSelectedId(change.techniqueId)}
                      className={cn(
                        "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-left transition-colors md:grid-cols-[minmax(0,1.35fr)_88px_88px_76px_24px] md:items-center",
                        active ? "bg-rust-soft/35" : "hover:bg-paper-deep/40",
                      )}
                    >
                      <TechniqueCell technique={change.technique} showTactics={false} />
                      <div className="flex items-center justify-end gap-2 md:justify-start">
                        <ChangeBadge kind={change.kind} />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <TacticLine labels={change.technique.tacticLabels} max={2} />
                      </div>
                      <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                        {coverage ? <CoverageBadge status={coverage.status} /> : <span className="text-[10px] text-muted">—</span>}
                      </div>
                      <ArrowRight className={cn("col-span-2 hidden size-3.5 md:col-span-1 md:block", active ? "text-rust" : "text-line-strong")} />
                    </button>
                    {active && selected ? (
                      <div className="border-t border-line px-3 py-3 md:hidden">
                        <ChangeDetail
                          change={selected}
                          sources={sources}
                          targetCoverage={targetCoverage}
                          baselineCoverage={baselineCoverage}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:block">
            {selected ? (
              <div className="sticky top-16">
                <ChangeDetail
                  change={selected}
                  sources={sources}
                  targetCoverage={targetCoverage}
                  baselineCoverage={baselineCoverage}
                />
                <div className="mt-3 flex items-center gap-2 px-1 text-[10px] leading-4 text-muted">
                  <ShieldCheck className="size-3.5 shrink-0" />
                  Coverage is public-rule availability, not organisational detection.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-[11px] leading-5 text-muted">
          A technique appearing in 3.0 reporting may reflect better documentation, a new source, or a mapping refinement. Treat the delta as a lead for hunting, not as attribution or proof of adoption.
        </p>
        <div className="flex gap-2">
          <ButtonLink href="/evidence">Inspect evidence</ButtonLink>
          <ButtonLink href="/reports" variant="primary">Export analysis</ButtonLink>
        </div>
      </div>
    </div>
  );
}
