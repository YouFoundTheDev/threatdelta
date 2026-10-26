import { describe, expect, it } from "vitest";
import { scoredHunts } from "@/lib/analysis";

describe("hunt prioritisation", () => {
  it("ranks every hunt and keeps the rank sequence", () => {
    expect(scoredHunts).toHaveLength(5);
    expect(scoredHunts.map((hunt) => hunt.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(scoredHunts.every((hunt) => hunt.score > 0)).toBe(true);
  });

  it("makes the score equal to the displayed factor breakdown", () => {
    for (const hunt of scoredHunts) {
      const total = hunt.factors.reduce((sum, factor) => sum + factor.points, 0);
      expect(hunt.score).toBe(total);
    }
  });

  it("surfaces the Safe Mode gap and the credential-led lateral path at the top", () => {
    const topIds = scoredHunts.slice(0, 2).map((hunt) => hunt.hunt.id);
    expect(topIds).toEqual(["credential-led-psexec", "safe-mode-reboot"]);

    const safeMode = scoredHunts.find((hunt) => hunt.hunt.id === "safe-mode-reboot");
    expect(safeMode?.factors.find((factor) => factor.label === "Detection gap")?.points).toBe(3);
    expect(safeMode?.hunt.requiredLogs.length).toBeGreaterThanOrEqual(4);

    const logHunt = scoredHunts.find((hunt) => hunt.hunt.id === "log-destruction");
    expect(logHunt?.score).toBe(6);
    expect(logHunt?.factors.find((factor) => factor.label === "Detection gap")?.points).toBe(0);
    expect(logHunt?.hunt.rationale).toContain("exact public coverage for Windows Event Log clearing");
  });
});
