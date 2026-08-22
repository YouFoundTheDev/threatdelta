import { describe, expect, it } from "vitest";
import { baselineSnapshot, conflicts, observations, targetSnapshot, techniques } from "@/lib/data";
import { compareSnapshots } from "@/lib/diff";

const comparison = compareSnapshots(
  baselineSnapshot,
  targetSnapshot,
  observations,
  techniques,
  conflicts,
);

describe("snapshot comparison", () => {
  it("counts exact, refined and dropped mappings from the real dataset", () => {
    expect(comparison.counts).toEqual({
      baseline: 26,
      target: 34,
      shared: 20,
      newlyDocumented: 13,
      refinements: 1,
      addedMappings: 14,
      notRedocumented: 6,
      conflicts: 3,
    });
  });

  it("does not count a sub-technique as a new technique when its parent is in the baseline", () => {
    expect(comparison.newlyDocumented.map((change) => change.techniqueId)).not.toContain("T1480.002");
    expect(comparison.refinements).toHaveLength(1);
    expect(comparison.refinements[0].techniqueId).toBe("T1480.002");
    expect(comparison.refinements[0].baselineObservation?.techniqueId).toBe("T1480");
  });

  it("separates new 3.0 mappings from techniques that were only documented in 2.0", () => {
    const added = comparison.newlyDocumented.map((change) => change.techniqueId);
    expect(added).toContain("T1688");
    expect(added).toContain("T1573.001");
    expect(added).toContain("T1547.004");
    expect(added).not.toContain("T1547.001");

    const dropped = comparison.notRedocumented.map((change) => change.techniqueId);
    expect(dropped).toEqual(
      expect.arrayContaining(["T1053.005", "T1059.003", "T1136", "T1547.001", "T1564.003", "T1047"]),
    );
  });

  it("keeps shared mappings with both observations available", () => {
    const shared = comparison.shared.find((change) => change.techniqueId === "T1490");
    expect(shared?.observation.snapshotId).toBe("lockbit-3.0");
    expect(shared?.baselineObservation?.snapshotId).toBe("lockbit-2.0");
  });

  it("does not claim that a later report proves adoption", () => {
    expect(comparison.newlyDocumented[0].kind).toBe("new");
    expect(comparison.counts.addedMappings).toBe(
      comparison.counts.newlyDocumented + comparison.counts.refinements,
    );
  });
});
