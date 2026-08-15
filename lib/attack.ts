import type { MatchKind, Technique } from "./types";

export const TACTIC_ORDER = [
  "reconnaissance",
  "resource-development",
  "initial-access",
  "execution",
  "persistence",
  "privilege-escalation",
  "stealth",
  "defense-impairment",
  "credential-access",
  "discovery",
  "lateral-movement",
  "collection",
  "command-and-control",
  "exfiltration",
  "impact",
];

export function tacticRank(technique: Technique): number {
  const ranks = technique.tactics
    .map((tactic) => TACTIC_ORDER.indexOf(tactic))
    .filter((rank) => rank >= 0);
  return ranks.length ? Math.min(...ranks) : TACTIC_ORDER.length;
}

export function compareTechniques(a: Technique, b: Technique): number {
  const rank = tacticRank(a) - tacticRank(b);
  return rank !== 0 ? rank : a.id.localeCompare(b.id);
}

export type TechniqueIndex = Map<string, Technique>;

export function buildTechniqueIndex(techniques: Technique[]): TechniqueIndex {
  return new Map(techniques.map((technique) => [technique.id, technique]));
}

export function techniqueAncestors(
  techniqueId: string,
  index: TechniqueIndex,
): string[] {
  const ancestors: string[] = [];
  let parentId = index.get(techniqueId)?.subtechniqueOf ?? null;

  while (parentId) {
    ancestors.push(parentId);
    parentId = index.get(parentId)?.subtechniqueOf ?? null;
  }

  return ancestors;
}

export function isSubtechniqueOf(
  techniqueId: string,
  ancestorId: string,
  index: TechniqueIndex,
): boolean {
  return techniqueAncestors(techniqueId, index).includes(ancestorId);
}

// a rule tagged with a parent technique can reasonably cover a sub-technique;
// a rule tagged with a child technique does not cover the whole parent.
export function matchRuleToTechnique(
  ruleTechniqueIds: string[],
  observedTechniqueId: string,
  index: TechniqueIndex,
): MatchKind | null {
  if (ruleTechniqueIds.includes(observedTechniqueId)) return "exact";

  if (
    ruleTechniqueIds.some((ruleId) =>
      isSubtechniqueOf(observedTechniqueId, ruleId, index),
    )
  ) {
    return "parent";
  }

  if (
    ruleTechniqueIds.some((ruleId) =>
      isSubtechniqueOf(ruleId, observedTechniqueId, index),
    )
  ) {
    return "child";
  }

  return null;
}
