# CattleCoin Backend

## Overview

The **CattleCoin Backend** is a Node.js + Express API server responsible for:

* Serving REST API endpoints used by the frontend
* Connecting to the PostgreSQL database
* Querying herd (pool) and cattle data
* Acting as the bridge between React UI and on-chain / database data

This backend follows a **monolithic Express server architecture** designed for rapid development and clear separation between frontend, backend, and database layers.

---

## Tech Stack

* **Node.js**
* **Express.js**
* **PostgreSQL**
* **pg (node-postgres)**
* **Docker (database container)**
* **dotenv** for environment configuration

---

## Project Structure

```
BackEnd/
│
├── src/
│   ├── server.js        # Express server entry point
│   ├── db.js            # PostgreSQL connection pool
│   └── routes/
│       └── pools.js     # Pool (herd) API routes
│
├── Database/            # SQL migrations + seeds
├── package.json
└── README.md
```

---

## Environment Setup

A shared `.env` file exists at the **project root** (`CattleCoin/.env`).

Example:

```
DATABASE_URL=postgresql://cattlecoin:cattlecoin@localhost:5432/cattlecoin
POSTGRES_DB=cattlecoin
POSTGRES_USER=cattlecoin
POSTGRES_PASSWORD=cattlecoin
POSTGRES_PORT=5432
```

The backend loads this automatically using dotenv.

---

## Installation

From the `BackEnd` directory:

```
npm install
```

---

## Running the Backend

### 1. Start Database (Docker)

From project root:

```
docker compose up -d
```

Verify container:

```
docker ps
```

You should see:

```
cattlecoin-db   postgres:16
```

---

### 2. Run Database Migrations

```
cd BackEnd/Database
./runMigrations.sh
```

---

### 3. Start Backend Server

```
cd BackEnd
npm run dev
```

Expected output:

```
Backend running on http://localhost:3000
```

---

## API Endpoints

### Health Check

```
GET /api/health
```

Returns server + database status.

---

### Pools (Herds)

```
GET /api/pools
```

Returns all investment pools (mapped from `herds` table).
---

## Database Connection

`src/db.js` creates a shared PostgreSQL connection pool:

* Uses `DATABASE_URL`
* Automatically reconnects
* Shared across routes

All queries should import this pool instead of creating new connections.

---

## Development Workflow

Recommended startup order:

1. Docker database
2. Run migrations
3. Start backend
4. Start frontend

```
React → Express → PostgreSQL
```

---

## Adding New Routes

1. Create a new file inside:

```
src/routes/
```

Example:

```
users.js
portfolio.js
```

2. Export an Express router

3. Register in `server.js`

```js
app.use("/api/users", usersRoutes);
```

---

## Testing the API

Open browser or Postman:

```
http://localhost:3000/api/health
http://localhost:3000/api/pools
```

---

## Future Improvements

* Authentication / JWT middleware
* Role-based access control
* Portfolio aggregation endpoints
* Smart contract integration
* Input validation middleware
* Centralized error handling

---

## Notes for Team Members

* Mock frontend data should be replaced with real API calls and update Frontend accordingly
* Never commit `.env`
* Always run migrations after pulling new database changes

---

## Authors

CSCE 482 — CattleCoin Backend Team
