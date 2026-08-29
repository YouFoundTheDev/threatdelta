import { buildTechniqueIndex, compareTechniques, matchRuleToTechnique } from "./attack";
import type {
  CoverageResult,
  CoverageStatus,
  Observation,
  RuleMatch,
  SigmaRule,
  Technique,
  TechniqueCoverage,
} from "./types";

const statusOrder: Record<CoverageStatus, number> = {
  gap: 0,
  broad: 1,
  direct: 2,
};

function statusFor(matches: RuleMatch[]): CoverageStatus {
  if (matches.some((match) => match.match === "exact")) return "direct";
  if (matches.some((match) => match.match === "parent")) return "broad";
  return "gap";
}

export function coverTechnique(
  technique: Technique,
  observation: Observation | undefined,
  rules: SigmaRule[],
  techniques: Technique[],
): TechniqueCoverage {
  const index = buildTechniqueIndex(techniques);
  const matches: RuleMatch[] = [];
  const related: RuleMatch[] = [];

  for (const rule of rules) {
    const match = matchRuleToTechnique(rule.techniqueIds, technique.id, index);
    if (!match) continue;

    if (match === "child") {
      related.push({ rule, match });
    } else {
      matches.push({ rule, match });
    }
  }

  matches.sort((a, b) => {
    const byMatch = a.match === b.match ? 0 : a.match === "exact" ? -1 : 1;
    return byMatch || a.rule.title.localeCompare(b.rule.title);
  });
  related.sort((a, b) => a.rule.title.localeCompare(b.rule.title));

  return {
    technique,
    observation,
    status: statusFor(matches),
    matches,
    related,
  };
}

export function buildCoverage(
  snapshotId: string,
  observations: Observation[],
  rules: SigmaRule[],
  techniques: Technique[],
): CoverageResult {
  const techniqueIndex = buildTechniqueIndex(techniques);
  const snapshotObservations = observations.filter(
    (observation) => observation.snapshotId === snapshotId,
  );

  const covered = snapshotObservations
    .map((observation) => {
      const technique = techniqueIndex.get(observation.techniqueId);
      if (!technique) return null;
      return coverTechnique(technique, observation, rules, techniques);
    })
    .filter((item): item is TechniqueCoverage => item !== null)
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || compareTechniques(a.technique, b.technique));

  const direct = covered.filter((item) => item.status === "direct").length;
  const broad = covered.filter((item) => item.status === "broad").length;
  const gap = covered.filter((item) => item.status === "gap").length;
  const total = covered.length;

  return {
    snapshotId,
    techniques: covered,
    summary: {
      total,
      direct,
      broad,
      gap,
      covered: direct,
      percent: total === 0 ? 0 : Math.round((direct / total) * 100),
    },
  };
}
