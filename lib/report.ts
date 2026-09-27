import type {
  CoverageStatus,
  Observation,
  ReportInput,
  ReportOptions,
  ScoredHunt,
  Source,
  TechniqueChange,
} from "./types";

const statusLabels: Record<CoverageStatus, string> = {
  direct: "direct rule",
  broad: "parent-tagged rule",
  gap: "gap in catalogue",
};

const changeLabels: Record<TechniqueChange["kind"], string> = {
  new: "Newly documented",
  refined: "Sub-technique refinement",
  shared: "Shared",
  "not-redocumented": "Not re-documented",
};

const confidenceLabels = { high: "High", medium: "Medium", low: "Low" } as const;

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function sourceFor(sources: Source[], id: string): Source | undefined {
  return sources.find((source) => source.id === id);
}

function tactics(change: TechniqueChange): string {
  return change.technique.tacticLabels.join(", ");
}

function sourceNames(change: TechniqueChange, sources: Source[]): string {
  return change.observation.sourceIds
    .map((id) => sourceFor(sources, id)?.publisher ?? id)
    .join("; ");
}

function scoreLines(hunt: ScoredHunt): string[] {
  return hunt.factors.map(
    (factor) => `- ${factor.label}: **${factor.points}** — ${factor.detail}`,
  );
}

function changeTable(
  title: string,
  changes: TechniqueChange[],
  sources: Source[],
): string[] {
  if (changes.length === 0) {
    return [`### ${title}`, "", "_None._", ""];
  }

  return [
    `### ${title} (${changes.length})`,
    "",
    "| ATT&CK | Technique | Tactics | Confidence | Sources |",
    "| --- | --- | --- | --- | --- |",
    ...changes.map(
      (change) =>
        `| ${change.techniqueId} | ${cell(change.technique.name)} | ${cell(tactics(change))} | ${confidenceLabels[change.observation.confidence]} | ${cell(sourceNames(change, sources))} |`,
    ),
    "",
  ];
}

function evidenceAppendix(observations: Observation[], sources: Source[]): string[] {
  const lines = ["## Evidence appendix", ""];

  for (const observation of observations) {
    lines.push(
      `### ${observation.techniqueId} · ${observation.snapshotId}`,
      "",
      `**Claim.** ${observation.claim}`,
      "",
      `**Confidence.** ${confidenceLabels[observation.confidence]} — ${observation.confidenceRationale}`,
      "",
    );

    for (const evidence of observation.evidence) {
      const source = sourceFor(sources, evidence.sourceId);
      const sourceLabel = source ? `${source.publisher}, ${source.title}` : evidence.sourceId;
      const citation = evidence.citedAs ? ` Source cited as ${evidence.citedAs}; normalised to current ATT&CK.` : "";
      lines.push(`- "${evidence.quote}" — ${sourceLabel}, ${evidence.locator}.${citation}`);
    }

    lines.push("");
  }

  return lines;
}

export function buildMarkdownReport(input: ReportInput, options: ReportOptions): string {
  const { caseFile, sources, comparison, coverage, hunts, observations } = input;
  const lines: string[] = [
    `# ThreatDelta — ${caseFile.title}`,
    "",
    `> ${caseFile.deck}`,
    "",
    `**Scope.** ${caseFile.scope}`,
    "",
    `- Baseline: **${comparison.baseline.label}** (${comparison.baseline.period})`,
    `- Target: **${comparison.target.label}** (${comparison.target.period})`,
    `- Generated: ${input.generatedAt}`,
    `- Framework: ${caseFile.attackVersion}`,
    "",
    "## Documentation delta",
    "",
    `- Baseline techniques: ${comparison.counts.baseline}`,
    `- Target techniques: ${comparison.counts.target}`,
    `- Newly documented: ${comparison.counts.newlyDocumented}`,
    `- Sub-technique refinements: ${comparison.counts.refinements}`,
    `- Added mappings (new + refinements): ${comparison.counts.addedMappings}`,
    `- Shared: ${comparison.counts.shared}`,
    `- Not re-documented: ${comparison.counts.notRedocumented}`,
    "",
    caseFile.universeNote,
    "",
    "## Read this first",
    "",
    ...caseFile.caveats.map((caveat) => `- ${caveat}`),
    "",
    ...changeTable("Newly documented", comparison.newlyDocumented, sources),
    ...changeTable("Sub-technique refinements", comparison.refinements, sources),
    ...changeTable("Shared", comparison.shared, sources),
    ...changeTable("Not re-documented", comparison.notRedocumented, sources),
  ];

  if (options.includeConflicts) {
    lines.push("## Conflicting and unresolved claims", "");
    if (comparison.conflicts.length === 0) {
      lines.push("_No conflicting claims in this comparison._", "");
    } else {
      for (const conflict of comparison.conflicts) {
        lines.push(
          `### ${conflict.title}`,
          "",
          `**Nature.** ${conflict.nature} · **Status.** ${conflict.status}`,
          "",
        );
        for (const claim of conflict.claims) {
          const source = sourceFor(sources, claim.sourceId);
          lines.push(
            `- **${source?.publisher ?? claim.sourceId}:** ${claim.text} _(${claim.locator})_`,
          );
        }
        lines.push(
          "",
          `**Interpretation.** ${conflict.interpretation}`,
          "",
          `**Analyst action.** ${conflict.analystAction}`,
          "",
        );
      }
    }
  }

  if (options.includeCoverage) {
    lines.push(
      "## Detection coverage",
      "",
      `Catalogue: ${coverage.summary.total} documented techniques, ${coverage.summary.covered} covered by an exact public Sigma rule, ${coverage.summary.broad} with only a parent-tagged rule for review, ${coverage.summary.gap} without a matching rule in this catalogue.`,
      "",
      "A missing public rule is not evidence that an organisation lacks a detection.",
      "",
      "| ATT&CK | Technique | Coverage | Rules |",
      "| --- | --- | --- | --- |",
      ...coverage.techniques.map((item) => {
        const ruleTitles = item.matches.map((match) => match.rule.title).join("; ");
        return `| ${item.technique.id} | ${cell(item.technique.name)} | ${statusLabels[item.status]} | ${cell(ruleTitles || "—")} |`;
      }),
      "",
    );
  }

  if (options.includeHunts) {
    lines.push("## Hunt hypotheses", "");
    for (const scored of hunts) {
      lines.push(
        `### ${scored.rank}. ${scored.hunt.title} — score ${scored.score}/11`,
        "",
        `**Question.** ${scored.hunt.question}`,
        "",
        `**Why now.** ${scored.hunt.summary}`,
        "",
        `**Rationale.** ${scored.hunt.rationale}`,
        "",
        "**Required logs**",
        "",
        ...scored.hunt.requiredLogs.map(
          (log) => `- ${log.source} (${log.events}) — ${log.why}`,
        ),
        "",
        "**Steps**",
        "",
        ...scored.hunt.steps.map((step, index) => `${index + 1}. ${step}`),
        "",
        "**False positives**",
        "",
        ...scored.hunt.falsePositives.map((item) => `- ${item}`),
        "",
        "**Priority breakdown**",
        "",
        ...scoreLines(scored),
        "",
      );
    }
  }

  if (options.includeEvidence) {
    lines.push(...evidenceAppendix(observations, sources));
  }

  if (options.includeSources) {
    lines.push("## Sources", "");
    for (const source of sources) {
      const published = source.retrievedAt
        ? `${source.publishedAt} · retrieved ${source.retrievedAt}`
        : source.publishedAt;
      lines.push(
        `- **${source.publisher}.** [${source.title}](${source.url}) (${published}). ${source.note}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Method",
    "",
    "- Comparison universe: techniques mapped to the two ATT&CK software entries. Parent/child relationships are used to separate sub-technique refinements from genuinely new mappings.",
    "- Evidence confidence: high means a direct government or primary-source quote; medium means a MITRE mapping supported mainly by vendor reporting or a single source.",
    "- Detection coverage: exact rule tags count as direct coverage; parent-tagged rules are shown as adjacent but are not counted as coverage; a child-only rule is related but not counted.",
    "- Hunt priority: documentation delta (max 3) + tactic exposure (max 3) + detection gap (max 3) + evidence strength (max 2).",
    "",
    "## Limitations",
    "",
    caseFile.universeNote,
    "",
    "- This is a documentation comparison, not telemetry or incident data.",
    "- No organisational detection inventory is included; public Sigma coverage is only a proxy for available logic.",
    "- ATT&CK mappings can lag, over-generalise, or differ between sources. The conflicts section records where this matters.",
    "",
    "---",
    "",
    "Generated by ThreatDelta. All quoted material remains attributable to its original publisher.",
  );

  return lines.join("\n");
}

export function buildJsonReport(input: ReportInput, options: ReportOptions): string {
  const { caseFile, sources, comparison, coverage, hunts, observations } = input;
  const payload: Record<string, unknown> = {
    schemaVersion: "1.0",
    generatedAt: input.generatedAt,
    tool: "ThreatDelta",
    meta: {
      caseId: caseFile.id,
      title: caseFile.title,
      deck: caseFile.deck,
      scope: caseFile.scope,
      attackVersion: caseFile.attackVersion,
      asOf: caseFile.asOf,
      universeNote: caseFile.universeNote,
      caveats: caseFile.caveats,
    },
    baseline: comparison.baseline,
    target: comparison.target,
    comparison: {
      counts: comparison.counts,
      newlyDocumented: comparison.newlyDocumented.map((change) => serializeChange(change, options.includeEvidence)),
      refinements: comparison.refinements.map((change) => serializeChange(change, options.includeEvidence)),
      shared: comparison.shared.map((change) => serializeChange(change, options.includeEvidence)),
      notRedocumented: comparison.notRedocumented.map((change) => serializeChange(change, options.includeEvidence)),
      conflicts: options.includeConflicts ? comparison.conflicts : [],
    },
    methodology: {
      confidence: "High = direct primary-source quote; medium = MITRE mapping with vendor reporting; low = weak or inferred support.",
      coverage: "Exact = direct; parent-tagged = broad; child-only = related but not counted.",
      priority: "Documentation delta (3) + tactic exposure (3) + detection gap (3) + evidence strength (2).",
    },
    limitations: caseFile.caveats,
  };

  if (options.includeCoverage) {
    payload.coverage = {
      snapshotId: coverage.snapshotId,
      summary: coverage.summary,
      techniques: coverage.techniques.map((item) => ({
        techniqueId: item.technique.id,
        technique: item.technique.name,
        status: item.status,
        rules: item.matches.map((match) => ({
          id: match.rule.id,
          title: match.rule.title,
          match: match.match,
          level: match.rule.level,
          url: match.rule.sourceUrl,
        })),
      })),
    };
  }

  if (options.includeHunts) payload.hunts = hunts;

  if (options.includeEvidence) {
    payload.evidence = observations.map((observation) => ({
      ...observation,
      evidence: observation.evidence.map((evidence) => {
        const source = sourceFor(sources, evidence.sourceId);
        return {
          ...evidence,
          source: source
            ? { title: source.title, publisher: source.publisher, url: source.url }
            : null,
        };
      }),
    }));
  }

  if (options.includeSources) payload.sources = sources;

  return JSON.stringify(payload, null, 2);
}

function serializeChange(change: TechniqueChange, includeEvidence: boolean) {
  const value = {
    techniqueId: change.techniqueId,
    technique: change.technique.name,
    tactics: change.technique.tacticLabels,
    kind: change.kind,
    kindLabel: changeLabels[change.kind],
    claim: change.observation.claim,
    confidence: change.observation.confidence,
    confidenceRationale: change.observation.confidenceRationale,
    sourceIds: change.observation.sourceIds,
  };

  if (includeEvidence) {
    return { ...value, evidence: change.observation.evidence };
  }

  return value;
}

export function reportFilename(format: "md" | "json", generatedAt: string): string {
  const stamp = generatedAt.slice(0, 10);
  return `threatdelta-lockbit-${stamp}.${format}`;
}
