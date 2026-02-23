# CattleCoin

A cattle tokenization platform that lets investors buy fractional ERC-20 ownership stakes in livestock herds, track individual cattle through the full supply chain, and view real-time valuations backed by on-chain data.

---

## Monorepo Structure

```
CattleCoin/
├── FrontEnd/              React + TypeScript investor dashboard
├── BackEnd/
│   ├── src/               Express API server
│   └── Database/          Postgres schema + Docker setup
├── docker-compose.yml     Starts the local Postgres database
├── erd.html               Entity Relationship Diagram (open in browser)
└── .env.example           Copy to .env and fill in credentials
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Docker Desktop | latest |

---

## Running the App for Development

### 1 — Environment variables

Copy `.env.example` to `.env` in the repo root:

```bash
cp .env.example .env
```

### 2 — Start the database

```bash
# From the repo root
docker compose up -d
```

Confirm the container is running:

```bash
docker ps
# should show cattlecoin-db on port 5432
```

### 3 — Run migrations

```bash
chmod +x BackEnd/Database/runMigrations.sh
./BackEnd/Database/runMigrations.sh
```

### 4 — Start the backend

```bash
cd BackEnd
npm install
npm run dev
```

The API server runs on **http://localhost:3000**.

Verify it's up:

```
GET http://localhost:3000/api/health
```

### 5 — Start the frontend

```bash
cd FrontEnd
npm install
npm run dev
```

Open **http://localhost:5173** — you will be redirected to `/investor`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://cattlecoin:cattlecoin@localhost:5432/cattlecoin` | Backend DB connection string |
| `POSTGRES_DB` | `cattlecoin` | Database name (Docker) |
| `POSTGRES_USER` | `cattlecoin` | Database user (Docker) |
| `POSTGRES_PASSWORD` | `cattlecoin` | Database password (Docker) |

> **WSL2 users:** Docker Desktop does not forward container ports to WSL2's loopback. Replace `localhost` in `DATABASE_URL` with the output of `ip route | grep default | awk '{print $3}'`.

---

## Database

- **Engine**: PostgreSQL 16 via Docker
- **Connection**: `postgresql://cattlecoin:cattlecoin@localhost:5432/cattlecoin`
- **Schema**: See `erd.html` (open in any browser) or `BackEnd/Database/README.md`
- **Migrations**: `BackEnd/Database/migrations/`

See [BackEnd/Database/README.md](BackEnd/Database/README.md) for full database docs.

---

## Backend

- **Framework**: Express 5 + Node.js
- **Port**: 3000
- **DB client**: node-postgres (`pg`)

See [BackEnd/README.md](BackEnd/README.md) for full backend docs.

---

## Frontend

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Charts**: Recharts
- **Router**: React Router v7

> The frontend currently uses mock data. API calls are in `FrontEnd/src/lib/api.ts` — each function has a `// TODO: replace with fetch(...)` comment ready for wiring to the backend.

See [FrontEnd/README.md](FrontEnd/README.md) for full frontend docs.

---

## Database Schema (ERD Summary)

Open `erd.html` in a browser to view the full interactive diagram. Core tables:

| Table | Description |
|-------|-------------|
| `users` | Investors and ranchers |
| `herds` | A physical cattle herd owned by a rancher |
| `animals` | Individual animal records (registration, breed, sex, lineage, genomics) |
| `token_pools` | ERC-20 token contract — one per herd |
| `ownership` | Investor ↔ token pool many-to-many (token balances) |
| `transactions` | On-chain buy/sell/mint/redeem audit log |
| `animal_weights` | Time-series weight records per animal |
| `animal_epds` | Expected Progeny Differences (genetic trait scores) |
| `cow_health` | Vaccination and health program records |
| `cow_valuation` | Scoring-based valuation snapshots per animal |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server + DB status check |
| `GET` | `/api/pools` | All herds/investment pools |

---

## Connecting the Frontend to the Backend

All API calls are in `FrontEnd/src/lib/api.ts`. Each function has a `// TODO: replace with fetch(...)` comment:

| Function | Planned Endpoint |
|----------|-----------------|
| `getPortfolio()` | `GET /api/portfolio` |
| `getPools()` | `GET /api/pools` |
| `getPoolById(id)` | `GET /api/pools/:id` |
| `getPoolCows(id)` | `GET /api/pools/:id/cows` |
| `getCowById(cowId)` | `GET /api/cows/:cowId` |

Return types are defined in `FrontEnd/src/lib/types.ts`.