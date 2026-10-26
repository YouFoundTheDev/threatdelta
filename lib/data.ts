import caseJson from "@/data/case.json";
import datasetJson from "@/data/dataset.json";
import conflictJson from "@/data/conflicts.json";
import huntJson from "@/data/hunts.json";
import monitoringJson from "@/data/monitoring.json";
import observationJson from "@/data/observations.json";
import sigmaJson from "@/data/sigma-rules.json";
import sourceJson from "@/data/sources.json";
import techniqueJson from "@/data/techniques.json";
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

export const caseFile = caseJson as CaseFile;
export const dataset = datasetJson as AttackDataset;
export const sources = sourceJson as Source[];
export const techniques = techniqueJson as Technique[];
export const observations = observationJson as Observation[];
export const conflicts = conflictJson as Conflict[];
export const sigmaRules = sigmaJson as SigmaRule[];
export const hunts = huntJson as Hunt[];
export const monitoring = monitoringJson as MonitoringConfig;

export const sourceById = new Map(sources.map((source) => [source.id, source]));
export const techniqueById = new Map(techniques.map((technique) => [technique.id, technique]));

export const baselineSnapshot = caseFile.snapshots[0];
export const targetSnapshot = caseFile.snapshots[1];
