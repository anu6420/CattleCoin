import express from "express";
import pool from "../db.js";

const router = express.Router();

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Query params: ?role=investor|rancher|feedlot|admin
// Returns minimal public info (no password_hash)
router.get("/", async (req, res) => {
  try {
    const { role } = req.query;
    const validRoles = ["investor", "rancher", "feedlot", "admin"];

    let query = "SELECT user_id, slug, role, email FROM users";
    const params = [];

    if (role) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
      }
      query += " WHERE role = $1::user_role";
      params.push(role);
    }

    query += " ORDER BY slug";

    const result = await pool.query(query, params);
    res.json(result.rows.map((r) => ({
      userId: r.user_id,
      slug:   r.slug,
      role:   r.role,
      email:  r.email,
    })));
  } catch (err) {
    console.error("GET /api/users error:", err.message);
    res.status(500).json({ error: "Failed to fetch users", detail: err.message });
  }
});

export default router;
