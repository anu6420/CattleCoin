import express from "express";
import pool from "../db.js";

const router = express.Router();

// ─── GET /api/invest/:herdId — fetch herd info for the buy form ───────────────
router.get("/:herdId", async (req, res) => {
  try {
    const { herdId } = req.params;
    const result = await pool.query(`
      SELECT
        h.herd_id, h.herd_name, h.listing_price, h.purchase_status,
        h.head_count, h.verified_flag, h.dominant_stage, h.breed_code,
        h.risk_score, h.tokens_sold, h.investor_pct, h.feedlot_status,
        tp.total_supply, tp.contract_address
      FROM herds h
      JOIN token_pools tp ON tp.herd_id = h.herd_id
      WHERE h.herd_id = $1 AND h.feedlot_status = 'listed'
    `, [herdId]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Herd not found or not yet available to investors" });
    const r = result.rows[0];

    const totalSupply = parseInt(r.total_supply, 10) || 0;
    const investorPct = r.investor_pct != null ? parseFloat(r.investor_pct) : null;
    const investorAllocation = investorPct != null
      ? Math.floor(totalSupply * investorPct / 100)
      : totalSupply;
    const tokensSold      = parseInt(r.tokens_sold, 10) || 0;
    const tokensAvailable = Math.max(0, investorAllocation - tokensSold);
    const pricePerToken   = totalSupply > 0
      ? Math.round((parseFloat(r.listing_price) || 0) / totalSupply * 100) / 100
      : 0;

    res.json({
      herdId: r.herd_id,
      herdName: r.herd_name || r.herd_id,
      purchaseStatus: r.purchase_status,
      listingPrice: parseFloat(r.listing_price) || 0,
      dominantStage: r.dominant_stage || "RANCH",
      breedCode: r.breed_code || "AN",
      riskScore: r.risk_score != null ? parseInt(r.risk_score, 10) : null,
      totalSupply,
      investorAllocation,
      investorPct,
      tokensSold,
      tokensAvailable,
      pricePerToken,
      contractAddress: r.contract_address || "",
      isAvailable: tokensAvailable > 0 && r.purchase_status !== "sold",
    });
  } catch (err) {
    console.error("GET /api/invest/:herdId", err.message);
    res.status(500).json({ error: "Failed to fetch herd for investment", detail: err.message });
  }
});

// ─── POST /api/invest — submit an investment ──────────────────────────────────
// Body: { herdId, investorSlug, tokensToBuy, walletAddress, fullName, email }
router.post("/", async (req, res) => {
  const { herdId, investorSlug, tokensToBuy, walletAddress, fullName, email } = req.body;
  if (!herdId || !tokensToBuy || tokensToBuy < 1) {
    return res.status(400).json({ error: "herdId and tokensToBuy (≥1) are required" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Resolve herd + pool (only allow investment in feedlot-listed herds)
    const herdRow = await client.query(`
      SELECT h.herd_id, h.purchase_status, h.tokens_sold, h.investor_pct,
             tp.pool_id, tp.total_supply
      FROM herds h
      JOIN token_pools tp ON tp.herd_id = h.herd_id
      WHERE h.herd_id = $1 AND h.feedlot_status = 'listed'
      FOR UPDATE
    `, [herdId]);

    if (herdRow.rows.length === 0) throw new Error("Herd not found or not yet available to investors");
    const hr = herdRow.rows[0];
    const totalSupply = parseInt(hr.total_supply, 10);
    const investorAllocation = hr.investor_pct != null
      ? Math.floor(totalSupply * parseFloat(hr.investor_pct) / 100)
      : totalSupply;
    const remaining = investorAllocation - parseInt(hr.tokens_sold, 10);
    if (remaining < tokensToBuy) {
      throw new Error(`Only ${remaining} investor tokens remaining`);
    }

    // Resolve or create user by slug (no-auth path)
    let userId;
    if (investorSlug) {
      const uRes = await client.query(
        "SELECT user_id FROM users WHERE slug = $1 AND role = 'investor'",
        [investorSlug]
      );
      if (uRes.rows.length > 0) userId = uRes.rows[0].user_id;
    }
    if (!userId && email) {
      const uRes = await client.query(
        "SELECT user_id FROM users WHERE email = $1",
        [email]
      );
      userId = uRes.rows[0]?.user_id;
    }
    if (!userId) {
      return res.status(400).json({ error: "Could not identify investor. Provide investorSlug or a known email." });
    }

    // Upsert ownership
    await client.query(`
      INSERT INTO ownership (user_id, pool_id, token_amount)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, pool_id)
      DO UPDATE SET token_amount = ownership.token_amount + EXCLUDED.token_amount
    `, [userId, hr.pool_id, tokensToBuy]);

    // Record transaction
    await client.query(`
      INSERT INTO transactions (user_id, pool_id, type, amount, status)
      VALUES ($1, $2, 'buy'::transaction_type, $3, 'confirmed')
    `, [userId, hr.pool_id, tokensToBuy]);

    // Increment tokens_sold on herd; mark sold when investor allocation exhausted
    const newTokensSold = parseInt(hr.tokens_sold, 10) + tokensToBuy;
    const newStatus = newTokensSold >= investorAllocation ? "sold" : hr.purchase_status;
    await client.query(`
      UPDATE herds SET tokens_sold = $1, purchase_status = $2 WHERE herd_id = $3
    `, [newTokensSold, newStatus, herdId]);

    await client.query("COMMIT");
    res.json({
      success: true,
      message: `Successfully purchased ${tokensToBuy} token(s) in ${hr.herd_id}.`,
      tokensRemaining: investorAllocation - newTokensSold,
      newStatus,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/invest", err.message);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
