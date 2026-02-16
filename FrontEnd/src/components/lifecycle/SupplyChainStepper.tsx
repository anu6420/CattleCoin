import { Check } from "lucide-react";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { cn } from "@/lib/utils";
import { STAGES } from "@/lib/types";
import type { Stage, LifecycleEvent } from "@/lib/types";

interface SupplyChainStepperProps {
  currentStage: Stage;
  events: LifecycleEvent[];
}

export function SupplyChainStepper({
  currentStage,
  events,
}: SupplyChainStepperProps) {
  const currentIdx = STAGES.indexOf(currentStage);
  const eventByStage = new Map(events.map((e) => [e.stage, e]));

  return (
    <div className="flex flex-col gap-0">
      {STAGES.map((stage, idx) => {
        const status =
          idx < currentIdx
            ? "completed"
            : idx === currentIdx
              ? "current"
              : "pending";
        const event = eventByStage.get(stage);

        return (
          <div key={stage} className="flex gap-3">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                  status === "completed" &&
                    "border-green-500 bg-green-500 text-white",
                  status === "current" &&
                    "border-primary bg-primary text-primary-foreground",
                  status === "pending" &&
                    "border-muted-foreground/30 bg-background text-muted-foreground/50",
                )}
              >
                {status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              {idx < STAGES.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-8",
                    idx < currentIdx ? "bg-green-500" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-6 pt-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    status === "pending" && "text-muted-foreground",
                  )}
                >
                  {stage}
                </span>
                {event && <VerifiedBadge verified={event.verified} />}
              </div>
              {event && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.note}
                </p>
              )}
              {status === "pending" && !event && (
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  Pending
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
