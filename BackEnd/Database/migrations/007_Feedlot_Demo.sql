-- =============================================================================
-- 007_Feedlot_Demo.sql
-- Fixes the live database after 006_Feedlot.sql set all herds to 'listed' with
-- NULL investor_pct. This migration:
--   1. Drops the old marketplace_herds view (can't ALTER column names in-place)
--   2. Resets 5 herds to feedlot_status='pending'
--   3. Removes investor ownership for pending herds
--   4. Sets investor_pct for the 15 listed herds
--   5. Assigns feedlot_user_id to each listed herd
--   6. Caps tokens_sold at investor_allocation
--   7. Syncs purchase_status
--   8. Recreates marketplace_herds view with investor_pct columns
-- =============================================================================

BEGIN;

-- ── 1. Drop old view before we add new columns to it ─────────────────────────
DROP VIEW IF EXISTS marketplace_herds;

-- ── 2. Reset 5 herds to pending ───────────────────────────────────────────────
UPDATE herds
SET feedlot_status  = 'pending',
    feedlot_user_id = NULL,
    investor_pct    = NULL,
    last_updated    = NOW()
WHERE herd_name IN (
    'Red Angus Yearling B',
    'Simmental Yearling B',
    'Brangus Yearling B',
    'Brahman Select A',
    'Hereford Select B'
);

-- ── 3. Remove investor ownership + zero tokens_sold for pending herds ─────────
DELETE FROM ownership
WHERE pool_id IN (
    SELECT tp.pool_id
    FROM token_pools tp
    JOIN herds h ON h.herd_id = tp.herd_id
    WHERE h.feedlot_status = 'pending'
);

UPDATE herds SET tokens_sold = 0
WHERE feedlot_status = 'pending';

-- ── 4. Set investor_pct for the 15 listed herds ───────────────────────────────
UPDATE herds SET investor_pct = 75 WHERE herd_name = 'Angus Prime Herd A';
UPDATE herds SET investor_pct = 40 WHERE herd_name = 'Angus Reserve B';
UPDATE herds SET investor_pct = 95 WHERE herd_name = 'Black Angus Feeders C';
UPDATE herds SET investor_pct = 85 WHERE herd_name = 'Angus Finishing D';
UPDATE herds SET investor_pct = 50 WHERE herd_name = 'Red Angus Select A';
UPDATE herds SET investor_pct = 45 WHERE herd_name = 'Red Angus Yearling C';
UPDATE herds SET investor_pct = 70 WHERE herd_name = 'Hereford Prime A';
UPDATE herds SET investor_pct = 60 WHERE herd_name = 'Hereford Grassfed C';
UPDATE herds SET investor_pct = 65 WHERE herd_name = 'Simmental Prime A';
UPDATE herds SET investor_pct = 90 WHERE herd_name = 'Wagyu A5 Reserve A';
UPDATE herds SET investor_pct = 80 WHERE herd_name = 'Wagyu F1 Select B';
UPDATE herds SET investor_pct = 95 WHERE herd_name = 'Wagyu Cross C';
UPDATE herds SET investor_pct = 55 WHERE herd_name = 'Brangus Prime A';
UPDATE herds SET investor_pct = 75 WHERE herd_name = 'Charolais Prime A';
UPDATE herds SET investor_pct = 70 WHERE herd_name = 'Charolais Feeders B';

-- ── 5. Assign feedlot users to listed herds ───────────────────────────────────
UPDATE herds SET feedlot_user_id = (SELECT user_id FROM users WHERE slug='feedlot1' LIMIT 1)
WHERE herd_name IN ('Angus Prime Herd A','Angus Finishing D','Wagyu A5 Reserve A','Brangus Prime A','Charolais Prime A');

UPDATE herds SET feedlot_user_id = (SELECT user_id FROM users WHERE slug='feedlot2' LIMIT 1)
WHERE herd_name IN ('Angus Reserve B','Red Angus Select A','Hereford Prime A','Wagyu F1 Select B','Charolais Feeders B');

UPDATE herds SET feedlot_user_id = (SELECT user_id FROM users WHERE slug='feedlot3' LIMIT 1)
WHERE herd_name IN ('Black Angus Feeders C','Red Angus Yearling C','Hereford Grassfed C','Simmental Prime A','Wagyu Cross C');

-- ── 6. Cap tokens_sold at investor_allocation ────────────────────────────────
UPDATE herds h
SET tokens_sold = LEAST(
    h.tokens_sold,
    FLOOR(tp.total_supply * h.investor_pct / 100.0)::BIGINT
)
FROM token_pools tp
WHERE tp.herd_id = h.herd_id
  AND h.feedlot_status = 'listed'
  AND h.investor_pct IS NOT NULL;

-- ── 7. Sync purchase_status ───────────────────────────────────────────────────
UPDATE herds h
SET purchase_status = CASE
    WHEN h.tokens_sold >= FLOOR(tp.total_supply * h.investor_pct / 100.0)::BIGINT
        THEN 'sold'
    ELSE 'available'
END
FROM token_pools tp
WHERE tp.herd_id = h.herd_id
  AND h.feedlot_status = 'listed'
  AND h.investor_pct IS NOT NULL;

-- ── 8. Recreate marketplace_herds view with investor_pct support ──────────────
CREATE VIEW marketplace_herds AS
SELECT
  h.herd_id,
  h.herd_name,
  h.listing_price,
  h.purchase_status,
  h.dominant_stage,
  h.breed_code,
  h.verified_flag,
  h.risk_score,
  h.investor_pct,
  h.feedlot_user_id,
  tp.total_supply,
  FLOOR(tp.total_supply * COALESCE(h.investor_pct, 100) / 100.0)::BIGINT AS investor_allocation,
  h.tokens_sold,
  GREATEST(0,
    FLOOR(tp.total_supply * COALESCE(h.investor_pct, 100) / 100.0)::BIGINT - h.tokens_sold
  ) AS investor_tokens_remaining
FROM herds h
JOIN token_pools tp ON tp.herd_id = h.herd_id
WHERE h.feedlot_status = 'listed';

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT herd_name, feedlot_status, investor_pct, tokens_sold, purchase_status
FROM herds
ORDER BY feedlot_status DESC, herd_name;

SELECT herd_name, investor_pct, total_supply, investor_allocation,
       tokens_sold, investor_tokens_remaining
FROM marketplace_herds
ORDER BY herd_name;
