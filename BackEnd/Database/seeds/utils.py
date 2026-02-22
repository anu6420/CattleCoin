from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Optional, Dict


@dataclass
class AnimalMetrics:
    """
    Container for per-animal metrics fed into the valuation engine.

    Attributes:
        breed_code: Breed code (e.g. 'AN', 'WAG').
        stage: Lifecycle stage ('ranch', 'backgrounding', 'feedlot', 'processing', 'distribution').
        is_genomic_enhanced: Whether the animal has genomic-enhanced EPDs on file.
        percentile_rank: Representative genetic percentile (0-100), typically MARB or composite.
        current_weight_lbs: Latest observed live weight for this animal, if any.
        harvest_weight_mid_lbs: Mid-point of the expected harvest weight range for the breed.
        price_per_lb: Expected live price per pound for this breed.
        num_cert_programs: Count of active value-add / certification programs for this animal.
    """
    breed_code: str
    stage: str
    is_genomic_enhanced: bool
    percentile_rank: Optional[float]
    current_weight_lbs: Optional[float]
    harvest_weight_mid_lbs: float
    price_per_lb: float
    num_cert_programs: int


# Stage → (completion_fraction, years_to_harvest)
STAGE_COMPLETION = {
    "ranch": (0.35, 0.75),
    "backgrounding": (0.55, 0.50),
    "feedlot": (0.90, 0.25),
    "processing": (1.00, 0.05),
    "distribution": (1.00, 0.05),
}

# Stage → target annual ROI used when backing out listing_price
STAGE_TARGET_ROI = {
    "ranch": 0.18,
    "backgrounding": 0.16,
    "feedlot": 0.14,
    "processing": 0.12,
    "distribution": 0.12,
}


def _truncated_normal(
    mean: float,
    std_dev: float,
    low: float,
    high: float,
    rng: random.Random,
) -> float:
    """
    Sample from a truncated normal N(mean, std_dev^2) clipped to [low, high].

    Simple rejection sampling is sufficient here given narrow ranges and small counts.
    """
    while True:
        x = rng.gauss(mean, std_dev)
        if low <= x <= high:
            return x


def calculate_genetics_score(
    percentile_rank: Optional[float],
    is_genomic_enhanced: bool,
    rng: Optional[random.Random] = None,
) -> float:
    """
    Compute a genetics score on a 0-100 scale from an EPD-derived percentile.

    Inputs:
        percentile_rank: Representative percentile (0-100) of the animal's EPD profile.
                         If None, we assume modestly above-average (p=60).
        is_genomic_enhanced: Genomic animals receive a small premium.

    Formula (before truncation and noise):
        p = max(0, min(100, percentile_rank or 60))
        base = 55 + 0.45 * (p - 50)
        if genomic: base += 6

    Then:
        noisy = truncated_normal(base, std=3, low=40, high=99)

    This mapping:
        - Anchors p=50 near score ~55.
        - Pushes high-percentile animals into the 70-90+ band.
        - Ensures even low-percentile animals remain investment-grade (>=40).
    """
    if rng is None:
        rng = random

    if percentile_rank is None:
        p = 60.0
    else:
        p = max(0.0, min(100.0, percentile_rank))

    base = 55.0 + 0.45 * (p - 50.0)
    if is_genomic_enhanced:
        base += 6.0

    noisy = _truncated_normal(base, 3.0, 40.0, 99.0, rng)
    return round(noisy, 4)


def calculate_health_score(
    verified_herd: bool,
    rng: Optional[random.Random] = None,
) -> float:
    """
    Health score on 0-100.

    Verified herds: center ~92, others ~80, std dev ~4, truncated to [60, 99].
    This keeps all animals reasonably healthy while rewarding verified herds.
    """
    if rng is None:
        rng = random

    base = 92.0 if verified_herd else 80.0
    value = _truncated_normal(base, 4.0, 60.0, 99.0, rng)
    return round(value, 4)


def calculate_weight_score(
    current_weight_lbs: Optional[float],
    stage: str,
    harvest_weight_mid_lbs: float,
    rng: Optional[random.Random] = None,
) -> float:
    """
    Weight score on 0-100 based on proximity to stage-adjusted harvest trajectory.

    Let completion_target be the expected fraction of final weight for this stage.
    completion = current_weight / (completion_target * harvest_weight_mid_lbs),
    clipped to [0.85, 1.05] to avoid extreme outliers.

    We map completion = 1.0 → score ~65 and apply slope 30 with small noise.
    """
    if rng is None:
        rng = random

    completion_target, _years = STAGE_COMPLETION.get(stage, (0.70, 0.50))

    if current_weight_lbs is None or harvest_weight_mid_lbs <= 0:
        completion = 1.03
    else:
        denom = completion_target * harvest_weight_mid_lbs
        if denom <= 0:
            completion = 1.0
        else:
            completion = current_weight_lbs / denom
        completion = max(0.85, min(1.05, completion))

    base = 65.0 + 30.0 * (completion - 1.0)
    value = _truncated_normal(base, 3.0, 55.0, 99.0, rng)
    return round(value, 4)


def calculate_certification_score(
    num_programs: int,
) -> float:
    """
    Certification score on 0-100.

    Each value-add program contributes 18 points, capped at 100.
    """
    n = max(0, num_programs)
    score = min(100.0, 18.0 * n)
    return round(score, 4)


def calculate_total_value(
    metrics: AnimalMetrics,
    genetics_score: float,
    health_score: float,
    weight_score: float,
    cert_score: float,
    discount_rate: float = 0.10,
) -> float:
    """
    Compute discounted total value (USD) for a single animal.

    Steps:
      1) Retrieve completion fraction and years_to_harvest from STAGE_COMPLETION.
      2) Compute quality uplift factor:
           u = 1
               + 0.30 * (genetics_score - 70) / 30
               + 0.20 * (cert_score / 100)
         and clamp u to [0.8, 1.6].
      3) Terminal value:
           V_terminal = harvest_weight_mid_lbs * price_per_lb * completion * u
      4) Discount for time value:
           total_value = V_terminal / (1 + discount_rate)**years_to_harvest
    """
    completion, years_to_harvest = STAGE_COMPLETION.get(
        metrics.stage, (0.70, 0.50)
    )

    uplift = 1.0
    uplift += 0.30 * ((genetics_score - 70.0) / 30.0)
    uplift += 0.20 * (cert_score / 100.0)
    uplift = max(0.8, min(1.6, uplift))

    v_terminal = (
        metrics.harvest_weight_mid_lbs
        * metrics.price_per_lb
        * completion
        * uplift
    )

    total_value = v_terminal / ((1.0 + discount_rate) ** years_to_harvest)
    return round(total_value, 2)


def calculate_projected_roi(
    herd_total_discounted_value: float,
    listing_price: float,
    years_to_harvest: float,
) -> float:
    """
    Compute projected annualized ROI (%) for a herd.

    multiplier = herd_total_discounted_value / listing_price
    roi_annual = (multiplier ** (1 / years_to_harvest) - 1) * 100
    """
    if listing_price <= 0 or herd_total_discounted_value <= 0 or years_to_harvest <= 0:
        return 0.0

    multiplier = herd_total_discounted_value / listing_price
    roi_annual = (multiplier ** (1.0 / years_to_harvest) - 1.0) * 100.0
    return round(roi_annual, 2)


def derive_listing_price_from_valuations(
    herd_stage: str,
    per_cow_values: Dict[str, float],
) -> float:
    """
    Compute an economically coherent herd listing price from per-cow discounted values.

    Steps:
      - Sum per-cow values → total discounted herd value.
      - Get stage-specific target ROI and years_to_harvest.
      - Fair listing price:
            P_fair = V_total / (1 + target_roi)**years
      - Apply 10% discount: listing_price = 0.9 * P_fair
    """
    total_value = sum(per_cow_values.values())
    _completion, years_to_harvest = STAGE_COMPLETION.get(
        herd_stage, (0.70, 0.50)
    )
    target_roi = STAGE_TARGET_ROI.get(herd_stage, 0.15)

    if years_to_harvest <= 0:
        years_to_harvest = 0.5

    fair_price = total_value / ((1.0 + target_roi) ** years_to_harvest)
    listing_price = fair_price * 0.90
    return round(listing_price, 2)
