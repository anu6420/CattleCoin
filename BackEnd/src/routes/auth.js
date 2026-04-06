import express from "express";
import pool from "../db.js";

const router = express.Router();

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { username: string, password: string }
//   username = user's slug
//   password = slug (seed users) OR the password set during signup
//
// Auth priority (no bcrypt yet — Google OAuth coming later):
//   1. password matches stored password_hash directly  (signup users)
//   2. password matches slug                           (seed / demo users)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT user_id, slug, role, email, password_hash FROM users WHERE slug = $1",
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Check password: real signup password first, then slug fallback for seed data
    const passwordOk =
      password === user.password_hash ||   // signup users (stored as plaintext for now)
      password === user.slug;              // seed/demo users (password = slug)

    if (!passwordOk) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
      userId: user.user_id,
      slug:   user.slug,
      role:   user.role,
      email:  user.email,
    });
  } catch (err) {
    console.error("POST /api/auth/login error:", err.message);
    res.status(500).json({ error: "Login failed", detail: err.message });
  }
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
// Body: { username, email, password, role }
//   role must be one of: investor | rancher | feedlot  (no admin self-signup)
//   username becomes the slug
//   password stored as-is for now (Google OAuth replaces this later)
router.post("/signup", async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: "username, email, password, and role are required" });
  }

  const allowedRoles = ["investor", "rancher", "feedlot"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      error: `Invalid role. Allowed values: ${allowedRoles.join(", ")}`,
    });
  }

  const slug = username.trim().toLowerCase().replace(/\s+/g, "_");

  try {
    // Check for duplicate slug or email
    const existing = await pool.query(
      "SELECT user_id FROM users WHERE slug = $1 OR email = $2",
      [slug, email.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Username or email already taken" });
    }

    const result = await pool.query(
      `INSERT INTO users (role, email, password_hash, slug)
       VALUES ($1::user_role, $2, $3, $4)
       RETURNING user_id, slug, role, email`,
      [role, email.trim(), password, slug]
    );

    const user = result.rows[0];
    res.status(201).json({
      userId: user.user_id,
      slug:   user.slug,
      role:   user.role,
      email:  user.email,
    });
  } catch (err) {
    console.error("POST /api/auth/signup error:", err.message);
    res.status(500).json({ error: "Sign up failed", detail: err.message });
  }
});

export default router;
