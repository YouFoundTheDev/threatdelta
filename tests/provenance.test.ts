import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  caseFile,
  conflicts,
  dataset,
  hunts,
  monitoring,
  observations,
  sigmaRules,
  sources,
  techniques,
} from "@/lib/data";
import { validateDataset } from "@/lib/provenance";
import type { Observation } from "@/lib/types";

const caseDataset = { caseFile, dataset, monitoring, sources, techniques, observations, conflicts, sigmaRules, hunts };

describe("evidence provenance", () => {
  it("passes every dataset integrity check", () => {
    const issues = validateDataset(caseDataset);
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

  it("matches the case version labels to the verified dataset manifest", () => {
    expect(caseFile.attackVersion).toBe("ATT&CK v20.0");
    expect(caseFile.attackReleaseDate).toBe("2026-10-13");
    expect(caseFile.verifiedAt).toBe("2026-10-26");
    expect(caseFile.historicalPeriod).toBe("February 2022 – June 2023");
    expect(dataset.attack.version).toBe("v20.0");
    expect(dataset.attack.software.S1199.techniqueCount).toBe(26);
    expect(dataset.attack.software.S1202.techniqueCount).toBe(34);
    expect(dataset.sigma.ruleCount).toBe(sigmaRules.length);
  });

  it("pins every Sigma rule to the verified commit and records verification dates", () => {
    const sourceIds = new Set(sources.map((source) => source.id));
    expect(sourceIds.has("mitre-attack-release")).toBe(true);
    expect(caseFile.attackSourceId).toBe("mitre-attack-release");
    expect(monitoring.reportFeeds.map((feed) => feed.id)).toEqual([
      "cisa-advisories",
      "fbi-ic3-csa",
      "unit42",
      "sentinelone-labs",
    ]);
    expect(dataset.attack.datasetSha256).toMatch(/^[a-f0-9]{64}$/);
    for (const rule of sigmaRules) {
      expect(rule.sourceUrl).toContain(dataset.sigma.commit);
    }
    for (const source of sources) {
      expect(source.retrievedAt).toBe("2026-10-26");
    }
  });

  it("keeps mapping locators on ATT&CK v20.0 and removes stale version labels", () => {
    for (const observation of observations) {
      for (const evidence of observation.evidence) {
        if (evidence.kind === "mapping") {
          expect(evidence.locator).toContain("MITRE ATT&CK v20.0");
        }
      }
    }

    const files = [
      "README.md",
      "data/case.json",
      "data/conflicts.json",
      "data/sources.json",
      "app/method/page.tsx",
    ];
    const text = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(text).not.toMatch(/ATT&CK v18|ATT&CK v19|v18\./);
  });

  it("catches a broken evidence reference", () => {
    const broken = structuredClone(observations) as Observation[];
    broken[0].evidence[0].sourceId = "missing-source";
    const issues = validateDataset({ ...caseDataset, observations: broken });
    expect(issues.some((issue) => issue.message.includes("missing source"))).toBe(true);
  });

  it("requires synthetic material to say so", () => {
    const broken = structuredClone(observations) as Observation[];
    broken[0].synthetic = true;
    const issues = validateDataset({ ...caseDataset, observations: broken });
    expect(issues.some((issue) => issue.message.includes("synthetic"))).toBe(true);
  });
});
