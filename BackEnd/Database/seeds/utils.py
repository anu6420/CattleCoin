from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Optional, Dict

@dataclass
class AnimalMetrics:
    """
    Per-animal inputs for the valuation engine.

    base_price_usd: Real USDA/AMS market value for this animal at its
                    current stage (weight × $/cwt). Updated at each
                    stage transition; scores stay locked.
    """
    breed_code: str
    stage: str
    is_genomic_enhanced: bool
    percentile_rank: Optional[float]
    current_weight_lbs: Optional[float]
    harvest_weight_mid_lbs: float
    base_price_usd: float        # replaces price_per_lb — stage-anchored $/head
    num_cert_programs: int
    days_on_feed: Optional[float] = None   # for sustainability FCR proxy
    fcr_score: Optional[float] = None     # feed conversion ratio (lower = better)
    usrsb_score: Optional[float] = None   # 0-100 USRSB indicator score


# Stage → (completion_fraction, years_to_harvest)
STAGE_COMPLETION = {
    "ranch":         (0.35, 0.75),
    "backgrounding": (0.55, 0.50),
    "feedlot":       (0.90, 0.25),
    "processing":    (1.00, 0.05),
    "distribution":  (1.00, 0.05),
}

# Stage → target annual ROI
STAGE_TARGET_ROI = {
    "ranch":         0.18,
    "backgrounding": 0.16,
    "feedlot":       0.14,
    "processing":    0.12,
    "distribution":  0.12,
}


def _truncated_normal(mean: float, std_dev: float, low: float, high: float,
                      rng: random.Random) -> float:
    while True:
        x = rng.gauss(mean, std_dev)
        if low <= x <= high:
            return x


# ─────────────────────────────────────────────
# SCORE 1: Genetics → Grade Premium multiplier
# ─────────────────────────────────────────────

def calculate_genetics_score(
    percentile_rank: Optional[float],
    is_genomic_enhanced: bool,
    rng: Optional[random.Random] = None,
) -> float:
    """
    Genetics score 0-100 from EPD composite percentile.
    p=50 anchors near 55; genomic +6 pts.
    Skewed upward — listed animals start at ~60+.
    """
    if rng is None:
        rng = random
    p = max(0.0, min(100.0, percentile_rank or 60.0))
    base = 55.0 + 0.45 * (p - 50.0)
    if is_genomic_enhanced:
        base += 6.0
    return round(_truncated_normal(base, 3.0, 40.0, 99.0, rng), 4)


def grade_premium(genetics_score: float) -> float:
    """
    GP(G) = 1 + 0.10 × (G − 50) / 50, clipped to [0.95, 1.10].
    Better EPDs → higher Prime/Choice share → grid value premium.
    """
    gp = 1.0 + 0.10 * (genetics_score - 50.0) / 50.0
    return round(max(0.95, min(1.10, gp)), 6)


# ─────────────────────────────────────────────
# SCORE 2: Health & Weight → QM (health portion)
# ─────────────────────────────────────────────

def calculate_health_score(
    verified_herd: bool,
    current_weight_lbs: Optional[float],
    stage: str,
    harvest_weight_mid_lbs: float,
    rng: Optional[random.Random] = None,
) -> float:
    """
    Health & Weight score 0-100.
    60% health component (verified herd status, BQA, treatment history).
    40% weight component (current weight vs stage benchmark).
    Professor's note: weight must be included in health score.
    """
    if rng is None:
        rng = random

    # 60% health
    health_base = 92.0 if verified_herd else 78.0
    health_component = _truncated_normal(health_base, 4.0, 55.0, 99.0, rng)

    # 40% weight: how close is current weight to stage target?
    completion_target, _ = STAGE_COMPLETION.get(stage, (0.70, 0.50))
    if current_weight_lbs and harvest_weight_mid_lbs > 0:
        ideal = completion_target * harvest_weight_mid_lbs
        ratio = current_weight_lbs / ideal
        ratio = max(0.80, min(1.10, ratio))
        weight_component = 60.0 + 40.0 * (ratio - 1.0) / 0.10
        weight_component = max(55.0, min(99.0, weight_component))
    else:
        weight_component = 72.0   # neutral fallback

    combined = 0.60 * health_component + 0.40 * weight_component
    return round(max(40.0, min(99.0, combined)), 4)


# ─────────────────────────────────────────────
# SCORE 3: Sustainability (two-part)
# ─────────────────────────────────────────────

def calculate_sustainability_score(
    days_on_feed: Optional[float],
    fcr_score: Optional[float],
    usrsb_score: Optional[float],
    rng: Optional[random.Random] = None,
) -> float:
    """
    Sustainability score 0-100, two equal halves:

    Planet (50%): feed efficiency + days-to-market proxy.
        - Fewer days on feed and better FCR → lower lifetime methane.
        - Reference: Megha et al. MDPI 2025 / USRSB framework.

    USRSB (50%): land, water, animal welfare indicators (0-100 input).
        - Reference: USRSB standard indicator set.

    If inputs are missing, use conservative defaults.
    """
    if rng is None:
        rng = random

    # Planet sub-score (0-100): lower DOF and FCR = higher score
    if days_on_feed is not None:
        # Benchmark: 160 DOF = good, >220 = poor
        planet_dof = max(0.0, min(100.0, 100.0 - (days_on_feed - 120.0) / 1.0))
    else:
        planet_dof = 65.0

    if fcr_score is not None:
        # FCR 5.0 = excellent (score 90), 8.0 = poor (score 50)
        planet_fcr = max(0.0, min(100.0, 90.0 - (fcr_score - 5.0) * 13.3))
    else:
        planet_fcr = 65.0

    planet_sub = 0.5 * planet_dof + 0.5 * planet_fcr

    # USRSB sub-score (0-100 direct input)
    usrsb = usrsb_score if usrsb_score is not None else 65.0
    usrsb = max(0.0, min(100.0, usrsb))

    combined = 0.50 * planet_sub + 0.50 * usrsb
    return round(_truncated_normal(combined, 3.0, 40.0, 99.0, rng), 4)


def sustainability_multiplier(sustainability_score: float) -> float:
    """
    SM(S) = 0.92 + 0.20 × S/100, range [0.92, 1.12].
    """
    return round(0.92 + 0.20 * (sustainability_score / 100.0), 6)


# ─────────────────────────────────────────────
# SCORE 4: Certifications
# ─────────────────────────────────────────────

def calculate_certification_score(num_programs: int) -> float:
    """
    +18 pts per verified program (NHTC, GAP, Verified Natural, etc.), cap 100.
    """
    return round(min(100.0, 18.0 * max(0, num_programs)), 4)


# ─────────────────────────────────────────────
# COMBINED Quality Multiplier QM(H, C)
# ─────────────────────────────────────────────

def quality_multiplier(health_score: float, cert_score: float) -> float:
    """
    QM(H,C) = 0.95 + 0.20×(H/100) + 0.10×(C/100), clipped [0.90, 1.25].
    """
    qm = 0.95 + 0.20 * (health_score / 100.0) + 0.10 * (cert_score / 100.0)
    return round(max(0.90, min(1.25, qm)), 6)


# ─────────────────────────────────────────────
# MAIN VALUATION: Per-cow value
# ─────────────────────────────────────────────

def calculate_total_value(
    metrics: AnimalMetrics,
    genetics_score: float,
    health_score: float,
    sustainability_score: float,
    cert_score: float,
    listing_discount: float = 0.10,
) -> float:
    """
    Per-cow listing value (USD).

    Formula:
        fair_value   = base_price_usd × GP(G) × QM(H,C) × SM(S)
        listing_value = fair_value × (1 − listing_discount)

    base_price_usd is the real USDA/AMS market value for this
    weight class at this stage (updated at each stage transition).
    Scores GP, QM, SM are locked at listing.
    """
    gp = grade_premium(genetics_score)
    qm = quality_multiplier(health_score, cert_score)
    sm = sustainability_multiplier(sustainability_score)

    fair_value = metrics.base_price_usd * gp * qm * sm
    listing_value = fair_value * (1.0 - listing_discount)
    return round(listing_value, 2)


# ─────────────────────────────────────────────
# HERD LISTING PRICE
# ─────────────────────────────────────────────

def derive_listing_price_from_valuations(
    herd_stage: str,
    per_cow_values: Dict[str, float],
) -> float:
    """
    Herd listing price = sum of per-cow listing values.
    (The 10% discount is already baked into calculate_total_value.)
    """
    return round(sum(per_cow_values.values()), 2)


# ─────────────────────────────────────────────
# ROI PROJECTION
# ─────────────────────────────────────────────

def calculate_projected_roi(
    herd_total_discounted_value: float,
    listing_price: float,
    years_to_harvest: float,
) -> float:
    """
    Annualized ROI (%) from listing price to terminal value.
    """
    if listing_price <= 0 or herd_total_discounted_value <= 0 or years_to_harvest <= 0:
        return 0.0
    multiplier = herd_total_discounted_value / listing_price
    return round((multiplier ** (1.0 / years_to_harvest) - 1.0) * 100.0, 2)
