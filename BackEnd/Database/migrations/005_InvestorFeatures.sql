-- =============================================================================
-- 005_InvestorFeatures.sql  (FIXED)
-- Adds: tokens_sold, risk_score, user slug, marketplace view.
-- Run AFTER 001, 002, 004.
-- =============================================================================

-- ── 1. Add tokens_sold + risk_score to herds ─────────────────────────────────
ALTER TABLE herds
  ADD COLUMN IF NOT EXISTS tokens_sold BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_score  INT    DEFAULT NULL;

-- ── 2. Add slug to users ──────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS slug VARCHAR(60) UNIQUE;

UPDATE users
SET slug = LOWER(SPLIT_PART(email, '@', 1))
WHERE role = 'investor' AND slug IS NULL;

-- ── 3. tokens_sold back-fill ──────────────────────────────────────────────────
UPDATE herds h
SET tokens_sold = COALESCE((
  SELECT SUM(o.token_amount)
  FROM ownership o
  JOIN token_pools tp ON tp.pool_id = o.pool_id
  WHERE tp.herd_id = h.herd_id
), 0);

-- ── 4. purchase_status: data-driven from tokens ───────────────────────────────
UPDATE herds h
SET purchase_status = 'sold'
FROM token_pools tp
WHERE tp.herd_id = h.herd_id
  AND h.tokens_sold >= tp.total_supply;

UPDATE herds h
SET purchase_status = 'available'
FROM token_pools tp
WHERE tp.herd_id = h.herd_id
  AND h.tokens_sold < tp.total_supply
  AND h.purchase_status <> 'pending';

-- ── 5. Compute risk_score (INT, no SMALLINT truncation) ───────────────────────
-- Formula: 100 - genetics*0.35 - health*0.35 - cert*0.15 - stage_progress*0.15
-- Higher score = higher risk. Range 0-100.
UPDATE herds h
SET risk_score = sub.score
FROM (
  SELECT
    h2.herd_id,
    GREATEST(0, LEAST(100,
      CAST(ROUND(
        100.0
        - COALESCE((
            SELECT AVG(cv.genetics_score)
            FROM cow_valuation cv
            JOIN animals a ON a.animal_id = cv.cow_id
            WHERE a.herd_id = h2.herd_id
          ), 50.0) * 0.35
        - COALESCE((
            SELECT AVG(cv.health_score)
            FROM cow_valuation cv
            JOIN animals a ON a.animal_id = cv.cow_id
            WHERE a.herd_id = h2.herd_id
          ), 50.0) * 0.35
        - COALESCE((
            SELECT AVG(cv.certification_score)
            FROM cow_valuation cv
            JOIN animals a ON a.animal_id = cv.cow_id
            WHERE a.herd_id = h2.herd_id
          ), 0.0) * 0.15
        - (CASE h2.dominant_stage
             WHEN 'RANCH'         THEN 0.00
             WHEN 'BACKGROUNDING' THEN 0.25
             WHEN 'FEEDLOT'       THEN 0.55
             WHEN 'PROCESSING'    THEN 0.80
             WHEN 'DISTRIBUTION'  THEN 1.00
             ELSE 0.00
           END) * 100.0 * 0.15
      , 0) AS INT)
    )) AS score
  FROM herds h2
) sub
WHERE h.herd_id = sub.herd_id;

-- ── 6. Marketplace view ───────────────────────────────────────────────────────
CREATE OR REPLACE VIEW marketplace_herds AS
SELECT
  h.herd_id, h.herd_name, h.listing_price, h.purchase_status,
  h.dominant_stage, h.breed_code, h.verified_flag, h.risk_score,
  tp.total_supply, h.tokens_sold,
  (tp.total_supply - h.tokens_sold) AS tokens_remaining
FROM herds h
JOIN token_pools tp ON tp.herd_id = h.herd_id
WHERE h.tokens_sold < tp.total_supply;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT herd_name, dominant_stage, risk_score, tokens_sold, purchase_status
FROM herds
ORDER BY dominant_stage, herd_name;

SELECT slug, email FROM users WHERE role = 'investor' ORDER BY email;
