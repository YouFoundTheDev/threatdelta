import type { Metadata } from "next";
import { DetectionWorkbench } from "@/components/detection-workbench";
import { PageHeader, Badge } from "@/components/ui";
import { baselineCoverage, caseFile, targetCoverage } from "@/lib/analysis";
import { sigmaRules } from "@/lib/data";

export const metadata: Metadata = { title: "Detection coverage — ThreatDelta" };

export default function DetectionsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Defence · public rule coverage"
        title={
          <>
            Detection <em className="italic text-rust">coverage</em>
          </>
        }
        deck="Match documented techniques to a small catalogue of real public Sigma rules. The result shows where public logic exists, where it needs interpretation, and where the catalogue is silent."
        actions={
          <>
            <Badge tone="neutral">{sigmaRules.length} SigmaHQ rules</Badge>
            <Badge tone="olive">{targetCoverage.summary.covered}/{targetCoverage.summary.total} exact</Badge>
            <Badge tone="amber">{targetCoverage.summary.broad} parent-tagged</Badge>
          </>
        }
      />
      <div className="mt-7">
        <DetectionWorkbench
          caseFile={caseFile}
          baselineCoverage={baselineCoverage}
          targetCoverage={targetCoverage}
          sigmaRules={sigmaRules}
        />
      </div>
    </div>
  );
}
