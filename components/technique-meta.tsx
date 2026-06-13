import { TechniqueCode } from "./signals";
import type { Technique } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TacticLine({
  labels,
  max = 3,
  className,
}: {
  labels: string[];
  max?: number;
  className?: string;
}) {
  const shown = labels.slice(0, max);
  const extra = labels.length - shown.length;
  return (
    <span className={cn("font-mono text-[9px] uppercase leading-4 tracking-[0.06em] text-muted", className)}>
      {shown.join(" · ")}
      {extra > 0 ? ` · +${extra}` : ""}
    </span>
  );
}

export function TechniqueCell({
  technique,
  showTactics = true,
}: {
  technique: Technique;
  showTactics?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <TechniqueCode id={technique.id} href={technique.url} />
      </div>
      <p className="mt-0.5 text-[13px] font-medium leading-4 text-ink">{technique.name}</p>
      {showTactics ? <TacticLine labels={technique.tacticLabels} className="mt-1" /> : null}
    </div>
  );
}
