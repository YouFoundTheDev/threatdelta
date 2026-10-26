import type { Metadata } from "next";
import { DetectionWorkbench } from "@/components/detection-workbench";
import { PageHeader, Badge } from "@/components/ui";
import { baselineCoverage, caseFile, currentCoverage, targetCoverage } from "@/lib/analysis";
import { sigmaRules } from "@/lib/data";

export const metadata: Metadata = { title: "Detection coverage — ThreatDelta" };

export default async function DetectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string }>;
}) {
  const { snapshot } = await searchParams;
  return (
    <div>
      <PageHeader
        eyebrow="Defence · public rule coverage"
        title={
          <>
            Detection <em className="italic text-rust">coverage</em>
          </>
        }
        deck="A small set of real public Sigma rules, matched against the techniques in the case. It tells you what is in this catalogue, not what is in your SOC."
        actions={
          <>
            <Badge tone="neutral">{sigmaRules.length} SigmaHQ rules</Badge>
            <Badge tone="ink">{caseFile.snapshots.length} snapshots</Badge>
            <Badge tone="amber">Catalogue check, not your stack</Badge>
          </>
        }
      />
      <div className="mt-7">
        <DetectionWorkbench
          caseFile={caseFile}
          coverageBySnapshot={{
            [caseFile.snapshots[0].id]: baselineCoverage,
            [caseFile.snapshots[1].id]: targetCoverage,
            [caseFile.snapshots[2].id]: currentCoverage,
          }}
          sigmaRules={sigmaRules}
          initialSnapshotId={snapshot}
        />
      </div>
    </div>
  );
}
