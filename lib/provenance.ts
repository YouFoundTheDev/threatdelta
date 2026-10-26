import type {
  AttackDataset,
  CaseFile,
  Conflict,
  Hunt,
  MonitoringConfig,
  Observation,
  SigmaRule,
  Source,
  Technique,
} from "./types";

export interface DatasetInput {
  caseFile: CaseFile;
  dataset: AttackDataset;
  monitoring: MonitoringConfig;
  sources: Source[];
  techniques: Technique[];
  observations: Observation[];
  conflicts: Conflict[];
  sigmaRules: SigmaRule[];
  hunts: Hunt[];
}

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateDataset(data: DatasetInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sourceIds = new Set(data.sources.map((source) => source.id));
  const techniqueIds = new Set(data.techniques.map((technique) => technique.id));
  const snapshotIds = new Set(data.caseFile.snapshots.map((snapshot) => snapshot.id));
  const allIds = [
    ...data.sources.map((source) => source.id),
    ...data.techniques.map((technique) => technique.id),
    ...data.observations.map((observation) => observation.id),
    ...data.conflicts.map((conflict) => conflict.id),
    ...data.sigmaRules.map((rule) => rule.id),
    ...data.hunts.map((hunt) => hunt.id),
  ];

  for (const id of duplicates(allIds)) {
    issues.push({ level: "error", message: `Duplicate id: ${id}` });
  }

  const evidenceIds = data.observations.flatMap((observation) =>
    observation.evidence.map((evidence) => evidence.id),
  );
  for (const id of duplicates(evidenceIds)) {
    issues.push({ level: "error", message: `Duplicate evidence id: ${id}` });
  }

  const dataset = data.dataset;
  if (!data.caseFile.attackVersion.endsWith(dataset.attack.version)) {
    issues.push({
      level: "error",
      message: `Case ATT&CK label ${data.caseFile.attackVersion} does not match dataset ${dataset.attack.version}`,
    });
  }
  if (data.caseFile.attackReleaseDate !== dataset.attack.releasedAt) {
    issues.push({ level: "error", message: "Case and dataset ATT&CK release dates differ" });
  }
  if (data.caseFile.verifiedAt !== dataset.attack.verifiedAt) {
    issues.push({ level: "error", message: "Case and dataset verification dates differ" });
  }
  if (!isHttpUrl(dataset.attack.sourceUrl) || !isHttpUrl(dataset.attack.datasetUrl)) {
    issues.push({ level: "error", message: "Dataset source URLs are invalid" });
  }
  if (data.sigmaRules.length !== dataset.sigma.ruleCount) {
    issues.push({
      level: "error",
      message: `Sigma catalogue has ${data.sigmaRules.length} rules but manifest says ${dataset.sigma.ruleCount}`,
    });
  }
  for (const [softwareId, software] of Object.entries(dataset.attack.software)) {
    const snapshotId = softwareId === "S1199" ? "lockbit-2.0" : softwareId === "S1202" ? "lockbit-3.0" : null;
    if (!snapshotId) {
      issues.push({ level: "error", message: `Unknown software manifest entry ${softwareId}` });
      continue;
    }
    const count = data.observations.filter((observation) => observation.snapshotId === snapshotId).length;
    if (count !== software.techniqueCount) {
      issues.push({
        level: "error",
        message: `${softwareId} has ${count} observations but manifest says ${software.techniqueCount}`,
      });
    }
  }

  if (!isHttpUrl(data.monitoring.workflowUrl) || !isHttpUrl(data.monitoring.attack.indexUrl) || !isHttpUrl(data.monitoring.sigma.commitApi)) {
    issues.push({ level: "error", message: "Monitoring configuration contains an invalid URL" });
  }
  if (data.monitoring.reportFeeds.length < 2) {
    issues.push({ level: "error", message: "At least two report feeds must be monitored" });
  }
  for (const feed of data.monitoring.reportFeeds) {
    if (!isHttpUrl(feed.url)) issues.push({ level: "error", message: `${feed.id} has an invalid feed URL` });
    if (feed.terms.length === 0) issues.push({ level: "error", message: `${feed.id} has no matching terms` });
  }
  for (const report of data.monitoring.knownReports) {
    if (!isHttpUrl(report.url)) issues.push({ level: "error", message: `${report.title} has an invalid URL` });
  }

  for (const source of data.sources) {
    if (!isHttpUrl(source.url)) {
      issues.push({ level: "error", message: `${source.id} has an invalid URL` });
    }
    if (!source.publishedAt) {
      issues.push({ level: "error", message: `${source.id} has no publication date` });
    }
    if (!source.retrievedAt) {
      issues.push({ level: "warning", message: `${source.id} has no verification date` });
    }
    if (source.retrievedAt && source.retrievedAt < source.publishedAt) {
      issues.push({ level: "error", message: `${source.id} was verified before it was published` });
    }
  }

  for (const technique of data.techniques) {
    if (technique.tactics.length === 0) {
      issues.push({ level: "error", message: `${technique.id} has no tactic` });
    }
    if (!isHttpUrl(technique.url)) {
      issues.push({ level: "error", message: `${technique.id} has an invalid ATT&CK URL` });
    }
    if (technique.subtechniqueOf && !techniqueIds.has(technique.subtechniqueOf)) {
      issues.push({
        level: "error",
        message: `${technique.id} references missing parent ${technique.subtechniqueOf}`,
      });
    }
  }

  for (const snapshot of data.caseFile.snapshots) {
    for (const sourceId of snapshot.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          level: "error",
          message: `Snapshot ${snapshot.id} references missing source ${sourceId}`,
        });
      }
    }
  }

  for (const observation of data.observations) {
    const prefix = `${observation.snapshotId}/${observation.techniqueId}`;

    if (!snapshotIds.has(observation.snapshotId)) {
      issues.push({ level: "error", message: `${prefix} has an unknown snapshot` });
    }
    if (!techniqueIds.has(observation.techniqueId)) {
      issues.push({ level: "error", message: `${prefix} has an unknown technique` });
    }
    if (observation.evidence.length === 0) {
      issues.push({ level: "error", message: `${prefix} has no evidence` });
    }
    if (observation.confidenceRationale.trim().length < 25) {
      issues.push({ level: "error", message: `${prefix} has a thin confidence rationale` });
    }

    const evidenceSources = new Set<string>();
    for (const evidence of observation.evidence) {
      evidenceSources.add(evidence.sourceId);
      if (!sourceIds.has(evidence.sourceId)) {
        issues.push({
          level: "error",
          message: `Evidence ${evidence.id} references missing source ${evidence.sourceId}`,
        });
      }
      if (evidence.quote.trim().length < 8) {
        issues.push({ level: "error", message: `Evidence ${evidence.id} has an empty quote` });
      }
      if (!evidence.locator.trim()) {
        issues.push({ level: "error", message: `Evidence ${evidence.id} has no locator` });
      }
    }

    for (const sourceId of observation.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          level: "error",
          message: `${prefix} references missing source ${sourceId}`,
        });
      }
      if (!evidenceSources.has(sourceId)) {
        issues.push({
          level: "warning",
          message: `${prefix} lists ${sourceId} but has no evidence from it`,
        });
      }
    }

    if (observation.synthetic && !observation.confidenceRationale.toLowerCase().includes("synthetic")) {
      issues.push({
        level: "error",
        message: `${prefix} is synthetic but not labelled as such`,
      });
    }
  }

  for (const conflict of data.conflicts) {
    if (conflict.claims.length < 2) {
      issues.push({ level: "error", message: `${conflict.id} needs at least two claims` });
    }
    for (const techniqueId of conflict.techniqueIds) {
      if (!techniqueIds.has(techniqueId)) {
        issues.push({
          level: "error",
          message: `${conflict.id} references missing technique ${techniqueId}`,
        });
      }
    }
    for (const claim of conflict.claims) {
      if (!sourceIds.has(claim.sourceId)) {
        issues.push({
          level: "error",
          message: `${conflict.id} references missing source ${claim.sourceId}`,
        });
      }
      if (!snapshotIds.has(claim.snapshotId)) {
        issues.push({
          level: "error",
          message: `${conflict.id} references missing snapshot ${claim.snapshotId}`,
        });
      }
      if (!conflict.techniqueIds.includes(claim.techniqueId)) {
        issues.push({
          level: "error",
          message: `${conflict.id} claim technique ${claim.techniqueId} is not declared`,
        });
      }
    }
  }

  for (const rule of data.sigmaRules) {
    if (!isHttpUrl(rule.sourceUrl)) {
      issues.push({ level: "error", message: `${rule.id} has an invalid source URL` });
    }
    if (!rule.sourceUrl.includes(dataset.sigma.commit)) {
      issues.push({
        level: "error",
        message: `${rule.id} is not pinned to the verified SigmaHQ commit`,
      });
    }
    if (rule.techniqueIds.length === 0) {
      issues.push({ level: "error", message: `${rule.title} has no ATT&CK tags` });
    }
    for (const techniqueId of rule.techniqueIds) {
      if (!techniqueIds.has(techniqueId)) {
        issues.push({
          level: "error",
          message: `${rule.title} references missing technique ${techniqueId}`,
        });
      }
    }
  }

  for (const hunt of data.hunts) {
    if (hunt.requiredLogs.length < 2) {
      issues.push({ level: "error", message: `${hunt.id} needs at least two log sources` });
    }
    if (hunt.steps.length < 3) {
      issues.push({ level: "error", message: `${hunt.id} needs at least three steps` });
    }
    if (hunt.falsePositives.length < 2) {
      issues.push({ level: "error", message: `${hunt.id} needs at least two false positives` });
    }
    for (const techniqueId of hunt.techniqueIds) {
      if (!techniqueIds.has(techniqueId)) {
        issues.push({
          level: "error",
          message: `${hunt.id} references missing technique ${techniqueId}`,
        });
      }
    }
    for (const sourceId of hunt.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          level: "error",
          message: `${hunt.id} references missing source ${sourceId}`,
        });
      }
    }
  }

  if (data.caseFile.snapshots.length < 2) {
    issues.push({ level: "error", message: "A comparison needs two snapshots" });
  }

  return issues;
}
