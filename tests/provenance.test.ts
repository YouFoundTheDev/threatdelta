import { describe, expect, it } from "vitest";
import {
  caseFile,
  conflicts,
  hunts,
  observations,
  sigmaRules,
  sources,
  techniques,
} from "@/lib/data";
import { validateDataset } from "@/lib/provenance";
import type { Observation } from "@/lib/types";

const dataset = { caseFile, sources, techniques, observations, conflicts, sigmaRules, hunts };

describe("evidence provenance", () => {
  it("passes every dataset integrity check", () => {
    const issues = validateDataset(dataset);
    expect(issues.filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("keeps every finding attributable to a registered source", () => {
    const sourceIds = new Set(sources.map((source) => source.id));
    for (const observation of observations) {
      expect(observation.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of observation.sourceIds) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }
      for (const evidence of observation.evidence) {
        expect(sourceIds.has(evidence.sourceId)).toBe(true);
        expect(evidence.quote.length).toBeGreaterThan(10);
        expect(evidence.locator.length).toBeGreaterThan(3);
      }
    }
  });

  it("catches a broken evidence reference", () => {
    const broken = structuredClone(observations) as Observation[];
    broken[0].evidence[0].sourceId = "missing-source";
    const issues = validateDataset({ ...dataset, observations: broken });
    expect(issues.some((issue) => issue.message.includes("missing source"))).toBe(true);
  });

  it("requires synthetic material to say so", () => {
    const broken = structuredClone(observations) as Observation[];
    broken[0].synthetic = true;
    const issues = validateDataset({ ...dataset, observations: broken });
    expect(issues.some((issue) => issue.message.includes("synthetic"))).toBe(true);
  });
});
