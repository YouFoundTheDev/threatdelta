"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, FileJson, FileText, Info, ShieldCheck } from "lucide-react";
import { Badge, Button, Panel, SectionLabel } from "./ui";
import { buildJsonReport, buildMarkdownReport, reportFilename } from "@/lib/report";
import type {
  AttackDataset,
  CaseFile,
  Comparison,
  CoverageResult,
  Observation,
  ReportOptions,
  ScoredHunt,
  Source,
  Technique,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Format = "md" | "json";
type Status = "idle" | "copied" | "error";

const optionMeta: Array<{ key: keyof ReportOptions; label: string; description: string }> = [
  { key: "includeEvidence", label: "Evidence appendix", description: "Every claim, quote, locator and confidence rationale." },
  { key: "includeCoverage", label: "Detection coverage", description: "Technique-by-technique public Sigma match result." },
  { key: "includeHunts", label: "Hunt hypotheses", description: "Hunt briefs with logs, steps, false positives and scores." },
  { key: "includeConflicts", label: "Source conflicts", description: "Where sources disagree, and what to do about it." },
  { key: "includeSources", label: "Sources & attribution", description: "Publisher, date, URL and provenance note." },
];

export function ReportBuilder({
  caseFile,
  dataset,
  comparison,
  coverage,
  currentCoverage,
  hunts,
  observations,
  techniques,
  sources,
  generatedAt,
}: {
  caseFile: CaseFile;
  dataset: AttackDataset;
  comparison: Comparison;
  coverage: CoverageResult;
  currentCoverage: CoverageResult;
  hunts: ScoredHunt[];
  observations: Observation[];
  techniques: Technique[];
  sources: Source[];
  generatedAt: string;
}) {
  const [format, setFormat] = useState<Format>("md");
  const [options, setOptions] = useState<ReportOptions>({
    includeEvidence: true,
    includeCoverage: true,
    includeHunts: true,
    includeConflicts: true,
    includeSources: true,
  });
  const [status, setStatus] = useState<Status>("idle");

  const report = useMemo(() => {
    const input = { caseFile, dataset, comparison, coverage, currentCoverage, hunts, observations, techniques, sources, generatedAt };
    return format === "md" ? buildMarkdownReport(input, options) : buildJsonReport(input, options);
  }, [format, options, caseFile, dataset, comparison, coverage, currentCoverage, hunts, observations, techniques, sources, generatedAt]);

  const filename = reportFilename(format, generatedAt);
  const sizeKb = Math.max(1, Math.round(new Blob([report]).size / 1024));

  function toggle(key: keyof ReportOptions) {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
    setStatus("idle");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
    }
  }

  function download() {
    const blob = new Blob([report], {
      type: format === "md" ? "text/markdown;charset=utf-8" : "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const enabled = Object.values(options).filter(Boolean).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Panel className="px-4 py-4">
          <SectionLabel>Format</SectionLabel>
          <div className="mt-2 grid grid-cols-2 gap-px border border-line bg-line">
            <button
              type="button"
              onClick={() => setFormat("md")}
              aria-pressed={format === "md"}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 text-[11px] font-medium",
                format === "md" ? "bg-ink text-paper" : "bg-surface text-muted hover:bg-paper-deep/60 hover:text-ink",
              )}
            >
              <FileText className="size-3.5" /> Markdown
            </button>
            <button
              type="button"
              onClick={() => setFormat("json")}
              aria-pressed={format === "json"}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 text-[11px] font-medium",
                format === "json" ? "bg-ink text-paper" : "bg-surface text-muted hover:bg-paper-deep/60 hover:text-ink",
              )}
            >
              <FileJson className="size-3.5" /> JSON
            </button>
          </div>
          <p className="mt-2 font-mono text-[9px] leading-4 text-muted">
            {format === "md" ? "Analyst brief with tables and an evidence appendix." : "Structured payload for tooling, with resolved sources."}
          </p>
        </Panel>

        <Panel className="px-4 py-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Include</SectionLabel>
            <span className="font-mono text-[9px] text-muted">{enabled}/5</span>
          </div>
          <div className="mt-3 space-y-0">
            {optionMeta.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer gap-3 border-t border-line py-3 first:border-t-0 first:pt-0"
              >
                <input
                  type="checkbox"
                  checked={options[option.key]}
                  onChange={() => toggle(option.key)}
                  className="mt-0.5 size-3.5 shrink-0 accent-[#8d2f28]"
                />
                <span>
                  <span className="block text-[11px] font-medium leading-4 text-ink">{option.label}</span>
                  <span className="mt-0.5 block text-[9px] leading-4 text-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </Panel>

        <div className="border-l-2 border-amber/50 bg-amber-soft/35 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-medium text-amber">
            <Info className="size-3.5" /> What is in the file
          </p>
          <p className="mt-1.5 text-[10px] leading-4 text-ink-soft">
            Method and limits always go in. No telemetry, customer data or adoption claims.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
          <ShieldCheck className="size-3.5" /> {comparison.counts.conflicts} tensions · {observations.length} findings · {sources.length} sources
        </div>
      </aside>

      <section className="min-w-0 border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line bg-paper-deep/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{format.toUpperCase()}</Badge>
              <span className="truncate font-mono text-[9px] text-muted">{filename}</span>
            </div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
              {report.length.toLocaleString("en-GB")} chars · ~{sizeKb} KB · generated {generatedAt.slice(0, 16).replace("T", " ")}Z
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={copy} className="h-8 px-2.5 text-[10px]">
              {status === "copied" ? <Check className="size-3.5 text-olive" /> : <Copy className="size-3.5" />}
              {status === "copied" ? "Copied" : "Copy"}
            </Button>
            <Button variant="primary" onClick={download} className="h-8 px-2.5 text-[10px]">
              <Download className="size-3.5" /> Download
            </Button>
          </div>
        </div>

        <div className="relative">
          <pre className="scroll-thin max-h-[680px] overflow-auto whitespace-pre-wrap break-words bg-[#1c201d] px-5 py-5 font-mono text-[11px] leading-[1.65] text-[#e6e1d4]">
            {report}
          </pre>
          {status === "error" ? (
            <p className="absolute bottom-3 right-3 border border-rust/30 bg-rust-soft px-2 py-1 text-[10px] text-rust">
              Clipboard unavailable. Use Download.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-[10px] leading-4 text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>{format === "md" ? "UTF-8 Markdown. Paste it into a ticket." : "Schema 1.0. Evidence sources are resolved inline."}</span>
          <span className="font-mono uppercase tracking-[0.06em]">ThreatDelta export</span>
        </div>
      </section>
    </div>
  );
}
