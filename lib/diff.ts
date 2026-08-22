import { compareTechniques, techniqueAncestors } from "./attack";
import type {
  Comparison,
  Conflict,
  Observation,
  Snapshot,
  Technique,
  TechniqueChange,
} from "./types";

function sortChanges(changes: TechniqueChange[]): TechniqueChange[] {
  return [...changes].sort((a, b) => {
    return compareTechniques(a.technique, b.technique);
  });
}

function observationFor(
  observations: Observation[],
  snapshotId: string,
  techniqueId: string,
): Observation | undefined {
  return observations.find(
    (observation) =>
      observation.snapshotId === snapshotId &&
      observation.techniqueId === techniqueId,
  );
}

export function compareSnapshots(
  baseline: Snapshot,
  target: Snapshot,
  observations: Observation[],
  techniques: Technique[],
  conflicts: Conflict[],
): Comparison {
  const techniqueIndex = new Map(techniques.map((technique) => [technique.id, technique]));
  const baselineIds = new Set(
    observations
      .filter((observation) => observation.snapshotId === baseline.id)
      .map((observation) => observation.techniqueId),
  );
  const targetObservations = observations.filter(
    (observation) => observation.snapshotId === target.id,
  );

  const newlyDocumented: TechniqueChange[] = [];
  const refinements: TechniqueChange[] = [];
  const shared: TechniqueChange[] = [];

  for (const observation of targetObservations) {
    const technique = techniqueIndex.get(observation.techniqueId);
    if (!technique) continue;

    const baselineObservation = observationFor(
      observations,
      baseline.id,
      observation.techniqueId,
    );

    if (baselineObservation) {
      shared.push({
        techniqueId: observation.techniqueId,
        kind: "shared",
        technique,
        observation,
        baselineObservation,
      });
      continue;
    }

    const ancestors = techniqueAncestors(observation.techniqueId, techniqueIndex);
    const parentInBaseline = ancestors
      .map((ancestorId) => observationFor(observations, baseline.id, ancestorId))
      .find((parent): parent is Observation => Boolean(parent));

    if (parentInBaseline) {
      refinements.push({
        techniqueId: observation.techniqueId,
        kind: "refined",
        technique,
        observation,
        baselineObservation: parentInBaseline,
      });
    } else {
      newlyDocumented.push({
        techniqueId: observation.techniqueId,
        kind: "new",
        technique,
        observation,
      });
    }
  }

  const targetIds = new Set(targetObservations.map((observation) => observation.techniqueId));
  const notRedocumented: TechniqueChange[] = [];

  for (const techniqueId of baselineIds) {
    if (targetIds.has(techniqueId)) continue;

    const hasTargetDescendant = [...targetIds].some((targetId) =>
      techniqueAncestors(targetId, techniqueIndex).includes(techniqueId),
    );
    if (hasTargetDescendant) continue;

    const observation = observationFor(observations, baseline.id, techniqueId);
    const technique = techniqueIndex.get(techniqueId);
    if (!observation || !technique) continue;

    notRedocumented.push({
      techniqueId,
      kind: "not-redocumented",
      technique,
      observation,
      baselineObservation: observation,
    });
  }

  const relevantConflicts = conflicts.filter((conflict) =>
    conflict.snapshotIds.some((id) => id === baseline.id || id === target.id),
  );

  const sortedNew = sortChanges(newlyDocumented);
  const sortedRefinements = sortChanges(refinements);
  const sortedShared = sortChanges(shared);
  const sortedDropped = sortChanges(notRedocumented);

  return {
    baseline,
    target,
    changes: [...sortedNew, ...sortedRefinements, ...sortedShared, ...sortedDropped],
    newlyDocumented: sortedNew,
    refinements: sortedRefinements,
    shared: sortedShared,
    notRedocumented: sortedDropped,
    conflicts: relevantConflicts,
    counts: {
      baseline: baselineIds.size,
      target: targetObservations.length,
      shared: sortedShared.length,
      newlyDocumented: sortedNew.length,
      refinements: sortedRefinements.length,
      addedMappings: sortedNew.length + sortedRefinements.length,
      notRedocumented: sortedDropped.length,
      conflicts: relevantConflicts.length,
    },
  };
}
