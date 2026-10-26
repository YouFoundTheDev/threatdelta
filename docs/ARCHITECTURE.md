# Architecture

ThreatDelta is a single Next.js App Router application with local JSON data and no runtime services. The design keeps analysis logic out of the UI so the case could be replaced without rewriting the workbench.

## Data flow

```text
data/*.json
   │
   ├── lib/data.ts            typed loaders and indexes
   ├── lib/attack.ts          ATT&CK ancestry and rule matching
   ├── lib/diff.ts            snapshot comparison
   ├── lib/detection.ts       Sigma coverage
   ├── lib/hunt.ts            transparent prioritisation
   ├── lib/provenance.ts      dataset integrity checks
   ├── lib/report.ts          Markdown / JSON export
   └── lib/analysis.ts        composed case view model
             │
             ├── server pages in app/
             └── client workbench components in components/
```

### Data

- `data/case.json` — case metadata, snapshots and limitations.
- `data/sources.json` — source registry with publisher, date, URL, verification date and provenance note.
- `data/dataset.json` — verified ATT&CK v20.0 and SigmaHQ commit manifest.
- `data/techniques.json` — the ATT&CK techniques used by the case, including parents needed for lineage and rule matching.
- `data/observations.json` — one technique claim per snapshot, with confidence, rationale, source IDs and evidence entries.
- `data/conflicts.json` — side-by-side claims where sources disagree or are silent.
- `data/sigma-rules.json` — metadata and source links for real public SigmaHQ rules.
- `data/hunts.json` — analyst hypotheses, log requirements, steps and false positives.
- `data/case.json` also carries the supplementary 2026 vendor snapshot and activity context.
- `data/dataset.json` — verified ATT&CK release and SigmaHQ commit manifest.
- `data/monitoring.json` — ATT&CK/Sigma endpoints, report feeds and known-report URLs used by the refresh pipeline.

### Refresh pipeline

- `lib/diff.ts` compares exact IDs and uses parent/child ancestry to classify refinements.
- `lib/attack.ts` resolves technique ancestry and exact/parent/child rule matches.
- `lib/detection.ts` counts only exact rule matches as coverage; parent-tagged matches are shown for review.
- `lib/hunt.ts` computes a visible additive score from documentation delta, tactic exposure, detection gap and evidence strength.
- `lib/report.ts` produces deterministic Markdown and JSON from the same view model.

### Refresh pipeline

`.github/workflows/refresh-intel.yml` runs weekly and on manual dispatch. `scripts/refresh-intel.mjs` checks the ATT&CK index, SigmaHQ commit and configured report feeds. `scripts/refresh-core.mjs` contains the testable extraction, comparison and feed-parsing functions.

The pipeline updates only machine-verifiable metadata. If LockBit's ATT&CK mapping set changes, or a Sigma rule loses a curated tag, it opens a review issue instead of inventing evidence. Verified updates open or update the `chore/intel-refresh` PR; they never auto-merge. Run it locally with `npm run refresh:intel`.

The UI receives plain data as props. Client components own only interaction state: selected rows, filters, tabs and export options.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Case overview, delta summary, recent findings |
| `/diff` | Historical snapshot comparison and claim tensions |
| `/2026` | Separate LockBit 5.0 vendor snapshot and activity context |
| `/evidence` | Searchable evidence and provenance |
| `/detections` | Technique-to-Sigma coverage and rule catalogue |
| `/hunts` | Ranked hunt hypotheses |
| `/reports` | Markdown/JSON export builder |
| `/method` | Method, sources, integrity checks and limitations |

## Replacing the case

1. Add source metadata to `data/sources.json` and update `data/dataset.json`.
2. Add the ATT&CK techniques and ancestors to `data/techniques.json`.
3. Add target and baseline observations with evidence locators to `data/observations.json`.
4. Update snapshots in `data/case.json` and any source disagreements in `data/conflicts.json`.
5. Replace or extend the Sigma catalogue and hunt briefs.
6. Run `npm run test`, `npm run typecheck` and `npm run build`.

The comparison, coverage and report engines do not contain case-specific copy.

## Testing

Vitest covers the logic that matters:

- comparison counts and lineage refinement;
- ATT&CK ancestry and exact/parent/child matching;
- coverage status and summary counts;
- hunt score composition and ordering;
- evidence provenance, dataset-version consistency and synthetic-label enforcement;
- pinned SigmaHQ source URLs and current ATT&CK mappings;
- Markdown/JSON report content and option toggles.

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` run in CI on every push and pull request.

## Deployment

The app has no environment variables or backend. Vercel builds the static routes at deploy time; `/reports` is request-time rendered so its export timestamp is current.
