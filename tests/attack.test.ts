import { describe, expect, it } from "vitest";
import {
  buildTechniqueIndex,
  isSubtechniqueOf,
  matchRuleToTechnique,
  techniqueAncestors,
} from "@/lib/attack";
import { observations, sigmaRules, techniques } from "@/lib/data";
import { targetCoverage, baselineCoverage, currentCoverage, datasetStats } from "@/lib/analysis";

const index = buildTechniqueIndex(techniques);

describe("ATT&CK matching", () => {
  it("resolves technique ancestry", () => {
    expect(techniqueAncestors("T1480.002", index)).toEqual(["T1480"]);
    expect(isSubtechniqueOf("T1480.002", "T1480", index)).toBe(true);
    expect(isSubtechniqueOf("T1547.001", "T1480", index)).toBe(false);
  });

  it("prefers exact tags, then parent tags, then child tags", () => {
    expect(matchRuleToTechnique(["T1490"], "T1490", index)).toBe("exact");
    expect(matchRuleToTechnique(["T1569"], "T1569.002", index)).toBe("parent");
    expect(matchRuleToTechnique(["T1021.002"], "T1021", index)).toBe("child");
    expect(matchRuleToTechnique(["T1490"], "T1486", index)).toBeNull();
  });

  it("separates exact coverage from parent-tagged rules that need review", () => {
    const fileDeletion = targetCoverage.techniques.find((item) => item.technique.id === "T1070.004");
    expect(fileDeletion?.status).toBe("broad");
    expect(fileDeletion?.matches.every((match) => match.match === "parent")).toBe(true);

    const shadowCopy = targetCoverage.techniques.find((item) => item.technique.id === "T1490");
    expect(shadowCopy?.status).toBe("direct");
    expect(shadowCopy?.matches.length).toBeGreaterThanOrEqual(3);
  });

  it("counts a missing public rule as a catalogue gap, not an organisational fact", () => {
    const safeMode = targetCoverage.techniques.find((item) => item.technique.id === "T1688");
    expect(safeMode?.status).toBe("gap");
    expect(safeMode?.matches).toHaveLength(0);
  });

  it("summarises target and baseline coverage from the catalogue", () => {
    expect(targetCoverage.summary).toMatchObject({ total: 34, direct: 11, broad: 1, gap: 22, covered: 11, percent: 32 });
    expect(baselineCoverage.summary).toMatchObject({ total: 26, direct: 8, broad: 1, gap: 17, covered: 8, percent: 31 });
    expect(datasetStats.sigmaRules).toBe(19);
    expect(datasetStats.sigmaRules).toBe(sigmaRules.length);
    expect(observations).toHaveLength(68);
    expect(currentCoverage.summary).toMatchObject({ total: 8, direct: 4, broad: 1, gap: 3, covered: 4, percent: 50 });
    expect(datasetStats.snapshots).toBe(3);
  });
});
