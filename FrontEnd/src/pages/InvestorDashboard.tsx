// import { useEffect, useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Skeleton } from "@/components/ui/skeleton";
// import { KpiCard, KpiCardSkeleton } from "@/components/common/KpiCard";
// import { StageBadge } from "@/components/common/StageBadge";
// import { VerifiedBadge } from "@/components/common/VerifiedBadge";
// import { LineChartCard, LineChartCardSkeleton } from "@/components/charts/LineChartCard";
// import { PoolsTable, PoolsTableSkeleton } from "@/components/tables/PoolsTable";
// import type { PoolSortKey } from "@/components/tables/PoolsTable";
// import { getInvestorPortfolio } from "@/lib/api";
// import type { PortfolioSummary } from "@/lib/types";
// import { formatUsd, formatPct, formatDateTime } from "@/lib/utils";

// export function InvestorDashboard() {
//   const { slug } = useParams<{ slug: string }>();
//   const [data, setData] = useState<PortfolioSummary | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [sortKey, setSortKey] = useState<PoolSortKey>("positionValueUsd");
//   const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

//   useEffect(() => {
//     if (!slug) return;
//     setLoading(true);
//     setError(null);
//     getInvestorPortfolio(slug)
//       .then(setData)
//       .catch(() => setError("Failed to load dashboard data."))
//       .finally(() => setLoading(false));
//   }, [slug]);

//   function handleSort(key: PoolSortKey) {
//     if (key === sortKey) {
//       setSortDir((d) => (d === "asc" ? "desc" : "asc"));
//     } else {
//       setSortKey(key);
//       setSortDir("desc");
//     }
//   }

//   if (error) {
//     return (
//       <div className="p-8 text-center space-y-3">
//         <p className="text-red-600">{error}</p>
//         <button
//           className="px-4 py-2 bg-slate-100 rounded text-sm"
//           onClick={() => window.location.reload()}
//         >
//           Retry
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6 p-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold tracking-tight">Investor Dashboard</h1>
//           {slug && (
//             <p className="text-sm text-slate-500 capitalize mt-0.5">
//               {slug.replace("investor", "Investor ")}
//             </p>
//           )}
//         </div>
//         {data && (
//           <span className="text-xs text-slate-400">
//             as of {formatDateTime(data.asOfIso)}
//           </span>
//         )}
//       </div>

//       {/* KPI Cards */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//         {loading ? (
//           <>
//             <KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton />
//           </>
//         ) : data ? (
//           <>
//             <KpiCard
//               label="Portfolio Value"
//               value={formatUsd(data.portfolioValueUsd)}
//               delta={data.change30dPct}
//               trend={data.change30dPct >= 0 ? "up" : "down"}
//             />
//             <KpiCard
//               label="30-Day Change"
//               value={formatPct(data.change30dPct)}
//               trend={data.change30dPct >= 0 ? "up" : "down"}
//             />
//             <KpiCard label="Lots Held" value={data.poolsHeld.toString()} />
//             <KpiCard
//               label="Avg Risk Score"
//               value={data.avgRisk.toString()}
//               subtitle="0 = low · 100 = high"
//             />
//           </>
//         ) : null}
//       </div>

//       {/* Portfolio Value Chart */}
//       {loading ? (
//         <LineChartCardSkeleton />
//       ) : data ? (
//         <LineChartCard
//           title="Portfolio Value (30 days)"
//           series={data.history30d}
//           valuePrefix="$"
//         />
//       ) : null}

//       {/* Recent Lifecycle Events */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="text-base">Recent Lifecycle Events</CardTitle>
//         </CardHeader>
//         <CardContent>
//           {loading ? (
//             <div className="space-y-2">
//               {Array.from({ length: 4 }).map((_, i) => (
//                 <Skeleton key={i} className="h-10 w-full" />
//               ))}
//             </div>
//           ) : data ? (
//             <ul className="divide-y text-sm">
//               {data.recentEvents.map((ev) => (
//                 <li key={ev.id} className="py-2.5 flex items-start gap-3">
//                   <div className="flex-1 min-w-0">
//                     {ev.poolId && (
//                       <Link
//                         to={`/investor/holdings/${ev.poolId}`}
//                         className="font-medium text-blue-600 hover:underline truncate block"
//                       >
//                         {ev.poolId}
//                       </Link>
//                     )}
//                     <p className="text-slate-600 truncate">{ev.note}</p>
//                   </div>
//                   <div className="flex items-center gap-2 shrink-0">
//                     <StageBadge stage={ev.stage} />
//                     {ev.verified && <VerifiedBadge />}
//                     <span className="text-xs text-slate-400">
//                       {formatDateTime(ev.timestampIso)}
//                     </span>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           ) : null}
//         </CardContent>
//       </Card>

//       {/* Top Pools */}
//       <Card>
//         <CardHeader className="flex flex-row items-center justify-between">
//           <CardTitle className="text-base">Top Lots</CardTitle>
//           <Link
//             to={`/investor/${slug}/holdings`}
//             className="text-sm text-blue-600 hover:underline"
//           >
//             View all
//           </Link>
//         </CardHeader>
//         <CardContent className="p-0">
//           {loading ? (
//             <PoolsTableSkeleton />
//           ) : data ? (
//             <PoolsTable
//               pools={data.topPools}
//               sortKey={sortKey}
//               sortDir={sortDir}
//               onSort={handleSort}
//             />
//           ) : null}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, KpiCardSkeleton } from "@/components/common/KpiCard";
import { StageBadge } from "@/components/common/StageBadge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { LineChartCard, LineChartCardSkeleton } from "@/components/charts/LineChartCard";
import { PoolsTable, PoolsTableSkeleton } from "@/components/tables/PoolsTable";
import { MyInvestments } from "@/components/common/MyInvestments";
import type { PoolSortKey } from "@/components/tables/PoolsTable";
import { getInvestorPortfolio, getInvestorHoldings } from "@/lib/api";
import type { PortfolioSummary, Pool } from "@/lib/types";
import { formatUsd, formatPct, formatDateTime } from "@/lib/utils";

export function InvestorDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [holdings, setHoldings] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<PoolSortKey>("positionValueUsd");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getInvestorPortfolio(slug),
      getInvestorHoldings(slug),
    ])
      .then(([portfolio, pools]) => {
        setData(portfolio);
        setHoldings(pools);
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, [slug]);

  // Build a herdId -> herdName lookup from holdings for use in recent events
  const herdNameMap = new Map<string, string>(
    holdings.map((p) => [p.herdId, p.name])
  );

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
      <div className="p-8 text-center space-y-3">
        <p className="text-red-600">{error}</p>
        <button
          className="px-4 py-2 bg-slate-100 rounded text-sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investor Dashboard</h1>
          {slug && (
            <p className="text-sm text-slate-500 capitalize mt-0.5">
              {slug.replace("investor", "Investor ")}
            </p>
          )}
        </div>
        {data && (
          <span className="text-xs text-slate-400">
            as of {formatDateTime(data.asOfIso)}
          </span>
        )}
      </div>

      {/* KPI Cards — all four are labeled */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton />
          </>
        ) : data ? (
          <>
            <KpiCard
              label="Portfolio Value"
              value={formatUsd(data.portfolioValueUsd)}
              delta={data.change30dPct}
              trend={data.change30dPct >= 0 ? "up" : "down"}
            />
            <KpiCard
              label="30-Day Change"
              value={formatPct(data.change30dPct)}
              trend={data.change30dPct >= 0 ? "up" : "down"}
            />
            <KpiCard
              label="Herds Held"
              value={data.poolsHeld.toString()}
              subtitle="active investments"
              trend="neutral"
            />
            <KpiCard
              label="Avg Risk Score"
              value={data.avgRisk.toString()}
              subtitle="0 = low · 100 = high"
              trend="neutral"
            />
          </>
        ) : null}
      </div>

      {/* Portfolio Value Chart */}
      {loading ? (
        <LineChartCardSkeleton />
      ) : data ? (
        <LineChartCard
          title="Portfolio Value (30 days)"
          series={data.history30d}
          valuePrefix="$"
        />
      ) : null}

      {/* My Investments — cards grid */}
      <MyInvestments pools={holdings} loading={loading} />

      {/* Recent Lifecycle Events — show herd name, not UUID */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Lifecycle Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data ? (
            <ul className="divide-y text-sm">
              {data.recentEvents.map((ev) => (
                <li key={ev.id} className="py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {ev.poolId && (
                      <Link
                        to={`/investor/holdings/${ev.poolId}`}
                        className="font-medium text-blue-600 hover:underline truncate block"
                      >
                        {/* Show herd name if available, fall back to ID */}
                        {herdNameMap.get(ev.poolId) ?? ev.poolId}
                      </Link>
                    )}
                    <p className="text-slate-600 truncate">{ev.note}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StageBadge stage={ev.stage} />
                    {ev.verified && <VerifiedBadge />}
                    <span className="text-xs text-slate-400">
                      {formatDateTime(ev.timestampIso)}
                    </span>
                  </div>
                </li>
              ))}
              {data.recentEvents.length === 0 && (
                <li className="py-6 text-center text-slate-400 text-sm">
                  No recent events.
                </li>
              )}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {/* Top Pools — show herd name (PoolsTable uses pool.name already) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Top Lots by Value</CardTitle>
          <Link
            to={`/investor/${slug}/holdings`}
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <PoolsTableSkeleton />
          ) : data ? (
            <PoolsTable
              pools={data.topPools}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}