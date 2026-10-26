import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Crosshair,
  FileOutput,
  GitCompareArrows,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { PageHeader, SectionLabel, Badge, ButtonLink, Panel, TextLink } from "@/components/ui";
import { ChangeBadge, CoverageBadge, SourceKindBadge, TechniqueCode } from "@/components/signals";
import { TechniqueCell, TacticLine } from "@/components/technique-meta";
import {
  caseFile,
  comparison,
  datasetStats,
  recentFindings,
  targetCoverage,
} from "@/lib/analysis";
import { formatDate } from "@/lib/utils";

const coverageByTechnique = new Map(
  targetCoverage.techniques.map((item) => [item.technique.id, item]),
);

const featuredIds = ["T1688", "T1078.003", "T1569.002", "T1547.004", "T1573.001", "T1480.002"];
const featured = featuredIds
  .map((id) => comparison.changes.find((change) => change.techniqueId === id))
  .filter((change) => change !== undefined);

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="bg-surface px-4 py-4 sm:px-5">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-2 font-display text-[38px] leading-none tracking-[-0.03em] text-ink tabular">{value}</p>
      <p className="mt-2 font-mono text-[9px] uppercase leading-4 tracking-[0.05em] text-muted">{note}</p>
    </div>
  );
}

function StackedBar({
  segments,
  total,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  total: number;
}) {
  return (
    <div className="flex h-2.5 w-full gap-px overflow-hidden bg-line">
      {segments.map((segment) => (
        <div
          key={segment.label}
          className={segment.color}
          style={{ width: `${total === 0 ? 0 : (segment.value / total) * 100}%` }}
          title={`${segment.label}: ${segment.value}`}
        />
      ))}
    </div>
  );
}

function Legend({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  return (
    <div className="mt-4 space-y-2">
      {segments.map((segment) => (
        <div key={segment.label} className="flex items-center justify-between gap-3 text-[11px]">
          <span className="flex items-center gap-2 text-ink-soft">
            <span className={`size-2 ${segment.color}`} />
            {segment.label}
          </span>
          <span className="font-mono tabular text-muted">{segment.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const deltaSegments = [
    { label: "Shared", value: datasetStats.shared, color: "bg-olive" },
    { label: "Newly documented", value: datasetStats.newlyDocumented, color: "bg-rust" },
    { label: "Refinement", value: datasetStats.refinements, color: "bg-amber" },
  ];

  const coverageSegments = [
    { label: "Direct Sigma rule", value: datasetStats.coverage.direct, color: "bg-olive" },
    { label: "Parent-tagged", value: datasetStats.coverage.broad, color: "bg-amber" },
    { label: "No rule in catalogue", value: datasetStats.coverage.gap, color: "bg-line-strong" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={caseFile.eyebrow}
        title={
          <>
            LockBit, <em className="italic text-rust">2.0 → 3.0</em>
          </>
        }
        deck={caseFile.deck}
        actions={
          <>
            <Badge tone="neutral">Historical cut-off {formatDate(caseFile.asOf)}</Badge>
            <ButtonLink href="/diff" variant="primary">
              Open intelligence diff <ArrowRight className="size-3.5" />
            </ButtonLink>
          </>
        }
      >
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          <span className="text-ink">Historical · FBI flash · 04 Feb 2022</span>
          <ArrowRight className="size-3 text-line-strong" />
          <span>CISA 075A · 16 Mar 2023</span>
          <ArrowRight className="size-3 text-line-strong" />
          <span className="text-rust">CISA 165A · 14 Jun 2023</span>
          <span className="hidden h-3 w-px bg-line-strong sm:inline-block" />
          <span>{caseFile.attackVersion} · verified {formatDate(caseFile.verifiedAt)}</span>
        </div>
      </PageHeader>

      <section className="mt-6 grid grid-cols-2 gap-px border border-line-strong bg-line lg:grid-cols-4" aria-label="Case statistics">
        <Stat label="Target mappings" value={datasetStats.targetTechniques} note={`${datasetStats.baselineTechniques} baseline · +${datasetStats.addedMappings} added / −${datasetStats.notRedocumented} dropped`} />
        <Stat label="Added mappings" value={datasetStats.addedMappings} note={`${datasetStats.newlyDocumented} new · ${datasetStats.refinements} sub-technique refinement`} />
        <Stat label="Shared across snapshots" value={datasetStats.shared} note={`${datasetStats.notRedocumented} not re-documented in 3.0`} />
        <Stat label="Exact Sigma coverage" value={`${datasetStats.coverage.covered}/${datasetStats.coverage.total}`} note={`${datasetStats.coverage.broad} parent-tagged · ${datasetStats.coverage.gap} gaps`} />
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
        <span>{datasetStats.conflicts} claim tensions</span>
        <span className="text-line-strong">·</span>
        <span>{datasetStats.hunts} hunt hypotheses</span>
        <span className="text-line-strong">·</span>
        <span>{datasetStats.evidence} evidence entries</span>
        <span className="text-line-strong">·</span>
        <span>{datasetStats.sources} sources</span>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.82fr)]">
        <div className="space-y-6">
          <Panel>
            <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <SectionLabel>Documentation delta</SectionLabel>
                <h2 className="mt-1 font-display text-[30px] leading-none tracking-[-0.02em]">What changed</h2>
              </div>
              <TextLink href="/diff">
                All {datasetStats.addedMappings} added mappings <ArrowRight className="size-3" />
              </TextLink>
            </div>

            <div className="hidden grid-cols-[minmax(0,1.5fr)_88px_110px_76px_48px] gap-3 border-b border-line px-5 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted md:grid">
              <span>Technique</span>
              <span>Status</span>
              <span>Tactic</span>
              <span>Coverage</span>
              <span className="text-right">Src</span>
            </div>

            <div>
              {featured.map((change) => {
                const coverage = coverageByTechnique.get(change.techniqueId);
                return (
                  <div
                    key={change.techniqueId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-line px-5 py-3 transition-colors last:border-b-0 hover:bg-paper-deep/40 md:grid-cols-[minmax(0,1.5fr)_88px_110px_76px_48px] md:items-center"
                  >
                    <TechniqueCell technique={change.technique} showTactics={false} />
                    <div className="flex items-center justify-end gap-2 md:justify-start">
                      <ChangeBadge kind={change.kind} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <TacticLine labels={change.technique.tacticLabels} max={2} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      {coverage ? <CoverageBadge status={coverage.status} /> : <span className="text-[10px] text-muted">—</span>}
                    </div>
                    <div className="col-span-2 font-mono text-[10px] text-muted md:col-span-1 md:text-right">
                      {change.observation.sourceIds.length} src
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-line bg-paper-deep/30 px-5 py-3">
              <p className="text-[11px] leading-4 text-muted">
                Newly documented means new to this mapping comparison — not proof of new adoption.
              </p>
              <Link href="/diff" className="ml-4 shrink-0 text-muted hover:text-rust" aria-label="Open diff">
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-end justify-between border-b border-line px-5 py-4">
              <div>
                <SectionLabel>From the sources</SectionLabel>
                <h2 className="mt-1 font-display text-[30px] leading-none tracking-[-0.02em]">Recent findings</h2>
              </div>
              <TextLink href="/evidence">
                Evidence explorer <ArrowRight className="size-3" />
              </TextLink>
            </div>
            <div>
              {recentFindings.map((finding) => {
                const quote = finding.observation.evidence.find(
                  (evidence) => evidence.kind === "direct" && evidence.sourceId === finding.source.id,
                )?.quote;
                return (
                  <article key={`${finding.observation.id}-${finding.source.id}`} className="border-b border-line px-5 py-4 last:border-b-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                        {formatDate(finding.publishedAt)}
                      </span>
                      <SourceKindBadge kind={finding.source.kind} />
                      <TechniqueCode id={finding.observation.techniqueId} />
                      <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
                        {finding.observation.snapshotId}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-ink-soft">
                      {quote ?? finding.observation.claim}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="truncate text-[10px] text-muted">{finding.source.publisher}</p>
                      <a
                        href={finding.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-rust hover:underline"
                      >
                        Source <ArrowUpRight className="size-3" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <div className="border-l-2 border-rust bg-rust-soft/55 px-5 py-5">
            <SectionLabel className="text-rust/80">Read this first</SectionLabel>
            <h2 className="mt-2 font-display text-[27px] leading-[1.02] tracking-[-0.02em] text-ink">
              Documentation is not adoption.
            </h2>
            <ol className="mt-4 space-y-3">
              {caseFile.caveats.map((caveat, index) => (
                <li key={caveat} className="flex gap-2.5 text-[11px] leading-[1.55] text-ink-soft">
                  <span className="mt-px font-mono text-[9px] text-rust/70">0{index + 1}</span>
                  <span>{caveat}</span>
                </li>
              ))}
            </ol>
            <Link href="/method" className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-rust hover:underline">
              Method, sources & limitations <ArrowRight className="size-3" />
            </Link>
          </div>

          <Panel className="px-5 py-5">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>Mapping delta</SectionLabel>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {datasetStats.baselineTechniques} <span className="text-line-strong">→</span> {datasetStats.targetTechniques} techniques
                </p>
              </div>
              <GitCompareArrows className="size-4 text-muted" aria-hidden />
            </div>
            <div className="mt-5">
              <StackedBar segments={deltaSegments} total={datasetStats.targetTechniques} />
              <Legend segments={deltaSegments} />
            </div>
            <p className="mt-4 border-t border-line pt-3 text-[10px] leading-4 text-muted">
              {datasetStats.notRedocumented} techniques were documented in 2.0 but not re-documented in 3.0. That is not evidence they were removed.
            </p>
          </Panel>

          <Panel className="px-5 py-5">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>Public rule coverage</SectionLabel>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {datasetStats.coverage.percent}% exact · {datasetStats.sigmaRules} rules in catalogue
                </p>
              </div>
              <ShieldCheck className="size-4 text-muted" aria-hidden />
            </div>
            <div className="mt-5">
              <StackedBar segments={coverageSegments} total={datasetStats.coverage.total} />
              <Legend segments={coverageSegments} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <p className="max-w-[220px] text-[10px] leading-4 text-muted">
                This is a small public Sigma catalogue, not your detection estate.
              </p>
              <Link href="/detections" className="text-muted hover:text-rust" aria-label="Open detection coverage">
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-end justify-between border-b border-line px-5 py-4">
              <div>
                <SectionLabel>Disagreement</SectionLabel>
                <h2 className="mt-1 font-display text-[26px] leading-none tracking-[-0.02em]">Claim tensions</h2>
              </div>
              <TriangleAlert className="size-4 text-amber" aria-hidden />
            </div>
            <div>
              {comparison.conflicts.map((conflict) => (
                <Link
                  key={conflict.id}
                  href="/diff"
                  className="block border-b border-line px-5 py-3 transition-colors last:border-b-0 hover:bg-paper-deep/40"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={conflict.nature === "capability" ? "rust" : "amber"}>{conflict.nature}</Badge>
                    <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted">{conflict.status}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] font-medium leading-4 text-ink">{conflict.title}</p>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-line bg-paper-deep/30 px-5 py-3">
              <p className="text-[10px] leading-4 text-muted">Not every disagreement is a contradiction.</p>
              <Link href="/diff" className="text-muted hover:text-rust" aria-label="Open conflicts">
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-px border border-line bg-line">
            <Link href="/hunts" className="group bg-surface px-4 py-4 hover:bg-paper-deep/50">
              <Crosshair className="size-4 text-rust" />
              <p className="mt-3 font-display text-[22px] leading-none">Plan hunts</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">{datasetStats.hunts} hypotheses</p>
            </Link>
            <Link href="/reports" className="group bg-surface px-4 py-4 hover:bg-paper-deep/50">
              <FileOutput className="size-4 text-rust" />
              <p className="mt-3 font-display text-[22px] leading-none">Export</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">MD / JSON</p>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
