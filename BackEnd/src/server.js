import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import poolsRoutes from "./routes/pools.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/pools", poolsRoutes);


app.get("/api/health", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json({
    status: "ok",
    dbTime: result.rows[0],
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});