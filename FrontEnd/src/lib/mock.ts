import type {
  Pool,
  Cow,
  CowHealth,
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

// ── Pools / Herds ────────────────────────────────────────────────────────────

export const POOLS: Pool[] = [
  {
    id: "POOL-001",
    name: "Angus Prime Herd A",
    poolType: "herd",
    cohortLabel: "Q4 2025 Angus",
    erc20Balance: 5000,
    positionValueUsd: 248_000,
    backingHerdCount: 12,
    totalCostUsd: 198_000,
    expectedRevenueUsd: 276_000,
    netExpectedUsd: 78_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 8 },
      { stage: "FEEDLOT", pct: 67 },
      { stage: "PROCESSING", pct: 25 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "FEEDLOT",
    verified: true,
    lastUpdateIso: daysAgo(1),
  },
  {
    id: "POOL-002",
    name: "Hereford Select B",
    poolType: "herd",
    cohortLabel: "Q3 2025 Hereford",
    erc20Balance: 3200,
    positionValueUsd: 156_000,
    backingHerdCount: 8,
    totalCostUsd: 128_000,
    expectedRevenueUsd: 172_000,
    netExpectedUsd: 44_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 50 },
      { stage: "AUCTION", pct: 25 },
      { stage: "BACKGROUNDING", pct: 25 },
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
    name: "Wagyu Cross C",
    poolType: "herd",
    cohortLabel: "Q1 2025 Wagyu",
    erc20Balance: 8000,
    positionValueUsd: 512_000,
    backingHerdCount: 15,
    totalCostUsd: 420_000,
    expectedRevenueUsd: 580_000,
    netExpectedUsd: 160_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 13 },
      { stage: "PROCESSING", pct: 60 },
      { stage: "DISTRIBUTION", pct: 27 },
    ],
    dominantStage: "PROCESSING",
    verified: true,
    lastUpdateIso: daysAgo(0),
  },
  {
    id: "POOL-004",
    name: "Brahman Mix D",
    poolType: "herd",
    cohortLabel: "Q4 2025 Brahman",
    erc20Balance: 2400,
    positionValueUsd: 98_000,
    backingHerdCount: 6,
    totalCostUsd: 84_000,
    expectedRevenueUsd: 108_000,
    netExpectedUsd: 24_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 17 },
      { stage: "AUCTION", pct: 50 },
      { stage: "BACKGROUNDING", pct: 33 },
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
    name: "Black Angus E",
    poolType: "herd",
    cohortLabel: "Q2 2025 Black Angus",
    erc20Balance: 6500,
    positionValueUsd: 385_000,
    backingHerdCount: 14,
    totalCostUsd: 310_000,
    expectedRevenueUsd: 420_000,
    netExpectedUsd: 110_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 21 },
      { stage: "DISTRIBUTION", pct: 79 },
    ],
    dominantStage: "DISTRIBUTION",
    verified: true,
    lastUpdateIso: daysAgo(1),
  },
  {
    id: "POOL-006",
    name: "Charolais Lot F",
    poolType: "herd",
    cohortLabel: "Q4 2025 Charolais",
    erc20Balance: 4100,
    positionValueUsd: 195_000,
    backingHerdCount: 10,
    totalCostUsd: 165_000,
    expectedRevenueUsd: 218_000,
    netExpectedUsd: 53_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 20 },
      { stage: "FEEDLOT", pct: 60 },
      { stage: "PROCESSING", pct: 20 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "FEEDLOT",
    verified: true,
    lastUpdateIso: daysAgo(2),
  },
  {
    id: "POOL-007",
    name: "Simmental G",
    poolType: "herd",
    cohortLabel: "Q1 2026 Simmental",
    erc20Balance: 1800,
    positionValueUsd: 72_000,
    backingHerdCount: 5,
    totalCostUsd: 60_000,
    expectedRevenueUsd: 82_000,
    netExpectedUsd: 22_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 80 },
      { stage: "AUCTION", pct: 20 },
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
    name: "Red Angus Premium H",
    poolType: "herd",
    cohortLabel: "Q3 2025 Red Angus",
    erc20Balance: 7200,
    positionValueUsd: 445_000,
    backingHerdCount: 10,
    totalCostUsd: 365_000,
    expectedRevenueUsd: 495_000,
    netExpectedUsd: 130_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 30 },
      { stage: "PROCESSING", pct: 50 },
      { stage: "DISTRIBUTION", pct: 20 },
    ],
    dominantStage: "PROCESSING",
    verified: true,
    lastUpdateIso: daysAgo(0),
  },

  // ── Individual Cattle Pools ──────────────────────────────────────────────
  {
    id: "IND-001",
    name: "Premium Wagyu Singles",
    poolType: "individual",
    cohortLabel: "Wagyu A5 Grade",
    erc20Balance: 4,
    positionValueUsd: 92_000,
    backingHerdCount: 4,
    totalCostUsd: 68_000,
    expectedRevenueUsd: 108_000,
    netExpectedUsd: 40_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 25 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 25 },
      { stage: "FEEDLOT", pct: 50 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "FEEDLOT",
    verified: true,
    lastUpdateIso: daysAgo(0),
  },
  {
    id: "IND-002",
    name: "Angus Select Singles",
    poolType: "individual",
    cohortLabel: "Certified Angus Beef",
    erc20Balance: 6,
    positionValueUsd: 54_000,
    backingHerdCount: 6,
    totalCostUsd: 42_000,
    expectedRevenueUsd: 61_200,
    netExpectedUsd: 19_200,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 17 },
      { stage: "BACKGROUNDING", pct: 33 },
      { stage: "FEEDLOT", pct: 33 },
      { stage: "PROCESSING", pct: 17 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "BACKGROUNDING",
    verified: true,
    lastUpdateIso: daysAgo(1),
  },
  {
    id: "IND-003",
    name: "Heritage Breed Singles",
    poolType: "individual",
    cohortLabel: "Longhorn & Highland",
    erc20Balance: 3,
    positionValueUsd: 38_500,
    backingHerdCount: 3,
    totalCostUsd: 27_000,
    expectedRevenueUsd: 42_000,
    netExpectedUsd: 15_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 67 },
      { stage: "AUCTION", pct: 33 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "RANCH",
    verified: false,
    lastUpdateIso: daysAgo(2),
  },
];

// ── Cows ─────────────────────────────────────────────────────────────────────

const FACILITIES: Record<Stage, string[]> = {
  RANCH: ["Bar-S Ranch, MT", "Twin Creeks Ranch, WY", "Kobe Valley Ranch, OR", "Sunset Pastures, TX"],
  AUCTION: ["Amarillo Livestock Exchange", "Regional Auction, CO", "Midwest Auction, IA"],
  BACKGROUNDING: ["Stocker Fields #1, KS", "Prairie Backgrounding, NE", "High Plains Stocker, OK"],
  FEEDLOT: ["Feedlot #7, Amarillo TX", "Feedlot #12, TX", "Feedlot #3, NE", "Valley Feedlot, IA"],
  PROCESSING: ["Premium Meats Co., NE", "Valley Processors, IA", "USDA Plant #42, KS"],
  DISTRIBUTION: ["Cold Chain Hub, KS", "Midwest Distribution, IL", "Southwest Logistics, AZ"],
};

function generateCowsForPool(pool: Pool): Cow[] {
  const cows: Cow[] = [];
  let tokenCounter = 1000 + parseInt(pool.id.replace("POOL-", "")) * 100;

  for (let i = 0; i < pool.backingHerdCount; i++) {
    // Distribute cows according to stageBreakdown
    let cumPct = 0;
    const roll = ((i + 1) / pool.backingHerdCount) * 100;
    let cowStage: Stage = "RANCH";
    for (const sb of pool.stageBreakdown) {
      cumPct += sb.pct;
      if (roll <= cumPct) {
        cowStage = sb.stage;
        break;
      }
    }

    const healthOptions: CowHealth[] = ["On Track", "On Track", "On Track", "Watch", "Issue"];
    const baseCost = pool.totalCostUsd / pool.backingHerdCount;
    const baseRevenue = pool.expectedRevenueUsd / pool.backingHerdCount;

    cows.push({
      cowId: `COW-${pool.id.replace("POOL-", "")}-${String(i + 1).padStart(3, "0")}`,
      tokenId: tokenCounter++,
      poolId: pool.id,
      stage: cowStage,
      ranchOrFacility: pick(FACILITIES[cowStage]),
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
  // POOL-001 events
  { id: "ev-001", poolId: "POOL-001", stage: "RANCH", verified: true, timestampIso: daysAgo(90), note: "Angus herd born & tagged at Bar-S Ranch." },
  { id: "ev-002", poolId: "POOL-001", stage: "AUCTION", verified: true, timestampIso: daysAgo(65), note: "Lot sold at Amarillo livestock auction." },
  { id: "ev-003", poolId: "POOL-001", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(50), note: "Entered stocker program for weight gain." },
  { id: "ev-004", poolId: "POOL-001", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(25), note: "Transferred to feedlot for finishing." },
  { id: "ev-005", poolId: "POOL-001", cowId: "COW-001-003", stage: "PROCESSING", verified: true, timestampIso: daysAgo(5), note: "3 head entered processing facility." },

  // POOL-002 events
  { id: "ev-006", poolId: "POOL-002", stage: "RANCH", verified: true, timestampIso: daysAgo(40), note: "Hereford calving season complete." },
  { id: "ev-007", poolId: "POOL-002", cowId: "COW-002-001", stage: "AUCTION", verified: true, timestampIso: daysAgo(15), note: "First group listed for auction." },

  // POOL-003 events
  { id: "ev-008", poolId: "POOL-003", stage: "RANCH", verified: true, timestampIso: daysAgo(120), note: "Wagyu cross bred on specialty ranch." },
  { id: "ev-009", poolId: "POOL-003", stage: "AUCTION", verified: true, timestampIso: daysAgo(95), note: "Premium auction — top price per head." },
  { id: "ev-010", poolId: "POOL-003", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(80), note: "Special diet backgrounding program." },
  { id: "ev-011", poolId: "POOL-003", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(55), note: "Entered specialty feedlot." },
  { id: "ev-012", poolId: "POOL-003", stage: "PROCESSING", verified: true, timestampIso: daysAgo(15), note: "Processing started at certified plant." },
  { id: "ev-013", poolId: "POOL-003", stage: "DISTRIBUTION", verified: true, timestampIso: daysAgo(3), note: "First batch in cold chain distribution." },

  // POOL-004 events
  { id: "ev-014", poolId: "POOL-004", stage: "RANCH", verified: true, timestampIso: daysAgo(60), note: "Brahman mix raised, grass-fed." },
  { id: "ev-015", poolId: "POOL-004", stage: "AUCTION", verified: false, timestampIso: daysAgo(12), note: "Listed for auction — pending verification." },

  // POOL-005 events
  { id: "ev-016", poolId: "POOL-005", stage: "RANCH", verified: true, timestampIso: daysAgo(150), note: "Premium Black Angus raised on pasture." },
  { id: "ev-017", poolId: "POOL-005", stage: "AUCTION", verified: true, timestampIso: daysAgo(120), note: "Sold to certified buyer." },
  { id: "ev-018", poolId: "POOL-005", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(100), note: "Backgrounding — weight gain program." },
  { id: "ev-019", poolId: "POOL-005", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(70), note: "Grain-finished program started." },
  { id: "ev-020", poolId: "POOL-005", stage: "PROCESSING", verified: true, timestampIso: daysAgo(30), note: "USDA inspected processing." },
  { id: "ev-021", poolId: "POOL-005", stage: "DISTRIBUTION", verified: true, timestampIso: daysAgo(5), note: "Cold chain distribution started." },

  // POOL-006 events
  { id: "ev-022", poolId: "POOL-006", stage: "RANCH", verified: true, timestampIso: daysAgo(85), note: "Charolais lot selected and tagged." },
  { id: "ev-023", poolId: "POOL-006", stage: "AUCTION", verified: true, timestampIso: daysAgo(60), note: "Auction completed successfully." },
  { id: "ev-024", poolId: "POOL-006", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(45), note: "Stocker field intake." },
  { id: "ev-025", poolId: "POOL-006", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(20), note: "Feedlot finishing started." },

  // POOL-007 events
  { id: "ev-026", poolId: "POOL-007", stage: "RANCH", verified: true, timestampIso: daysAgo(18), note: "Simmental herd on pasture." },

  // POOL-008 events
  { id: "ev-027", poolId: "POOL-008", stage: "RANCH", verified: true, timestampIso: daysAgo(110), note: "Red Angus premium stock selected." },
  { id: "ev-028", poolId: "POOL-008", stage: "AUCTION", verified: true, timestampIso: daysAgo(90), note: "Sold at Iowa livestock exchange." },
  { id: "ev-029", poolId: "POOL-008", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(75), note: "Prairie backgrounding program." },
  { id: "ev-030", poolId: "POOL-008", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(45), note: "Entered Valley Feedlot." },
  { id: "ev-031", poolId: "POOL-008", stage: "PROCESSING", verified: true, timestampIso: daysAgo(8), note: "Processing started." },

  // Cow-level events (mixed across pools)
  { id: "ev-032", poolId: "POOL-001", cowId: "COW-001-005", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(2), note: "Weight check — 1,180 lb, on target." },
  { id: "ev-033", poolId: "POOL-003", cowId: "COW-003-002", stage: "PROCESSING", verified: true, timestampIso: daysAgo(1), note: "USDA grade: Choice." },
  { id: "ev-034", poolId: "POOL-005", cowId: "COW-005-010", stage: "DISTRIBUTION", verified: true, timestampIso: daysAgo(0), note: "Shipped to Southwest Logistics." },
  { id: "ev-035", poolId: "POOL-006", cowId: "COW-006-004", stage: "FEEDLOT", verified: false, timestampIso: daysAgo(1), note: "Health watch — mild respiratory, treated." },
  { id: "ev-036", poolId: "POOL-002", cowId: "COW-002-003", stage: "RANCH", verified: true, timestampIso: daysAgo(3), note: "Vaccination completed." },

  // IND-001 events (Premium Wagyu Singles)
  { id: "ev-037", poolId: "IND-001", stage: "RANCH", verified: true, timestampIso: daysAgo(75), note: "Wagyu A5 calves selected from specialty ranch." },
  { id: "ev-038", poolId: "IND-001", stage: "AUCTION", verified: true, timestampIso: daysAgo(50), note: "Individual lot auction — premium bids." },
  { id: "ev-039", poolId: "IND-001", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(35), note: "Specialty diet backgrounding started." },
  { id: "ev-040", poolId: "IND-001", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(10), note: "Transferred to premium feedlot program." },
  { id: "ev-041", poolId: "IND-001", cowId: "COW-IND001-001", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(1), note: "Weight check — 1,320 lb, marbling excellent." },

  // IND-002 events (Angus Select Singles)
  { id: "ev-042", poolId: "IND-002", stage: "RANCH", verified: true, timestampIso: daysAgo(60), note: "Certified Angus selected individually." },
  { id: "ev-043", poolId: "IND-002", stage: "AUCTION", verified: true, timestampIso: daysAgo(40), note: "Individual purchase at livestock exchange." },
  { id: "ev-044", poolId: "IND-002", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(25), note: "Entered backgrounding program." },
  { id: "ev-045", poolId: "IND-002", cowId: "COW-IND002-003", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(5), note: "Feedlot intake — grain finishing." },
  { id: "ev-046", poolId: "IND-002", cowId: "COW-IND002-005", stage: "PROCESSING", verified: true, timestampIso: daysAgo(2), note: "Entered processing, USDA Choice expected." },

  // IND-003 events (Heritage Breed Singles)
  { id: "ev-047", poolId: "IND-003", stage: "RANCH", verified: false, timestampIso: daysAgo(30), note: "Heritage breeds identified — Longhorn & Highland." },
  { id: "ev-048", poolId: "IND-003", cowId: "COW-IND003-002", stage: "AUCTION", verified: false, timestampIso: daysAgo(8), note: "Highland cow listed at specialty auction." },
];

// ── Budget Breakdowns (per pool) ─────────────────────────────────────────────

const BUDGET_DATA: Record<string, BudgetItem[]> = {
  "POOL-001": [
    { label: "Ranch & Acquisition", amountUsd: 72_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 18_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 68_000, category: "cost" },
    { label: "Processing", amountUsd: 24_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 16_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 276_000, category: "revenue" },
  ],
  "POOL-002": [
    { label: "Ranch & Acquisition", amountUsd: 56_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 14_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 38_000, category: "cost" },
    { label: "Processing", amountUsd: 12_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 8_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 172_000, category: "revenue" },
  ],
  "POOL-003": [
    { label: "Ranch & Acquisition", amountUsd: 165_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 35_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 120_000, category: "cost" },
    { label: "Processing", amountUsd: 62_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 38_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 580_000, category: "revenue" },
  ],
  "POOL-004": [
    { label: "Ranch & Acquisition", amountUsd: 36_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 10_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 24_000, category: "cost" },
    { label: "Processing", amountUsd: 8_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 6_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 108_000, category: "revenue" },
  ],
  "POOL-005": [
    { label: "Ranch & Acquisition", amountUsd: 112_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 28_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 95_000, category: "cost" },
    { label: "Processing", amountUsd: 48_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 27_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 420_000, category: "revenue" },
  ],
  "POOL-006": [
    { label: "Ranch & Acquisition", amountUsd: 62_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 16_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 54_000, category: "cost" },
    { label: "Processing", amountUsd: 20_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 13_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 218_000, category: "revenue" },
  ],
  "POOL-007": [
    { label: "Ranch & Acquisition", amountUsd: 28_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 6_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 16_000, category: "cost" },
    { label: "Processing", amountUsd: 6_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 4_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 82_000, category: "revenue" },
  ],
  "POOL-008": [
    { label: "Ranch & Acquisition", amountUsd: 135_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 30_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 110_000, category: "cost" },
    { label: "Processing", amountUsd: 55_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 35_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 495_000, category: "revenue" },
  ],
  "IND-001": [
    { label: "Acquisition (per head)", amountUsd: 28_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 8_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 20_000, category: "cost" },
    { label: "Processing", amountUsd: 7_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 5_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 108_000, category: "revenue" },
  ],
  "IND-002": [
    { label: "Acquisition (per head)", amountUsd: 18_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 5_000, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 12_000, category: "cost" },
    { label: "Processing", amountUsd: 4_000, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 3_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 61_200, category: "revenue" },
  ],
  "IND-003": [
    { label: "Acquisition (per head)", amountUsd: 12_000, category: "cost" },
    { label: "Backgrounding", amountUsd: 3_500, category: "cost" },
    { label: "Feed & Finishing", amountUsd: 7_000, category: "cost" },
    { label: "Processing", amountUsd: 2_500, category: "cost" },
    { label: "Logistics & Distribution", amountUsd: 2_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 42_000, category: "revenue" },
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

const INDIVIDUAL_DOCUMENTS: Document[] = [
  { title: "Individual Bill of Sale", type: "transfer", url: "#" },
  { title: "Veterinary Health Certificate", type: "inspection", url: "#" },
  { title: "Breed Registration Papers", type: "certificate", url: "#" },
  { title: "USDA Grade Certificate", type: "grade", url: "#" },
];

export function getPoolDocuments(pool: Pool): Document[] {
  const docs = pool.poolType === "individual" ? INDIVIDUAL_DOCUMENTS : HERD_DOCUMENTS;
  // Vary count per pool so it doesn't look uniform
  const count = 3 + (parseInt(pool.id.replace(/\D/g, "")) % 3);
  return docs.slice(0, Math.min(count, docs.length));
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
