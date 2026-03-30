import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import poolsRoutes from "./routes/pools.js";
import cowsRoutes from "./routes/cows.js";
import portfolioRoutes from "./routes/portfolio.js";
import investorsRoutes from "./routes/investors.js";
import investRoutes from "./routes/invest.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/pools", poolsRoutes);
app.use("/api/cows", cowsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/investors", investorsRoutes); // per-investor dashboard + holdings
app.use("/api/invest",    investRoutes);    // POST buy-tokens form

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", dbTime: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});