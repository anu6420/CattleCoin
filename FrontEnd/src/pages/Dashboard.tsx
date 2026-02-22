import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, KpiCardSkeleton } from "@/components/common/KpiCard";
import { StageBadge } from "@/components/common/StageBadge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { LineChartCard, LineChartCardSkeleton } from "@/components/charts/LineChartCard";
import { PoolsTable, PoolsTableSkeleton } from "@/components/tables/PoolsTable";
import type { PoolSortKey } from "@/components/tables/PoolsTable";
import { getPortfolio } from "@/lib/api";
import type { PortfolioSummary } from "@/lib/types";
import { formatUsd, formatPct, formatDateTime } from "@/lib/utils";

export function Dashboard() {
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<PoolSortKey>("positionValueUsd");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    getPortfolio()
      .then(setData)
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key: PoolSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-destructive">{error}</p>
        <button
          className="mt-4 text-sm text-primary underline"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Investor Dashboard</h2>
        {data && (
          <p className="text-xs text-muted-foreground">
            as of {formatDateTime(data.asOfIso)}
          </p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : data ? (
          <>
            <KpiCard
              title="Portfolio Value"
              value={formatUsd(data.portfolioValueUsd)}
            />
            <KpiCard
              title="30d Change"
              value={formatPct(data.change30dPct)}
              trend={data.change30dPct >= 0 ? "up" : "down"}
            />
            <KpiCard
              title="Lots Held"
              value={String(data.poolsHeld)}
            />
            <KpiCard
              title="Risk Score"
              value="—"
              subtitle="pending backend"
              trend="neutral"
            />
          </>
        ) : null}
      </div>

      {/* Portfolio Value Chart */}
      {loading ? (
        <LineChartCardSkeleton />
      ) : data ? (
        <LineChartCard title="Portfolio Value (30 days)" data={data.history30d} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Lifecycle Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recent Lifecycle Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data ? (
              <ul className="space-y-3">
                {data.recentEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start justify-between rounded-md border border-border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {ev.poolId && (
                          <Link
                            to={`/investor/holdings/${ev.poolId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {ev.poolId}
                          </Link>
                        )}
                        {ev.cowId && (
                          <span className="text-xs text-muted-foreground">
                            {ev.cowId}
                          </span>
                        )}
                        <StageBadge stage={ev.stage} />
                        <VerifiedBadge verified={ev.verified} />
                      </div>
                      <p className="text-xs text-muted-foreground">{ev.note}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(ev.timestampIso)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        {/* Top Pools */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Top Pools
              </CardTitle>
              <Link
                to="/investor/holdings"
                className="text-xs text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <PoolsTableSkeleton rows={5} />
            ) : data ? (
              <PoolsTable
                pools={data.topPools}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                compact
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
