import type { Pool, Cow, CowDetailData, PoolDetail, PortfolioSummary } from "./types";
import {
  POOLS,
  COWS,
  buildPoolBudget,
  buildPoolHistory,
  buildPortfolioHistory,
  getRecentEvents,
  getPoolEvents,
  getPoolCows as getPoolCowsMock,
  getPoolDocuments,
  getCowWeights,
  getCowEPDs,
  getCowHealthRecords,
  getCowValuations,
} from "./mock";

// Simulates network latency for realistic loading states.
function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// TODO: replace with fetch('/api/portfolio')
export async function getPortfolio(): Promise<PortfolioSummary> {
  await delay();

  const portfolioValueUsd = POOLS.reduce((s, p) => s + p.positionValueUsd, 0);
  const avgRisk = Math.round(
    POOLS.reduce((s, p) => s + (p.netExpectedUsd / p.listingPrice) * 100, 0) /
      POOLS.length,
  );

  const topPools = [...POOLS]
    .sort((a, b) => b.positionValueUsd - a.positionValueUsd)
    .slice(0, 5);

  return {
    asOfIso: new Date().toISOString(),
    portfolioValueUsd,
    change30dPct: 4.2,
    poolsHeld: POOLS.length,
    avgRisk,
    history30d: buildPortfolioHistory(),
    recentEvents: getRecentEvents(8),
    topPools,
  };
}

// TODO: replace with fetch('/api/pools')
export async function getPools(): Promise<Pool[]> {
  await delay();
  return [...POOLS];
}

// fetch('/api/pools')
// export async function getPools(): Promise<Pool[]> {
//   const res = await fetch(`${API_BASE}/pools`);

//   if (!res.ok) {
//     throw new Error("Failed to fetch pools");
//   }

//   return res.json();
// }

// TODO: replace with fetch(`/api/pools/${poolId}`)
export async function getPoolById(poolId: string): Promise<PoolDetail | null> {
  await delay(500);
  const pool = POOLS.find((p) => p.id === poolId);
  if (!pool) return null;

  return {
    pool,
    lifecycle: getPoolEvents(poolId),
    budgetBreakdown: buildPoolBudget(poolId),
    valuationHistory30d: buildPoolHistory(pool),
    documents: getPoolDocuments(pool),
  };
}

// TODO: replace with fetch(`/api/pools/${poolId}/cows`)
export async function getPoolCows(poolId: string): Promise<Cow[]> {
  await delay(300);
  return getPoolCowsMock(poolId);
}

// TODO: replace with fetch(`/api/cows/${cowId}`)
// Returns full CowDetailData including weights, EPDs, health records, and valuations.
export async function getCowById(cowId: string): Promise<CowDetailData | null> {
  await delay(300);
  const cow = COWS.find((c) => c.cowId === cowId);
  if (!cow) return null;

  return {
    cow,
    weights: getCowWeights(cowId),
    epds: getCowEPDs(cowId),
    healthRecords: getCowHealthRecords(cowId),
    valuations: getCowValuations(cowId),
  };
}
