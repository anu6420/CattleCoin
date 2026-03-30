// import { useEffect, useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import {
//   ChevronRight, FileText, ShieldCheck, ClipboardList,
//   ArrowLeftRight, Award, Shield, PlusCircle, ExternalLink, TrendingUp,
// } from "lucide-react";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Skeleton } from "@/components/ui/skeleton";
// import { Separator } from "@/components/ui/separator";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { KpiCard, KpiCardSkeleton } from "@/components/common/KpiCard";
// import { StageBadge } from "@/components/common/StageBadge";
// import { VerifiedBadge } from "@/components/common/VerifiedBadge";
// import { LineChartCard, LineChartCardSkeleton } from "@/components/charts/LineChartCard";
// import { SupplyChainStepper } from "@/components/lifecycle/SupplyChainStepper";
// import { PipelineBar } from "@/components/pool/PipelineBar";
// import { BudgetBreakdown } from "@/components/pool/BudgetBreakdown";
// import { CowsTable, CowsTableSkeleton } from "@/components/tables/CowsTable";
// import { getPoolById, getPoolCows } from "@/lib/api";
// import type { PoolDetail as PoolDetailType, Cow, Document, PurchaseStatus } from "@/lib/types";
// import { formatUsd, formatNumber } from "@/lib/utils";

// const DOC_ICONS: Record<string, React.ElementType> = {
//   certificate: Award,
//   inspection: ClipboardList,
//   transfer: ArrowLeftRight,
//   grade: ShieldCheck,
//   insurance: Shield,
//   other: FileText,
// };

// const STATUS_STYLES: Record<PurchaseStatus, string> = {
//   available: "bg-green-50 text-green-700 border-green-200",
//   pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
//   sold:      "bg-slate-50 text-slate-600 border-slate-200",
// };

// function abbreviateAddress(addr: string): string {
//   if (addr.length <= 14) return addr;
//   return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
// }

// export function PoolDetail() {
//   const { id } = useParams<{ id: string }>();
//   const [data, setData] = useState<PoolDetailType | null>(null);
//   const [cows, setCows] = useState<Cow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [cowsLoading, setCowsLoading] = useState(true);
//   const [notFound, setNotFound] = useState(false);

//   function handleRemoveCow(cowId: string) {
//     setCows((prev) => prev.filter((c) => c.cowId !== cowId));
//   }

//   useEffect(() => {
//     if (!id) return;
//     setLoading(true);
//     setCowsLoading(true);

//     getPoolById(id)
//       .then((result) => {
//         if (!result) setNotFound(true);
//         else setData(result);
//       })
//       .catch(() => setNotFound(true))
//       .finally(() => setLoading(false));

//     getPoolCows(id)
//       .then(setCows)
//       .catch(() => {})
//       .finally(() => setCowsLoading(false));
//   }, [id]);

//   if (notFound) {
//     return (
//       <div className="p-8 text-center space-y-3">
//         <h2 className="text-lg font-semibold">Herd not found</h2>
//         <p className="text-slate-500">No herd with ID "{id}" exists.</p>
//         <Link to=".."><Button variant="outline">Back to Holdings</Button></Link>
//       </div>
//     );
//   }

//   // Derived availability
//   const tokensRemaining = data
//     ? (data.pool as any).tokensRemaining ?? (data.pool.totalSupply - ((data.pool as any).tokensSold ?? 0))
//     : 0;
//   const isAvailable =
//     !loading &&
//     data?.pool.purchaseStatus !== "sold" &&
//     tokensRemaining > 0;

//   return (
//     <div className="space-y-6 p-6">
//       {/* Breadcrumb */}
//       <nav className="flex items-center gap-1 text-sm text-slate-500">
//         <Link to=".." className="hover:underline">Holdings</Link>
//         <ChevronRight className="h-3.5 w-3.5" />
//         {loading ? <Skeleton className="h-4 w-24" /> : <span>{data?.pool.name}</span>}
//       </nav>

//       {/* Title row */}
//       {loading ? (
//         <Skeleton className="h-8 w-64" />
//       ) : data ? (
//         <div className="flex flex-wrap items-start justify-between gap-4">
//           <div className="space-y-1">
//             <div className="flex flex-wrap items-center gap-2">
//               <h1 className="text-2xl font-bold">{data.pool.name}</h1>
//               <Badge variant="outline">Lot</Badge>
//               <Badge
//                 variant="outline"
//                 className={STATUS_STYLES[data.pool.purchaseStatus]}
//               >
//                 {data.pool.purchaseStatus.charAt(0).toUpperCase() + data.pool.purchaseStatus.slice(1)}
//               </Badge>
//               {data.pool.cohortLabel && (
//                 <Badge variant="secondary">{data.pool.cohortLabel}</Badge>
//               )}
//               <Badge variant="secondary">{data.pool.geneticsLabel}</Badge>
//             </div>
//             <div className="flex items-center gap-2 text-sm text-slate-500">
//               <span>Contract:</span>
//               <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
//                 {abbreviateAddress(data.pool.contractAddress)}
//               </code>
//             </div>
//           </div>

//           {/* ── Invest Button — only when tokens remain ── */}
//           {isAvailable && (
//             <Link to={`/invest/${data.pool.herdId}`}>
//               <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
//                 <TrendingUp className="h-4 w-4" />
//                 Invest in This Herd
//               </Button>
//             </Link>
//           )}
//         </div>
//       ) : null}

//       {/* KPI Cards */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//         {loading ? (
//           <><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></>
//         ) : data ? (
//           <>
//             <KpiCard
//               label="Position Value"
//               value={formatUsd(data.pool.positionValueUsd)}
//             />
//             <KpiCard
//               label="Expected Revenue"
//               value={formatUsd(data.pool.expectedRevenueUsd)}
//               delta={data.pool.netExpectedUsd}
//               trend={data.pool.netExpectedUsd >= 0 ? "up" : "down"}
//               subtitle={data.pool.netExpectedUsd >= 0 ? "profitable" : "at risk"}
//             />
//             <KpiCard
//               label="Tokens Available"
//               value={`${formatNumber(tokensRemaining)} / ${formatNumber(data.pool.totalSupply)}`}
//               subtitle="remaining to purchase"
//             />
//             <KpiCard
//               label="Risk Score"
//               value={(data.pool as any).riskScore != null ? String((data.pool as any).riskScore) : "–"}
//               subtitle="0 = low · 100 = high"
//             />
//           </>
//         ) : null}
//       </div>

//       {/* Two column: Pipeline + Stepper | Budget + Chart */}
//       <div className="grid lg:grid-cols-2 gap-6">
//         {/* Left */}
//         <div className="space-y-6">
//           <Card>
//             <CardHeader><CardTitle className="text-base">Supply Chain Pipeline</CardTitle></CardHeader>
//             <CardContent>
//               {loading ? <Skeleton className="h-8 w-full" /> : data ? (
//                 <PipelineBar breakdown={data.pool.stageBreakdown} />
//               ) : null}
//             </CardContent>
//           </Card>
//           <Card>
//             <CardHeader><CardTitle className="text-base">Lifecycle Progress</CardTitle></CardHeader>
//             <CardContent>
//               {loading ? (
//                 <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
//               ) : data ? (
//                 <SupplyChainStepper events={data.lifecycle} currentStage={data.pool.dominantStage} />
//               ) : null}
//             </CardContent>
//           </Card>
//         </div>

//         {/* Right */}
//         <div className="space-y-6">
//           <Card>
//             <CardHeader><CardTitle className="text-base">Budget Breakdown</CardTitle></CardHeader>
//             <CardContent>
//               {loading ? (
//                 <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
//               ) : data ? (
//                 <BudgetBreakdown items={data.budgetBreakdown} />
//               ) : null}
//             </CardContent>
//           </Card>
//           {loading ? <LineChartCardSkeleton /> : data ? (
//             <LineChartCard
//               title="Lot Value (30 days)"
//               series={data.valuationHistory30d}
//               valuePrefix="$"
//             />
//           ) : null}
//         </div>
//       </div>

//       {/* Documents */}
//       {!loading && data && data.documents.length > 0 && (
//         <Card>
//           <CardHeader><CardTitle className="text-base">Docs</CardTitle></CardHeader>
//           <CardContent className="flex flex-wrap gap-3">
//             {data.documents.map((doc) => {
//               const Icon = DOC_ICONS[doc.type] ?? FileText;
//               return (
//                 <a
//                   key={doc.title}
//                   href={doc.url}
//                   target="_blank"
//                   rel="noreferrer"
//                   className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
//                 >
//                   <Icon className="h-4 w-4" />
//                   {doc.title}
//                   <ExternalLink className="h-3 w-3" />
//                 </a>
//               );
//             })}
//           </CardContent>
//         </Card>
//       )}

//       {/* Cattle Records */}
//       <Card>
//         <CardHeader className="flex flex-row items-center justify-between">
//           <CardTitle className="text-base">
//             Individual Cattle Records ({cowsLoading ? "…" : cows.length} head)
//           </CardTitle>
//           <Button variant="outline" size="sm" className="gap-1.5">
//             <PlusCircle className="h-4 w-4" /> Add Cattle
//           </Button>
//         </CardHeader>
//         <CardContent className="p-0">
//           {cowsLoading ? (
//             <CowsTableSkeleton />
//           ) : cows.length === 0 ? (
//             <p className="p-6 text-center text-slate-500 text-sm">
//               No cattle records found for this lot.
//             </p>
//           ) : (
//             <CowsTable cows={cows} onRemove={handleRemoveCow} />
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronRight, FileText, ShieldCheck, ClipboardList,
  ArrowLeftRight, Award, Shield, PlusCircle, ExternalLink, TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard, KpiCardSkeleton } from "@/components/common/KpiCard";
import { StageBadge } from "@/components/common/StageBadge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { LineChartCard, LineChartCardSkeleton } from "@/components/charts/LineChartCard";
import { SupplyChainStepper } from "@/components/lifecycle/SupplyChainStepper";
import { PipelineBar } from "@/components/pool/PipelineBar";
import { BudgetBreakdown } from "@/components/pool/BudgetBreakdown";
import { CowsTable, CowsTableSkeleton } from "@/components/tables/CowsTable";
import { getPoolById, getPoolCows } from "@/lib/api";
import type { PoolDetail as PoolDetailType, Cow, Document, PurchaseStatus } from "@/lib/types";
import { formatUsd, formatNumber, formatPct } from "@/lib/utils";

const DOC_ICONS: Record<string, React.ElementType> = {
  certificate: Award,
  inspection: ClipboardList,
  transfer: ArrowLeftRight,
  grade: ShieldCheck,
  insurance: Shield,
  other: FileText,
};

const STATUS_STYLES: Record<PurchaseStatus, string> = {
  available: "bg-green-50 text-green-700 border-green-200",
  pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  sold:      "bg-slate-50 text-slate-600 border-slate-200",
};

function abbreviateAddress(addr: string): string {
  if (!addr || addr === "#" || addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function PoolDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PoolDetailType | null>(null);
  const [cows, setCows] = useState<Cow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cowsLoading, setCowsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  function handleRemoveCow(cowId: string) {
    setCows((prev) => prev.filter((c) => c.cowId !== cowId));
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setCowsLoading(true);

    getPoolById(id)
      .then((result) => {
        if (!result) setNotFound(true);
        else setData(result);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    getPoolCows(id)
      .then(setCows)
      .catch(() => {})
      .finally(() => setCowsLoading(false));
  }, [id]);

  if (notFound) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-lg font-semibold">Herd not found</h2>
        <p className="text-slate-500">No herd with ID "{id}" exists.</p>
        <Link to=".."><Button variant="outline">Back to Holdings</Button></Link>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const pool = data?.pool;

  // Tokens remaining for purchase
  const tokensRemaining = pool
    ? (pool.tokensRemaining ?? Math.max(0, pool.totalSupply - ((pool as any).tokensSold ?? 0)))
    : 0;

  // Investor's token ownership details
  const tokenAmount = pool?.tokenAmount ?? 0;
  const totalSupply = pool?.totalSupply ?? 1;
  const ownershipPct = totalSupply > 0 ? tokenAmount / totalSupply : 0;

  // Investor-proportional net expected return (not entire herd)
  const investorNetExpected = pool
    ? Math.round(pool.netExpectedUsd * ownershipPct)
    : 0;

  // Whether investor owns any tokens in this herd
  const isOwner = tokenAmount > 0;

  const isAvailable =
    !loading &&
    pool?.purchaseStatus !== "sold" &&
    tokensRemaining > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link to=".." className="hover:underline">Holdings</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {loading ? <Skeleton className="h-4 w-24" /> : <span>{pool?.name}</span>}
      </nav>

      {/* Title row */}
      {loading ? (
        <Skeleton className="h-8 w-64" />
      ) : pool ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{pool.name}</h1>
              <Badge variant="outline">Lot</Badge>
              <Badge
                variant="outline"
                className={STATUS_STYLES[pool.purchaseStatus]}
              >
                {pool.purchaseStatus.charAt(0).toUpperCase() + pool.purchaseStatus.slice(1)}
              </Badge>
              {pool.cohortLabel && (
                <Badge variant="secondary">{pool.cohortLabel}</Badge>
              )}
              <Badge variant="secondary">{pool.geneticsLabel}</Badge>
            </div>
            {pool.contractAddress && pool.contractAddress !== "" && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Contract:</span>
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  {abbreviateAddress(pool.contractAddress)}
                </code>
              </div>
            )}
          </div>

          {/* Invest Button — only when tokens remain */}
          {isAvailable && (
            <Link to={`/invest/${pool.herdId}`}>
              <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                <TrendingUp className="h-4 w-4" />
                Invest in This Herd
              </Button>
            </Link>
          )}
        </div>
      ) : null}

      {/* KPI Cards — all four labeled */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></>
        ) : pool ? (
          <>
            {/* 1. Herd position value */}
            <KpiCard
              label="Herd Value"
              value={formatUsd(pool.positionValueUsd)}
              subtitle={`Listed at ${formatUsd(pool.listingPrice)}`}
              trend="neutral"
            />

            {/* 2. Expected net return — scoped to investor's ownership share */}
            <KpiCard
              label={isOwner ? "Your Net Expected" : "Total Net Expected"}
              value={formatUsd(isOwner ? investorNetExpected : pool.netExpectedUsd)}
              subtitle={
                isOwner
                  ? `${(ownershipPct * 100).toFixed(1)}% ownership share`
                  : pool.netExpectedUsd >= 0 ? "profitable" : "at risk"
              }
              trend={pool.netExpectedUsd >= 0 ? "up" : "down"}
            />

            {/* 3. Tokens owned by this investor */}
            <KpiCard
              label="Your Tokens"
              value={isOwner ? `${formatNumber(tokenAmount)} / ${formatNumber(totalSupply)}` : "None"}
              subtitle={
                isOwner
                  ? `${(ownershipPct * 100).toFixed(1)}% of this herd`
                  : "You don't own tokens in this herd"
              }
              trend={isOwner ? "neutral" : "neutral"}
            />

            {/* 4. Risk score */}
            <KpiCard
              label="Risk Score"
              value={(pool as any).riskScore != null ? String((pool as any).riskScore) : "–"}
              subtitle="0 = low · 100 = high"
              trend="neutral"
            />
          </>
        ) : null}
      </div>

      {/* Two column: Pipeline + Stepper | Budget + Chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Supply Chain Pipeline</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-full" /> : pool ? (
                <PipelineBar breakdown={pool.stageBreakdown} />
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Lifecycle Progress</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : data ? (
                <SupplyChainStepper events={data.lifecycle} currentStage={pool!.dominantStage} />
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Budget Breakdown</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : data ? (
                <BudgetBreakdown items={data.budgetBreakdown} />
              ) : null}
            </CardContent>
          </Card>

          {/* Herd Value chart — placeholder data until real time-series is wired */}
          {/* TODO: Replace placeholder series with real per-herd valuation history from /api/pools/:id/valuation-history */}
          {loading ? (
            <LineChartCardSkeleton />
          ) : data ? (
            <LineChartCard
              title="Herd Value (30 days)"
              series={data.valuationHistory30d}
              valuePrefix="$"
            />
          ) : null}
        </div>
      </div>

      {/* Documents */}
      {!loading && data && data.documents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {data.documents.map((doc) => {
              const Icon = DOC_ICONS[doc.type] ?? FileText;
              return (
                <a
                  key={doc.title}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <Icon className="h-4 w-4" />
                  {doc.title}
                  <ExternalLink className="h-3 w-3" />
                </a>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Cattle Records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Individual Cattle Records ({cowsLoading ? "…" : cows.length} head)
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5">
            <PlusCircle className="h-4 w-4" /> Add Cattle
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {cowsLoading ? (
            <CowsTableSkeleton />
          ) : cows.length === 0 ? (
            <p className="p-6 text-center text-slate-500 text-sm">
              No cattle records found for this lot.
            </p>
          ) : (
            <CowsTable cows={cows} onRemove={handleRemoveCow} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}