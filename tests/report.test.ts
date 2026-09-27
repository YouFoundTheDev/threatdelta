import { describe, expect, it } from "vitest";
import {
  baselineCoverage,
  comparison,
  datasetStats,
  targetCoverage,
} from "@/lib/analysis";
import {
  caseFile,
  observations,
  sources,
  techniques,
} from "@/lib/data";
import { buildJsonReport, buildMarkdownReport, reportFilename } from "@/lib/report";
import { scoredHunts } from "@/lib/analysis";

const generatedAt = "2026-10-26T12:00:00.000Z";
const input = {
  caseFile,
  sources,
  comparison,
  coverage: targetCoverage,
  hunts: scoredHunts,
  observations,
  techniques,
  generatedAt,
};

const allOptions = {
  includeEvidence: true,
  includeCoverage: true,
  includeHunts: true,
  includeConflicts: true,
  includeSources: true,
};

describe("report exports", () => {
  it("builds a Markdown report with the delta, conflicts, coverage and hunts", () => {
    const markdown = buildMarkdownReport(input, allOptions);
    expect(markdown).toContain("# ThreatDelta — LockBit, 2.0 → 3.0");
    expect(markdown).toContain("Newly documented (13)");
    expect(markdown).toContain("Sub-technique refinements (1)");
    expect(markdown).toContain("T1688");
    expect(markdown).toContain("WMI shadow-copy deletion");
    expect(markdown).toContain("Detection coverage");
    expect(markdown).toContain("Credential-led SMB fan-out");
    expect(markdown).toContain("https://www.ic3.gov/CSA/2022/220204.pdf");
    expect(markdown).toContain("A missing public rule is not evidence");
    expect(markdown).not.toContain("undefined");
  });

  it("omits optional sections when they are switched off", () => {
    const markdown = buildMarkdownReport(input, {
      includeEvidence: false,
      includeCoverage: false,
      includeHunts: false,
      includeConflicts: false,
      includeSources: false,
    });
    expect(markdown).toContain("## Documentation delta");
    expect(markdown).not.toContain("## Evidence appendix");
    expect(markdown).not.toContain("## Detection coverage");
    expect(markdown).not.toContain("## Hunt hypotheses");
    expect(markdown).not.toContain("## Conflicting and unresolved claims");
    expect(markdown).not.toContain("## Sources");
  });

  it("removes the evidence payload from JSON when the appendix is disabled", () => {
    const json = JSON.parse(
      buildJsonReport(input, { ...allOptions, includeEvidence: false }),
    );
    expect(json.evidence).toBeUndefined();
    expect(json.comparison.newlyDocumented[0].evidence).toBeUndefined();
    expect(json.comparison.newlyDocumented[0].sourceIds.length).toBeGreaterThan(0);
  });

  it("builds parseable JSON with stable comparison counts", () => {
    const raw = buildJsonReport(input, allOptions);
    const json = JSON.parse(raw);
    expect(json.schemaVersion).toBe("1.0");
    expect(json.generatedAt).toBe(generatedAt);
    expect(json.comparison.counts.addedMappings).toBe(14);
    expect(json.coverage.summary.covered).toBe(datasetStats.coverage.covered);
    expect(json.coverage.summary.broad).toBe(2);
    expect(json.sources).toHaveLength(sources.length);
    expect(json.evidence).toHaveLength(60);
    expect(json.hunts).toHaveLength(5);
    expect(json.comparison.conflicts).toHaveLength(3);
  });

  it("resolves source metadata inside JSON evidence", () => {
    const json = JSON.parse(buildJsonReport(input, allOptions));
    const finding = json.evidence.find(
      (item: { techniqueId: string; snapshotId: string }) =>
        item.techniqueId === "T1688" && item.snapshotId === "lockbit-3.0",
    );
    expect(finding.evidence[1].source.publisher).toContain("CISA");
    expect(finding.evidence[1].source.url).toContain("cisa.gov");
  });

  it("names files with the generation date", () => {
    expect(reportFilename("md", generatedAt)).toBe("threatdelta-lockbit-2026-10-26.md");
    expect(reportFilename("json", generatedAt)).toBe("threatdelta-lockbit-2026-10-26.json");
  });

  it("keeps baseline coverage available for the selected snapshot", () => {
    expect(baselineCoverage.summary.total).toBe(26);
  });
});
