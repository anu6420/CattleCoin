import { useEffect, useState } from "react";
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
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("ALL");

  // Sort
  const [sortKey, setSortKey] = useState<PoolSortKey>("positionValueUsd");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
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
      p.id.toLowerCase().includes(search.toLowerCase()) ||
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
      <h2 className="text-2xl font-bold">Lots</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, ID, or genetics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Stages</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Verified" />
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
            onClick={() => {
              setSearch("");
              setStageFilter("ALL");
              setVerifiedFilter("ALL");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <PoolsTableSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No lots match your filters.
          </p>
          <Button
            variant="link"
            size="sm"
            className="mt-2"
            onClick={() => {
              setSearch("");
              setStageFilter("ALL");
              setVerifiedFilter("ALL");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <PoolsTable
          pools={filtered}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )}
    </div>
  );
}
