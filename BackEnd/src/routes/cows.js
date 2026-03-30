import express from "express";
import pool from "../db.js";

const router = express.Router();

// ─── GET /api/cows/:cowId ────────────────────────────────────────────────────
router.get("/:cowId", async (req, res) => {
  try {
    const { cowId } = req.params;

    // Validate numeric id
    const animalId = parseInt(cowId, 10);
    if (isNaN(animalId)) {
      return res.status(400).json({ error: "Invalid cow ID" });
    }

    // ── Base animal row ────────────────────────────────────────────────────
    const animalResult = await pool.query(
      `SELECT
         a.animal_id, a.herd_id, a.registration_number, a.official_id,
         a.animal_name, a.breed_code, a.sex_code, a.birth_date,
         a.sire_registration_number, a.dam_registration_number,
         a.is_genomic_enhanced, a.created_at,
         h.dominant_stage, h.verified_flag AS herd_verified,
         h.listing_price, h.head_count
       FROM animals a
       JOIN herds h ON h.herd_id = a.herd_id
       WHERE a.animal_id = $1`,
      [animalId]
    );

    if (animalResult.rows.length === 0) {
      return res.status(404).json({ error: "Cow not found" });
    }

    const a = animalResult.rows[0];

    // ── Latest weight ──────────────────────────────────────────────────────
    const latestWeightRes = await pool.query(
      `SELECT weight_lbs FROM animal_weights WHERE animal_id = $1
       ORDER BY weight_date DESC LIMIT 1`,
      [animalId]
    );
    const weightLbs = parseFloat(latestWeightRes.rows[0]?.weight_lbs) || 700;

    // ── Latest valuation ──────────────────────────────────────────────────
    const latestValRes = await pool.query(
      `SELECT fair_value FROM cow_valuation WHERE cow_id = $1
       ORDER BY valuation_date DESC LIMIT 1`,
      [animalId]
    );
    const baseCost =
      parseFloat(a.listing_price) / Math.max(parseInt(a.head_count, 10), 1);
    const totalValue = parseFloat(latestValRes.rows[0]?.fair_value) || Math.round(baseCost * 1.4);

    // ── Verified ───────────────────────────────────────────────────────────
    const verifiedRes = await pool.query(
      `SELECT EXISTS(
         SELECT 1 FROM animal_health_programs
         WHERE animal_id = $1 AND verified_flag = true
       ) AS verified`,
      [animalId]
    );
    const verified = Boolean(verifiedRes.rows[0]?.verified);

    const stage = a.dominant_stage || "RANCH";
    const health = verified ? "On Track" : "Watch";

    const cow = {
      cowId: a.animal_id.toString(),
      herdId: a.herd_id,
      registrationNumber: a.registration_number || "",
      officialId: a.official_id || "",
      animalName: a.animal_name || `Animal ${a.animal_id}`,
      breedCode: a.breed_code || "AN",
      sexCode: a.sex_code || "S",
      birthDate: a.birth_date
        ? new Date(a.birth_date).toISOString().split("T")[0]
        : "",
      sireRegistrationNumber: a.sire_registration_number || "",
      damRegistrationNumber: a.dam_registration_number || "",
      isGenomicEnhanced: Boolean(a.is_genomic_enhanced),
      createdAt: new Date(a.created_at).toISOString(),

      stage,
      weightLbs,
      health,
      daysInStage: Math.floor(Math.random() * 45) + 3,
      costToDateUsd: Math.round(baseCost * 0.85),
      totalValue,
      verified,
    };

    // ── Weight history ─────────────────────────────────────────────────────
    const weightsRes = await pool.query(
      `SELECT weight_id, animal_id, weight_date, weight_lbs, weight_type, location_code
       FROM animal_weights WHERE animal_id = $1
       ORDER BY weight_date ASC`,
      [animalId]
    );
    const weights = weightsRes.rows.map((w) => ({
      weightId: parseInt(w.weight_id, 10),
      cowId: w.animal_id.toString(),
      weightDate: new Date(w.weight_date).toISOString().split("T")[0],
      weightLbs: parseFloat(w.weight_lbs),
      weightType: w.weight_type || "sale",
      locationCode: w.location_code || "",
    }));

    // ── EPDs ───────────────────────────────────────────────────────────────
    const epdsRes = await pool.query(
      `SELECT ae.animal_epd_id, ae.animal_id, ae.trait_code,
              ae.epd_value, ae.accuracy, ae.percentile_rank,
              er.evaluation_date
       FROM animal_epds ae
       JOIN epd_runs er ON er.epd_run_id = ae.epd_run_id
       WHERE ae.animal_id = $1
       ORDER BY er.evaluation_date DESC`,
      [animalId]
    );
    const epds = epdsRes.rows.map((e) => ({
      cowEpdId: parseInt(e.animal_epd_id, 10),
      cowId: e.animal_id.toString(),
      traitCode: e.trait_code,
      epdValue: parseFloat(e.epd_value) || 0,
      accuracy: parseFloat(e.accuracy) || 0,
      percentileRank: parseFloat(e.percentile_rank) || 0,
      evaluationDate: new Date(e.evaluation_date).toISOString().split("T")[0],
    }));

    // ── Health records ─────────────────────────────────────────────────────
    // Join vaccinations + health programs into the CowHealthRecord shape
    const healthRes = await pool.query(
      `SELECT
         av.animal_vacc_id AS health_record_id,
         av.animal_id,
         v.vaccine_name,
         av.administration_date,
         hp.program_name AS health_program_name,
         ahp.certification_number,
         ahp.verified_flag
       FROM animal_vaccinations av
       JOIN vaccines v ON v.vaccine_id = av.vaccine_id
       LEFT JOIN animal_health_programs ahp ON ahp.animal_id = av.animal_id
       LEFT JOIN health_programs hp ON hp.health_program_id = ahp.health_program_id
       WHERE av.animal_id = $1
       ORDER BY av.administration_date DESC`,
      [animalId]
    );
    const healthRecords = healthRes.rows.map((h) => ({
      healthRecordId: parseInt(h.health_record_id, 10),
      cowId: h.animal_id.toString(),
      vaccineName: h.vaccine_name || "",
      administrationDate: new Date(h.administration_date).toISOString().split("T")[0],
      healthProgramName: h.health_program_name || "General Health",
      certificationNumber: h.certification_number || "",
      verifiedFlag: Boolean(h.verified_flag),
    }));

    // ── Valuations ─────────────────────────────────────────────────────────
    const valsRes = await pool.query(
      `SELECT valuation_id, cow_id, valuation_date,
              genetics_score, health_score, certification_score,
              fair_value, valuation_method_version
       FROM cow_valuation WHERE cow_id = $1
       ORDER BY valuation_date ASC`,
      [animalId]
    );
    const valuations = valsRes.rows.map((v) => ({
      valuationId: parseInt(v.valuation_id, 10),
      cowId: v.cow_id.toString(),
      valuationDate: new Date(v.valuation_date).toISOString(),
      geneticsScore: parseFloat(v.genetics_score) || 0,
      healthScore: parseFloat(v.health_score) || 0,
      weightScore: 70, // not in schema separately; use placeholder
      certificationScore: parseFloat(v.certification_score) || 0,
      totalValue: parseFloat(v.fair_value) || totalValue,
      valuationMethodVersion: v.valuation_method_version || "v1.0",
    }));

    res.json({ cow, weights, epds, healthRecords, valuations });
  } catch (err) {
    console.error("GET /api/cows/:cowId", err.message);
    res.status(500).json({ error: "Failed to fetch cow detail" });
  }
});

export default router;