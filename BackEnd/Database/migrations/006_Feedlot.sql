-- =============================================================================
-- 006_Feedlot.sql
-- Adds feedlot actor to the flow:
--   Rancher lists herd → Feedlot claims herd + sets investor_pct → Investor buys
--
-- Changes:
--   1. Add 'feedlot' to user_role enum
--   2. Add feedlot_user_id, investor_pct, feedlot_status columns to herds
--   3. Seed feedlot users
--   4. Set existing herds to feedlot_status = 'listed' (preserves existing data)
-- =============================================================================

-- 1. Extend user_role enum with 'feedlot'
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'feedlot';
EXCEPTION WHEN others THEN NULL; END $$;

-- 2. Add feedlot columns to herds
--    feedlot_status: 'pending' (rancher listed, no feedlot yet)
--                   'listed'  (feedlot claimed + set investor_pct, visible to investors)
--                   'sold'    (all investor tokens sold)
ALTER TABLE herds
  ADD COLUMN IF NOT EXISTS feedlot_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS investor_pct    DECIMAL(5,2) DEFAULT NULL
    CHECK (investor_pct IS NULL OR (investor_pct > 0 AND investor_pct <= 100)),
  ADD COLUMN IF NOT EXISTS feedlot_status  VARCHAR(20) DEFAULT 'pending'
    CHECK (feedlot_status IN ('pending', 'listed', 'sold'));

CREATE INDEX IF NOT EXISTS ix_herds_feedlot_status ON herds (feedlot_status);
CREATE INDEX IF NOT EXISTS ix_herds_feedlot_user   ON herds (feedlot_user_id);

-- 3. Seed feedlot users (slug stored in a separate column for easy lookup)
--    Add slug column to users if not present
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS slug VARCHAR(60) UNIQUE;

INSERT INTO users (role, email, password_hash, slug)
VALUES
  ('feedlot', 'feedlot1@cattlecoin.dev', 'placeholder_hash', 'feedlot1'),
  ('feedlot', 'feedlot2@cattlecoin.dev', 'placeholder_hash', 'feedlot2'),
  ('feedlot', 'feedlot3@cattlecoin.dev', 'placeholder_hash', 'feedlot3')
ON CONFLICT (email) DO NOTHING;

-- Also back-fill slug for existing investor/rancher users if missing
UPDATE users SET slug = 'investor1' WHERE email = 'investor1@cattlecoin.dev' AND slug IS NULL;
UPDATE users SET slug = 'investor2' WHERE email = 'investor2@cattlecoin.dev' AND slug IS NULL;
UPDATE users SET slug = 'investor3' WHERE email = 'investor3@cattlecoin.dev' AND slug IS NULL;
UPDATE users SET slug = 'investor4' WHERE email = 'investor4@cattlecoin.dev' AND slug IS NULL;
UPDATE users SET slug = 'investor5' WHERE email = 'investor5@cattlecoin.dev' AND slug IS NULL;

-- 4. Mark all existing herds as 'listed' so they remain visible in the investor
--    marketplace (existing demo data was created before the feedlot step existed)
UPDATE herds
SET feedlot_status = 'listed'
WHERE feedlot_status IS NULL OR feedlot_status = 'pending';

-- Verify
SELECT herd_name, feedlot_status, investor_pct FROM herds ORDER BY herd_name;
