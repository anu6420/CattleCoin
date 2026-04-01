import express from "express";
import pool from "../db.js";

const router = express.Router();

const BREED_LABEL = {
  AN: "Angus AI Select", HH: "Hereford Registered", WA: "Wagyu F1 Cross",
  BR: "Brahman AI Select", BA: "Black Angus Premium AI", CH: "Charolais Fullblood",
  SM: "Simmental Registered AI", RA: "Red Angus AI Elite",
};

// ─── GET /api/portfolio ───────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const allStages = ["RANCH", "BACKGROUNDING", "FEEDLOT", "PROCESSING", "DISTRIBUTION"];

    // Check if ownership records exist
    const ownershipCheck = await pool.query("SELECT COUNT(*) FROM ownership");
    const hasOwnership = parseInt(ownershipCheck.rows[0].count, 10) > 0;

    // Build herd query — scoped to investor-owned herds if ownership exists
    const herdFilter = hasOwnership
      ? `WHERE h.herd_id IN (
           SELECT DISTINCT tp2.herd_id
           FROM ownership o
           JOIN token_pools tp2 ON tp2.pool_id = o.pool_id
           JOIN users u ON u.user_id = o.user_id
           WHERE u.role = 'investor'
         )`
      : "";

    const herdsRes = await pool.query(`
      SELECT
        h.herd_id, h.rancher_id, h.herd_name, h.listing_price, h.purchase_status,
        h.head_count, h.verified_flag, h.last_updated, h.cohort_label, h.season,
        h.breed_code, h.dominant_stage,
        tp.pool_id, tp.total_supply, tp.contract_address,
        COALESCE(
          (
            SELECT SUM(latest.fair_value)
            FROM animals a
            CROSS JOIN LATERAL (
              SELECT cv.fair_value
              FROM cow_valuation cv
              WHERE cv.cow_id = a.animal_id
              ORDER BY cv.valuation_date DESC
              LIMIT 1
            ) latest
            WHERE a.herd_id = h.herd_id
          ),
          h.listing_price * 1.25
        ) AS position_value_usd
      FROM herds h
      LEFT JOIN token_pools tp ON tp.herd_id = h.herd_id
      ${herdFilter}
      ORDER BY h.last_updated DESC
    `);

    // Get investor token amounts per herd
    let tokenAmounts = {};
    if (hasOwnership) {
      const taRes = await pool.query(`
        SELECT tp.herd_id, SUM(o.token_amount)::int AS total_tokens
        FROM ownership o
        JOIN token_pools tp ON tp.pool_id = o.pool_id
        JOIN users u ON u.user_id = o.user_id
        WHERE u.role = 'investor'
        GROUP BY tp.herd_id
      `);
      taRes.rows.forEach((r) => {
        tokenAmounts[r.herd_id] = r.total_tokens;
      });
    }

    const pools = herdsRes.rows.map((r) => {
      const stage = r.dominant_stage || "RANCH";
      const lp = parseFloat(r.listing_price) || 0;
      const positionValueUsd = parseFloat(r.position_value_usd) || lp * 1.25;
      const expectedRevenueUsd = lp * 1.40;
      const tokenAmount = tokenAmounts[r.herd_id] ?? 20;

      return {
        id: r.herd_id,
        herdId: r.herd_id,
        rancherId: r.rancher_id || "",
        listingPrice: lp,
        purchaseStatus: r.purchase_status || "available",
        poolId: r.pool_id || "",
        totalSupply: parseInt(r.total_supply, 10) || 20,
        contractAddress: r.contract_address || "",
        tokenAmount,
        name: r.herd_name || r.herd_id,
        poolType: "herd",
        cohortLabel: r.cohort_label || null,
        geneticsLabel: BREED_LABEL[r.breed_code] ?? r.breed_code ?? "Unknown",
        season: r.season || "Fall",
        positionValueUsd,
        backingHerdCount: parseInt(r.head_count, 10) || 0,
        expectedRevenueUsd,
        netExpectedUsd: expectedRevenueUsd - lp,
        stageBreakdown: allStages.map((s) => ({ stage: s, pct: s === stage ? 100 : 0 })),
        dominantStage: stage,
        verified: Boolean(r.verified_flag),
        lastUpdateIso: r.last_updated
          ? new Date(r.last_updated).toISOString()
          : new Date().toISOString(),
      };
    });

    const portfolioValueUsd = pools.reduce((s, p) => s + p.positionValueUsd, 0);

    // 30-day history built from total portfolio value
    const history30d = Array.from({ length: 31 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (30 - i));
      const variance = 0.97 + (i / 30) * 0.06 + Math.sin(i * 0.4) * 0.01;
      return {
        dateIso: d.toISOString(),
        value: Math.round(portfolioValueUsd * variance),
      };
    });

    // Recent events from vaccinations across all investor-owned herds
    const eventsRes = await pool.query(`
      SELECT
        'ev-' || av.animal_vacc_id::text       AS id,
        a.herd_id                               AS pool_id,
        a.animal_id::text                       AS cow_id,
        COALESCE(h.dominant_stage, 'RANCH')     AS stage,
        h.verified_flag                          AS verified,
        av.administration_date::timestamptz      AS timestamp_iso,
        v.vaccine_name || ' administered'        AS note
      FROM animal_vaccinations av
      JOIN animals a  ON a.animal_id  = av.animal_id
      JOIN herds   h  ON h.herd_id    = a.herd_id
      JOIN vaccines v ON v.vaccine_id = av.vaccine_id
      ${hasOwnership ? `WHERE a.herd_id IN (
        SELECT DISTINCT tp2.herd_id
        FROM ownership o
        JOIN token_pools tp2 ON tp2.pool_id = o.pool_id
        JOIN users u ON u.user_id = o.user_id
        WHERE u.role = 'investor'
      )` : ""}
      ORDER BY av.administration_date DESC
      LIMIT 8
    `);

    const recentEvents = eventsRes.rows.map((e) => ({
      id: e.id,
      poolId: e.pool_id,
      cowId: e.cow_id,
      stage: e.stage,
      verified: Boolean(e.verified),
      timestampIso: new Date(e.timestamp_iso).toISOString(),
      note: e.note,
    }));

    const topPools = [...pools]
      .sort((a, b) => b.positionValueUsd - a.positionValueUsd)
      .slice(0, 5);

    res.json({
      asOfIso: new Date().toISOString(),
      portfolioValueUsd,
      change30dPct: 4.2,
      poolsHeld: pools.length,
      avgRisk: 55,
      history30d,
      recentEvents,
      topPools,
    });
  } catch (err) {
    console.error("GET /api/portfolio error:", err.message);
    res.status(500).json({ error: "Failed to fetch portfolio", detail: err.message });
  }
});

export default router;