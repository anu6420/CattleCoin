import { Badge } from "@/components/ui/badge";
import type { Stage } from "@/lib/types";

const STAGE_COLORS: Record<Stage, string> = {
  RANCH: "bg-green-100 text-green-800 border-green-200",
  AUCTION: "bg-yellow-100 text-yellow-800 border-yellow-200",
  BACKGROUNDING: "bg-amber-100 text-amber-800 border-amber-200",
  FEEDLOT: "bg-orange-100 text-orange-800 border-orange-200",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
  DISTRIBUTION: "bg-purple-100 text-purple-800 border-purple-200",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge variant="outline" className={STAGE_COLORS[stage]}>
      {stage}
    </Badge>
  );
}
