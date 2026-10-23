import type { Metadata } from "next";
import { ReportBuilder } from "@/components/report-builder";
import { PageHeader, Badge } from "@/components/ui";
import {
  caseFile,
  comparison,
  scoredHunts,
  targetCoverage,
} from "@/lib/analysis";
import { observations, sources, techniques } from "@/lib/data";

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
        deck="Export the selected analysis as an analyst-readable Markdown brief or a structured JSON payload. Every option below changes the actual output."
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
          comparison={comparison}
          coverage={targetCoverage}
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
