import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/common/StageBadge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { getCowById } from "@/lib/api";
import type { Cow, CowHealth } from "@/lib/types";
import { formatUsd, formatWeight, formatDate } from "@/lib/utils";

const HEALTH_STYLES: Record<CowHealth, string> = {
  "On Track": "bg-green-100 text-green-800 border-green-200",
  Watch: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Issue: "bg-red-100 text-red-800 border-red-200",
};

export function CowDetail() {
  const { cowId } = useParams<{ cowId: string }>();
  const [cow, setCow] = useState<Cow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!cowId) return;
    setLoading(true);
    getCowById(cowId)
      .then((result) => {
        if (!result) setNotFound(true);
        else setCow(result);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [cowId]);

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold">Cow not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No cow with ID &ldquo;{cowId}&rdquo; exists.
        </p>
        <Link
          to="/investor/holdings"
          className="mt-4 text-sm text-primary hover:underline"
        >
          Back to Holdings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/investor/holdings" className="hover:text-foreground">
          Holdings
        </Link>
        <ChevronRight className="h-3 w-3" />
        {cow && (
          <>
            <Link
              to={`/investor/holdings/${cow.poolId}`}
              className="hover:text-foreground"
            >
              {cow.poolId}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-foreground">
          {loading ? <Skeleton className="inline-block h-4 w-24" /> : cow?.cowId}
        </span>
      </nav>

      {/* Title */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : cow ? (
        <div>
          <h2 className="text-2xl font-bold">{cow.cowId}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground font-mono">
              Token #{cow.tokenId}
            </span>
            <StageBadge stage={cow.stage} />
            <VerifiedBadge verified={cow.verified} showLabel />
          </div>
        </div>
      ) : null}

      {/* Details card */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : cow ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Pool</dt>
                  <dd>
                    <Link
                      to={`/investor/holdings/${cow.poolId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {cow.poolId}
                    </Link>
                  </dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Stage</dt>
                  <dd><StageBadge stage={cow.stage} /></dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Facility</dt>
                  <dd className="text-right">{cow.ranchOrFacility}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Weight</dt>
                  <dd className="font-medium">{formatWeight(cow.weightLb)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Health</dt>
                  <dd>
                    <Badge variant="outline" className={HEALTH_STYLES[cow.health]}>
                      {cow.health}
                    </Badge>
                  </dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Days in Stage</dt>
                  <dd className="font-medium">{cow.daysInStage}d</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cost-to-Date</dt>
                  <dd className="font-medium">{formatUsd(cow.costToDateUsd)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Projected Exit</dt>
                  <dd className="font-medium">{formatUsd(cow.projectedExitUsd)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Update</dt>
                  <dd>{formatDate(cow.updatedIso)}</dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>

        {/* Placeholder for future chart / lifecycle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Lifecycle &amp; Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Detailed cow lifecycle timeline and weight chart coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
