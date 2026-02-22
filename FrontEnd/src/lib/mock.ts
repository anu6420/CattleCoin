import type {
  Pool,
  Cow,
  CowHealth,
  CowSource,
  Document,
  LifecycleEvent,
  SeriesPoint,
  BudgetItem,
  Stage,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function generateSeries(
  days: number,
  base: number,
  volatility: number,
): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  let value = base;
  for (let i = days; i >= 0; i--) {
    value += (Math.random() - 0.45) * volatility;
    value = Math.max(value * 0.95, value);
    points.push({ dateIso: daysAgo(i), value: Math.round(value) });
  }
  return points;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Pools / Lots ──────────────────────────────────────────────────────────────
// All pools are herd/lot investments (ERC-20).
// Investors buy into entire lots; individual cattle are ERC-721 records only.
// Minimum herd size: 20-50 head.
// All cattle in a lot share the same genetics and are in the same stage.

export const POOLS: Pool[] = [
  {
    id: "POOL-001",
    name: "Angus Prime Lot A",
    poolType: "herd",
    cohortLabel: "Fall 2025 — Angus",
    geneticsLabel: "Angus AI Select",
    season: "Fall",
    erc20Balance: 20,
    positionValueUsd: 248_000,
    backingHerdCount: 32,
    totalCostUsd: 198_000,
    expectedRevenueUsd: 276_000,
    netExpectedUsd: 78_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 100 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "FEEDLOT",
    verified: true,
    lastUpdateIso: daysAgo(1),
  },
  {
    id: "POOL-002",
    name: "Hereford Select Lot B",
    poolType: "herd",
    cohortLabel: "Spring 2025 — Hereford",
    geneticsLabel: "Hereford Registered",
    season: "Spring",
    erc20Balance: 20,
    positionValueUsd: 156_000,
    backingHerdCount: 28,
    totalCostUsd: 128_000,
    expectedRevenueUsd: 172_000,
    netExpectedUsd: 44_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 100 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "RANCH",
    verified: true,
    lastUpdateIso: daysAgo(2),
  },
  {
    id: "POOL-003",
    name: "Wagyu Cross Lot C",
    poolType: "herd",
    cohortLabel: "Fall 2024 — Wagyu",
    geneticsLabel: "Wagyu F1 Cross",
    season: "Fall",
    erc20Balance: 20,
    positionValueUsd: 512_000,
    backingHerdCount: 45,
    totalCostUsd: 420_000,
    expectedRevenueUsd: 580_000,
    netExpectedUsd: 160_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 100 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "PROCESSING",
    verified: true,
    lastUpdateIso: daysAgo(0),
  },
  {
    id: "POOL-004",
    name: "Brahman Mix Lot D",
    poolType: "herd",
    cohortLabel: "Fall 2025 — Brahman",
    geneticsLabel: "Brahman AI Select",
    season: "Fall",
    erc20Balance: 20,
    positionValueUsd: 178_000,
    backingHerdCount: 24,
    totalCostUsd: 144_000,
    expectedRevenueUsd: 198_000,
    netExpectedUsd: 54_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 100 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "AUCTION",
    verified: false,
    lastUpdateIso: daysAgo(3),
  },
  {
    id: "POOL-005",
    name: "Black Angus Lot E",
    poolType: "herd",
    cohortLabel: "Spring 2025 — Black Angus",
    geneticsLabel: "Black Angus Premium AI",
    season: "Spring",
    erc20Balance: 20,
    positionValueUsd: 385_000,
    backingHerdCount: 38,
    totalCostUsd: 310_000,
    expectedRevenueUsd: 420_000,
    netExpectedUsd: 110_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 100 },
    ],
    dominantStage: "DISTRIBUTION",
    verified: true,
    lastUpdateIso: daysAgo(1),
  },
  {
    id: "POOL-006",
    name: "Charolais Lot F",
    poolType: "herd",
    cohortLabel: "Fall 2025 — Charolais",
    geneticsLabel: "Charolais Fullblood",
    season: "Fall",
    erc20Balance: 20,
    positionValueUsd: 265_000,
    backingHerdCount: 35,
    totalCostUsd: 218_000,
    expectedRevenueUsd: 292_000,
    netExpectedUsd: 74_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 100 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "FEEDLOT",
    verified: true,
    lastUpdateIso: daysAgo(2),
  },
  {
    id: "POOL-007",
    name: "Simmental Lot G",
    poolType: "herd",
    cohortLabel: "Spring 2026 — Simmental",
    geneticsLabel: "Simmental Registered AI",
    season: "Spring",
    erc20Balance: 20,
    positionValueUsd: 142_000,
    backingHerdCount: 22,
    totalCostUsd: 116_000,
    expectedRevenueUsd: 158_000,
    netExpectedUsd: 42_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 100 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "RANCH",
    verified: true,
    lastUpdateIso: daysAgo(5),
  },
  {
    id: "POOL-008",
    name: "Red Angus Premium Lot H",
    poolType: "herd",
    cohortLabel: "Spring 2025 — Red Angus",
    geneticsLabel: "Red Angus AI Elite",
    season: "Spring",
    erc20Balance: 20,
    positionValueUsd: 445_000,
    backingHerdCount: 42,
    totalCostUsd: 365_000,
    expectedRevenueUsd: 495_000,
    netExpectedUsd: 130_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 100 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "PROCESSING",
    verified: true,
    lastUpdateIso: daysAgo(0),
  },
];

// ── Cattle Breeds by Stage ───────────────────────────────────────────────────

const BREEDS_BY_POOL: Record<string, string> = {
  "POOL-001": "Angus",
  "POOL-002": "Hereford",
  "POOL-003": "Wagyu F1",
  "POOL-004": "Brahman",
  "POOL-005": "Black Angus",
  "POOL-006": "Charolais",
  "POOL-007": "Simmental",
  "POOL-008": "Red Angus",
};

// ── Facilities ───────────────────────────────────────────────────────────────

const FACILITIES: Record<Stage, string[]> = {
  RANCH: ["Bar-S Ranch, MT", "Twin Creeks Ranch, WY", "Kobe Valley Ranch, OR", "Sunset Pastures, TX"],
  AUCTION: ["Amarillo Livestock Exchange", "Regional Auction, CO", "Midwest Auction, IA"],
  BACKGROUNDING: ["Stocker Fields #1, KS", "Prairie Backgrounding, NE", "High Plains Stocker, OK"],
  FEEDLOT: ["Feedlot #7, Amarillo TX", "Feedlot #12, TX", "Feedlot #3, NE", "Valley Feedlot, IA"],
  PROCESSING: ["Premium Meats Co., NE", "Valley Processors, IA", "USDA Plant #42, KS"],
  DISTRIBUTION: ["Cold Chain Hub, KS", "Midwest Distribution, IL", "Southwest Logistics, AZ"],
};

// ── Cow Generation ───────────────────────────────────────────────────────────
// All cattle in a lot are in the same stage (dominantStage) and share genetics.
// Source is mostly Ranch, with some Dairy (male calves from dairy cow mothers).

function generateCowsForPool(pool: Pool): Cow[] {
  const cows: Cow[] = [];
  let tokenCounter = 1000 + parseInt(pool.id.replace("POOL-", "")) * 100;
  const healthOptions: CowHealth[] = ["On Track", "On Track", "On Track", "On Track", "Watch"];
  const breed = BREEDS_BY_POOL[pool.id] ?? "Angus";
  // ~85% Ranch source, ~15% Dairy (male calves from dairy cows)
  const sourceOptions: CowSource[] = ["Ranch", "Ranch", "Ranch", "Ranch", "Ranch", "Ranch", "Dairy"];

  const baseCost = pool.totalCostUsd / pool.backingHerdCount;
  const baseRevenue = pool.expectedRevenueUsd / pool.backingHerdCount;

  for (let i = 0; i < pool.backingHerdCount; i++) {
    cows.push({
      cowId: `COW-${pool.id.replace("POOL-", "")}-${String(i + 1).padStart(3, "0")}`,
      tokenId: tokenCounter++,
      poolId: pool.id,
      stage: pool.dominantStage,   // all cattle in same stage
      ranchOrFacility: pick(FACILITIES[pool.dominantStage]),
      breed,
      source: pick(sourceOptions),
      weightLb: 600 + Math.floor(Math.random() * 800),
      health: pick(healthOptions),
      daysInStage: 3 + Math.floor(Math.random() * 45),
      costToDateUsd: Math.round(baseCost * (0.7 + Math.random() * 0.6)),
      projectedExitUsd: Math.round(baseRevenue * (0.85 + Math.random() * 0.3)),
      updatedIso: daysAgo(Math.floor(Math.random() * 5)),
      verified: pool.verified || Math.random() > 0.3,
    });
  }

  return cows;
}

export const COWS: Cow[] = POOLS.flatMap(generateCowsForPool);

// ── Lifecycle Events ─────────────────────────────────────────────────────────

export const LIFECYCLE_EVENTS: LifecycleEvent[] = [
  // POOL-001 — Angus Prime Lot A (at FEEDLOT)
  { id: "ev-001", poolId: "POOL-001", stage: "RANCH", verified: true, timestampIso: daysAgo(90), note: "32 Angus calves born & tagged at Bar-S Ranch." },
  { id: "ev-002", poolId: "POOL-001", stage: "AUCTION", verified: true, timestampIso: daysAgo(65), note: "Lot sold at Amarillo livestock auction." },
  { id: "ev-003", poolId: "POOL-001", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(50), note: "Entire lot entered stocker program for weight gain." },
  { id: "ev-004", poolId: "POOL-001", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(25), note: "Full lot transferred to feedlot for finishing." },
  { id: "ev-005", poolId: "POOL-001", cowId: "COW-1-003", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(2), note: "Weight check — 1,180 lb average, on target." },

  // POOL-002 — Hereford Select Lot B (at RANCH)
  { id: "ev-006", poolId: "POOL-002", stage: "RANCH", verified: true, timestampIso: daysAgo(40), note: "28 Hereford calves born — calving season complete." },
  { id: "ev-007", poolId: "POOL-002", cowId: "COW-2-004", stage: "RANCH", verified: true, timestampIso: daysAgo(5), note: "Vaccination round completed. All 28 head clear." },

  // POOL-003 — Wagyu Cross Lot C (at PROCESSING)
  { id: "ev-008", poolId: "POOL-003", stage: "RANCH", verified: true, timestampIso: daysAgo(150), note: "45 Wagyu F1 cross calves selected from specialty ranch." },
  { id: "ev-009", poolId: "POOL-003", stage: "AUCTION", verified: true, timestampIso: daysAgo(120), note: "Premium auction — top price per head." },
  { id: "ev-010", poolId: "POOL-003", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(100), note: "Special diet backgrounding program for full lot." },
  { id: "ev-011", poolId: "POOL-003", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(70), note: "Entered specialty feedlot — grain-finishing." },
  { id: "ev-012", poolId: "POOL-003", stage: "PROCESSING", verified: true, timestampIso: daysAgo(10), note: "Processing started at certified USDA plant." },
  { id: "ev-013", poolId: "POOL-003", cowId: "COW-3-012", stage: "PROCESSING", verified: true, timestampIso: daysAgo(1), note: "USDA grade: Prime — marbling excellent." },

  // POOL-004 — Brahman Mix Lot D (at AUCTION)
  { id: "ev-014", poolId: "POOL-004", stage: "RANCH", verified: true, timestampIso: daysAgo(60), note: "24 Brahman mix calves raised, grass-fed on pasture." },
  { id: "ev-015", poolId: "POOL-004", stage: "AUCTION", verified: false, timestampIso: daysAgo(12), note: "Lot listed for auction — pending verification." },

  // POOL-005 — Black Angus Lot E (at DISTRIBUTION)
  { id: "ev-016", poolId: "POOL-005", stage: "RANCH", verified: true, timestampIso: daysAgo(180), note: "38 Black Angus raised on premium pasture." },
  { id: "ev-017", poolId: "POOL-005", stage: "AUCTION", verified: true, timestampIso: daysAgo(150), note: "Lot sold to certified buyer." },
  { id: "ev-018", poolId: "POOL-005", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(125), note: "Backgrounding — weight gain program." },
  { id: "ev-019", poolId: "POOL-005", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(90), note: "Grain-finished program started." },
  { id: "ev-020", poolId: "POOL-005", stage: "PROCESSING", verified: true, timestampIso: daysAgo(40), note: "USDA inspected processing." },
  { id: "ev-021", poolId: "POOL-005", stage: "DISTRIBUTION", verified: true, timestampIso: daysAgo(8), note: "Full lot entered cold chain distribution." },
  { id: "ev-022", poolId: "POOL-005", cowId: "COW-5-022", stage: "DISTRIBUTION", verified: true, timestampIso: daysAgo(1), note: "Shipment dispatched to Southwest Logistics." },

  // POOL-006 — Charolais Lot F (at FEEDLOT)
  { id: "ev-023", poolId: "POOL-006", stage: "RANCH", verified: true, timestampIso: daysAgo(110), note: "35 Charolais calves selected and tagged." },
  { id: "ev-024", poolId: "POOL-006", stage: "AUCTION", verified: true, timestampIso: daysAgo(85), note: "Auction completed — lot sold." },
  { id: "ev-025", poolId: "POOL-006", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(65), note: "Full lot entered stocker field intake." },
  { id: "ev-026", poolId: "POOL-006", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(35), note: "Feedlot finishing started — grain program." },
  { id: "ev-027", poolId: "POOL-006", cowId: "COW-6-008", stage: "FEEDLOT", verified: false, timestampIso: daysAgo(2), note: "Health watch — mild respiratory, treated." },

  // POOL-007 — Simmental Lot G (at RANCH)
  { id: "ev-028", poolId: "POOL-007", stage: "RANCH", verified: true, timestampIso: daysAgo(30), note: "22 Simmental calves on pasture — 4 months to auction." },

  // POOL-008 — Red Angus Premium Lot H (at PROCESSING)
  { id: "ev-029", poolId: "POOL-008", stage: "RANCH", verified: true, timestampIso: daysAgo(140), note: "42 Red Angus premium stock selected." },
  { id: "ev-030", poolId: "POOL-008", stage: "AUCTION", verified: true, timestampIso: daysAgo(115), note: "Sold at Iowa livestock exchange." },
  { id: "ev-031", poolId: "POOL-008", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(95), note: "Prairie backgrounding program — full lot." },
  { id: "ev-032", poolId: "POOL-008", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(65), note: "Entered Valley Feedlot — finishing program." },
  { id: "ev-033", poolId: "POOL-008", stage: "PROCESSING", verified: true, timestampIso: daysAgo(10), note: "Processing started at certified plant." },
];

// ── Budget Breakdowns (per pool) ─────────────────────────────────────────────
// Simplified for investor view: Cattle Cost + Operating Costs + Expected Revenue

const BUDGET_DATA: Record<string, BudgetItem[]> = {
  "POOL-001": [
    { label: "Cattle Acquisition", amountUsd: 72_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 126_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 276_000, category: "revenue" },
  ],
  "POOL-002": [
    { label: "Cattle Acquisition", amountUsd: 56_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 72_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 172_000, category: "revenue" },
  ],
  "POOL-003": [
    { label: "Cattle Acquisition", amountUsd: 165_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 255_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 580_000, category: "revenue" },
  ],
  "POOL-004": [
    { label: "Cattle Acquisition", amountUsd: 48_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 96_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 198_000, category: "revenue" },
  ],
  "POOL-005": [
    { label: "Cattle Acquisition", amountUsd: 112_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 198_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 420_000, category: "revenue" },
  ],
  "POOL-006": [
    { label: "Cattle Acquisition", amountUsd: 72_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 146_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 292_000, category: "revenue" },
  ],
  "POOL-007": [
    { label: "Cattle Acquisition", amountUsd: 46_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 70_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 158_000, category: "revenue" },
  ],
  "POOL-008": [
    { label: "Cattle Acquisition", amountUsd: 135_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 230_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 495_000, category: "revenue" },
  ],
};

// ── Documents (per pool) ─────────────────────────────────────────────────────

const HERD_DOCUMENTS: Document[] = [
  { title: "Certificate of Origin", type: "certificate", url: "#" },
  { title: "Health Inspection Report", type: "inspection", url: "#" },
  { title: "Ownership Transfer Record", type: "transfer", url: "#" },
  { title: "USDA Grade Certificate", type: "grade", url: "#" },
  { title: "Livestock Insurance Policy", type: "insurance", url: "#" },
];

export function getPoolDocuments(pool: Pool): Document[] {
  const count = 3 + (parseInt(pool.id.replace(/\D/g, "")) % 3);
  return HERD_DOCUMENTS.slice(0, Math.min(count, HERD_DOCUMENTS.length));
}

// ── Builders ─────────────────────────────────────────────────────────────────

export function buildPoolBudget(poolId: string): BudgetItem[] {
  return BUDGET_DATA[poolId] ?? BUDGET_DATA["POOL-001"];
}

export function buildPoolHistory(pool: Pool): SeriesPoint[] {
  return generateSeries(30, pool.positionValueUsd * 0.95, pool.positionValueUsd * 0.008);
}

export function buildPortfolioHistory(): SeriesPoint[] {
  const totalBase = POOLS.reduce((s, p) => s + p.positionValueUsd, 0);
  return generateSeries(30, totalBase * 0.97, totalBase * 0.003);
}

export function getRecentEvents(count: number): LifecycleEvent[] {
  return [...LIFECYCLE_EVENTS]
    .sort(
      (a, b) =>
        new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime(),
    )
    .slice(0, count);
}

export function getPoolEvents(poolId: string): LifecycleEvent[] {
  return LIFECYCLE_EVENTS.filter((e) => e.poolId === poolId).sort(
    (a, b) =>
      new Date(a.timestampIso).getTime() - new Date(b.timestampIso).getTime(),
  );
}

export function getPoolCows(poolId: string): Cow[] {
  return COWS.filter((c) => c.poolId === poolId);
}
