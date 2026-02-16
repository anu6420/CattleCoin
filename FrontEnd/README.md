# Cattle Token - Investor Dashboard (MVP)

Frontend-only MVP investor dashboard for a cattle tokenization platform.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 — you'll be redirected to `/investor`.

## Routes

| Path                        | Page             | Description                                 |
| --------------------------- | ---------------- | ------------------------------------------- |
| `/investor`                 | Dashboard        | KPI cards, portfolio chart, events, top 5   |
| `/investor/holdings`        | Holdings         | Searchable/filterable/sortable holdings     |
| `/investor/holdings/:id`    | Holding Detail   | Supply chain stepper, valuation, risk, docs |

## Project Structure

```
src/
├── components/
│   ├── charts/          LineChartCard (Recharts wrapper)
│   ├── common/          KpiCard, StageBadge, VerifiedBadge
│   ├── layout/          AppShell (sidebar + header + Outlet)
│   ├── lifecycle/       SupplyChainStepper
│   ├── tables/          HoldingsTable
│   └── ui/              shadcn/ui primitives (Card, Badge, Button, etc.)
├── lib/
│   ├── types.ts         TypeScript data models
│   ├── mock.ts          12 holdings + lifecycle events (mock data)
│   ├── api.ts           Async API layer (returns mock data)
│   └── utils.ts         cn(), formatUsd(), formatPct(), formatDate()
├── pages/
│   ├── Dashboard.tsx
│   ├── Holdings.tsx
│   └── HoldingDetail.tsx
├── App.tsx              Router setup
├── main.tsx             Entry point
└── index.css            Tailwind v4 + theme tokens
```

## Mock Data

All mock data lives in `src/lib/mock.ts`:
- **12 holdings** across all 5 supply-chain stages
- **34 lifecycle events** (3+ per holding)
- Valuation time series are generated procedurally

## Swapping in Real APIs

The API layer is in `src/lib/api.ts`. Each function has a `// TODO: replace with fetch(...)` comment. Replace the mock implementations with real `fetch()` calls:

| Function            | Mock Source       | Future Endpoint             |
| ------------------- | ----------------- | --------------------------- |
| `getPortfolio()`    | Aggregated mocks  | `GET /api/portfolio`        |
| `getHoldings()`     | `HOLDINGS` array  | `GET /api/holdings`         |
| `getHoldingById(id)`| `buildHoldingDetail()` | `GET /api/holdings/:id` |

The return types (`PortfolioSummary`, `Holding[]`, `HoldingDetail`) are defined in `src/lib/types.ts` — keep the same shape from your backend.

## Tech Stack

- Vite + React 19 + TypeScript
- React Router v7
- Tailwind CSS v4
- shadcn/ui (Radix primitives)
- Recharts
- Lucide icons
