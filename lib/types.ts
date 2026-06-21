export type SourceKind = "government" | "mitre" | "vendor" | "community";
export type Confidence = "high" | "medium" | "low";
export type EvidenceKind = "mapping" | "direct" | "analyst-note";
export type ChangeKind = "new" | "refined" | "shared" | "not-redocumented";
export type CoverageStatus = "direct" | "broad" | "gap";
export type MatchKind = "exact" | "parent" | "child";
export type ConflictNature = "capability" | "taxonomy" | "coverage";

export interface Source {
  id: string;
  title: string;
  publisher: string;
  kind: SourceKind;
  publishedAt: string;
  retrievedAt?: string;
  url: string;
  note: string;
}

export interface Snapshot {
  id: string;
  label: string;
  version: string;
  releasedAt: string;
  period: string;
  sourceIds: string[];
  summary: string;
  limitations: string;
}

export interface CaseFile {
  id: string;
  title: string;
  eyebrow: string;
  deck: string;
  asOf: string;
  attackVersion: string;
  scope: string;
  universeNote: string;
  snapshots: Snapshot[];
  caveats: string[];
}

export interface Technique {
  id: string;
  name: string;
  tactics: string[];
  tacticLabels: string[];
  description: string;
  url: string;
  subtechniqueOf: string | null;
}

export interface Evidence {
  id: string;
  sourceId: string;
  kind: EvidenceKind;
  quote: string;
  locator: string;
  citedAs?: string;
  synthetic?: boolean;
}

export interface Observation {
  id: string;
  snapshotId: string;
  techniqueId: string;
  claim: string;
  confidence: Confidence;
  confidenceRationale: string;
  sourceIds: string[];
  evidence: Evidence[];
  synthetic?: boolean;
}

export interface ConflictClaim {
  sourceId: string;
  snapshotId: string;
  techniqueId: string;
  text: string;
  locator: string;
  citedAs?: string;
}

export interface Conflict {
  id: string;
  title: string;
  nature: ConflictNature;
  techniqueIds: string[];
  snapshotIds: string[];
  claims: ConflictClaim[];
  interpretation: string;
  analystAction: string;
  status: string;
}

export interface SigmaRule {
  id: string;
  title: string;
  status: string;
  level: "low" | "medium" | "high" | "critical";
  description: string;
  logsource: string;
  techniqueIds: string[];
  sourceUrl: string;
  author: string;
  license: string;
}

export interface HuntLogSource {
  source: string;
  events: string;
  why: string;
}

export interface Hunt {
  id: string;
  title: string;
  question: string;
  techniqueIds: string[];
  summary: string;
  rationale: string;
  requiredLogs: HuntLogSource[];
  steps: string[];
  falsePositives: string[];
  sourceIds: string[];
}

export interface RuleMatch {
  rule: SigmaRule;
  match: MatchKind;
}

export interface TechniqueCoverage {
  technique: Technique;
  observation?: Observation;
  status: CoverageStatus;
  matches: RuleMatch[];
  related: RuleMatch[];
}

export interface CoverageSummary {
  total: number;
  direct: number;
  broad: number;
  gap: number;
  covered: number;
  percent: number;
}

export interface CoverageResult {
  snapshotId: string;
  techniques: TechniqueCoverage[];
  summary: CoverageSummary;
}

export interface TechniqueChange {
  techniqueId: string;
  kind: ChangeKind;
  technique: Technique;
  observation: Observation;
  baselineObservation?: Observation;
}

export interface ComparisonCounts {
  baseline: number;
  target: number;
  shared: number;
  newlyDocumented: number;
  refinements: number;
  addedMappings: number;
  notRedocumented: number;
  conflicts: number;
}

export interface Comparison {
  baseline: Snapshot;
  target: Snapshot;
  changes: TechniqueChange[];
  newlyDocumented: TechniqueChange[];
  refinements: TechniqueChange[];
  shared: TechniqueChange[];
  notRedocumented: TechniqueChange[];
  conflicts: Conflict[];
  counts: ComparisonCounts;
}

export interface ScoreFactor {
  label: string;
  points: number;
  detail: string;
}

export interface ScoredHunt {
  hunt: Hunt;
  score: number;
  rank: number;
  factors: ScoreFactor[];
}

export interface ReportOptions {
  includeEvidence: boolean;
  includeCoverage: boolean;
  includeHunts: boolean;
  includeConflicts: boolean;
  includeSources: boolean;
}

export interface ReportInput {
  caseFile: CaseFile;
  sources: Source[];
  comparison: Comparison;
  coverage: CoverageResult;
  hunts: ScoredHunt[];
  observations: Observation[];
  techniques: Technique[];
  generatedAt: string;
}
