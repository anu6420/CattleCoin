import { ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({
  verified,
  showLabel = false,
}: {
  verified: boolean;
  showLabel?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        verified ? "text-green-600" : "text-muted-foreground"
      )}
    >
      {verified ? (
        <ShieldCheck className="h-4 w-4" />
      ) : (
        <ShieldAlert className="h-4 w-4" />
      )}
      {showLabel && (verified ? "Verified" : "Unverified")}
    </span>
  );
}
