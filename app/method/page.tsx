import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, Database, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge, PageHeader, Panel, SectionLabel } from "@/components/ui";
import { SourceKindBadge, TechniqueCode } from "@/components/signals";
import { caseFile, comparison, scoredHunts, validationIssues } from "@/lib/analysis";
import { dataset, monitoring, sigmaRules, sources, techniques } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Method & sources — ThreatDelta" };

const confidenceRubric = [
  ["High", "A direct quote from a government or primary source, or a MITRE ATT&CK mapping with a cited government advisory."],
  ["Medium", "A MITRE ATT&CK use statement supported mainly by vendor reporting, or a single-source mapping."],
  ["Low", "Weak or inferred support; kept visible rather than smoothed away."],
];

const coverageRubric = [
  ["Direct", "The rule carries the observed technique ID. Counted as exact coverage."],
  ["Parent-tagged", "The rule carries an ancestor ID. Shown as adjacent, but not counted as exact coverage."],
  ["Child-only", "The rule carries a narrower sub-technique ID. Related, but cannot cover the whole parent."],
  ["Gap", "No exact or parent-tagged rule in this catalogue. Not evidence of organisational blindness."],
];

export default function MethodPage() {
  const errors = validationIssues.filter((issue) => issue.level === "error").length;
  const warnings = validationIssues.filter((issue) => issue.level === "warning").length;

  return (
    <div>
      <PageHeader
        eyebrow="Method · data notes"
        title={
          <>
            Method & <em className="italic text-rust">sources</em>
          </>
        }
        deck="How the data was checked, what the scores mean, and where this stops being useful."
        actions={
          <>
            <Badge tone="neutral">{caseFile.attackVersion}</Badge>
            <Badge tone="olive">Dataset check: {errors} errors</Badge>
            <Badge tone="neutral">Verified {formatDate(caseFile.verifiedAt)}</Badge>
            <Badge tone="neutral">Historical cut-off {formatDate(caseFile.asOf)}</Badge>
          </>
        }
      />

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <div className="space-y-6">
          <Panel className="px-5 py-5">
            <SectionLabel>Scope</SectionLabel>
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-ink-soft">{caseFile.scope}</p>
            <p className="mt-3 max-w-3xl text-[11px] leading-5 text-muted">{caseFile.universeNote}</p>
            <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-4">
              {[
                ["Baseline", comparison.counts.baseline],
                ["Target", comparison.counts.target],
                ["Added", comparison.counts.addedMappings],
                ["Shared", comparison.counts.shared],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface px-3 py-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{label}</p>
                  <p className="mt-1 font-display text-[28px] leading-none tabular">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
              <div className="bg-surface px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Historical period</p>
                <p className="mt-1 text-[11px] leading-4 text-ink-soft">{caseFile.historicalPeriod} · ends {formatDate(caseFile.asOf)}</p>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">ATT&CK mapping</p>
                <p className="mt-1 text-[11px] leading-4 text-ink-soft">{caseFile.attackVersion} · released {formatDate(caseFile.attackReleaseDate)}</p>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Verified</p>
                <p className="mt-1 text-[11px] leading-4 text-ink-soft">{formatDate(caseFile.verifiedAt)}</p>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">SigmaHQ snapshot</p>
                <a
                  href={`${dataset.sigma.repositoryUrl}/commit/${dataset.sigma.commit}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block font-mono text-[10px] text-rust hover:underline"
                >
                  {dataset.sigma.commit.slice(0, 8)} · {formatDate(dataset.sigma.commitDate)}
                </a>
              </div>
            </div>
          </Panel>

          <Panel className="px-5 py-5">
            <SectionLabel>Comparison rules</SectionLabel>
            <div className="mt-3 space-y-3 text-[12px] leading-5 text-ink-soft">
              <p>
                The target observation set is compared by exact ATT&amp;CK ID against the baseline. A target ID with no baseline
                equivalent is newly documented unless one of its ancestors was already in the baseline.
              </p>
              <p>
                The one lineage case in this case study is <TechniqueCode id="T1480.002" />: it refines the shared parent{" "}
                <TechniqueCode id="T1480" />, so it is shown as a refinement rather than a separate new technique.
              </p>
              <p>
                A baseline technique with no target equivalent is labelled <span className="font-medium">not re-documented</span>.
                That is a documentation fact, not a claim that the behaviour disappeared.
              </p>
            </div>
          </Panel>

          <Panel className="px-5 py-5">
            <SectionLabel>Confidence rubric</SectionLabel>
            <div className="mt-3 space-y-0">
              {confidenceRubric.map(([label, description]) => (
                <div key={label} className="grid gap-1 border-t border-line py-3 first:border-t-0 first:pt-0 sm:grid-cols-[90px_1fr] sm:gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-amber">{label}</span>
                  <span className="text-[11px] leading-5 text-ink-soft">{description}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="px-5 py-5">
            <SectionLabel>Coverage and hunt scoring</SectionLabel>
            <div className="mt-3 space-y-0">
              {coverageRubric.map(([label, description]) => (
                <div key={label} className="grid gap-1 border-t border-line py-3 first:border-t-0 first:pt-0 sm:grid-cols-[110px_1fr] sm:gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</span>
                  <span className="text-[11px] leading-5 text-ink-soft">{description}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[12px] leading-5 text-ink-soft">
                Hunt priority is additive and visible: documentation delta (new 3, refinement 2, shared 1) + maximum tactic
                exposure (impact / initial access 3, lateral movement / defence impairment 2, other 1) + detection gap
                (no rule 3, parent-tagged 1, direct 0) + evidence strength (high 2, medium 1). Maximum 11. Ties break by number of implicated techniques, then title.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {scoredHunts.map((hunt) => (
                  <span key={hunt.hunt.id} className="border border-line bg-paper-deep/40 px-2 py-1 font-mono text-[9px] text-muted">
                    {hunt.rank}. {hunt.hunt.title} · {hunt.score}/11
                  </span>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="px-5 py-5">
            <SectionLabel>What this does not do</SectionLabel>
            <ul className="mt-3 space-y-2">
              {caseFile.caveats.map((caveat) => (
                <li key={caveat} className="flex gap-2.5 text-[11px] leading-5 text-ink-soft">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber" />
                  {caveat}
                </li>
              ))}
              <li className="flex gap-2.5 text-[11px] leading-5 text-ink-soft">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber" />
                No synthetic IOCs, telemetry, victim data or organisational detection inventory is used. Hunt hypotheses are analyst synthesis and are labelled as such.
              </li>
            </ul>
          </Panel>

          <div>
            <div className="flex items-end justify-between border-b border-line pb-3">
              <div>
                <SectionLabel>Bibliography</SectionLabel>
                <h2 className="mt-1 font-display text-[32px] leading-none tracking-[-0.02em]">Sources</h2>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">{sources.length} registered</span>
            </div>
            <div className="divide-y divide-line">
              {sources.map((source) => (
                <article key={source.id} className="grid gap-2 py-4 sm:grid-cols-[120px_1fr] sm:gap-4">
                  <div>
                    <SourceKindBadge kind={source.kind} />
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.04em] text-muted">
                      Dated {formatDate(source.publishedAt)}
                    </p>
                    {source.retrievedAt ? (
                      <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.04em] text-muted">
                        Verified {formatDate(source.retrievedAt)}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-start gap-1.5 font-display text-[21px] leading-[1.05] tracking-[-0.01em] text-ink hover:text-rust"
                    >
                      {source.title}
                      <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-line-strong group-hover:text-rust" />
                    </a>
                    <p className="mt-1 text-[10px] font-medium text-muted">{source.publisher}</p>
                    <p className="mt-1.5 max-w-3xl text-[10px] leading-4 text-muted">{source.note}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="border border-line bg-surface px-4 py-4">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted" />
              <SectionLabel>Refresh pipeline</SectionLabel>
            </div>
            <p className="mt-2 text-[11px] font-medium text-ink">{monitoring.cadence}</p>
            <p className="mt-1 text-[10px] leading-4 text-muted">
              GitHub Actions checks ATT&amp;CK releases, the SigmaHQ commit, and {monitoring.reportFeeds.length} report feeds.
              Machine-verifiable metadata opens a PR; new advisory findings require analyst mapping.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {monitoring.reportFeeds.map((feed) => (
                <span key={feed.id} className="border border-line bg-paper-deep/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.04em] text-muted">
                  {feed.name}
                </span>
              ))}
            </div>
            <a
              href={monitoring.workflowUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-rust hover:underline"
            >
              View workflow runs <ArrowUpRight className="size-3" />
            </a>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.04em] text-muted">
              GitHub repository access required
            </p>
          </div>

          <div className="border border-line bg-surface px-4 py-4">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted" />
              <SectionLabel>Data check</SectionLabel>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-olive" />
              <p className="text-[12px] font-medium text-ink">
                {errors === 0 ? "Every source resolves" : `${errors} errors`}
              </p>
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-muted">
              {warnings === 0 ? "Every evidence entry resolves to a registered source." : `${warnings} warnings.`} Checks cover source IDs, URLs, ATT&amp;CK
              references, conflict claims, Sigma tags and hunt structure.
            </p>
            <div className="mt-3 border-t border-line pt-2 font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
              {techniques.length} techniques · {sources.length} sources · {sigmaRules.length} Sigma rules
            </div>
          </div>

          <div className="border-l-2 border-rust bg-rust-soft/55 px-4 py-4">
            <SectionLabel className="text-rust/80">The short version</SectionLabel>
            <p className="mt-2 font-display text-[25px] leading-[1.05] tracking-[-0.02em]">A report change is a lead, not proof.</p>
            <p className="mt-2 text-[10px] leading-4 text-ink-soft">
              ATT&amp;CK and Sigma moving is evidence that documentation changed. It is not evidence that behaviour changed, and a public-rule gap says nothing about your estate.
            </p>
          </div>

          <div className="border border-line bg-surface px-4 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted" />
              <SectionLabel>SigmaHQ</SectionLabel>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-muted">
              These are {sigmaRules.length} real SigmaHQ rules, pinned to the verified commit. Rule text stays under the SigmaHQ Detection Rule License 1.1. This is a catalogue, not a detection product.
            </p>
            <a
              href="https://github.com/SigmaHQ/sigma"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-rust hover:underline"
            >
              SigmaHQ repository <ArrowUpRight className="size-3" />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
