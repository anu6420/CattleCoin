import type {
  Pool,
  Cow,
  CowDetailData,
  PoolDetail,
  PortfolioSummary,
  HerdInvestInfo,
  InvestPayload,
  InvestResult,
} from "./types";

const API_BASE = "/api";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Portfolio (global, used by Admin) ───────────────────────────────────────
export async function getPortfolio(): Promise<PortfolioSummary> {
  return fetchJSON("/portfolio");
}

// ─── Per-investor portfolio (Dashboard) ──────────────────────────────────────
export async function getInvestorPortfolio(slug: string): Promise<PortfolioSummary> {
  return fetchJSON(`/investors/${slug}/portfolio`);
}

// ─── Per-investor holdings (Holdings page) ────────────────────────────────────
export async function getInvestorHoldings(slug: string): Promise<Pool[]> {
  return fetchJSON(`/investors/${slug}/holdings`);
}

// ─── Pools / Herds ────────────────────────────────────────────────────────────
export async function getPools(): Promise<Pool[]> {
  return fetchJSON("/pools");
}

export async function getPoolById(poolId: string): Promise<PoolDetail | null> {
  try {
    return await fetchJSON(`/pools/${poolId}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}

export async function getPoolCows(poolId: string): Promise<Cow[]> {
  return fetchJSON(`/pools/${poolId}/cows`);
}

// ─── Individual Cow ───────────────────────────────────────────────────────────
export async function getCowById(cowId: string): Promise<CowDetailData | null> {
  try {
    return await fetchJSON(`/cows/${cowId}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}

// ─── Invest ───────────────────────────────────────────────────────────────────
export async function getHerdForInvest(herdId: string): Promise<HerdInvestInfo | null> {
  try {
    return await fetchJSON(`/invest/${herdId}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}

export async function postInvestment(payload: InvestPayload): Promise<InvestResult> {
  const res = await fetch(`${API_BASE}/invest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Investment failed: ${res.status}`);
  }
  return res.json() as Promise<InvestResult>;
}
