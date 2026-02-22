import { formatUsd } from "@/lib/utils";
import type { BudgetItem } from "@/lib/types";

interface BudgetBreakdownProps {
  items: BudgetItem[];
}

export function BudgetBreakdown({ items }: BudgetBreakdownProps) {
  const costs = items.filter((i) => i.category === "cost");
  const revenues = items.filter((i) => i.category === "revenue");
  const totalCost = costs.reduce((s, i) => s + i.amountUsd, 0);
  const totalRevenue = revenues.reduce((s, i) => s + i.amountUsd, 0);
  const net = totalRevenue - totalCost;
  const maxBar = Math.max(totalRevenue, totalCost);

  return (
    <div className="space-y-4">
      {/* Cost summary rows */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Investment Summary
        </p>
        {costs.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <span className="font-medium">{formatUsd(item.amountUsd)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-red-400"
                style={{ width: `${(item.amountUsd / maxBar) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>Total Investment</span>
          <span className="text-red-600">{formatUsd(totalCost)}</span>
        </div>
      </div>

      {/* Revenue row */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Expected Return
        </p>
        {revenues.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <span className="font-medium">{formatUsd(item.amountUsd)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${(item.amountUsd / maxBar) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Net */}
      <div className="flex items-center justify-between rounded-lg bg-accent p-3 text-sm font-semibold">
        <span>Net Expected</span>
        <span className={net >= 0 ? "text-green-600" : "text-red-600"}>
          {formatUsd(net)}
        </span>
      </div>
    </div>
  );
}
