import type { Metadata } from "next";
import { ReportBuilder } from "@/components/report-builder";
import { PageHeader, Badge } from "@/components/ui";
import {
  caseFile,
  comparison,
  currentCoverage,
  scoredHunts,
  targetCoverage,
} from "@/lib/analysis";
import { dataset, observations, sources, techniques } from "@/lib/data";

export const metadata: Metadata = { title: "Reports — ThreatDelta" };
export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const generatedAt = new Date().toISOString();

  return (
    <div>
      <PageHeader
        eyebrow="Delivery · export"
        title={
          <>
            Build a <em className="italic text-rust">report</em>
          </>
        }
        deck="Take the analysis with you: Markdown for a ticket, JSON for tooling. Every switch changes the actual file."
        actions={
          <>
            <Badge tone="neutral">Markdown</Badge>
            <Badge tone="neutral">JSON</Badge>
            <Badge tone="ink">Public sources only</Badge>
          </>
        }
      />
      <div className="mt-7">
        <ReportBuilder
          caseFile={caseFile}
          dataset={dataset}
          comparison={comparison}
          coverage={targetCoverage}
          currentCoverage={currentCoverage}
          hunts={scoredHunts}
          observations={observations}
          techniques={techniques}
          sources={sources}
          generatedAt={generatedAt}
        />
      </div>
    </div>
  );
}
