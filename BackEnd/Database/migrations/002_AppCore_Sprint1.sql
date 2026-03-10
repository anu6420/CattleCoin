-- ERD (User, Herd, Cow, TokenPool, Ownership, Transaction,
-- CowHealth, CowValuation) while reusing Greg's tables from 001.
--
-- Tables that already exist (001): animals, animal_weights, epd_traits, epd_runs,
-- animal_epds, vaccines, animal_vaccinations, health_programs, animal_health_programs,
-- value_add_programs, animal_value_add_programs
--
-- "Cow" in ERD maps to client table "animals".

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('investor', 'rancher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('buy', 'sell', 'mint', 'redeem');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User (ERD: User)

CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          user_role NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  wallet_address VARCHAR(120),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Herd (ERD: Herd)

CREATE TABLE IF NOT EXISTS herds (
  herd_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rancher_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  listing_price  DECIMAL(12,2),   -- ERD: listing_price
  purchase_status VARCHAR(60),    -- ERD: purchase_status

  -- UI-friendly fields
  herd_name      VARCHAR(120),
  head_count     INT DEFAULT 0 CHECK (head_count >= 20),
  verified_flag  BOOLEAN NOT NULL DEFAULT FALSE,
  last_updated   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_herds_rancher
ON herds (rancher_id);

-- Cow (ERD: Cow) -> maps to Greg's table "animals"
-- Add herd_id FK to animals so it matches ERD: cow.herd_id -> herd.herd_id

ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS herd_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name      = 'animals'
      AND tc.constraint_name = 'fk_animals_herd_id'
  ) THEN
    ALTER TABLE animals
      ADD CONSTRAINT fk_animals_herd_id
      FOREIGN KEY (herd_id) REFERENCES herds(herd_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_animals_herd
ON animals (herd_id);

-- TokenPool (ERD: TokenPool) - 1 Herd = 1 Pool (UNIQ)

CREATE TABLE IF NOT EXISTS token_pools (
  pool_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  herd_id          UUID NOT NULL UNIQUE REFERENCES herds(herd_id) ON DELETE CASCADE,
  total_supply     BIGINT NOT NULL CHECK (total_supply >= 0),
  contract_address VARCHAR(120),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_token_pools_herd
ON token_pools (herd_id);

-- Ownership (ERD: Ownership junction) - User <-> TokenPool (M:N)

CREATE TABLE IF NOT EXISTS ownership (
  ownership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(user_id)       ON DELETE CASCADE,
  pool_id      UUID NOT NULL REFERENCES token_pools(pool_id) ON DELETE CASCADE,

  token_amount BIGINT NOT NULL CHECK (token_amount >= 0),
  acquired_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (user_id, pool_id)
);

CREATE INDEX IF NOT EXISTS ix_ownership_user ON ownership (user_id);
CREATE INDEX IF NOT EXISTS ix_ownership_pool ON ownership (pool_id);

-- Transaction (ERD: Transaction audit)

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(user_id)       ON DELETE CASCADE,
  pool_id            UUID NOT NULL REFERENCES token_pools(pool_id) ON DELETE CASCADE,

  type               transaction_type NOT NULL,
  amount             DECIMAL(18,6) NOT NULL CHECK (amount > 0),
  status             VARCHAR(60),
  blockchain_tx_hash VARCHAR(120),

  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_transactions_user    ON transactions (user_id);
CREATE INDEX IF NOT EXISTS ix_transactions_pool    ON transactions (pool_id);
CREATE INDEX IF NOT EXISTS ix_transactions_created ON transactions (created_at);

-- CowHealth (ERD: CowHealth)
-- Greg's normalized vaccination/program tables in 001 hold the detail rows.
-- This table is the summary record that feeds the UI Health column.

CREATE TABLE IF NOT EXISTS cow_health (
  health_record_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cow_id             BIGINT NOT NULL REFERENCES animals(animal_id) ON DELETE CASCADE,

  vaccine_name       VARCHAR(120),
  administration_date DATE,

  health_program_name  VARCHAR(120),
  certification_number VARCHAR(80),

  verified_flag      BOOLEAN DEFAULT FALSE,

  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_cow_health_cow
ON cow_health (cow_id, created_at);

-- CowValuation (ERD: CowValuation)
-- Stores every score, every multiplier, and every price step for full audit trail.
-- Formula: fair_value = base_price_usd × grade_premium × quality_mult × sustainability_mult
--          listing_value = fair_value × 0.90  (10% investor discount)

CREATE TABLE IF NOT EXISTS cow_valuation (
  valuation_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cow_id                   BIGINT NOT NULL REFERENCES animals(animal_id) ON DELETE CASCADE,
  valuation_date           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Four locked scores (set at listing, never change)
  genetics_score           DECIMAL(12,4),  -- 0-100  EPD percentile composite
  health_score             DECIMAL(12,4),  -- 0-100  60% health + 40% weight
  sustainability_score     DECIMAL(12,4),  -- 0-100  50% planet (FCR/DOF) + 50% USRSB
  certification_score      DECIMAL(12,4),  -- 0-100  +18 pts per verified program

  -- Derived multipliers (stored for audit / transparency to investors)
  grade_premium            DECIMAL(8,6),   -- GP(G)   = 1 + 0.10×(G-50)/50, clip 0.95–1.10
  quality_mult             DECIMAL(8,6),   -- QM(H,C) = 0.95 + 0.20×H/100 + 0.10×C/100, clip 0.90–1.25
  sustainability_mult      DECIMAL(8,6),   -- SM(S)   = 0.92 + 0.20×S/100, clip 0.92–1.12

  -- Price chain (base updates at each stage; scores/multipliers stay locked)
  base_price_usd           DECIMAL(14,2),  -- USDA/AMS anchor: weight × $/cwt for this stage
  fair_value               DECIMAL(14,2),  -- base_price_usd × GP × QM × SM
  listing_value            DECIMAL(14,2),  -- fair_value × 0.90

  valuation_method_version VARCHAR(60),
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_cow_valuation_cow_date
ON cow_valuation (cow_id, valuation_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION BLOCK — only relevant when upgrading an existing database.
-- On a fresh install the CREATE TABLE above already has the correct schema.
-- Run this if cow_valuation already existed with the old weight_score column.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE cow_valuation
  ADD COLUMN IF NOT EXISTS sustainability_score  DECIMAL(12,4),
  ADD COLUMN IF NOT EXISTS grade_premium         DECIMAL(8,6),
  ADD COLUMN IF NOT EXISTS quality_mult          DECIMAL(8,6),
  ADD COLUMN IF NOT EXISTS sustainability_mult   DECIMAL(8,6),
  ADD COLUMN IF NOT EXISTS base_price_usd        DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS fair_value            DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS listing_value         DECIMAL(14,2),
  DROP COLUMN IF EXISTS weight_score;
