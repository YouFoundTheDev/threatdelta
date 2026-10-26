import type { Metadata } from "next";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Badge, ButtonLink, PageHeader, Panel, SectionLabel } from "@/components/ui";
import { ConfidenceBadge, CoverageBadge, SourceKindBadge, TechniqueCode } from "@/components/signals";
import { TacticLine } from "@/components/technique-meta";
import { caseFile, currentCoverage, currentSnapshot } from "@/lib/analysis";
import { observations, sourceById, techniqueById } from "@/lib/data";
import { compareTechniques } from "@/lib/attack";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "2026 reporting — ThreatDelta" };

export default function CurrentReportingPage() {
  const currentObservations = observations
    .filter((observation) => observation.snapshotId === currentSnapshot.id)
    .sort((a, b) => {
      const aTech = techniqueById.get(a.techniqueId);
      const bTech = techniqueById.get(b.techniqueId);
      return aTech && bTech ? compareTechniques(aTech, bTech) : 0;
    });

  const baselineIds = new Set(
    observations
      .filter((observation) => observation.snapshotId === "lockbit-3.0")
      .map((observation) => observation.techniqueId),
  );
  const newObservations = currentObservations.filter((observation) => !baselineIds.has(observation.techniqueId));
  const sharedObservations = currentObservations.filter((observation) => baselineIds.has(observation.techniqueId));
  const coverageById = new Map(currentCoverage.techniques.map((item) => [item.technique.id, item]));
  const sources = currentSnapshot.sourceIds
    .map((id) => sourceById.get(id))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));

  return (
    <div>
      <PageHeader
        eyebrow="Supplementary · 2026 vendor reporting"
        title={
          <>
            LockBit 5.0, <em className="italic text-rust">as vendors saw it</em>
          </>
        }
        deck={caseFile.currentReporting.deck}
        actions={
          <>
            <Badge tone="amber">Vendor reporting</Badge>
            <Badge tone="neutral">{currentObservations.length} techniques</Badge>
            <Badge tone="neutral">Verified {formatDate(caseFile.verifiedAt)}</Badge>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 border-l-2 border-amber/50 bg-amber-soft/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-[11px] leading-5 text-ink-soft">
          <span className="font-medium">This is not an official advisory.</span> {caseFile.currentReporting.caveat}
        </p>
        <a href="/diff" className="shrink-0 text-[10px] font-medium text-rust hover:underline">
          Back to the historical diff
        </a>
      </div>

      <section className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3" aria-label="2026 activity context">
        {caseFile.currentReporting.activity.map((item) => {
          const source = sourceById.get(item.sourceId);
          return (
            <div key={item.label} className="bg-surface px-4 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{item.label}</p>
              <p className="mt-2 font-display text-[38px] leading-none tracking-[-0.03em] tabular">{item.value}</p>
              <p className="mt-1 text-[10px] leading-4 text-muted">{item.note}</p>
              {source ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[9px] text-muted hover:text-rust"
                >
                  {source.publisher} <ArrowUpRight className="size-2.5" />
                </a>
              ) : null}
            </div>
          );
        })}
        <div className="bg-surface px-4 py-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Coverage in this catalogue</p>
          <p className="mt-2 font-display text-[38px] leading-none tracking-[-0.03em] tabular">
            {currentCoverage.summary.covered}/{currentCoverage.summary.total}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-muted">
            {currentCoverage.summary.broad} parent-tagged · {currentCoverage.summary.gap} gaps
          </p>
          <a href="/detections?snapshot=lockbit-5.0-2026" className="mt-2 inline-flex items-center gap-1 text-[9px] text-muted hover:text-rust">
            Open on detection page <ArrowUpRight className="size-2.5" />
          </a>
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="space-y-4">
          <div className="flex items-end justify-between border-b border-line pb-3">
            <div>
              <SectionLabel>What the 2026 sources name</SectionLabel>
              <h2 className="mt-1 font-display text-[32px] leading-none tracking-[-0.02em]">Techniques</h2>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">{currentObservations.length} findings</span>
          </div>

          {currentObservations.map((observation) => {
            const technique = techniqueById.get(observation.techniqueId);
            const coverage = coverageById.get(observation.techniqueId);
            if (!technique) return null;
            return (
              <Panel key={observation.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TechniqueCode id={technique.id} href={technique.url} />
                      <ConfidenceBadge confidence={observation.confidence} />
                      {coverage ? <CoverageBadge status={coverage.status} /> : null}
                    </div>
                    <h3 className="mt-1 font-display text-[24px] leading-none tracking-[-0.02em]">{technique.name}</h3>
                    <TacticLine labels={technique.tacticLabels} className="mt-1.5" />
                  </div>
                  {!baselineIds.has(observation.techniqueId) ? <Badge tone="rust">New to this snapshot</Badge> : <Badge tone="olive">Also in 3.0</Badge>}
                </div>

                <p className="mt-3 text-[12px] leading-5 text-ink-soft">{observation.claim}</p>

                <div className="mt-3 space-y-3">
                  {observation.evidence.map((evidence) => {
                    const source = sourceById.get(evidence.sourceId);
                    return (
                      <div key={evidence.id} className="border-t border-line pt-3">
                        <blockquote className="border-l border-line-strong pl-3 font-display text-[17px] leading-[1.35] tracking-[-0.01em] text-ink-soft">
                          “{evidence.quote}”
                        </blockquote>
                        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-muted">{evidence.locator}</span>
                          {source ? (
                            <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] text-muted hover:text-rust">
                              <SourceKindBadge kind={source.kind} /> {source.publisher} <ExternalLink className="size-2.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            );
          })}
        </div>

        <aside className="space-y-5">
          <Panel className="px-4 py-4">
            <SectionLabel>New here vs the 3.0 map</SectionLabel>
            {newObservations.length ? (
              <div className="mt-2 space-y-3">
                {newObservations.map((observation) => {
                  const technique = techniqueById.get(observation.techniqueId);
                  if (!technique) return null;
                  return (
                    <div key={observation.id}>
                      <p className="text-[12px] font-medium text-ink">{technique.id} · {technique.name}</p>
                      <p className="mt-1 text-[10px] leading-4 text-muted">
                        This is not in the LockBit 3.0 software mapping. It is a 2026 vendor observation, not proof the behaviour is new in the wild.
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-4 text-muted">No technique in this vendor snapshot is new versus the 3.0 mapping.</p>
            )}
            <div className="mt-3 border-t border-line pt-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted">Also in the 3.0 mapping · {sharedObservations.length}</p>
              <p className="mt-1 text-[10px] leading-4 text-muted">
                {sharedObservations.map((observation) => observation.techniqueId).join(" · ")}
              </p>
            </div>
          </Panel>

          <div className="border-l-2 border-amber/50 bg-amber-soft/35 px-4 py-3">
            <p className="text-[10px] font-medium text-amber">Read the scope</p>
            <p className="mt-1.5 text-[10px] leading-4 text-ink-soft">
              Acronis and AhnLab analysed the 5.0 build. They did not write a full intrusion chain. A technique missing here is unexamined, not gone.
            </p>
          </div>

          <Panel className="px-4 py-4">
            <SectionLabel>Sources behind this snapshot</SectionLabel>
            <div className="mt-2 space-y-3">
              {sources.map((source) => (
                <div key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-1 text-[11px] font-medium leading-4 text-ink hover:text-rust">
                    {source.title} <ArrowUpRight className="mt-0.5 size-2.5 shrink-0 text-line-strong group-hover:text-rust" />
                  </a>
                  <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.04em] text-muted">
                    {source.publisher} · {formatDate(source.publishedAt)}
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-muted">{source.note}</p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/evidence">Check the evidence</ButtonLink>
            <ButtonLink href="/detections?snapshot=lockbit-5.0-2026" variant="primary">Coverage</ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
