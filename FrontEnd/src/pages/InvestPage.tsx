import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/common/StageBadge";
import { getHerdForInvest, postInvestment } from "@/lib/api";
import type { HerdInvestInfo } from "@/lib/types";
import { formatUsd } from "@/lib/utils";

const INVESTORS = [
  { slug: "investor1", label: "Investor 1" },
  { slug: "investor2", label: "Investor 2" },
  { slug: "investor3", label: "Investor 3" },
  { slug: "investor4", label: "Investor 4" },
  { slug: "investor5", label: "Investor 5" },
];

export function InvestPage() {
  const { herdId } = useParams<{ herdId: string }>();
  const navigate = useNavigate();

  const [herd, setHerd] = useState<HerdInvestInfo | null>(null);
  const [loadingHerd, setLoadingHerd] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tokens, setTokens] = useState(1);
  const [slug, setSlug] = useState("investor1");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!herdId) return;
    setLoadingHerd(true);
    setLoadError(null);
    getHerdForInvest(herdId)
      .then((data) => {
        if (!data) setLoadError("Herd not found.");
        else setHerd(data);
      })
      .catch(() => setLoadError("Failed to load herd data."))
      .finally(() => setLoadingHerd(false));
  }, [herdId]);

  const pricePerToken = herd ? herd.pricePerToken : 0;
  const totalCost = tokens * pricePerToken;
  const tokensAvailable = herd?.tokensAvailable ?? 0;
  const inputInvalid = tokens < 1 || tokens > tokensAvailable;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!herd || inputInvalid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await postInvestment({
        herdId: herd.herdId,
        investorSlug: slug,
        tokensToBuy: tokens,
      });
      setSuccess(result.message);
      setTimeout(() => navigate(`/investor/${slug}/dashboard`), 2500);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Investment failed.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingHerd) {
    return (
      <div className="max-w-lg mx-auto p-8 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (loadError || !herd) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
        <p className="text-slate-700">{loadError ?? "Herd not found."}</p>
        <Link to=".."><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      </div>
    );
  }

  // ── Sold / Unavailable state ───────────────────────────────────────────────
  if (!herd.isAvailable) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center space-y-4">
        <Badge variant="outline" className="bg-slate-50 text-slate-600">Sold Out</Badge>
        <p className="text-slate-700">
          <strong>{herd.herdName}</strong> has no tokens remaining.
        </p>
        <Link to="..">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" />Back to Holdings</Button>
        </Link>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold">Investment Confirmed!</h2>
        <p className="text-slate-600">{success}</p>
        <p className="text-sm text-slate-400">Redirecting to your dashboard…</p>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      {/* Back link */}
      <Link
        to={`/investor/holdings/${herd.herdId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Herd Detail
      </Link>

      {/* Herd summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{herd.herdName}</CardTitle>
            <StageBadge stage={herd.dominantStage} />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-slate-500">Listing Price</span>
          <span className="font-medium">{formatUsd(herd.listingPrice)}</span>

          <span className="text-slate-500">Price per Token</span>
          <span className="font-medium">{formatUsd(herd.pricePerToken)}</span>

          <span className="text-slate-500">Tokens Available</span>
          <span className="font-medium">
            {herd.tokensAvailable.toLocaleString()} / {herd.totalSupply.toLocaleString()}
          </span>

          <span className="text-slate-500">Risk Score</span>
          <span className="font-medium">
            {herd.riskScore != null ? herd.riskScore : "N/A"}
            <span className="text-xs text-slate-400 ml-1">(0 = low)</span>
          </span>
        </CardContent>
      </Card>

      {/* Investment form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Place Investment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Investor picker */}
            <div className="space-y-1.5">
              <Label>Investing as</Label>
              <Select value={slug} onValueChange={setSlug}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  {INVESTORS.map((inv) => (
                    <SelectItem key={inv.slug} value={inv.slug}>{inv.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Token input */}
            <div className="space-y-1.5">
              <Label htmlFor="tokens">
                Number of Tokens
                <span className="text-slate-400 font-normal ml-1">
                  (max {herd.tokensAvailable.toLocaleString()})
                </span>
              </Label>
              <Input
                id="tokens"
                type="number"
                min={1}
                max={herd.tokensAvailable}
                value={tokens}
                onChange={(e) => setTokens(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className={inputInvalid ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {inputInvalid && tokens > tokensAvailable && (
                <p className="text-xs text-red-500">
                  Only {herd.tokensAvailable.toLocaleString()} tokens available.
                </p>
              )}
            </div>

            {/* Total cost */}
            <div className="bg-slate-50 rounded-lg p-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Cost</span>
              <span className="text-xl font-bold">{formatUsd(totalCost)}</span>
            </div>

            {/* Error */}
            {submitError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {submitError}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || inputInvalid}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? "Processing…" : `Confirm Investment · ${formatUsd(totalCost)}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
