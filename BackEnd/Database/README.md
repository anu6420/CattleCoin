# CattleCoin — Database (Postgres + Docker)

This folder contains the local Postgres database setup and SQL migration workflow for CattleCoin.

We manage all schema changes using **versioned SQL migration files**. This keeps every developer’s database consistent and provides a clean path to future deployment (e.g., AWS RDS).

---

## What’s in here

- `migrations/` — versioned SQL migration files (`001_*.sql`, `002_*.sql`, ...)
- `runMigrations.sh` — runs all migrations in order against the Docker Postgres container
- `seeds/` - scripts to insert data

---

## Quick Start

### 1) Start the database

From the **repo root** (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

Confirm it’s running:

```bash
docker ps
```

---

### 2) Run migrations (recommended)

From the **repo root**:

```bash
chmod +x BackEnd/Database/runMigrations.sh
./BackEnd/Database/runMigrations.sh
```

This will apply every `*.sql` file in `BackEnd/Database/migrations/` in filename order.

---

## Connection Details

Default local connection:

- Host: `localhost`
- Port: `5432`
- Database: `cattlecoin`
- User: `cattlecoin`
- Password: `cattlecoin`

Connection string (example):

```
postgresql://cattlecoin:cattlecoin@localhost:5432/cattlecoin
```

---

## Adding a New Migration

1. Create a new file in `migrations/`
2. Use the next sequential number prefix and a short description:

   - `002_add_tokens.sql`
   - `003_add_valuations.sql`

3. **Write only the change** (do not rewrite old migrations)
4. Run migrations locally:
   ```bash
   ./BackEnd/Database/runMigrations.sh
   ```
5. Commit + push the migration file

---

## Resetting the DB 

This deletes all local data (because it removes the Docker volume).

```bash
docker compose down -v
docker compose up -d
./BackEnd/Database/runMigrations.sh
```

---

## Things to keep in mind

- Never manually change schema in a running DB without adding a migration file
- Never edit old migration files after they’ve been merged
- Always pull latest changes before you start
- All schema changes must be committed to Git

---

## Common Commands

Stop DB:

```bash
docker compose down
```

Open a psql shell inside the container:

```bash
docker exec -it cattlecoin-db psql -U cattlecoin -d cattlecoin
```

Apply a single migration manually:

```bash
docker exec -i cattlecoin-db psql -U cattlecoin -d cattlecoin < BackEnd/Database/migrations/001_init.sql
```
