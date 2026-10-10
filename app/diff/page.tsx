import type { Metadata } from "next";
import { DiffWorkbench } from "@/components/diff-workbench";
import { PageHeader, Badge } from "@/components/ui";
import {
  baselineCoverage,
  caseFile,
  comparison,
  targetCoverage,
} from "@/lib/analysis";
import { sources } from "@/lib/data";

export const metadata: Metadata = { title: "Intelligence diff — ThreatDelta" };

export default function DiffPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Comparison · documentation delta"
        title={
          <>
            Intelligence <em className="italic text-rust">diff</em>
          </>
        }
        deck="Compare the ATT&CK mappings of two public LockBit snapshots. Each row is a mapping change, not an incident count or a claim of adoption."
        actions={
          <>
            <Badge tone="neutral">Baseline 4 Feb 2022</Badge>
            <Badge tone="ink">Target 14 Jun 2023</Badge>
          </>
        }
      />
      <div className="mt-7">
        <DiffWorkbench
          caseFile={caseFile}
          comparison={comparison}
          sources={sources}
          targetCoverage={targetCoverage}
          baselineCoverage={baselineCoverage}
        />
      </div>
    </div>
  );
}
