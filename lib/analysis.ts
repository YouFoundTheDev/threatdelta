import {
  baselineSnapshot,
  caseFile,
  conflicts,
  dataset,
  hunts,
  monitoring,
  observations,
  sigmaRules,
  sourceById,
  sources,
  targetSnapshot,
  techniques,
} from "./data";
import { buildCoverage } from "./detection";
import { compareSnapshots } from "./diff";
import { scoreHunts } from "./hunt";
import { validateDataset } from "./provenance";
import type { Observation, Source } from "./types";

export { caseFile, dataset };

export const comparison = compareSnapshots(
  baselineSnapshot,
  targetSnapshot,
  observations,
  techniques,
  conflicts,
);

export const baselineCoverage = buildCoverage(
  baselineSnapshot.id,
  observations,
  sigmaRules,
  techniques,
);

export const targetCoverage = buildCoverage(
  targetSnapshot.id,
  observations,
  sigmaRules,
  techniques,
);

export const scoredHunts = scoreHunts(
  hunts,
  comparison,
  targetCoverage,
  techniques,
);

export const validationIssues = validateDataset({
  caseFile,
  dataset,
  monitoring,
  sources,
  techniques,
  observations,
  conflicts,
  sigmaRules,
  hunts,
});

export interface Finding {
  observation: Observation;
  source: Source;
  publishedAt: string;
}

function directEvidenceFindings(): Finding[] {
  const byObservation = new Map<string, Finding>();

  for (const observation of observations) {
    for (const evidence of observation.evidence) {
      if (evidence.kind !== "direct") continue;
      const source = sourceById.get(evidence.sourceId);
      if (!source) continue;

      const current = byObservation.get(observation.id);
      if (!current || source.publishedAt > current.publishedAt) {
        byObservation.set(observation.id, {
          observation,
          source,
          publishedAt: source.publishedAt,
        });
      }
    }
  }

  const findings = [...byObservation.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // keep the panel varied: one latest finding per source, then fill with the rest
  const seenSources = new Set<string>();
  const varied: Finding[] = [];
  for (const finding of findings) {
    if (seenSources.has(finding.source.id)) continue;
    seenSources.add(finding.source.id);
    varied.push(finding);
  }
  for (const finding of findings) {
    if (varied.length >= 5) break;
    if (!varied.includes(finding)) varied.push(finding);
  }

  return varied.slice(0, 5).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export const recentFindings = directEvidenceFindings();

export const datasetStats = {
  snapshots: caseFile.snapshots.length,
  findings: observations.length,
  baselineTechniques: comparison.counts.baseline,
  targetTechniques: comparison.counts.target,
  addedMappings: comparison.counts.addedMappings,
  newlyDocumented: comparison.counts.newlyDocumented,
  refinements: comparison.counts.refinements,
  shared: comparison.counts.shared,
  notRedocumented: comparison.counts.notRedocumented,
  conflicts: comparison.counts.conflicts,
  evidence: observations.reduce((total, observation) => total + observation.evidence.length, 0),
  sources: sources.length,
  sigmaRules: sigmaRules.length,
  hunts: scoredHunts.length,
  coverage: targetCoverage.summary,
};
