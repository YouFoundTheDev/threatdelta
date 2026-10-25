# Changelog

All notable changes to ThreatDelta are recorded here. The project is a case-study workbench, not a production CTI platform.

## [0.1.0] — 2026-10-26

### Added

- LockBit 2.0 → 3.0 case study built from FBI Flash CU-000162-MW, CISA AA23-075A, CISA AA23-165A and the MITRE ATT&CK v18 software mappings (S1199/S1202).
- Lineage-aware snapshot comparison that separates new techniques, sub-technique refinements, shared techniques, and techniques not re-documented.
- Evidence explorer with source URLs, locators, direct quotes, confidence rationale, ATT&CK cross-references, and mapping-vs-evidence labels.
- Detection coverage against 15 real public SigmaHQ rules with exact, parent-tagged and gap semantics.
- Hunt planner with five hypotheses, required logs, investigative steps, false positives, source references and a transparent /11 priority score.
- Markdown and JSON report exports with selectable evidence, coverage, hunts, conflicts and sources.
- Method & sources page documenting confidence, coverage, prioritisation, data integrity and limitations.
- Responsive desktop/mobile layouts, local typography, custom 404 and app icon.
- Dataset provenance validation and 26 Vitest tests covering comparison, ATT&CK matching, coverage, provenance, prioritisation and exports.

### Notes

- No synthetic IOCs, telemetry, victim data or organisational detection inventory are used.
- Documentation deltas are not evidence of adversary adoption, and catalogue gaps are not evidence of organisational detection gaps.
