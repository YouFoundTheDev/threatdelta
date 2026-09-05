import type {
  Comparison,
  Confidence,
  CoverageResult,
  CoverageStatus,
  Hunt,
  ScoreFactor,
  ScoredHunt,
  Technique,
  TechniqueChange,
} from "./types";

const documentationPoints: Record<TechniqueChange["kind"], number> = {
  new: 3,
  refined: 2,
  shared: 1,
  "not-redocumented": 0,
};

const documentationLabel: Record<TechniqueChange["kind"], string> = {
  new: "newly documented",
  refined: "sub-technique refinement",
  shared: "shared",
  "not-redocumented": "not re-documented",
};

const tacticPoints: Record<string, number> = {
  impact: 3,
  "initial-access": 3,
  "lateral-movement": 2,
  "defense-impairment": 2,
  persistence: 1,
  stealth: 1,
  "privilege-escalation": 1,
  execution: 1,
  discovery: 1,
  "credential-access": 1,
  "command-and-control": 1,
  exfiltration: 1,
  collection: 1,
};

const coveragePoints: Record<CoverageStatus, number> = {
  gap: 3,
  broad: 1,
  direct: 0,
};

const confidencePoints: Record<Confidence, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function scoreHunt(
  hunt: Hunt,
  comparison: Comparison,
  coverage: CoverageResult,
  techniques: Technique[],
): ScoredHunt {
  const techniqueIndex = new Map(techniques.map((technique) => [technique.id, technique]));
  const changes = new Map(
    comparison.changes.map((change) => [change.techniqueId, change]),
  );
  const coverageByTechnique = new Map(
    coverage.techniques.map((item) => [item.technique.id, item]),
  );

  const observedHuntTechniques = hunt.techniqueIds.filter((id) => changes.has(id));
  const docScores = observedHuntTechniques.map(
    (id) => documentationPoints[changes.get(id)!.kind],
  );
  const docScore = docScores.length ? Math.max(...docScores) : 0;
  const docDetail = observedHuntTechniques.length
    ? observedHuntTechniques
        .map((id) => `${id} ${documentationLabel[changes.get(id)!.kind]}`)
        .join("; ")
    : "No implicated technique is in the comparison universe";

  const tacticCandidates = hunt.techniqueIds
    .map((id) => techniqueIndex.get(id))
    .filter((technique): technique is Technique => Boolean(technique));
  const tacticScore = tacticCandidates.length
    ? Math.max(...tacticCandidates.map((technique) => Math.max(...technique.tactics.map((tactic) => tacticPoints[tactic] ?? 1))))
    : 0;
  const exposedTactics = unique(
    tacticCandidates.flatMap((technique) => technique.tacticLabels),
  );
  const tacticDetail = exposedTactics.length
    ? `Exposure includes ${exposedTactics.slice(0, 3).join(", ")}`
    : "No tactic metadata";

  const coverageScores = hunt.techniqueIds.map((id) => {
    const item = coverageByTechnique.get(id);
    return item ? coveragePoints[item.status] : 0;
  });
  const gapScore = coverageScores.length ? Math.max(...coverageScores) : 0;
  const gapDetail = hunt.techniqueIds
    .map((id) => {
      const item = coverageByTechnique.get(id);
      if (!item) return `${id} outside snapshot mapping`;
      if (item.status === "gap") return `${id} has no public rule`;
      if (item.status === "broad") return `${id} has a parent-tagged rule for review`;
      return `${id} is directly covered`;
    })
    .join("; ");

  const confidenceScores = hunt.techniqueIds
    .map((id) => changes.get(id)?.observation.confidence)
    .filter((confidence): confidence is Confidence => Boolean(confidence))
    .map((confidence) => confidencePoints[confidence]);
  const confidenceScore = confidenceScores.length ? Math.max(...confidenceScores) : 0;
  const confidenceDetail = confidenceScores.length
    ? `Strongest evidence is ${confidenceScores.includes(2) ? "high" : "medium"} confidence`
    : "No evidence confidence in the comparison";

  const factors: ScoreFactor[] = [
    {
      label: "Documentation delta",
      points: docScore,
      detail: docDetail,
    },
    {
      label: "Tactic exposure",
      points: tacticScore,
      detail: tacticDetail,
    },
    {
      label: "Detection gap",
      points: gapScore,
      detail: gapDetail,
    },
    {
      label: "Evidence strength",
      points: confidenceScore,
      detail: confidenceDetail,
    },
  ];

  return {
    hunt,
    score: factors.reduce((total, factor) => total + factor.points, 0),
    rank: 0,
    factors,
  };
}

export function scoreHunts(
  huntList: Hunt[],
  comparison: Comparison,
  coverage: CoverageResult,
  techniques: Technique[],
): ScoredHunt[] {
  return huntList
    .map((hunt) => scoreHunt(hunt, comparison, coverage, techniques))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.hunt.techniqueIds.length !== a.hunt.techniqueIds.length) {
        return b.hunt.techniqueIds.length - a.hunt.techniqueIds.length;
      }
      return a.hunt.title.localeCompare(b.hunt.title);
    })
    .map((hunt, index) => ({ ...hunt, rank: index + 1 }));
}
