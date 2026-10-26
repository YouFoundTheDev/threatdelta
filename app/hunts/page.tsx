import type { Metadata } from "next";
import { HuntPlanner } from "@/components/hunt-planner";
import { PageHeader, Badge } from "@/components/ui";
import { comparison, scoredHunts, targetCoverage } from "@/lib/analysis";
import { sources, techniques } from "@/lib/data";

export const metadata: Metadata = { title: "Hunt planner — ThreatDelta" };

export default function HuntsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Action · threat hunting"
        title={
          <>
            Hunt <em className="italic text-rust">planner</em>
          </>
        }
        deck="Five things to check if the delta matters. Each brief gives you the signals, the steps and the noise you will hit."
        actions={
          <>
            <Badge tone="neutral">{scoredHunts.length} hypotheses</Badge>
            <Badge tone="ink">Transparent score /11</Badge>
          </>
        }
      />
      <div className="mt-7">
        <HuntPlanner
          scoredHunts={scoredHunts}
          comparison={comparison}
          coverage={targetCoverage}
          sources={sources}
          techniques={techniques}
        />
      </div>
    </div>
  );
}
