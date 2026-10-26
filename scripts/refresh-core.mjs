import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import YAML from "yaml";

export const TACTIC_ORDER = [
  "reconnaissance",
  "resource-development",
  "initial-access",
  "execution",
  "persistence",
  "privilege-escalation",
  "stealth",
  "defense-impairment",
  "credential-access",
  "discovery",
  "lateral-movement",
  "collection",
  "command-and-control",
  "exfiltration",
  "impact",
];

const TACTIC_LABELS = {
  reconnaissance: "Reconnaissance",
  "resource-development": "Resource Development",
  "initial-access": "Initial Access",
  execution: "Execution",
  persistence: "Persistence",
  "privilege-escalation": "Privilege Escalation",
  stealth: "Stealth",
  "defense-impairment": "Defense Impairment",
  "credential-access": "Credential Access",
  discovery: "Discovery",
  "lateral-movement": "Lateral Movement",
  collection: "Collection",
  "command-and-control": "Command and Control",
  exfiltration: "Exfiltration",
  impact: "Impact",
};

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function cleanMitreText(text) {
  return String(text ?? "")
    .replace(/\(Citation:[^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstSentence(text, max = 230) {
  const match = text.match(/(.+?[.!?])\s/);
  const sentence = match ? match[1] : text;
  return sentence.length > max ? `${sentence.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : sentence;
}

function externalId(object) {
  return object?.external_references?.[0]?.external_id ?? null;
}

function techniqueParent(id) {
  return id.includes(".") ? id.split(".")[0] : null;
}

export function extractTechniqueMetadata(stix, techniqueIds) {
  const wanted = new Set(techniqueIds);
  const byExternalId = new Map();

  for (const object of stix.objects ?? []) {
    if (object.type !== "attack-pattern") continue;
    const id = externalId(object);
    if (id) byExternalId.set(id, object);
  }

  return [...wanted]
    .sort()
    .map((id) => {
      const object = byExternalId.get(id);
      if (!object) throw new Error(`ATT&CK technique ${id} is missing from the dataset`);
      const tactics = [...new Set((object.kill_chain_phases ?? []).map((phase) => phase.phase_name))]
        .filter((tactic) => TACTIC_ORDER.includes(tactic))
        .sort((a, b) => TACTIC_ORDER.indexOf(a) - TACTIC_ORDER.indexOf(b));
      const description = firstSentence(cleanMitreText(object.description));
      return {
        id,
        name: object.name,
        tactics,
        tacticLabels: tactics.map((tactic) => TACTIC_LABELS[tactic]),
        description,
        url: `https://attack.mitre.org/techniques/${id.replace(".", "/")}/`,
        subtechniqueOf: techniqueParent(id),
      };
    });
}

export function extractLockBitMappings(stix) {
  const objectById = new Map((stix.objects ?? []).map((object) => [object.id, object]));
  const mappings = {};

  for (const software of stix.objects ?? []) {
    if (software.type !== "malware" || !["LockBit 2.0", "LockBit 3.0"].includes(software.name)) continue;

    const snapshotId = software.name === "LockBit 2.0" ? "lockbit-2.0" : "lockbit-3.0";
    const claims = {};
    const techniqueIds = [];

    for (const relationship of stix.objects ?? []) {
      if (relationship.type !== "relationship") continue;
      if (relationship.relationship_type !== "uses" || relationship.source_ref !== software.id) continue;

      const target = objectById.get(relationship.target_ref);
      if (!target || target.type !== "attack-pattern") continue;
      const id = externalId(target);
      if (!id) continue;

      claims[id] = cleanMitreText(relationship.description) || `${software.name} uses ${target.name}.`;
      techniqueIds.push(id);
    }

    techniqueIds.sort();
    mappings[snapshotId] = {
      softwareId: software.id,
      softwareExternalId: externalId(software),
      softwareName: software.name,
      modifiedAt: software.modified,
      techniqueIds,
      claims,
    };
  }

  return mappings;
}

export function compareMappingSets(observations, mappings) {
  const added = {};
  const removed = {};

  for (const [snapshotId, mapping] of Object.entries(mappings)) {
    const current = new Set(
      observations
        .filter((observation) => observation.snapshotId === snapshotId)
        .map((observation) => observation.techniqueId),
    );
    const next = new Set(mapping.techniqueIds);
    added[snapshotId] = [...next].filter((id) => !current.has(id)).sort();
    removed[snapshotId] = [...current].filter((id) => !next.has(id)).sort();
  }

  const changed = Object.values(added).some((ids) => ids.length) || Object.values(removed).some((ids) => ids.length);
  return { changed, added, removed };
}

export function allMappingTechniqueIds(mappings) {
  const ids = new Set();
  for (const mapping of Object.values(mappings)) {
    for (const id of mapping.techniqueIds) {
      ids.add(id);
      if (id.includes(".")) ids.add(id.split(".")[0]);
    }
  }
  return [...ids].sort();
}

export function updateObservationMappings(observations, mappings, versionLabel) {
  return observations.map((observation) => {
    const mapping = mappings[observation.snapshotId];
    const claim = mapping?.claims[observation.techniqueId];
    if (!claim) return observation;

    const next = structuredClone(observation);
    next.claim = claim;
    const mappingEvidence = next.evidence.find(
      (evidence) =>
        evidence.kind === "mapping" &&
        (evidence.sourceId === "mitre-s1199" || evidence.sourceId === "mitre-s1202"),
    );
    const locator = `MITRE ATT&CK ${versionLabel} ${mapping.softwareExternalId} · technique use`;

    if (mappingEvidence) {
      mappingEvidence.quote = claim;
      mappingEvidence.locator = locator;
    } else {
      next.evidence.push({
        id: `ev-${observation.id}-mapping`,
        sourceId: observation.snapshotId === "lockbit-2.0" ? "mitre-s1199" : "mitre-s1202",
        kind: "mapping",
        quote: claim,
        locator,
      });
    }

    return next;
  });
}

export function replaceVersionInStrings(value, fromVersion, toVersion) {
  if (typeof value === "string") return value.split(fromVersion).join(toVersion);
  if (Array.isArray(value)) return value.map((item) => replaceVersionInStrings(item, fromVersion, toVersion));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceVersionInStrings(item, fromVersion, toVersion)]),
    );
  }
  return value;
}

export function updateCaseVersion(caseFile, { fromVersion, toVersion, releaseDate, verifiedAt }) {
  const next = replaceVersionInStrings(structuredClone(caseFile), fromVersion, toVersion);
  next.attackVersion = toVersion;
  next.attackReleaseDate = releaseDate;
  next.verifiedAt = verifiedAt;
  return next;
}

export function updateSourcesForAttack(
  sources,
  { toVersion, releaseDate, verifiedAt, datasetUrl, datasetSha256, mappings },
) {
  const next = structuredClone(sources);
  const release = next.find((source) => source.id === "mitre-attack-release");
  if (release) {
    release.title = `MITRE ATT&CK ${toVersion} release`;
    release.publishedAt = releaseDate;
    release.retrievedAt = verifiedAt;
    release.url = `https://github.com/mitre-attack/attack-stix-data/releases/tag/${toVersion}`;
    release.note = `Official Enterprise ATT&CK STIX release used for the ${toVersion} technique and software mappings. Dataset SHA-256 ${datasetSha256}; ${datasetUrl}. Verified ${verifiedAt}.`;
  }

  for (const [snapshotId, sourceId] of [
    ["lockbit-2.0", "mitre-s1199"],
    ["lockbit-3.0", "mitre-s1202"],
  ]) {
    const source = next.find((item) => item.id === sourceId);
    const mapping = mappings[snapshotId];
    if (!source || !mapping) continue;
    source.title = `MITRE ATT&CK ${toVersion} — ${mapping.softwareName} (${mapping.softwareExternalId})`;
    source.publishedAt = String(mapping.modifiedAt).slice(0, 10);
    source.retrievedAt = verifiedAt;
    source.note = `Enterprise ATT&CK ${toVersion} software mapping. Software object last modified ${String(mapping.modifiedAt).slice(0, 10)}; page verified ${verifiedAt}.`;
  }

  return next;
}

export function updateConflictsVersion(conflicts, fromVersion, toVersion) {
  return replaceVersionInStrings(conflicts, fromVersion, toVersion);
}

export function findLatestAttack(index) {
  const collection = (index.collections ?? []).find((item) =>
    item.versions?.[0]?.url?.includes("enterprise-attack"),
  );
  if (!collection?.versions?.[0]) throw new Error("Enterprise ATT&CK collection not found in index.json");
  const latest = collection.versions[0];
  return {
    version: `v${latest.version}`,
    rawVersion: latest.version,
    url: latest.url,
    modifiedAt: latest.modified,
    releasedAt: String(latest.modified).slice(0, 10),
  };
}

export function parentTechniqueIds(techniqueIds) {
  const parents = new Set();
  for (const id of techniqueIds) {
    if (id.includes(".")) parents.add(id.split(".")[0]);
  }
  return [...parents].sort();
}

export function sigmaRulePath(sourceUrl) {
  const match = sourceUrl.match(/\/blob\/[^/]+\/(.+)$/);
  if (!match) throw new Error(`Cannot determine SigmaHQ path from ${sourceUrl}`);
  return match[1];
}

export function parsedSigmaTechniqueIds(tags = []) {
  return tags
    .map((tag) => String(tag).toLowerCase())
    .filter((tag) => /^attack\.t\d{4}(?:\.\d{3})?$/.test(tag))
    .map((tag) => tag.replace("attack.", "").toUpperCase());
}

export function parseSigmaRule(yamlText, path) {
  const data = YAML.parse(yamlText);
  if (!data || typeof data !== "object") throw new Error(`Invalid Sigma rule: ${path}`);
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  return {
    path,
    id: data.id,
    title: data.title,
    status: data.status,
    level: data.level,
    description: data.description,
    author: data.author,
    date: data.date,
    modified: data.modified,
    tags,
    techniqueIds: parsedSigmaTechniqueIds(tags),
    logsource: data.logsource,
  };
}

export function verifySigmaRule(rule, parsed) {
  const issues = [];
  if (rule.id !== parsed.id) issues.push(`ID changed from ${rule.id} to ${parsed.id}`);
  if (!parsed.techniqueIds.some((id) => rule.techniqueIds.includes(id))) {
    issues.push(`Curated ATT&CK tags ${rule.techniqueIds.join(", ")} are no longer present`);
  }
  return issues;
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<script.*?<\/script>/gis, " ")
    .replace(/<style.*?<\/style>/gis, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function textNode(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return textNode(value["#text"] ?? value.__cdata ?? value.href ?? "");
  return "";
}

function firstLink(value) {
  if (Array.isArray(value)) return firstLink(value[0]);
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return firstLink(value["@_href"] ?? value["#text"] ?? value.href ?? "");
  return "";
}

export function extractFeedItems(xml, feedId) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
  });
  const document = parser.parse(xml);
  const channel = document?.rss?.channel;
  const entries = channel ? channel.item : document?.feed?.entry;
  const items = Array.isArray(entries) ? entries : entries ? [entries] : [];

  return items.map((item) => ({
    feedId,
    title: stripHtml(textNode(item.title)),
    url: firstLink(item.link),
    description: stripHtml(textNode(item.description ?? item.summary ?? item.content)),
    publishedAt: stripHtml(textNode(item.pubDate ?? item.published ?? item.updated)),
  }));
}

export function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return String(url).toLowerCase();
  }
}

export function filterCandidateReports(items, knownReports, feed) {
  const known = new Set(knownReports.map((report) => normalizeUrl(report.url)));
  const terms = (feed.terms ?? []).map((term) => term.toLowerCase());
  const seen = new Set();

  return items.filter((item) => {
    if (!item.url || known.has(normalizeUrl(item.url))) return false;
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    if (!terms.some((term) => haystack.includes(term))) return false;
    const key = normalizeUrl(item.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function buildPrBody(summary) {
  const lines = ["# Verified intelligence data refresh", "", `Checked: ${summary.checkedAt}`, ""];
  if (summary.attack.status === "updated") {
    lines.push(
      "## ATT&CK",
      "",
      `- Version: ${summary.attack.from} → ${summary.attack.to}`,
      `- Released: ${summary.attack.releasedAt}`,
      `- LockBit mappings unchanged; technique metadata and observation claims refreshed.`,
      "",
    );
  } else if (summary.attack.status === "no-change") {
    lines.push("## ATT&CK", "", `- No version change (${summary.attack.to}).`, "");
  }
  if (summary.sigma.status === "updated") {
    lines.push(
      "## SigmaHQ",
      "",
      `- Commit: ${summary.sigma.from.slice(0, 8)} → ${summary.sigma.to.slice(0, 8)}`,
      `- ${summary.sigma.ruleCount} curated rules re-verified and re-pinned.`,
      "",
    );
  } else if (summary.sigma.status === "no-change") {
    lines.push("## SigmaHQ", "", `- No commit change (${summary.sigma.to.slice(0, 8)}).`, "");
  }
  if (summary.candidates.length) {
    lines.push(
      "## New reporting candidates",
      "",
      ...summary.candidates.map((item) => `- [${item.title}](${item.url}) — ${item.feedName}`),
      "",
    );
  }
  lines.push(
    "## Verification",
    "",
    "- Lint, typecheck, tests and production build are run in the refresh workflow before this PR is opened.",
    "- Automated changes are limited to machine-verifiable metadata. New intelligence claims still require analyst review.",
    "- Regenerate screenshots if version labels changed.",
    "",
    `_Generated by [scripts/refresh-intel.mjs](../blob/main/scripts/refresh-intel.mjs)._`,
  );
  return lines.join("\n");
}

export function buildIssueBody(summary) {
  const lines = ["# Analyst review required", "", `Checked: ${summary.checkedAt}`, ""];
  if (summary.attack.status === "manual-review") {
    lines.push(
      "## ATT&CK mapping change",
      "",
      `The latest ATT&CK release ${summary.attack.to} changes the LockBit software mappings. The pipeline did not update observations automatically.`,
      "",
      ...Object.entries(summary.attack.added).map(
        ([snapshot, ids]) => `- ${snapshot} added: ${ids.length ? ids.join(", ") : "none"}`,
      ),
      ...Object.entries(summary.attack.removed).map(
        ([snapshot, ids]) => `- ${snapshot} removed: ${ids.length ? ids.join(", ") : "none"}`,
      ),
      "",
      "Update `data/observations.json` with evidence for every added technique and review every removed technique before merging.",
      "",
    );
  }
  if (summary.candidates.length) {
    lines.push(
      "## New reporting candidates",
      "",
      ...summary.candidates.map(
        (item) => `- [${item.title}](${item.url}) — ${item.feedName}${item.publishedAt ? ` (${item.publishedAt})` : ""}`,
      ),
      "",
      "Triage each item, add only verifiable evidence to the source registry, and do not auto-generate findings.",
      "",
    );
  }
  if (summary.errors.length) {
    lines.push("## Source check errors", "", ...summary.errors.map((error) => `- ${error}`), "");
  }
  return lines.join("\n");
}
