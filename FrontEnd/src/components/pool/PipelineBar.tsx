import type { StageBreakdown, Stage } from "@/lib/types";

const STAGE_COLORS: Record<Stage, string> = {
  RANCH: "bg-green-500",
  AUCTION: "bg-yellow-500",
  BACKGROUNDING: "bg-amber-500",
  FEEDLOT: "bg-orange-500",
  PROCESSING: "bg-blue-500",
  DISTRIBUTION: "bg-purple-500",
};

const STAGE_TEXT_COLORS: Record<Stage, string> = {
  RANCH: "text-green-700",
  AUCTION: "text-yellow-700",
  BACKGROUNDING: "text-amber-700",
  FEEDLOT: "text-orange-700",
  PROCESSING: "text-blue-700",
  DISTRIBUTION: "text-purple-700",
};

interface PipelineBarProps {
  breakdown: StageBreakdown[];
}

export function PipelineBar({ breakdown }: PipelineBarProps) {
  const active = breakdown.filter((s) => s.pct > 0);

  return (
    <div className="space-y-3">
      {/* Segmented bar */}
      <div className="flex h-6 w-full overflow-hidden rounded-full bg-muted">
        {active.map((s) => (
          <div
            key={s.stage}
            className={`${STAGE_COLORS[s.stage]} flex items-center justify-center text-[10px] font-bold text-white`}
            style={{ width: `${s.pct}%` }}
            title={`${s.stage}: ${s.pct}%`}
          >
            {s.pct >= 10 ? `${s.pct}%` : ""}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {breakdown.map((s) => (
          <div key={s.stage} className="flex items-center gap-1.5 text-xs">
            <div className={`h-2.5 w-2.5 rounded-full ${STAGE_COLORS[s.stage]}`} />
            <span className={s.pct > 0 ? STAGE_TEXT_COLORS[s.stage] : "text-muted-foreground"}>
              {s.stage}
            </span>
            <span className="font-medium">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
