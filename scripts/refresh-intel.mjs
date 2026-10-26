import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import {
  allMappingTechniqueIds,
  buildIssueBody,
  buildPrBody,
  compareMappingSets,
  extractFeedItems,
  extractLockBitMappings,
  extractTechniqueMetadata,
  filterCandidateReports,
  findLatestAttack,
  formatDate,
  formatShortDate,
  parseSigmaRule,
  sha256,
  sigmaRulePath,
  updateCaseVersion,
  updateConflictsVersion,
  updateObservationMappings,
  updateSourcesForAttack,
  verifySigmaRule,
} from "./refresh-core.mjs";

const root = process.cwd();
const outputDir = process.env.RUNNER_TEMP || root;
const today = new Date().toISOString().slice(0, 10);

const files = {
  case: "data/case.json",
  dataset: "data/dataset.json",
  sources: "data/sources.json",
  observations: "data/observations.json",
  techniques: "data/techniques.json",
  conflicts: "data/conflicts.json",
  sigma: "data/sigma-rules.json",
  monitoring: "data/monitoring.json",
  readme: "README.md",
  architecture: "docs/ARCHITECTURE.md",
};

async function readJson(file) {
  return JSON.parse(await readFile(path.join(root, file), "utf8"));
}

async function writeIfChanged(file, value) {
  const filePath = path.join(root, file);
  const next = typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`;
  const current = await readFile(filePath, "utf8");
  if (current === next) return false;
  await writeFile(filePath, next);
  return true;
}

async function fetchText(url, { timeout = 45000 } = {}) {
  const headers = {
    "user-agent": "ThreatDelta-Refresh/1.0 (+https://github.com/YouFoundTheDev/threatdelta)",
    accept: "*/*",
  };
  if (process.env.GITHUB_TOKEN && url.startsWith("https://api.github.com/")) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  throw lastError;
}

async function fetchJson(url, options) {
  return JSON.parse(await fetchText(url, options));
}

async function replaceMetadataInFile(file, replacements, changedFiles) {
  const filePath = path.join(root, file);
  const current = await readFile(filePath, "utf8");
  let next = current;
  for (const [from, to] of replacements) {
    if (from) next = next.split(from).join(to);
  }
  if (next !== current) {
    await writeFile(filePath, next);
    changedFiles.push(file);
  }
}

async function main() {
  const [caseFile, dataset, sources, observations, techniques, conflicts, sigmaRules, monitoring] = await Promise.all([
    readJson(files.case),
    readJson(files.dataset),
    readJson(files.sources),
    readJson(files.observations),
    readJson(files.techniques),
    readJson(files.conflicts),
    readJson(files.sigma),
    readJson(files.monitoring),
  ]);

  const summary = {
    checkedAt: new Date().toISOString(),
    attack: {
      status: "no-change",
      from: dataset.attack.version,
      to: dataset.attack.version,
      releasedAt: dataset.attack.releasedAt,
    },
    sigma: {
      status: "no-change",
      from: dataset.sigma.commit,
      to: dataset.sigma.commit,
      ruleCount: dataset.sigma.ruleCount,
    },
    candidates: [],
    changedFiles: [],
    errors: [],
    manualReview: false,
  };

  // ATT&CK releases
  try {
    const index = await fetchJson(monitoring.attack.indexUrl);
    const latest = findLatestAttack(index);
    summary.attack.to = latest.version;
    summary.attack.releasedAt = latest.releasedAt;

    if (latest.version !== dataset.attack.version) {
      const stixText = await fetchText(latest.url, { timeout: 90000 });
      const stix = JSON.parse(stixText);
      const mappings = extractLockBitMappings(stix);
      const mappingDelta = compareMappingSets(observations, mappings);
      summary.attack.added = mappingDelta.added;
      summary.attack.removed = mappingDelta.removed;

      if (mappingDelta.changed) {
        summary.attack.status = "manual-review";
        summary.manualReview = true;
      } else {
        summary.attack.status = "updated";
        const techniqueIds = [
          ...new Set([
            ...allMappingTechniqueIds(mappings),
            ...techniques.map((technique) => technique.id),
          ]),
        ].sort();
        const nextTechniques = extractTechniqueMetadata(stix, techniqueIds);
        const nextObservations = updateObservationMappings(observations, mappings, latest.version);
        const nextCase = updateCaseVersion(caseFile, {
          fromVersion: caseFile.attackVersion,
          toVersion: `ATT&CK ${latest.version}`,
          releaseDate: latest.releasedAt,
          verifiedAt: today,
        });
        const nextSources = updateSourcesForAttack(sources, {
          toVersion: latest.version,
          releaseDate: latest.releasedAt,
          verifiedAt: today,
          datasetUrl: latest.url,
          datasetSha256: sha256(stixText),
          mappings,
        });
        const nextConflicts = updateConflictsVersion(conflicts, caseFile.attackVersion, nextCase.attackVersion);
        const nextDataset = structuredClone(dataset);
        nextDataset.attack.version = latest.version;
        nextDataset.attack.releasedAt = latest.releasedAt;
        nextDataset.attack.verifiedAt = today;
        nextDataset.attack.sourceUrl = `https://github.com/mitre-attack/attack-stix-data/releases/tag/${latest.version}`;
        nextDataset.attack.datasetUrl = latest.url;
        nextDataset.attack.datasetSha256 = sha256(stixText);
        for (const [snapshotId, mapping] of Object.entries(mappings)) {
          const key = mapping.softwareExternalId;
          nextDataset.attack.software[key] = {
            name: mapping.softwareName,
            modifiedAt: mapping.modifiedAt,
            techniqueCount: mapping.techniqueIds.length,
          };
          if (snapshotId === "lockbit-2.0" || snapshotId === "lockbit-3.0") {
            summary.attack[snapshotId] = {
              techniques: mapping.techniqueIds.length,
              modifiedAt: mapping.modifiedAt,
            };
          }
        }

        if (await writeIfChanged(files.dataset, nextDataset)) summary.changedFiles.push(files.dataset);
        if (await writeIfChanged(files.techniques, nextTechniques)) summary.changedFiles.push(files.techniques);
        if (await writeIfChanged(files.observations, nextObservations)) summary.changedFiles.push(files.observations);
        if (await writeIfChanged(files.case, nextCase)) summary.changedFiles.push(files.case);
        if (await writeIfChanged(files.sources, nextSources)) summary.changedFiles.push(files.sources);
        if (await writeIfChanged(files.conflicts, nextConflicts)) summary.changedFiles.push(files.conflicts);

        await replaceMetadataInFile(
          files.readme,
          [
            [caseFile.attackVersion, nextCase.attackVersion],
            [formatDate(caseFile.attackReleaseDate), formatDate(latest.releasedAt)],
            [formatShortDate(caseFile.attackReleaseDate), formatShortDate(latest.releasedAt)],
            [formatDate(caseFile.verifiedAt), formatDate(today)],
            [formatShortDate(caseFile.verifiedAt), formatShortDate(today)],
          ],
          summary.changedFiles,
        );
        await replaceMetadataInFile(
          files.architecture,
          [[caseFile.attackVersion, nextCase.attackVersion]],
          summary.changedFiles,
        );
      }
    }
  } catch (error) {
    summary.errors.push(`ATT&CK refresh failed: ${error.message}`);
  }

  // SigmaHQ commit and curated rules
  try {
    // re-read files because an ATT&CK update may already have written to them
    const currentCase = await readJson(files.case);
    const currentDataset = await readJson(files.dataset);
    const currentSources = await readJson(files.sources);
    const commit = await fetchJson(monitoring.sigma.commitApi);
    const nextCommit = commit.sha;
    const commitDate = String(commit.commit?.committer?.date ?? today).slice(0, 10);
    summary.sigma.to = nextCommit;

    if (nextCommit !== currentDataset.sigma.commit) {
      const nextRules = [];
      const issues = [];
      for (const rule of sigmaRules) {
        const rulePath = sigmaRulePath(rule.sourceUrl);
        const raw = await fetchText(
          `https://raw.githubusercontent.com/SigmaHQ/sigma/${nextCommit}/${rulePath}`,
        );
        const parsed = parseSigmaRule(raw, rulePath);
        issues.push(...verifySigmaRule(rule, parsed).map((issue) => `${rule.title}: ${issue}`));
        nextRules.push({
          ...rule,
          title: parsed.title ?? rule.title,
          status: parsed.status ?? rule.status,
          level: parsed.level ?? rule.level,
          author: parsed.author ?? rule.author,
          sourceUrl: `https://github.com/SigmaHQ/sigma/blob/${nextCommit}/${rulePath}`,
        });
      }

      if (issues.length) {
        summary.sigma.status = "manual-review";
        summary.manualReview = true;
        summary.errors.push(...issues);
      } else {
        summary.sigma.status = "updated";
        summary.sigma.ruleCount = nextRules.length;
        summary.sigma.commitDate = commitDate;

        const nextDataset = structuredClone(currentDataset);
        nextDataset.sigma.commit = nextCommit;
        nextDataset.sigma.commitDate = commitDate;
        nextDataset.sigma.verifiedAt = today;
        nextDataset.sigma.ruleCount = nextRules.length;

        const nextSources = structuredClone(currentSources);
        const sigmaSource = nextSources.find((source) => source.id === "sigma-hq");
        if (sigmaSource) {
          sigmaSource.publishedAt = commitDate;
          sigmaSource.retrievedAt = today;
          sigmaSource.note = `Public SigmaHQ rules verified at commit ${nextCommit} (${commitDate}). Rule source links are pinned to that commit. Rule text remains subject to the SigmaHQ Detection Rule License.`;
        }

        const nextCase = structuredClone(currentCase);
        nextCase.verifiedAt = today;

        if (await writeIfChanged(files.dataset, nextDataset)) summary.changedFiles.push(files.dataset);
        if (await writeIfChanged(files.sigma, nextRules)) summary.changedFiles.push(files.sigma);
        if (await writeIfChanged(files.sources, nextSources)) summary.changedFiles.push(files.sources);
        if (await writeIfChanged(files.case, nextCase)) summary.changedFiles.push(files.case);

        await replaceMetadataInFile(
          files.readme,
          [
            [currentDataset.sigma.commit.slice(0, 8), nextCommit.slice(0, 8)],
            [formatDate(currentDataset.sigma.commitDate), formatDate(commitDate)],
            [formatShortDate(currentDataset.sigma.commitDate), formatShortDate(commitDate)],
            [formatDate(currentCase.verifiedAt), formatDate(today)],
            [formatShortDate(currentCase.verifiedAt), formatShortDate(today)],
          ],
          summary.changedFiles,
        );
      }
    }
  } catch (error) {
    summary.errors.push(`SigmaHQ refresh failed: ${error.message}`);
  }

  // Candidate reports from monitored feeds
  const candidateUrls = new Set();
  for (const feed of monitoring.reportFeeds) {
    try {
      const xml = await fetchText(feed.url);
      const items = extractFeedItems(xml, feed.id);
      for (const item of filterCandidateReports(items, monitoring.knownReports, feed)) {
        if (candidateUrls.has(item.url)) continue;
        candidateUrls.add(item.url);
        summary.candidates.push({ ...item, feedName: feed.name });
      }
    } catch (error) {
      summary.errors.push(`${feed.name} feed failed: ${error.message}`);
    }
  }

  summary.changedFiles = [...new Set(summary.changedFiles)];
  summary.hasChanges = summary.changedFiles.length > 0;
  summary.hasCandidates = summary.candidates.length > 0;
  summary.hasErrors = summary.errors.length > 0;

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "refresh-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(path.join(outputDir, "refresh-pr.md"), `${buildPrBody(summary)}\n`);
  await writeFile(path.join(outputDir, "refresh-issue.md"), `${buildIssueBody(summary)}\n`);

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      [
        `has_changes=${summary.hasChanges}`,
        `requires_review=${summary.manualReview}`,
        `has_candidates=${summary.hasCandidates}`,
        `has_errors=${summary.hasErrors}`,
        "",
      ].join("\n"),
    );
  }

  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.some((error) => error.startsWith("ATT&CK refresh failed") || error.startsWith("SigmaHQ refresh failed"))) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
