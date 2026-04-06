import * as React from "react";
import { CheckCircle, ChevronRight, Loader2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { FeedlotHerd } from "@/lib/types";
import {
  getFeedlotPendingHerds,
  getFeedlotDashboard,
  postFeedlotClaim,
} from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  RANCH:          "bg-green-100 text-green-800",
  AUCTION:        "bg-yellow-100 text-yellow-800",
  BACKGROUNDING:  "bg-blue-100  text-blue-800",
  FEEDLOT:        "bg-orange-100 text-orange-800",
  PROCESSING:     "bg-purple-100 text-purple-800",
  DISTRIBUTION:   "bg-gray-100  text-gray-800",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HerdCard({
  herd,
  onSelect,
  selected,
}: {
  herd: FeedlotHerd;
  onSelect: (h: FeedlotHerd) => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(herd)}
      className={cn(
        "w-full text-left rounded-lg border p-4 transition-colors hover:bg-accent/40",
        selected && "border-primary bg-accent/60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{herd.herdName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{herd.geneticsLabel}</p>
        </div>
        <Badge className={cn("text-xs", STAGE_COLORS[herd.dominantStage])}>
          {herd.dominantStage}
        </Badge>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>{herd.headCount} head</span>
        <span>{fmt(herd.listingPrice)}</span>
        {herd.riskScore != null && <span>Risk {herd.riskScore}</span>}
        {herd.verified && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" /> Verified
          </span>
        )}
      </div>
    </button>
  );
}

function ClaimedHerdRow({ herd }: { herd: FeedlotHerd }) {
  const allocation  = herd.investorAllocation ?? 0;
  const sold        = herd.investorTokensSold ?? 0;
  const remaining   = herd.investorTokensRemaining ?? 0;
  const soldPct     = allocation > 0 ? Math.round((sold / allocation) * 100) : 0;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{herd.herdName}</p>
          <p className="text-xs text-muted-foreground">{herd.geneticsLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", STAGE_COLORS[herd.dominantStage])}>
            {herd.dominantStage}
          </Badge>
          <Badge
            className={cn(
              "text-xs",
              herd.feedlotStatus === "sold"
                ? "bg-gray-100 text-gray-700"
                : "bg-emerald-100 text-emerald-700"
            )}
          >
            {herd.feedlotStatus === "sold" ? "Sold Out" : "Listed"}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md bg-muted/40 p-2">
          <p className="text-xs text-muted-foreground">Investor %</p>
          <p className="text-sm font-semibold">{herd.investorPct ?? "—"}%</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <p className="text-xs text-muted-foreground">Tokens Sold</p>
          <p className="text-sm font-semibold">
            {sold} / {allocation}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-sm font-semibold">{remaining}</p>
        </div>
      </div>

      {allocation > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Sold</span>
            <span>{soldPct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${soldPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Claim Panel ───────────────────────────────────────────────────────────────

interface ClaimPanelProps {
  herd: FeedlotHerd;
  feedlotSlug: string;
  onClose: () => void;
  onSuccess: (herdId: string) => void;
}

function ClaimPanel({ herd, feedlotSlug, onClose, onSuccess }: ClaimPanelProps) {
  const [pctStr, setPctStr] = React.useState("40");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pct = parseFloat(pctStr);
  const isValid = !isNaN(pct) && pct > 0 && pct <= 100;

  const investorValue = isValid
    ? Math.round(herd.listingPrice * (pct / 100))
    : 0;

  async function handleClaim() {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await postFeedlotClaim({ feedlotSlug, herdId: herd.herdId, investorPct: pct });
      onSuccess(herd.herdId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold">{herd.herdName}</h3>
          <p className="text-xs text-muted-foreground">{herd.geneticsLabel} · {herd.headCount} head</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Separator className="mb-4" />

      {/* Herd snapshot */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Listing Price</p>
          <p className="text-sm font-semibold">{fmt(herd.listingPrice)}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Stage</p>
          <p className="text-sm font-semibold">{herd.dominantStage}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Season</p>
          <p className="text-sm font-semibold">{herd.season}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Risk Score</p>
          <p className="text-sm font-semibold">{herd.riskScore ?? "N/A"}</p>
        </div>
      </div>

      {/* Investor % input */}
      <label className="block mb-1 text-sm font-medium">
        Investor Allocation (%)
      </label>
      <p className="text-xs text-muted-foreground mb-2">
        What percentage of this herd are you willing to sell to investors?
      </p>
      <div className="flex items-center gap-2 mb-1">
        <Input
          type="number"
          min={1}
          max={100}
          step={1}
          value={pctStr}
          onChange={(e) => setPctStr(e.target.value)}
          className="w-28"
          placeholder="e.g. 40"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>

      {isValid && (
        <p className="text-xs text-muted-foreground mb-4">
          Investor-facing value: <span className="font-medium text-foreground">{fmt(investorValue)}</span>
          {" "}· Feedlot retains {fmt(herd.listingPrice - investorValue)}
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive mb-3">{error}</p>
      )}

      <Button
        className="w-full"
        disabled={!isValid || loading}
        onClick={handleClaim}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Listing…</>
        ) : (
          <>List Herd for Investors <ChevronRight className="h-4 w-4 ml-1" /></>
        )}
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function FeedlotPage() {
  const { currentUser } = useAuth();
  const slug = currentUser?.slug ?? "";
  const [pendingHerds, setPendingHerds] = React.useState<FeedlotHerd[]>([]);
  const [claimedHerds, setClaimedHerds] = React.useState<FeedlotHerd[]>([]);
  const [selectedHerd, setSelectedHerd] = React.useState<FeedlotHerd | null>(null);
  const [loadingPending, setLoadingPending] = React.useState(true);
  const [loadingClaimed, setLoadingClaimed] = React.useState(true);
  const [successHerdName, setSuccessHerdName] = React.useState<string | null>(null);

  // Load pending herds once
  React.useEffect(() => {
    setLoadingPending(true);
    getFeedlotPendingHerds()
      .then(setPendingHerds)
      .catch(console.error)
      .finally(() => setLoadingPending(false));
  }, []);

  // Load claimed herds whenever slug is available
  React.useEffect(() => {
    if (!slug) return;
    setLoadingClaimed(true);
    getFeedlotDashboard(slug)
      .then((data) => setClaimedHerds(data.claimedHerds))
      .catch(console.error)
      .finally(() => setLoadingClaimed(false));
  }, [slug]);

  function handleClaimSuccess(herdId: string) {
    const claimed = pendingHerds.find((h) => h.herdId === herdId);
    setSuccessHerdName(claimed?.herdName ?? "Herd");
    // Remove from pending list
    setPendingHerds((prev) => prev.filter((h) => h.herdId !== herdId));
    setSelectedHerd(null);
    // Refresh claimed list
    getFeedlotDashboard(slug)
      .then((data) => setClaimedHerds(data.claimedHerds))
      .catch(console.error);
    // Clear success banner after 4s
    setTimeout(() => setSuccessHerdName(null), 4000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedlot Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review rancher-listed herds and publish them to the investor marketplace.
        </p>
      </div>

      {/* Success banner */}
      {successHerdName && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 flex items-center gap-2 text-sm text-green-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{successHerdName}</strong> is now listed on the investor marketplace.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Left: Available Herds ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Herds</CardTitle>
            <CardDescription>
              Herds listed by ranchers awaiting feedlot review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingPending ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : pendingHerds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No herds pending feedlot review.
              </p>
            ) : (
              pendingHerds.map((herd) => (
                <HerdCard
                  key={herd.herdId}
                  herd={herd}
                  onSelect={setSelectedHerd}
                  selected={selectedHerd?.herdId === herd.herdId}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* ── Right: Claim Panel OR My Listed Herds ── */}
        <div className="space-y-4">
          {selectedHerd ? (
            <ClaimPanel
              herd={selectedHerd}
              feedlotSlug={slug}
              onClose={() => setSelectedHerd(null)}
              onSuccess={handleClaimSuccess}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">My Listed Herds</CardTitle>
                <CardDescription>
                  Herds you've published to the investor marketplace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingClaimed ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : claimedHerds.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    You haven't listed any herds yet. Select a herd on the left to get started.
                  </p>
                ) : (
                  claimedHerds.map((herd) => (
                    <ClaimedHerdRow key={herd.herdId} herd={herd} />
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Hint when no herd selected but herds exist */}
          {!selectedHerd && pendingHerds.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Select a herd on the left to review and publish it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
