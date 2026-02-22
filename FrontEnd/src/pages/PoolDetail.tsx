import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, FileText, ShieldCheck, ClipboardList, ArrowLeftRight, Award, Shield, PlusCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiCardSkeleton } from "@/components/common/KpiCard";
import { StageBadge } from "@/components/common/StageBadge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { LineChartCard, LineChartCardSkeleton } from "@/components/charts/LineChartCard";
import { SupplyChainStepper } from "@/components/lifecycle/SupplyChainStepper";
import { PipelineBar } from "@/components/pool/PipelineBar";
import { BudgetBreakdown } from "@/components/pool/BudgetBreakdown";
import { CowsTable, CowsTableSkeleton } from "@/components/tables/CowsTable";
import { getPoolById, getPoolCows } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import type { PoolDetail as PoolDetailType, Cow, Document } from "@/lib/types";
import { formatUsd, formatNumber } from "@/lib/utils";

const DOC_ICONS: Record<Document["type"], typeof FileText> = {
  certificate: Award,
  inspection: ClipboardList,
  transfer: ArrowLeftRight,
  grade: ShieldCheck,
  insurance: Shield,
  other: FileText,
};

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
        if (!result) {
          setNotFound(true);
        } else {
          setData(result);
        }
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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold">Pool not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No pool with ID &ldquo;{id}&rdquo; exists.
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
        <span className="text-foreground">
          {loading ? (
            <Skeleton className="inline-block h-4 w-24" />
          ) : (
            data?.pool.name
          )}
        </span>
      </nav>

      {/* Title */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : data ? (
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{data.pool.name}</h2>
              <Badge
                variant="outline"
                className="bg-slate-50 text-slate-600 border-slate-200"
              >
                Lot
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{data.pool.id}</span>
              {data.pool.cohortLabel && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <span className="text-sm text-muted-foreground">
                    {data.pool.cohortLabel}
                  </span>
                </>
              )}
              <Separator orientation="vertical" className="h-3" />
              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                {data.pool.geneticsLabel}
              </span>
              <StageBadge stage={data.pool.dominantStage} />
              <VerifiedBadge verified={data.pool.verified} showLabel />
            </div>
          </div>
        </div>
      ) : null}

      {/* Summary KPI Cards */}
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
              title="Tokens Held (ERC-20)"
              value={formatNumber(data.pool.erc20Balance)}
              subtitle="of 20 issued"
            />
            <KpiCard
              title="Lot Size"
              value={`${data.pool.backingHerdCount} head`}
            />
            <KpiCard
              title="Investment to Date"
              value={formatUsd(data.pool.totalCostUsd)}
            />
            <KpiCard
              title="Net Expected"
              value={formatUsd(data.pool.netExpectedUsd)}
              trend={data.pool.netExpectedUsd >= 0 ? "up" : "down"}
              subtitle={
                data.pool.netExpectedUsd >= 0 ? "profitable" : "at risk"
              }
            />
          </>
        ) : null}
      </div>

      {/* Two column: Pipeline + Supply Chain | Budget + Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Supply Chain Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Supply Chain Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : data ? (
                <PipelineBar breakdown={data.pool.stageBreakdown} />
              ) : null}
            </CardContent>
          </Card>

          {/* Supply Chain Stepper */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Lifecycle Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data ? (
                <SupplyChainStepper
                  currentStage={data.pool.dominantStage}
                  events={data.lifecycle}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Budget Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Budget Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : data ? (
                <BudgetBreakdown items={data.budgetBreakdown} />
              ) : null}
            </CardContent>
          </Card>

          {/* Pool Value Chart */}
          {loading ? (
            <LineChartCardSkeleton height={240} />
          ) : data ? (
            <LineChartCard
              title="Position Value (30 days)"
              data={data.valuationHistory30d}
              height={240}
            />
          ) : null}
        </div>
      </div>

      {/* Documents — compact horizontal strip */}
      {loading ? (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-8 w-44" />
            </div>
          </CardContent>
        </Card>
      ) : data && data.documents.length > 0 ? (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 overflow-x-auto">
              <span className="shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Docs
              </span>
              <Separator orientation="vertical" className="h-5" />
              {data.documents.map((doc) => {
                const Icon = DOC_ICONS[doc.type] ?? FileText;
                return (
                  <a
                    key={doc.title}
                    href={doc.url}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {doc.title}
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Cattle Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Individual Cattle Records ({cowsLoading ? "..." : cows.length} head)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              disabled
              title="Add cattle — coming soon"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Cattle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cowsLoading ? (
            <CowsTableSkeleton rows={6} />
          ) : cows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No cattle records found for this lot.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <CowsTable cows={cows} onRemove={handleRemoveCow} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
