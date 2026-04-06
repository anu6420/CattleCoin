import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PoolsTable, PoolsTableSkeleton } from "@/components/tables/PoolsTable";
import type { PoolSortKey } from "@/components/tables/PoolsTable";
import { getPools } from "@/lib/api";
import { STAGES } from "@/lib/types";
import type { Pool } from "@/lib/types";

export function Holdings() {
  const { slug } = useParams<{ slug: string }>();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [verifiedFilter, setVerifiedFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<PoolSortKey>("positionValueUsd");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setLoading(true);
    // Fetch all herds so investor can browse the full marketplace
    getPools()
      .then(setPools)
      .catch(() => setError("Failed to load lots."))
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

  const filtered = pools.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.herdId.toLowerCase().includes(search.toLowerCase()) ||
      p.geneticsLabel.toLowerCase().includes(search.toLowerCase());
    const matchesStage =
      stageFilter === "ALL" || p.dominantStage === stageFilter;
    const matchesVerified =
      verifiedFilter === "ALL" ||
      (verifiedFilter === "VERIFIED" && p.verified) ||
      (verifiedFilter === "UNVERIFIED" && !p.verified);
    return matchesSearch && matchesStage && matchesVerified;
  });

  if (error) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-red-600">{error}</p>
        <button className="px-4 py-2 bg-slate-100 rounded text-sm" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Lots</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse all available herds — click any to view details or invest
          </p>
        </div>
        {!loading && (
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {pools.length} lots
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search lots…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Stages</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="UNVERIFIED">Unverified</SelectItem>
          </SelectContent>
        </Select>
        {(search || stageFilter !== "ALL" || verifiedFilter !== "ALL") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setStageFilter("ALL"); setVerifiedFilter("ALL"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <PoolsTableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 space-y-2">
          <p>No lots match your filters.</p>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStageFilter("ALL"); setVerifiedFilter("ALL"); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        // Pass slug so PoolsTable navigates to /investor/:slug/holdings/:id
        <PoolsTable
          pools={filtered}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          slug={slug}
        />
      )}
    </div>
  );
}