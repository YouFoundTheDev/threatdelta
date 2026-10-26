import { describe, expect, it } from "vitest";
import {
  buildIssueBody,
  buildPrBody,
  compareMappingSets,
  extractFeedItems,
  extractLockBitMappings,
  extractTechniqueMetadata,
  filterCandidateReports,
  findLatestAttack,
  normalizeUrl,
  parseSigmaRule,
  updateCaseVersion,
  updateObservationMappings,
} from "@/scripts/refresh-core.mjs";
import { caseFile, observations } from "@/lib/data";

type MappingFixture = Record<
  string,
  {
    softwareExternalId: string;
    techniqueIds: string[];
    claims: Record<string, string>;
  }
>;
type DeltaFixture = {
  changed: boolean;
  added: Record<string, string[]>;
  removed: Record<string, string[]>;
};
type UpdatedObservation = {
  claim: string;
  evidence: Array<{ kind: string; locator?: string }>;
};

const stix = {
  objects: [
    {
      type: "malware",
      id: "malware--lockbit-2",
      name: "LockBit 2.0",
      modified: "2026-10-13T10:00:00Z",
      external_references: [{ external_id: "S1199" }],
    },
    {
      type: "attack-pattern",
      id: "attack-pattern--t1490",
      name: "Inhibit System Recovery",
      description: "Adversaries may delete recovery data. More detail follows.",
      external_references: [{ external_id: "T1490" }],
      kill_chain_phases: [{ phase_name: "impact" }],
    },
    {
      type: "attack-pattern",
      id: "attack-pattern--t1480",
      name: "Execution Guardrails",
      description: "Adversaries may constrain execution. More detail follows.",
      external_references: [{ external_id: "T1480" }],
      kill_chain_phases: [{ phase_name: "stealth" }],
    },
    {
      type: "attack-pattern",
      id: "attack-pattern--t1480-002",
      name: "Mutual Exclusion",
      description: "Adversaries may use a mutex. More detail follows.",
      external_references: [{ external_id: "T1480.002" }],
      kill_chain_phases: [{ phase_name: "stealth" }],
    },
    {
      type: "relationship",
      relationship_type: "uses",
      source_ref: "malware--lockbit-2",
      target_ref: "attack-pattern--t1490",
      description: "[LockBit 2.0](https://attack.mitre.org/software/S1199) can delete shadow copies.(Citation: FBI)",
    },
    {
      type: "relationship",
      relationship_type: "uses",
      source_ref: "malware--lockbit-2",
      target_ref: "attack-pattern--t1480-002",
      description: "[LockBit 2.0](https://attack.mitre.org/software/S1199) can use a mutex.",
    },
  ],
};

describe("refresh core", () => {
  it("extracts LockBit mappings and cleans ATT&CK text", () => {
    const mappings = extractLockBitMappings(stix) as unknown as MappingFixture;
    expect(mappings["lockbit-2.0"].techniqueIds).toEqual(["T1480.002", "T1490"]);
    expect(mappings["lockbit-2.0"].claims.T1490).toBe("LockBit 2.0 can delete shadow copies.");
  });

  it("extracts current technique metadata from the STIX dataset", () => {
    const techniques = extractTechniqueMetadata(stix, ["T1490", "T1480", "T1480.002"]);
    expect(techniques.map((item) => item.id)).toEqual(["T1480", "T1480.002", "T1490"]);
    expect(techniques.find((item) => item.id === "T1480.002")?.subtechniqueOf).toBe("T1480");
    expect(techniques.find((item) => item.id === "T1490")?.description).toBe("Adversaries may delete recovery data.");
  });

  it("detects mapping additions and removals", () => {
    const mappings = extractLockBitMappings(stix) as unknown as MappingFixture;
    const current = [
      { snapshotId: "lockbit-2.0", techniqueId: "T1490" },
    ];
    const delta = compareMappingSets(current, mappings) as unknown as DeltaFixture;
    expect(delta.changed).toBe(true);
    expect(delta.added["lockbit-2.0"]).toEqual(["T1480.002"]);
    expect(delta.removed["lockbit-2.0"]).toEqual([]);
  });

  it("updates mapping claims without touching direct evidence", () => {
    const sample = structuredClone(observations[0]);
    const mappings = {
      "lockbit-2.0": {
        softwareExternalId: "S1199",
        techniqueIds: [sample.techniqueId],
        claims: { [sample.techniqueId]: "Updated mapping claim." },
      },
    };
    const updated = updateObservationMappings([sample], mappings, "v21.0") as unknown as UpdatedObservation[];
    const direct = sample.evidence.filter((evidence) => evidence.kind === "direct");
    expect(updated[0].claim).toBe("Updated mapping claim.");
    expect(updated[0].evidence.filter((evidence) => evidence.kind === "direct")).toEqual(direct);
    expect(updated[0].evidence.find((evidence) => evidence.kind === "mapping")?.locator).toContain("MITRE ATT&CK v21.0");
  });

  it("reads the enterprise collection from the ATT&CK index", () => {
    const latest = findLatestAttack({
      collections: [
        {
          versions: [
            { version: "20.0", url: "https://example.test/mobile-attack-20.0.json", modified: "2026-10-13T00:00:00Z" },
          ],
        },
        {
          versions: [
            { version: "20.0", url: "https://example.test/enterprise-attack-20.0.json", modified: "2026-10-13T00:00:00Z" },
          ],
        },
      ],
    });
    expect(latest.version).toBe("v20.0");
    expect(latest.url).toContain("enterprise-attack");
  });

  it("parses Sigma tags and RSS candidates", () => {
    const rule = parseSigmaRule(
      [
        "title: Security Eventlog Cleared",
        "id: d99b79d2-0a6f-4f46-ad8b-260b6e17f982",
        "status: test",
        "level: high",
        "author: Florian Roth",
        "tags:",
        "  - attack.defense-impairment",
        "  - attack.t1685.005",
        "logsource:",
        "  product: windows",
        "  service: security",
      ].join("\n"),
      "rules/windows/builtin/security/win_security_audit_log_cleared.yml",
    );
    expect(rule.techniqueIds).toEqual(["T1685.005"]);

    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>LockBit campaign update</title><link>https://example.test/new-lockbit</link><description>New ransomware report</description><pubDate>Mon, 26 Oct 2026 10:00:00 GMT</pubDate></item>
      <item><title>Unrelated advisory</title><link>https://example.test/unrelated</link><description>Other malware</description></item>
      <item><title>Known LockBit report</title><link>https://example.test/known</link><description>Already in the registry</description></item>
    </channel></rss>`;
    const items = extractFeedItems(xml, "test-feed");
    const candidates = filterCandidateReports(items, [{ url: "https://example.test/known" }], {
      id: "test-feed",
      name: "Test feed",
      kind: "vendor",
      url: "https://example.test/feed",
      terms: ["lockbit"],
    });
    expect(items).toHaveLength(3);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].title).toBe("LockBit campaign update");
    expect(normalizeUrl("https://example.test/new-lockbit/")).toBe("example.test/new-lockbit");
  });

  it("updates version labels without changing historical dates", () => {
    const updated = updateCaseVersion(caseFile, {
      fromVersion: caseFile.attackVersion,
      toVersion: "ATT&CK v21.0",
      releaseDate: "2027-04-20",
      verifiedAt: "2026-10-26",
    });
    expect(updated.attackVersion).toBe("ATT&CK v21.0");
    expect(updated.asOf).toBe(caseFile.asOf);
    expect(updated.historicalPeriod).toBe(caseFile.historicalPeriod);
    expect(updated.scope).toContain("ATT&CK v21.0");
  });

  it("builds review-oriented PR and issue bodies", () => {
    const summary = {
      checkedAt: "2026-10-26T00:00:00Z",
      attack: {
        status: "manual-review",
        from: "v20.0",
        to: "v21.0",
        releasedAt: "2027-04-20",
        added: { "lockbit-3.0": ["T9999"] },
        removed: { "lockbit-3.0": [] },
      },
      sigma: { status: "no-change", from: "abc", to: "abc", ruleCount: 19 },
      candidates: [{ title: "New report", url: "https://example.test/report", feedName: "CISA advisories" }],
      errors: [],
    };
    expect(buildPrBody(summary)).toContain("New reporting candidates");
    expect(buildIssueBody(summary)).toContain("Analyst review required");
    expect(buildIssueBody(summary)).toContain("T9999");
  });
});
