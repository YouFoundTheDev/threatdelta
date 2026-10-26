"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge, Button, Empty, Input, Panel, SectionLabel, Select } from "./ui";
import { ConfidenceBadge, SourceKindBadge, TechniqueCode } from "./signals";
import { TacticLine } from "./technique-meta";
import { compareTechniques } from "@/lib/attack";
import type {
  CaseFile,
  Observation,
  Source,
  Technique,
} from "@/lib/types";
import { cn, formatDate, matchesQuery } from "@/lib/utils";

function EvidenceDetail({
  observation,
  technique,
  sourceById,
  snapshots,
}: {
  observation: Observation;
  technique: Technique;
  sourceById: Map<string, Source>;
  snapshots: CaseFile["snapshots"];
}) {
  const snapshot = snapshots.find((item) => item.id === observation.snapshotId);

  return (
    <div className="border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TechniqueCode id={technique.id} href={technique.url} />
            <ConfidenceBadge confidence={observation.confidence} />
          </div>
          <Badge tone="neutral">{snapshot?.label ?? observation.snapshotId}</Badge>
        </div>
        <h2 className="mt-2 font-display text-[30px] leading-[0.98] tracking-[-0.02em]">{technique.name}</h2>
        <TacticLine labels={technique.tacticLabels} max={6} className="mt-2" />
        <p className="mt-3 text-[11px] leading-5 text-muted">{technique.description}</p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div>
          <SectionLabel>Claim</SectionLabel>
          <p className="mt-2 text-[13px] leading-5 text-ink">{observation.claim}</p>
        </div>

        <div className="border border-line bg-paper-deep/30 px-3 py-3">
          <SectionLabel>Confidence rationale</SectionLabel>
          <p className="mt-1.5 text-[11px] leading-5 text-ink-soft">{observation.confidenceRationale}</p>
        </div>

        <div>
          <SectionLabel>Evidence entries ({observation.evidence.length})</SectionLabel>
          <div className="mt-2 space-y-4">
            {observation.evidence.map((evidence) => {
              const source = sourceById.get(evidence.sourceId);
              return (
                <div key={evidence.id} className="border-t border-line pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={evidence.kind === "direct" ? "olive" : "neutral"}>{evidence.kind}</Badge>
                      {evidence.citedAs ? (
                        <span className="font-mono text-[9px] text-amber">cited as {evidence.citedAs}</span>
                      ) : null}
                    </div>
                    {source ? <SourceKindBadge kind={source.kind} /> : null}
                  </div>
                  <blockquote className="mt-2 border-l border-line-strong pl-3 font-display text-[17px] leading-[1.35] tracking-[-0.01em] text-ink-soft">
                    “{evidence.quote}”
                  </blockquote>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-muted">{evidence.locator}</span>
                    {source ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-rust hover:underline"
                      >
                        {source.publisher} · {formatDate(source.publishedAt)} <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-[10px] leading-4 text-muted">
            {observation.synthetic ? "Synthetic material — labelled." : "Public source. No synthetic telemetry."}
          </p>
          <a
            href={technique.url}
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

export function EvidenceExplorer({
  caseFile,
  observations,
  techniques,
  sources,
}: {
  caseFile: CaseFile;
  observations: Observation[];
  techniques: Technique[];
  sources: Source[];
}) {
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [tactic, setTactic] = useState("all");
  const [sourceId, setSourceId] = useState("all");
  const [selectedId, setSelectedId] = useState("");

  const techniqueById = useMemo(() => new Map(techniques.map((technique) => [technique.id, technique])), [techniques]);
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const usedSources = useMemo(
    () => sources.filter((source) => observations.some((observation) => observation.sourceIds.includes(source.id))),
    [sources, observations],
  );

  const tacticOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const technique of techniques) {
      for (let index = 0; index < technique.tactics.length; index += 1) {
        map.set(technique.tactics[index], technique.tacticLabels[index]);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [techniques]);

  const filtered = useMemo(() => {
    const snapshotOrder = new Map([
      [caseFile.snapshots[1]?.id, 0],
      [caseFile.currentReporting.snapshotId, 1],
      [caseFile.snapshots[0]?.id, 2],
    ]);

    return observations
      .filter((observation) => {
        const technique = techniqueById.get(observation.techniqueId);
        if (!technique) return false;

        if (snapshot !== "all" && observation.snapshotId !== snapshot) return false;
        if (confidence !== "all" && observation.confidence !== confidence) return false;
        if (tactic !== "all" && !technique.tactics.includes(tactic)) return false;
        if (sourceId !== "all" && !observation.sourceIds.includes(sourceId)) return false;

        if (!query.trim()) return true;
        const sourceText = observation.sourceIds
          .map((id) => {
            const source = sourceById.get(id);
            return source ? `${source.title} ${source.publisher}` : "";
          })
          .join(" ");
        const evidenceText = observation.evidence.map((evidence) => `${evidence.quote} ${evidence.locator}`).join(" ");
        return matchesQuery(
          [observation.techniqueId, technique.name, observation.claim, sourceText, evidenceText],
          query,
        );
      })
      .sort((a, b) => {
        const aOrder = snapshotOrder.get(a.snapshotId) ?? 99;
        const bOrder = snapshotOrder.get(b.snapshotId) ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        const aTech = techniqueById.get(a.techniqueId);
        const bTech = techniqueById.get(b.techniqueId);
        return aTech && bTech ? compareTechniques(aTech, bTech) : 0;
      });
  }, [observations, techniqueById, snapshot, confidence, tactic, sourceId, query, sourceById, caseFile.snapshots, caseFile.currentReporting.snapshotId]);

  const selected = filtered.find((observation) => observation.id === selectedId) ?? filtered[0];
  const selectedTechnique = selected ? techniqueById.get(selected.techniqueId) : undefined;

  const activeFilters = [
    snapshot !== "all",
    confidence !== "all",
    tactic !== "all",
    sourceId !== "all",
    Boolean(query.trim()),
  ].filter(Boolean).length;

  const clear = () => {
    setQuery("");
    setSnapshot("all");
    setConfidence("all");
    setTactic("all");
    setSourceId("all");
  };

  return (
    <div>
      <Panel className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search findings</span>
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search technique, claim, quote or source"
              className="h-10 pl-9"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              <SlidersHorizontal className="size-3.5" /> Filter
            </span>
            <Select value={snapshot} onChange={(event) => setSnapshot(event.target.value)} aria-label="Filter by snapshot">
              <option value="all">All snapshots</option>
              {caseFile.snapshots.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </Select>
            <Select value={confidence} onChange={(event) => setConfidence(event.target.value)} aria-label="Filter by confidence">
              <option value="all">All confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select value={tactic} onChange={(event) => setTactic(event.target.value)} aria-label="Filter by tactic">
              <option value="all">All tactics</option>
              {tacticOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Select value={sourceId} onChange={(event) => setSourceId(event.target.value)} aria-label="Filter by source">
              <option value="all">All sources</option>
              {usedSources.map((source) => (
                <option key={source.id} value={source.id}>{source.publisher}</option>
              ))}
            </Select>
            {activeFilters > 0 ? (
              <Button variant="ghost" onClick={clear} className="h-9 px-2 text-[10px]">
                Clear ({activeFilters})
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
            {filtered.length} of {observations.length} findings
          </p>
          <p className="text-[10px] text-muted">Quotes come from the sources. Analyst mappings are marked.</p>
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <div className="mt-5">
          <Empty>No findings match these filters. Clear the search and try a broader tactic or snapshot.</Empty>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px] xl:grid-cols-[minmax(0,1fr)_470px]">
          <div className="border border-line bg-surface">
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_88px_74px_24px] gap-3 border-b border-line bg-paper-deep/40 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted md:grid">
              <span>Technique</span>
              <span>Claim</span>
              <span>Evidence</span>
              <span>Confidence</span>
              <span />
            </div>
            <div>
              {filtered.map((observation, index) => {
                const technique = techniqueById.get(observation.techniqueId);
                if (!technique) return null;
                const active = selected?.id === observation.id;
                const snapshotChanged = index === 0 || filtered[index - 1].snapshotId !== observation.snapshotId;
                const snapshot = caseFile.snapshots.find((item) => item.id === observation.snapshotId);
                const snapshotCount = filtered.filter((item) => item.snapshotId === observation.snapshotId).length;
                return (
                  <Fragment key={observation.id}>
                    {snapshotChanged ? (
                      <div className="flex items-center justify-between border-b border-line bg-paper-deep/55 px-4 py-2">
                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink">{snapshot?.label ?? observation.snapshotId}</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted">{snapshotCount} findings</span>
                      </div>
                    ) : null}
                    <div className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setSelectedId(observation.id)}
                        className={cn(
                          "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-left transition-colors md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_88px_74px_24px] md:items-center",
                          active ? "bg-rust-soft/35" : "hover:bg-paper-deep/40",
                        )}
                      >
                        <div>
                          <TechniqueCode id={technique.id} href={technique.url} />
                          <p className="mt-0.5 text-[12px] font-medium leading-4 text-ink">{technique.name}</p>
                          <TacticLine labels={technique.tacticLabels} max={2} className="mt-1" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="line-clamp-2 text-[11px] leading-4 text-muted">{observation.claim}</p>
                        </div>
                        <div className="col-span-2 flex items-center justify-between gap-2 font-mono text-[9px] text-muted md:col-span-1 md:block">
                          <span>{observation.sourceIds.length} src</span>
                          <span className="md:mt-1 md:block">{observation.evidence.length} ev</span>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <ConfidenceBadge confidence={observation.confidence} />
                        </div>
                        <ArrowRight className={cn("col-span-2 hidden size-3.5 md:col-span-1 md:block", active ? "text-rust" : "text-line-strong")} />
                      </button>
                      {active && selectedTechnique ? (
                        <div className="border-t border-line px-3 py-3 md:hidden">
                          <EvidenceDetail
                            observation={observation}
                            technique={selectedTechnique}
                            sourceById={sourceById}
                            snapshots={caseFile.snapshots}
                          />
                        </div>
                      ) : null}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:block">
            {selected && selectedTechnique ? (
              <div className="sticky top-16">
                <EvidenceDetail
                  observation={selected}
                  technique={selectedTechnique}
                  sourceById={sourceById}
                  snapshots={caseFile.snapshots}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
