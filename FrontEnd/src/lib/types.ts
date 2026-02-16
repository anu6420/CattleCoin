// ── Supply Chain Stages ──────────────────────────────────────────────────────

export type Stage =
  | "RANCH"
  | "AUCTION"
  | "BACKGROUNDING"
  | "FEEDLOT"
  | "PROCESSING"
  | "DISTRIBUTION";

export const STAGES: Stage[] = [
  "RANCH",
  "AUCTION",
  "BACKGROUNDING",
  "FEEDLOT",
  "PROCESSING",
  "DISTRIBUTION",
];

// ── Pool / Herd (ERC-20 concept) ─────────────────────────────────────────────

export type PoolType = "herd" | "individual";

export type StageBreakdown = {
  stage: Stage;
  pct: number; // 0-100, all should sum to 100
};

export type Pool = {
  id: string;
  name: string;
  poolType: PoolType;
  cohortLabel?: string;
  erc20Balance: number;
  positionValueUsd: number;
  backingHerdCount: number;
  totalCostUsd: number;
  expectedRevenueUsd: number;
  netExpectedUsd: number;
  stageBreakdown: StageBreakdown[];
  dominantStage: Stage;
  verified: boolean;
  lastUpdateIso: string;
};

// ── Cow (ERC-721 concept) ────────────────────────────────────────────────────

export type CowHealth = "On Track" | "Watch" | "Issue";

export type Cow = {
  cowId: string;
  tokenId: number;
  poolId: string;
  stage: Stage;
  ranchOrFacility: string;
  weightLb: number;
  health: CowHealth;
  daysInStage: number;
  costToDateUsd: number;
  projectedExitUsd: number;
  updatedIso: string;
  verified: boolean;
};

// ── Lifecycle Event ──────────────────────────────────────────────────────────

export type LifecycleEvent = {
  id: string;
  poolId?: string;
  cowId?: string;
  stage: Stage;
  verified: boolean;
  timestampIso: string;
  note: string;
};

// ── Time Series ──────────────────────────────────────────────────────────────

export type SeriesPoint = {
  dateIso: string;
  value: number;
};

// ── Budget Breakdown ─────────────────────────────────────────────────────────

export type BudgetItem = {
  label: string;
  amountUsd: number;
  category: "cost" | "revenue";
};

// ── Document ─────────────────────────────────────────────────────────────────

export type Document = {
  title: string;
  type: "certificate" | "inspection" | "transfer" | "grade" | "insurance" | "other";
  url: string;
};

// ── Pool Detail ──────────────────────────────────────────────────────────────

export type PoolDetail = {
  pool: Pool;
  lifecycle: LifecycleEvent[];
  budgetBreakdown: BudgetItem[];
  valuationHistory30d: SeriesPoint[];
  documents: Document[];
};

// ── Portfolio Summary ────────────────────────────────────────────────────────

export type PortfolioSummary = {
  asOfIso: string;
  portfolioValueUsd: number;
  change30dPct: number;
  poolsHeld: number;
  avgRisk: number; // 0-100
  history30d: SeriesPoint[];
  recentEvents: LifecycleEvent[];
  topPools: Pool[];
};
