import type { Metadata } from "next";
import { EvidenceExplorer } from "@/components/evidence-explorer";
import { PageHeader, Badge } from "@/components/ui";
import { caseFile } from "@/lib/analysis";
import { observations, sources, techniques } from "@/lib/data";

export const metadata: Metadata = { title: "Evidence explorer — ThreatDelta" };

export default function EvidencePage() {
  const high = observations.filter((observation) => observation.confidence === "high").length;
  const direct = observations.reduce(
    (total, observation) => total + observation.evidence.filter((evidence) => evidence.kind === "direct").length,
    0,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Case file · sources"
        title={
          <>
            Evidence <em className="italic text-rust">explorer</em>
          </>
        }
        deck="Every finding in the case, with the quote and source behind it. Search by technique, source or phrase."
        actions={
          <>
            <Badge tone="neutral">{observations.length} findings</Badge>
            <Badge tone="olive">{high} high confidence</Badge>
            <Badge tone="ink">{direct} direct quotes</Badge>
          </>
        }
      />
      <div className="mt-7">
        <EvidenceExplorer caseFile={caseFile} observations={observations} techniques={techniques} sources={sources} />
      </div>
    </div>
  );
}
