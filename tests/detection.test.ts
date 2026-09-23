import { describe, expect, it } from "vitest";
import { coverTechnique } from "@/lib/detection";
import { observations, sigmaRules, techniques } from "@/lib/data";
import { techniqueById } from "@/lib/data";

describe("detection coverage", () => {
  it("does not count a sub-technique rule as coverage for its parent", () => {
    const parent = techniqueById.get("T1547");
    const observation = observations.find(
      (item) => item.techniqueId === "T1547.001",
    );
    if (!parent) throw new Error("missing parent technique");

    const coverage = coverTechnique(parent, observation, sigmaRules, techniques);
    expect(coverage.status).toBe("gap");
    expect(coverage.matches).toHaveLength(0);
    expect(coverage.related.some((match) => match.rule.id === "bbf59793-6efb-4fa1-95ca-a7d288e52c88")).toBe(true);
  });

  it("labels coverage statuses without rounding gaps away", () => {
    const wmic = coverTechnique(
      techniqueById.get("T1047")!,
      observations.find((item) => item.techniqueId === "T1047"),
      sigmaRules,
      techniques,
    );
    expect(wmic.status).toBe("direct");
    expect(wmic.matches[0].rule.title).toBe("Application Termination Attempt via Wmic.EXE");
  });
});
