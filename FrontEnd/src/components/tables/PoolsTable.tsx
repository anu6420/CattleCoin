import { useNavigate } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/common/StageBadge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatUsd, formatDate } from "@/lib/utils";
import type { Pool } from "@/lib/types";

export type PoolSortKey =
  | "name"
  | "backingHerdCount"
  | "positionValueUsd"
  | "netExpectedUsd"
  | "lastUpdateIso";

interface PoolsTableProps {
  pools: Pool[];
  sortKey: PoolSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: PoolSortKey) => void;
  compact?: boolean;
}

export function PoolsTable({
  pools,
  sortKey,
  sortDir,
  onSort,
  compact = false,
}: PoolsTableProps) {
  const navigate = useNavigate();

  const sorted = [...pools].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "backingHerdCount":
        return dir * (a.backingHerdCount - b.backingHerdCount);
      case "positionValueUsd":
        return dir * (a.positionValueUsd - b.positionValueUsd);
      case "netExpectedUsd":
        return dir * (a.netExpectedUsd - b.netExpectedUsd);
      case "lastUpdateIso":
        return (
          dir *
          (new Date(a.lastUpdateIso).getTime() -
            new Date(b.lastUpdateIso).getTime())
        );
      default:
        return 0;
    }
  });

  function SortHeader({
    label,
    field,
  }: {
    label: string;
    field: PoolSortKey;
  }) {
    const isActive = sortKey === field;
    return (
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onSort(field)}
      >
        {label}
        <ArrowUpDown
          className={cn("h-3 w-3", isActive ? "opacity-100" : "opacity-40")}
        />
      </button>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <SortHeader label="Lot" field="name" />
          </TableHead>
          <TableHead>
            <SortHeader label="Head Count" field="backingHerdCount" />
          </TableHead>
          <TableHead>
            <SortHeader label="Position Value" field="positionValueUsd" />
          </TableHead>
          {!compact && (
            <TableHead>
              <SortHeader label="Net Expected" field="netExpectedUsd" />
            </TableHead>
          )}
          {!compact && <TableHead>Stage</TableHead>}
          {!compact && <TableHead>Verified</TableHead>}
          {!compact && (
            <TableHead>
              <SortHeader label="Last Update" field="lastUpdateIso" />
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p) => (
          <TableRow
            key={p.id}
            className="cursor-pointer"
            onClick={() => navigate(`/investor/holdings/${p.id}`)}
          >
            <TableCell>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{p.name}</p>
                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] px-1.5 py-0"
                  >
                    Lot
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.id}</p>
              </div>
            </TableCell>
            <TableCell className="font-medium">
              {p.backingHerdCount} head
            </TableCell>
            <TableCell className="font-medium">
              {formatUsd(p.positionValueUsd)}
            </TableCell>
            {!compact && (
              <TableCell>
                <span
                  className={cn(
                    "font-medium",
                    p.netExpectedUsd >= 0 ? "text-green-600" : "text-red-600",
                  )}
                >
                  {formatUsd(p.netExpectedUsd)}
                </span>
              </TableCell>
            )}
            {!compact && (
              <TableCell>
                <StageBadge stage={p.dominantStage} />
              </TableCell>
            )}
            {!compact && (
              <TableCell>
                <VerifiedBadge verified={p.verified} />
              </TableCell>
            )}
            {!compact && (
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(p.lastUpdateIso)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PoolsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
