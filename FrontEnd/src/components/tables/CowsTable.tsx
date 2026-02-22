import { useState } from "react";
import { ArrowUpDown, Trash2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/common/StageBadge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatUsd, formatDate, formatWeight } from "@/lib/utils";
import type { Cow, CowHealth } from "@/lib/types";

type CowSortKey =
  | "tokenId"
  | "cowId"
  | "stage"
  | "breed"
  | "source"
  | "weightLb"
  | "health"
  | "daysInStage"
  | "costToDateUsd"
  | "projectedExitUsd"
  | "updatedIso";

const HEALTH_STYLES: Record<CowHealth, string> = {
  "On Track": "bg-green-100 text-green-800 border-green-200",
  Watch: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Issue: "bg-red-100 text-red-800 border-red-200",
};

interface CowsTableProps {
  cows: Cow[];
  onRemove?: (cowId: string) => void;
}

export function CowsTable({ cows, onRemove }: CowsTableProps) {
  const [sortKey, setSortKey] = useState<CowSortKey>("tokenId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(key: CowSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...cows].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "tokenId":
        return dir * (a.tokenId - b.tokenId);
      case "cowId":
        return dir * a.cowId.localeCompare(b.cowId);
      case "stage":
        return dir * a.stage.localeCompare(b.stage);
      case "breed":
        return dir * a.breed.localeCompare(b.breed);
      case "source":
        return dir * a.source.localeCompare(b.source);
      case "weightLb":
        return dir * (a.weightLb - b.weightLb);
      case "health":
        return dir * a.health.localeCompare(b.health);
      case "daysInStage":
        return dir * (a.daysInStage - b.daysInStage);
      case "costToDateUsd":
        return dir * (a.costToDateUsd - b.costToDateUsd);
      case "projectedExitUsd":
        return dir * (a.projectedExitUsd - b.projectedExitUsd);
      case "updatedIso":
        return (
          dir *
          (new Date(a.updatedIso).getTime() - new Date(b.updatedIso).getTime())
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
    field: CowSortKey;
  }) {
    const isActive = sortKey === field;
    return (
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => handleSort(field)}
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
            <SortHeader label="Token" field="tokenId" />
          </TableHead>
          <TableHead>
            <SortHeader label="Cattle ID" field="cowId" />
          </TableHead>
          <TableHead>
            <SortHeader label="Stage" field="stage" />
          </TableHead>
          <TableHead>
            <SortHeader label="Breed" field="breed" />
          </TableHead>
          <TableHead>
            <SortHeader label="Source" field="source" />
          </TableHead>
          <TableHead>Facility</TableHead>
          <TableHead>
            <SortHeader label="Weight" field="weightLb" />
          </TableHead>
          <TableHead>
            <SortHeader label="Health" field="health" />
          </TableHead>
          <TableHead>
            <SortHeader label="Days" field="daysInStage" />
          </TableHead>
          <TableHead>
            <SortHeader label="Investment to Date" field="costToDateUsd" />
          </TableHead>
          <TableHead>
            <SortHeader label="Projected Exit" field="projectedExitUsd" />
          </TableHead>
          <TableHead>
            <SortHeader label="Updated" field="updatedIso" />
          </TableHead>
          {onRemove && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((cow) => (
          <TableRow key={cow.cowId}>
            <TableCell className="font-mono text-xs">{cow.tokenId}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{cow.cowId}</span>
                <VerifiedBadge verified={cow.verified} />
              </div>
            </TableCell>
            <TableCell>
              <StageBadge stage={cow.stage} />
            </TableCell>
            <TableCell className="text-sm">{cow.breed}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={
                  cow.source === "Dairy"
                    ? "bg-blue-50 text-blue-700 border-blue-200 text-xs"
                    : "bg-green-50 text-green-700 border-green-200 text-xs"
                }
              >
                {cow.source}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
              {cow.ranchOrFacility}
            </TableCell>
            <TableCell className="text-sm">{formatWeight(cow.weightLb)}</TableCell>
            <TableCell>
              <Badge variant="outline" className={HEALTH_STYLES[cow.health]}>
                {cow.health}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{cow.daysInStage}d</TableCell>
            <TableCell className="text-sm font-medium">
              {formatUsd(cow.costToDateUsd)}
            </TableCell>
            <TableCell className="text-sm font-medium">
              {formatUsd(cow.projectedExitUsd)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDate(cow.updatedIso)}
            </TableCell>
            {onRemove && (
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(cow.cowId)}
                  title="Remove from lot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CowsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
