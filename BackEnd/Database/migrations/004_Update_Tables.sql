-- =============================================================================
-- 004_Update_Tables.sql  (FIXED)
-- Adds UI/API columns to herds and back-fills them correctly from seed data.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS throughout.
-- =============================================================================

ALTER TABLE herds
  ADD COLUMN IF NOT EXISTS dominant_stage VARCHAR(30) DEFAULT 'RANCH',
  ADD COLUMN IF NOT EXISTS breed_code     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS season         VARCHAR(20) DEFAULT 'Fall',
  ADD COLUMN IF NOT EXISTS cohort_label   VARCHAR(120);

-- ── Back-fill dominant_stage from known herd names (matches seed.py exactly) ─
UPDATE herds SET dominant_stage = 'FEEDLOT'       WHERE herd_name = 'Angus Prime Herd A';
UPDATE herds SET dominant_stage = 'BACKGROUNDING' WHERE herd_name = 'Angus Reserve B';
UPDATE herds SET dominant_stage = 'PROCESSING'    WHERE herd_name = 'Black Angus Feeders C';
UPDATE herds SET dominant_stage = 'FEEDLOT'       WHERE herd_name = 'Angus Finishing D';
UPDATE herds SET dominant_stage = 'BACKGROUNDING' WHERE herd_name = 'Red Angus Select A';
UPDATE herds SET dominant_stage = 'RANCH'         WHERE herd_name = 'Red Angus Yearling B';
UPDATE herds SET dominant_stage = 'BACKGROUNDING' WHERE herd_name = 'Red Angus Yearling C';
UPDATE herds SET dominant_stage = 'FEEDLOT'       WHERE herd_name = 'Hereford Prime A';
UPDATE herds SET dominant_stage = 'BACKGROUNDING' WHERE herd_name = 'Hereford Select B';
UPDATE herds SET dominant_stage = 'RANCH'         WHERE herd_name = 'Hereford Grassfed C';
UPDATE herds SET dominant_stage = 'FEEDLOT'       WHERE herd_name = 'Simmental Prime A';
UPDATE herds SET dominant_stage = 'BACKGROUNDING' WHERE herd_name = 'Simmental Yearling B';
UPDATE herds SET dominant_stage = 'FEEDLOT'       WHERE herd_name = 'Wagyu A5 Reserve A';
UPDATE herds SET dominant_stage = 'FEEDLOT'       WHERE herd_name = 'Wagyu F1 Select B';
UPDATE herds SET dominant_stage = 'PROCESSING'    WHERE herd_name = 'Wagyu Cross C';
UPDATE herds SET dominant_stage = 'RANCH'         WHERE herd_name = 'Brahman Select A';
UPDATE herds SET dominant_stage = 'BACKGROUNDING' WHERE herd_name = 'Brangus Prime A';
UPDATE herds SET dominant_stage = 'RANCH'         WHERE herd_name = 'Brangus Yearling B';
UPDATE herds SET dominant_stage = 'FEEDLOT'       WHERE herd_name = 'Charolais Prime A';
UPDATE herds SET dominant_stage = 'FEEDLOT'       WHERE herd_name = 'Charolais Feeders B';

-- Fallback: anything still NULL or defaulted gets RANCH
UPDATE herds SET dominant_stage = 'RANCH' WHERE dominant_stage IS NULL;

-- ── Back-fill breed_code from herd_name ──────────────────────────────────────
UPDATE herds SET breed_code = 'BA'  WHERE breed_code IS NULL AND herd_name ILIKE '%black angus%';
UPDATE herds SET breed_code = 'RA'  WHERE breed_code IS NULL AND herd_name ILIKE '%red angus%';
UPDATE herds SET breed_code = 'AN'  WHERE breed_code IS NULL AND herd_name ILIKE '%angus%';
UPDATE herds SET breed_code = 'HH'  WHERE breed_code IS NULL AND herd_name ILIKE '%hereford%';
UPDATE herds SET breed_code = 'WA'  WHERE breed_code IS NULL AND herd_name ILIKE '%wagyu%';
UPDATE herds SET breed_code = 'BR'  WHERE breed_code IS NULL AND herd_name ILIKE '%brahman%';
UPDATE herds SET breed_code = 'CH'  WHERE breed_code IS NULL AND herd_name ILIKE '%charolais%';
UPDATE herds SET breed_code = 'SM'  WHERE breed_code IS NULL AND herd_name ILIKE '%simmental%';
UPDATE herds SET breed_code = 'BN'  WHERE breed_code IS NULL AND herd_name ILIKE '%brangus%';
UPDATE herds SET breed_code = 'AN'  WHERE breed_code IS NULL; -- fallback

-- ── Back-fill cohort_label from season + breed_code ──────────────────────────
UPDATE herds SET season = 'Spring' WHERE herd_name ILIKE '%yearling%' OR herd_name ILIKE '%select%';
UPDATE herds SET season = 'Fall'   WHERE season IS NULL;

UPDATE herds
SET cohort_label = season || ' 2025 — ' || COALESCE(breed_code, 'Cattle')
WHERE cohort_label IS NULL;

-- Verify
SELECT herd_name, dominant_stage, breed_code, season FROM herds ORDER BY dominant_stage, herd_name;
