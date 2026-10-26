# Changelog

All notable changes to ThreatDelta are recorded here. The project is a case-study workbench, not a production CTI platform.

## [0.1.3] — 2026-10-26

### Fixed

- Added an explicit official-source check for the 2026 snapshot. CISA and FBI IC3 feeds, MITRE ATT&CK v20.0 and Europol were checked on 26 Oct 2026.
- Clarified that no official LockBit 5.0 advisory or ATT&CK software entry exists as of that date. The 2026 technical findings remain vendor research and are labelled as such throughout.
- Added Europol's 2024 LockBit actions as the latest official context, plus direct links to the CISA/IC3 feeds and MITRE software list.
- Updated source counts to 15 and added official-status validation and report output.

## [0.1.2] — 2026-10-26

### Added

- A separate 2026 vendor snapshot for LockBit 5.0, with 8 technique observations from Acronis Threat Research Unit and AhnLab ASEC.
- 2026 activity context from Check Point Research (163 claimed victims in Q1 2026) and Bitdefender (112 in December 2025).
- A `/2026` reporting page with build findings, coverage, source links and a comparison against the LockBit 3.0 mapping.
- 2026 snapshot filtering on the detection page and a 2026 section in Markdown/JSON exports.
- Four new vendor sources, including Acronis, AhnLab, Check Point and Bitdefender.
- Tests for the 8-technique vendor snapshot, its coverage and report output.

### Changed

- Rewrote page copy and panel labels to be shorter and more direct.
- Added a 2026 snapshot link to the dashboard, navigation and diff page.
- Updated the README, methodology, evidence explorer and reports for the new snapshot.
- Bumped the test/evidence footprint to 68 findings and 13 sources while keeping the historical 2.0→3.0 diff at 26/34 techniques.

## [0.1.1] — 2026-10-26

### Changed

- Upgraded all technique metadata and LockBit software mappings to **MITRE ATT&CK v20.0**, released 13 October 2026 and verified 26 October 2026 against the official Enterprise STIX dataset. The LockBit software objects themselves were last modified on 21 October 2025; their 26/34 technique mappings are unchanged in v20.0.
- Added `data/dataset.json` with the ATT&CK release, dataset hash, software object dates and SigmaHQ commit used for verification.
- Refreshed the SigmaHQ catalogue at commit `05d1031` (21 October 2026) and pinned every rule URL to that commit.
- Expanded the catalogue from 15 to 19 rules with verified event-log-clearing, PsExec service-artefact and Process Hacker rules.
- Recalculated coverage to **11/34 exact**, **1 parent-tagged** and **22 catalogue gaps** for LockBit 3.0; the log-destruction hunt now scores **6/11**.
- Added historical-period, current-mapping and last-verified labels across the dashboard, navigation, method page and exports.
- Updated the export schema with ATT&CK release, verification, historical-period and dataset metadata.
- Added a review-gated weekly GitHub Actions refresh pipeline for ATT&CK releases, SigmaHQ commits and CISA/IC3/Unit 42/SentinelOne feeds. Machine-verifiable changes open a PR; new reports open a review issue.
- Added regression tests for the v20.0 manifest, pinned SigmaHQ commit URLs, refresh-core mapping/feed logic and the revised coverage counts; total test count is now 38.

### Fixed

- Removed stale ATT&CK v18 labels and hardcoded catalogue counts from the interface.
- Updated the log-destruction hypothesis to reflect that Windows Event Log clearing now has exact public Sigma coverage.
- Kept historical publication dates unchanged: the intelligence period remains February 2022 – June 2023.

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
