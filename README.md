# ThreatDelta

A small CTI analyst workbench for comparing public cyber-threat reporting, inspecting the evidence behind ATT&CK mappings, reviewing public detection coverage, and turning documentation changes into testable hunt hypotheses.

Built with Next.js, TypeScript, Tailwind CSS and local JSON data. No backend, auth, paid APIs or required LLM calls.

**Live demo:** [threatdelta.vercel.app](https://threatdelta.vercel.app) · **Source:** private GitHub repository

![ThreatDelta dashboard](screenshots/dashboard.png)

## What it does

- **Dashboard** — case statistics and recent source findings derived from the actual dataset, with a documentation-delta view and explicit reading caveats.
- **Intelligence diff** — compares LockBit 2.0 and 3.0 ATT&CK mappings, separating new techniques, sub-technique refinements, shared techniques, techniques not re-documented, and source disagreements.
- **Evidence explorer** — searchable claims with source URLs, locators, direct quotes, ATT&CK IDs, confidence rationale, and the distinction between source evidence and derived mappings.
- **Detection coverage** — matches documented techniques to 15 real public SigmaHQ rules and separates exact coverage, parent-tagged rules, and catalogue gaps.
- **Hunt planner** — five hypotheses with required logs, investigative steps, false positives, source references and a visible priority score.
- **Reports** — exports the selected analysis as Markdown or JSON, with evidence, coverage, hunts, conflicts and sources individually toggleable.
- **Method & sources** — the full confidence rubric, coverage semantics, priority formula, bibliography, dataset checks and limitations.

The full in-app methodology view is captured in [`screenshots/method.png`](screenshots/method.png).

## Case study

The case compares two public snapshots of the LockBit ransomware lineage:

| | Baseline | Target |
| --- | --- | --- |
| Snapshot | LockBit 2.0 | LockBit 3.0 (“LockBit Black”) |
| Public cut-off | 4 Feb 2022 | 14 Jun 2023 |
| Primary reporting | [FBI Flash CU-000162-MW](https://www.ic3.gov/CSA/2022/220204.pdf) | [CISA AA23-165A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-165a) |
| Supporting report | — | [CISA AA23-075A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-075a) |
| ATT&CK mapping | [S1199](https://attack.mitre.org/software/S1199/) | [S1202](https://attack.mitre.org/software/S1202/) |

The comparison universe is deliberately narrow: the **26** and **34** techniques mapped to the two ATT&CK software entries in ATT&CK v18. That produces:

- **13 newly documented techniques** and **1 sub-technique refinement** — 14 added mappings in total.
- **20 shared** techniques.
- **6 techniques** documented in 2.0 but not re-documented in 3.0.
- **3 conflicting / unresolved claims** where sources map the same space differently or a field observation contradicts a capability mapping.

The UI says “newly documented”, never “newly adopted”. The diff is a lead for validation, not proof of behavioural change.

## Screenshots

### Intelligence diff

![Intelligence diff](screenshots/diff.png)

### Conflicting claims

![Conflicting claims](screenshots/diff-conflicts.png)

### Evidence explorer

![Evidence explorer](screenshots/evidence-search.png)

### Detection coverage

![Detection coverage](screenshots/detections.png)

Rule catalogue view: [`screenshots/detection-rules.png`](screenshots/detection-rules.png).

### Hunt planner

![Hunt planner](screenshots/hunts.png)

### Reports

![Report builder](screenshots/reports.png)

Mobile layouts are included in [`screenshots/mobile-dashboard.png`](screenshots/mobile-dashboard.png) and [`screenshots/mobile-menu.png`](screenshots/mobile-menu.png).

## Methodology

### 1. Snapshot construction

Each observed technique is one ATT&CK software-mapping entry with a claim, confidence, source IDs and at least one evidence entry. Evidence is classified as:

- `direct` — an exact quote from a government, MITRE or vendor source, with a locator such as a table or section.
- `mapping` — the ATT&CK `uses` statement for the software entry.
- `analyst-note` — reserved for clearly labelled analyst synthesis; no synthetic evidence is currently used.

Direct quotes were checked against the fetched PDF/HTML source text. The dataset is locally stored in [`data/observations.json`](data/observations.json); source metadata is in [`data/sources.json`](data/sources.json).

### 2. Comparison rules

[`lib/diff.ts`](lib/diff.ts) compares exact ATT&CK IDs. A target ID absent from the baseline is:

- **new** if no baseline technique is one of its ancestors;
- **refined** if an ancestor exists in the baseline (for example `T1480.002` refining shared parent `T1480`);
- **not re-documented** in the reverse direction if a baseline technique is absent from the target mapping (not proof of removal).

The parent/child logic is in [`lib/attack.ts`](lib/attack.ts). Source disagreements are curated separately in [`data/conflicts.json`](data/conflicts.json), with claims shown side by side rather than ranked.

### 3. Confidence

- **High** — direct primary-source quote, or a MITRE use statement backed by a cited government advisory.
- **Medium** — MITRE mapping supported mainly by vendor reporting or a single source.
- **Low** — weak or inferred support; kept visible if used.

### 4. Detection coverage

[`lib/detection.ts`](lib/detection.ts) matches each documented technique against 15 real rules from the public [SigmaHQ repository](https://github.com/SigmaHQ/sigma):

- **Direct** — the rule carries the exact technique ID. Counted as coverage.
- **Parent-tagged** — the rule carries an ancestor ID. Shown for review, but not counted as exact coverage.
- **Child-only** — a narrower rule; related, but it cannot cover the whole parent.
- **Gap** — no exact or parent-tagged rule in this catalogue.

The catalogue is a sample, not an organisational detection inventory. A missing public rule is never presented as a lack of detection.

### 5. Hunt priority

[`lib/hunt.ts`](lib/hunt.ts) uses an additive, visible rubric with a maximum of 11:

```text
documentation delta  (new 3, refinement 2, shared 1)
+ tactic exposure    (impact / initial access 3,
                      lateral movement / defence impairment 2,
                      other 1)
+ detection gap      (no rule 3, parent-tagged 1, direct 0)
+ evidence strength  (high 2, medium 1)
```

The UI shows every factor and its points. Priority is a planning heuristic, not a probability or a claim that a technique is active in any environment.

## Sources

- FBI, *Indicators of Compromise Associated with LockBit 2.0 Ransomware*, Flash CU-000162-MW, 4 Feb 2022 — https://www.ic3.gov/CSA/2022/220204.pdf
- CISA/FBI/MS-ISAC, *#StopRansomware: LockBit 3.0*, AA23-075A, 16 Mar 2023 — https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-075a
- CISA/FBI/MS-ISAC and international partners, *Understanding Ransomware Threat Actors: LockBit*, AA23-165A, 14 Jun 2023 — https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-165a
- MITRE ATT&CK, *LockBit 2.0 (S1199)* — https://attack.mitre.org/software/S1199/
- MITRE ATT&CK, *LockBit 3.0 (S1202)* — https://attack.mitre.org/software/S1202/
- SentinelOne Labs, *LockBit 3.0 Update*, 21 Jul 2022 — https://www.sentinelone.com/labs/lockbit-3-0-update-unpicking-the-ransomwares-latest-anti-analysis-and-evasion-techniques/
- Palo Alto Networks Unit 42, *LockBit 2.0: How This RaaS Operates and How to Protect Against It*, 9 Jun 2022 — https://unit42.paloaltonetworks.com/lockbit-2-ransomware/
- SigmaHQ, public detection rules — https://github.com/SigmaHQ/sigma

The last two vendor sources are background for MITRE mappings cited in the dataset; they are not used as direct evidence entries.

## Run locally

Requires Node.js 20.9+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm test          # 26 Vitest tests
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
npm run build     # production build
npm start         # serve the production build
```

No environment variables are required. The app is deployable to Vercel as-is; all routes except `/reports` are static, and `/reports` is request-time rendered to stamp the export.

## Verification

Last verified locally with Node 24 and Next.js 16.4.3:

- `npm run lint` — clean.
- `npm run typecheck` — clean.
- `npm test` — 26 passed across comparison, ATT&CK matching/coverage, evidence provenance, hunt prioritisation and report exports.
- `npm run build` — successful.

Tests include regression checks for the 26/34/20/14/6 counts, the `T1480.002` refinement rule, parent-vs-exact Sigma matching, broken source references, synthetic-label enforcement, report option toggles and JSON export shape.

Architecture notes for maintainers live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Project structure

```text
app/            routes: dashboard, diff, evidence, detections, hunts, reports, method
components/     workbench UI, shared signals and primitives
lib/            comparison, ATT&CK matching, coverage, hunts, reports, provenance
data/           local JSON: case, snapshots, techniques, observations, conflicts, rules, hunts
tests/          Vitest suites for logic and exports
screenshots/    desktop and mobile captures
```

Comparison and export logic is kept out of the UI components. The data files are plain JSON and can be replaced with another case without changing the core diff, coverage or scoring code.

## Limitations

- **Documentation is not adoption.** A later report can add a technique because reporting improved, a new source was cited, or a mapping changed. This workbench does not infer adversary behaviour change.
- **The universe is not exhaustive.** Advisory-only techniques (for example some exfiltration mappings) are outside the S1199/S1202 comparison counts. This is stated in the diff.
- **ATT&CK identifiers drift.** ATT&CK v18 renumbered `T1070.001` to `T1685.005` and `T1562.001` to `T1685`. The dataset uses current IDs while preserving source `citedAs` labels.
- **The Sigma catalogue is small.** It contains 15 real public rules, not an organisational detection inventory. Parent-tagged matches need validation.
- **No telemetry or IOCs.** The app deliberately avoids stale indicators and does not include victim, customer or incident data.
- **Hunt hypotheses need local validation.** Required logs and false positives are starting points; field availability and retention must be confirmed.
- **Three conflicts are curated examples, not exhaustive adjudication.** They are shown to demonstrate how to keep disagreement visible.

## Attribution

ATT&CK technique metadata is from the MITRE ATT&CK Enterprise dataset (v18). Advisory quotes remain attributable to their publishers. SigmaHQ rule titles, IDs, tags and links are reproduced as metadata; rule text remains under the [SigmaHQ Detection Rule License 1.1](https://github.com/SigmaHQ/Detection-Rule-License).
