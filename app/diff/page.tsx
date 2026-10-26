import type { Metadata } from "next";
import { DiffWorkbench } from "@/components/diff-workbench";
import { PageHeader, Badge, ButtonLink } from "@/components/ui";
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
        eyebrow="Historical comparison · 2022 → 2023"
        title={
          <>
            Intelligence <em className="italic text-rust">diff</em>
          </>
        }
        deck="Two snapshots of the same actor line. This is what ATT&CK recorded in February 2022 and June 2023, and what changed in the documentation."
        actions={
          <>
            <Badge tone="neutral">Historical baseline · 4 Feb 2022</Badge>
            <Badge tone="ink">Historical target · 14 Jun 2023</Badge>
            <ButtonLink href="/2026">2026 vendor snapshot</ButtonLink>
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
