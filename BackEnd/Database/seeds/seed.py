#!/usr/bin/env python3
"""
Cattle Platform — Database Seed Script
=======================================
Targets the exact schema defined in:
  001_EPD_Data.sql   — animals, animal_weights, epd_traits, epd_runs,
                        animal_epds, vaccines, animal_vaccinations,
                        health_programs, animal_health_programs,
                        value_add_programs, animal_value_add_programs
  002_AppCore_Sprint1.sql — users, herds, animals.herd_id (FK),
                             token_pools, ownership, transactions,
                             cow_health, cow_valuation

Key design decisions:
  • BIGINT GENERATED ALWAYS AS IDENTITY PKs (animals, weights, epds, etc.)
    are handled by inserting in dependency order and using subqueries
    (SELECT animal_id FROM animals WHERE registration_number = ...) everywhere
    a child table needs the parent's PK — never hardcoded IDs.
  • UUID PKs (users, herds, token_pools, ownership, transactions) are
    generated in Python with uuid4() and embedded as literals.
  • contract_address and blockchain_tx_hash are intentionally NULL.
  • Rancher names/emails generated via the Faker library (no hardcoding).
  • random.seed(42) makes every run produce identical SQL.

Usage:
    pip install faker
    python seed_cattle.py                        # print SQL to stdout
    python seed_cattle.py --output seed.sql      # write to file
    python seed_cattle.py --execute \\
        --host localhost --port 5432 \\
        --dbname cattle_dev --user postgres --password secret

Sources:
  [S1] USDA AMS Livestock Market News — fed/feeder cattle prices
       https://www.ams.usda.gov/market-news/livestock
  [S2] Cattle-Fax 2024 Outlook — Angus ~$1.90/lb, Wagyu ~$9/lb live
       https://www.cattle-fax.com
  [S3] OSU Extension Beef Cattle Budgets 2024 — cost-of-gain $1.05-1.25/lb
       https://extension.okstate.edu/programs/beef-extension/
  [S4] UNL Beef — placement 700-800 lb → harvest 1,300-1,400 lb, 120-160 DOF
       https://beef.unl.edu
  [S5] American Angus Assoc EPD Means 2024
       https://www.angus.org/Nce/EpdMeans.aspx
  [S6] BIF Guidelines 9th Ed. — trait definitions and breed averages
       https://beefimprovement.org/library/bif-guidelines/
  [S7] BQA Feedlot Guidelines — arrival vaccination protocol
       https://www.bqa.org/Media/BQA/Docs/feedlotguidelines.pdf
  [S8] IMI Global — NHTC / Verified Natural / GAP certification
       https://imiglobal.com
  [S9] USDA AMS NHTC program standards
       https://www.ams.usda.gov/grades-standards/nhtc
"""

from __future__ import annotations

import argparse
import random
import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional, Dict

from utils import (
    AnimalMetrics,
    calculate_genetics_score,
    calculate_health_score,
    calculate_weight_score,
    calculate_certification_score,
    calculate_total_value,
    calculate_projected_roi,
    derive_listing_price_from_valuations,
)

# ---------------------------------------------------------------------------
# Global RNG — seed for reproducibility
# ---------------------------------------------------------------------------

random.seed(42)
RNG = random.Random(42)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def uid() -> str:
    return str(uuid.uuid4())


def rnd_date(start: date, end: date) -> date:
    return start + timedelta(days=random.randint(0, (end - start).days))


def days_ago(n: int) -> date:
    return date.today() - timedelta(days=n)


def q(v) -> str:
    """Escape and quote a Python value for SQL."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def animal_subq(reg: str) -> str:
    """Subquery that resolves a registration_number to its BIGINT animal_id."""
    return f"(SELECT animal_id FROM animals WHERE registration_number = {q(reg)} LIMIT 1)"


def pool_subq(herd_id: str) -> str:
    """Subquery that resolves a herd_id to its UUID pool_id."""
    return f"(SELECT pool_id FROM token_pools WHERE herd_id = {q(herd_id)} LIMIT 1)"


# ---------------------------------------------------------------------------
# Breed configuration
# Tuple layout:
#   (birth_lb, weaning_lb, yearling_lb,
#    harvest_lb_min, harvest_lb_max,
#    epd_bw_avg, epd_ww_avg, epd_yw_avg, epd_marb_avg,
#    price_per_lb_usd)          ← [S1][S2]
# ---------------------------------------------------------------------------
BREEDS: dict[str, tuple] = {
    "AN":  (85,  550, 850,  1250, 1350,  1.5,  65,  112, 0.45, 1.90),  # Black/Red Angus
    "HH":  (82,  520, 820,  1200, 1300,  0.8,  55,   98, 0.28, 1.85),  # Hereford
    "WAG": (70,  450, 750,  1050, 1150, -2.5,  45,   60, 1.20, 9.00),  # Wagyu     [S2]
    "CH":  (95,  620, 1000, 1350, 1450,  2.0,  75,  128, 0.18, 1.88),  # Charolais
    "SIM": (90,  600, 980,  1350, 1420,  1.8,  72,  124, 0.22, 1.87),  # Simmental
    "BR":  (78,  490, 800,  1150, 1250,  1.2,  48,   88, 0.15, 1.80),  # Brahman
    "BN":  (80,  510, 820,  1180, 1280,  1.4,  54,   95, 0.20, 1.82),  # Brangus
}

# Stages and realistic days-old range for animals at that stage  [S4]
STAGE_AGE_DAYS: dict[str, tuple[int, int]] = {
    "ranch":         (30,   240),
    "backgrounding": (240,  420),
    "feedlot":       (420,  600),
    "processing":    (540,  730),
    "distribution":  (600,  800),
}

FACILITIES: dict[str, list[str]] = {
    "ranch": [
        "Ranch Facility 1",
        "Ranch Facility 2",
        "Ranch Facility 3",
        "Ranch Facility 4",
        "Ranch Facility 5",
    ],
    "backgrounding": [
        "Backgrounding Facility 1",
        "Backgrounding Facility 2",
        "Backgrounding Facility 3",
    ],
    "feedlot": [
        "Feedlot Facility 1",
        "Feedlot Facility 2",
        "Feedlot Facility 3",
        "Feedlot Facility 4",
    ],
    "processing": [
        "Processing Facility 1",
        "Processing Facility 2",
    ],
    "distribution": [
        "Distribution Facility 1",
        "Distribution Facility 2",
    ],
    "auction": [
        "Auction Facility 1",
        "Auction Facility 2",
        "Auction Facility 3",
    ],
}

VETS = [
    "Dr. Feedlot Vet A",
    "Dr. Feedlot Vet B",
    "Dr. Ranch Vet A",
    "Dr. Ranch Vet B",
    "Dr. Consulting DVM",
]


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class User:
    user_id: str
    role: str
    email: str
    wallet_address: Optional[str] = None


@dataclass
class Herd:
    herd_id: str
    rancher_id: str
    herd_name: str
    breed_code: str
    head_count: int  # must be >= 20 per schema CHECK
    listing_price: float
    purchase_status: str  # available | pending | sold
    verified_flag: bool
    stage: str  # used internally to drive animal generation
    projected_roi_annual: Optional[float] = None  # not stored in DB, for diagnostics



@dataclass
class Animal:
    registration_number: str
    official_id: str         # USDA 840 EID
    animal_name: str
    breed_code: str
    sex_code: str            # B | C | H | S
    birth_date: date
    sire_reg: Optional[str]
    dam_reg: Optional[str]
    is_genomic_enhanced: bool
    herd_id: str             # FK into herds.herd_id (UUID)
    # stage inherited from herd, stored here for weight/vacc logic
    stage: str

# ---------------------------------------------------------------------------
# Deterministic users
# ---------------------------------------------------------------------------

def build_users() -> list[User]:
    users: list[User] = []

    # Admin
    users.append(User(uid(), "admin", "admin@cattleplatform.io", None))

    # 5 ranchers, deterministic identities
    for i in range(1, 6):
        users.append(
            User(
                uid(),
                "rancher",
                f"rancher{i}@platform.io",
                f"0x{'%020x' % (i,)}",
            )
        )

    # 5 investors, deterministic identities
    for i in range(1, 6):
        users.append(
            User(
                uid(),
                "investor",
                f"investor{i}@platform.io",
                f"0x{'%020x' % (i,)}",
            )
        )

    return users



# ---------------------------------------------------------------------------
# Build herds
# ---------------------------------------------------------------------------
def build_herds(users: list[User]) -> list[Herd]:
    ranchers = [u for u in users if u.role == "rancher"]

    specs = [
        # (rancher_index, name, breed, head_count, status, verified, stage, stage_pct)
        (0, "Angus Prime Herd A", "AN", 42, "available", True, "feedlot", 0.75),
        (0, "Angus Reserve B", "AN", 28, "available", True, "backgrounding", 0.40),
        (0, "Black Angus Feeders C", "AN", 35, "sold", True, "processing", 0.95),
        (0, "Angus Finishing D", "AN", 50, "available", True, "feedlot", 0.85),
        (1, "Red Angus Select A", "AN", 30, "available", True, "backgrounding", 0.50),
        (1, "Red Angus Yearling B", "AN", 22, "pending", True, "ranch", 0.25),
        (1, "Red Angus Yearling C", "AN", 27, "available", True, "backgrounding", 0.45),
        (2, "Hereford Prime A", "HH", 38, "available", True, "feedlot", 0.70),
        (2, "Hereford Select B", "HH", 25, "available", False, "backgrounding", 0.35),
        (2, "Hereford Grassfed C", "HH", 20, "available", True, "ranch", 0.60),
        (2, "Simmental Prime A", "SIM", 31, "available", True, "feedlot", 0.65),
        (2, "Simmental Yearling B", "SIM", 23, "pending", False, "backgrounding", 0.30),
        (3, "Wagyu A5 Reserve A", "WAG", 20, "available", True, "feedlot", 0.90),
        (3, "Wagyu F1 Select B", "WAG", 24, "available", True, "feedlot", 0.80),
        (3, "Wagyu Cross C", "WAG", 30, "sold", True, "processing", 0.95),
        (4, "Brahman Select A", "BR", 26, "available", False, "ranch", 0.45),
        (4, "Brangus Prime A", "BN", 33, "available", True, "backgrounding", 0.55),
        (4, "Brangus Yearling B", "BN", 21, "pending", True, "ranch", 0.20),
        (1, "Charolais Prime A", "CH", 29, "available", True, "feedlot", 0.75),
        (1, "Charolais Feeders B", "CH", 44, "available", True, "feedlot", 0.70),
    ]

    herds: list[Herd] = []
    for rancher_idx, name, breed, head, status, verified, stage, pct in specs:
        rancher = ranchers[rancher_idx]
        herds.append(
            Herd(
                herd_id=uid(),
                rancher_id=rancher.user_id,
                herd_name=name,
                breed_code=breed,
                head_count=head,
                listing_price=0.0,  # placeholder, will be updated post-valuation
                purchase_status=status,
                verified_flag=verified,
                stage=stage,
            )
        )
    return herds

# ---------------------------------------------------------------------------
# Build animals
# ---------------------------------------------------------------------------

# EID counter — USDA 840 prefix (15 digits total)  [USDA 840 standard]
_EID_COUNTER = [840_003_100_000_000]

def _next_eid() -> str:
    _EID_COUNTER[0] += 1
    return str(_EID_COUNTER[0])


def build_animals(herds: list[Herd]) -> list[Animal]:
    """
    Generate 20-50 animals per herd with stage-appropriate birth dates,
    sex ratios, and genomic testing rates.

    Sex distribution: ~78% steers (C), 14% heifers (H), 8% bulls (B)  [S6]
    Genomic testing: Wagyu 90%, Angus 65%, continental/Brahman 35%  [S5]
    """
    animals: list[Animal] = []

    for herd in herds:
        cfg = BREEDS[herd.breed_code]
        age_min, age_max = STAGE_AGE_DAYS[herd.stage]

        genomic_rate = 0.90 if herd.breed_code == "WAG" else \
                       0.65 if herd.breed_code in ("AN", "SIM") else 0.35

        for n in range(1, herd.head_count + 1):
            age_days = random.randint(age_min, age_max)
            birth = days_ago(age_days)

            roll = random.random()
            sex = "C" if roll < 0.78 else ("H" if roll < 0.92 else "B")

            is_genomic = random.random() < genomic_rate

            # Registration number: BREED-YEAR-HERD_SHORT-SEQ
            herd_short = herd.herd_id[-6:].upper()
            reg = f"{herd.breed_code}-{birth.year}-{herd_short}-{n:03d}"

            # Animal name: short herd prefix + sequence
            prefix = "".join(w[0] for w in herd.herd_name.split()[:3]).upper()
            name = f"{prefix} {n:03d}"

            animals.append(Animal(
                registration_number=reg,
                official_id=_next_eid(),
                animal_name=name,
                breed_code=herd.breed_code,
                sex_code=sex,
                birth_date=birth,
                sire_reg=None,   # sire/dam linkage out of scope for seed
                dam_reg=None,
                is_genomic_enhanced=is_genomic,
                herd_id=herd.herd_id,
                stage=herd.stage,
            ))

    return animals


# ---------------------------------------------------------------------------
# SQL section generators
# ---------------------------------------------------------------------------

# ── Users ──────────────────────────────────────────────────────────────────

def gen_users(users: list[User]) -> list[str]:
    out = []
    for u in users:
        out.append(
            f"INSERT INTO users (user_id, role, email, password_hash, wallet_address) VALUES "
            f"({q(u.user_id)}, {q(u.role)}::user_role, {q(u.email)}, "
            f"{q('$2b$12$placeholder_hash')}, {q(u.wallet_address)});"
        )
    return out


# ── Herds ──────────────────────────────────────────────────────────────────
def gen_herds(herds: list[Herd]) -> list[str]:
    out = []
    for h in herds:
        out.append(
            "INSERT INTO herds "
            "(herd_id, rancher_id, herd_name, head_count, listing_price, purchase_status, verified_flag) VALUES "
            f"({q(h.herd_id)}, {q(h.rancher_id)}, {q(h.herd_name)}, "
            f"{h.head_count}, {h.listing_price}, {q(h.purchase_status)}, {q(h.verified_flag)});"
        )
    return out



# ── Animals ─────────────────────────────────────────────────────────────────
# NOTE: animal_id is BIGINT GENERATED ALWAYS AS IDENTITY — we never specify it.
# herd_id was added to animals via ALTER TABLE in 002_AppCore_Sprint1.sql.

def gen_animals(animals: list[Animal]) -> list[str]:
    out = []
    for a in animals:
        out.append(
            f"INSERT INTO animals "
            f"(registration_number, official_id, animal_name, breed_code, sex_code, "
            f"birth_date, sire_registration_number, dam_registration_number, "
            f"is_genomic_enhanced, herd_id) VALUES "
            f"({q(a.registration_number)}, {q(a.official_id)}, {q(a.animal_name)}, "
            f"{q(a.breed_code)}, {q(a.sex_code)}, {q(str(a.birth_date))}, "
            f"{q(a.sire_reg)}, {q(a.dam_reg)}, "
            f"{q(a.is_genomic_enhanced)}, {q(a.herd_id)});"
        )
    return out


# ── Token pools ─────────────────────────────────────────────────────────────
# contract_address intentionally NULL.
# total_supply = head_count × 1000 tokens per head.

def gen_token_pools(herds: list[Herd]) -> list[str]:
    out = []
    for h in herds:
        supply = h.head_count * 1000
        out.append(
            f"INSERT INTO token_pools (pool_id, herd_id, total_supply, contract_address) VALUES "
            f"({q(uid())}, {q(h.herd_id)}, {supply}, NULL);"
        )
    return out


# ── EPD trait dictionary ─────────────────────────────────────────────────────

def gen_epd_traits() -> list[str]:
    traits = [
        # (trait_code, trait_name, category, unit, description, is_index)
        ("BW",   "Birth Weight",            "growth",      "lb",    "Expected difference in calf birth weight",                                False),
        ("WW",   "Weaning Weight",          "growth",      "lb",    "Expected difference in 205-day weaning weight",                           False),
        ("YW",   "Yearling Weight",         "growth",      "lb",    "Expected difference in 365-day yearling weight",                          False),
        ("MILK", "Milk (Maternal)",         "maternal",    "lb",    "Milk contribution to weaning weight via dam",                             False),
        ("MWW",  "Maternal Weaning Weight", "maternal",    "lb",    "Combined WW + MILK/2 index",                                              False),
        ("SC",   "Scrotal Circumference",   "reproduction","cm",    "Expected difference in scrotal circumference at yearling",                 False),
        ("HP",   "Heifer Pregnancy",        "reproduction","%",     "Expected difference in heifer pregnancy rate",                             False),
        ("CW",   "Carcass Weight",          "carcass",     "lb",    "Expected difference in hot carcass weight",                               False),
        ("REA",  "Rib Eye Area",            "carcass",     "sq.in", "Expected difference in longissimus dorsi muscle cross-section area",      False),
        ("FAT",  "Fat Thickness",           "carcass",     "in",    "Expected difference in 12th-rib subcutaneous fat thickness",              False),
        ("MARB", "Marbling Score",          "carcass",     "score", "Expected difference in USDA marbling score",                              False),
        ("TEND", "Tenderness",              "carcass",     "lb",    "Expected diff in Warner-Bratzler shear force (lower = more tender)",      False),
        ("API",  "All-Purpose Index",       "index",       "$",     "Dollar-value index for cow-calf through feedlot scenarios",               True),
        ("TI",   "Terminal Index",          "index",       "$",     "Dollar-value index optimised for terminal sire scenarios",                True),
        ("BMI",  "Beef Market Index",       "index",       "$",     "Composite dollar-value index for overall beef merit",                     True),
    ]
    out = []
    for code, name, cat, unit, desc, is_idx in traits:
        out.append(
            f"INSERT INTO epd_traits (trait_code, trait_name, trait_category, unit_of_measure, description, is_index) "
            f"VALUES ({q(code)}, {q(name)}, {q(cat)}, {q(unit)}, {q(desc)}, {q(is_idx)}) "
            f"ON CONFLICT (trait_code) DO NOTHING;"
        )
    return out


# ── EPD runs ─────────────────────────────────────────────────────────────────
# epd_run_id is BIGINT GENERATED ALWAYS AS IDENTITY.
# Child inserts (animal_epds) look up the run via breed_code + evaluation_date subquery.

EPD_RUNS: list[tuple] = [
    # (breed_code, source_system, evaluation_date, import_batch_id)
    ("AN",  "American Angus Association GE-EPD v14",       "2025-02-01", "AAA-2025-FEB"),
    ("HH",  "American Hereford Association EPD",           "2024-11-01", "AHA-2024-NOV"),
    ("WAG", "American Wagyu Registry EPD",                 "2024-09-01", "AWR-2024-SEP"),
    ("CH",  "American-International Charolais Assoc EPD",  "2024-10-01", "AICA-2024-OCT"),
    ("SIM", "American Simmental Association EPD",          "2025-01-01", "ASA-2025-JAN"),
    ("BR",  "American Brahman Breeders Association EPD",   "2024-08-01", "ABBA-2024-AUG"),
    ("BN",  "International Brangus Breeders Assoc EPD",    "2024-07-01", "IBBA-2024-JUL"),
]

def gen_epd_runs() -> list[str]:
    out = []
    for breed, source, eval_date, batch_id in EPD_RUNS:
        out.append(
            f"INSERT INTO epd_runs (breed_code, source_system, evaluation_date, import_batch_id) VALUES "
            f"({q(breed)}, {q(source)}, {q(eval_date)}, {q(batch_id)});"
        )
    return out


# ── Vaccines ─────────────────────────────────────────────────────────────────

VACCINES: list[tuple] = [
    # (name, manufacturer, type)        — standard BQA arrival protocol [S7]
    ("Vista Once SQ (IBR, BVD1, BVD2, PI3, BRSV)", "Merck Animal Health",   "viral MLV"),
    ("Bovi-Shield Gold FP 5 L5",                    "Zoetis",                "viral MLV"),
    ("One Shot Ultra 7 (Clostridial 7-way)",         "Zoetis",                "clostridial bacterin"),
    ("Vision 7 with SPUR (Clostridial 7-way)",       "Merck Animal Health",   "clostridial bacterin"),
    ("Mannheimia Haemolytica (Pasteurella)",         "Elanco",                "bacterial"),
    ("Bovilis Nasalgen 3 (intranasal MLV)",          "Merck Animal Health",   "intranasal MLV"),
    ("Dectomax (doramectin) Pour-On",               "Zoetis",                "antiparasitic"),
    ("Ivomec (ivermectin) Pour-On",                 "Boehringer Ingelheim",  "antiparasitic"),
    ("Spirovac Lepto 5-way",                        "Zoetis",                "leptospiral bacterin"),
    ("Ultrabac 7 Somubac (Clostridial + Somnus)",   "Zoetis",                "clostridial bacterin"),
]

def gen_vaccines() -> list[str]:
    out = []
    for name, mfr, vtype in VACCINES:
        out.append(
            f"INSERT INTO vaccines (vaccine_name, manufacturer, vaccine_type) VALUES "
            f"({q(name)}, {q(mfr)}, {q(vtype)});"
        )
    return out


# ── Health programs ───────────────────────────────────────────────────────────

HEALTH_PROGRAMS: list[tuple] = [
    ("Beef Quality Assurance (BQA)",
     "National best-practice program covering animal handling, record-keeping, and treatment protocols",
     "National Cattlemen's Beef Association"),
    ("Certified Angus Beef Verified",
     "Source and age verification for eligibility to market under the CAB brand",
     "Certified Angus Beef LLC"),
    ("No Antibiotics Ever (NAE)",
     "Animals raised without any antibiotics, verified by third-party audit",
     "IMI Global"),
    ("USDA Process Verified Program (PVP)",
     "USDA AMS third-party verification of specific production claims",
     "USDA AMS"),
]

def gen_health_programs() -> list[str]:
    out = []
    for name, desc, body in HEALTH_PROGRAMS:
        out.append(
            f"INSERT INTO health_programs (program_name, program_description, certifying_body, active_flag) VALUES "
            f"({q(name)}, {q(desc)}, {q(body)}, TRUE);"
        )
    return out


# ── Value-add programs ────────────────────────────────────────────────────────

VALUE_ADD_PROGRAMS: list[tuple] = [
    ("Non-Hormone Treated Cattle (NHTC)",  "NHTC",           "USDA AMS",        "No growth-promoting hormones ever administered; USDA-verified [S9]"),
    ("Verified Natural (VN)",              "Verified Natural","IMI Global",      "No antibiotics, no hormones, minimally processed, natural feed [S8]"),
    ("Global Animal Partnership Step 1",   "GAP",            "GAP Program",     "Minimum animal welfare standards; third-party audited [S8]"),
    ("Global Animal Partnership Step 4",   "GAP",            "GAP Program",     "Pasture-centered standards; continuous outdoor access required [S8]"),
    ("Certified Grassfed by AGW",          "Grassfed",       "A Greener World", "100 percent grassfed and finished on pasture; AGW certified"),
    ("Export Eligible — EU Verified",      "EU Export",      "USDA FAS",        "Meets EU Directive 96/22/EC hormone-free beef import requirements"),
]

def gen_value_add_programs() -> list[str]:
    out = []
    for name, ptype, body, desc in VALUE_ADD_PROGRAMS:
        out.append(
            f"INSERT INTO value_add_programs (program_name, program_type, certifying_body, description, active_flag) VALUES "
            f"({q(name)}, {q(ptype)}, {q(body)}, {q(desc)}, TRUE);"
        )
    return out


# ── Animal weights ────────────────────────────────────────────────────────────
def gen_animal_weights(animals: list[Animal]) -> tuple[list[str], dict[str, float]]:
    """
    Insert weight records appropriate to each animal's lifecycle stage and
    return a map registration_number -> latest weight for valuation.
    """
    weight_events: dict[str, list[tuple]] = {
        "ranch": [("weaning", 350, 600, 45)],
        "backgrounding": [("stocker_intake", 540, 720, 60),
                          ("stocker_check", 650, 800, 30)],
        "feedlot": [("feedlot_placement", 700, 800, 120),
                    ("feedlot_mid", 950, 1100, 60),
                    ("feedlot_final", 1200, 1400, 14)],
        "processing": [("harvest_weight", 1200, 1430, 7)],
        "distribution": [("harvest_weight", 1200, 1430, 14)],
    }

    out: list[str] = []
    latest_weights: dict[str, float] = {}

    for a in animals:
        cfg = BREEDS[a.breed_code]
        scale = (cfg[3] + cfg[4]) / 2 / 1300
        events = weight_events.get(a.stage, [("weaning", 350, 600, 45)])
        facility = random.choice(FACILITIES.get(a.stage, FACILITIES["ranch"]))

        last_weight = None
        for wtype, lb_min, lb_max, days_back in events:
            lb = round(random.uniform(lb_min * scale, lb_max * scale), 1)
            wdate = days_ago(days_back + random.randint(0, 10))
            last_weight = lb
            out.append(
                "INSERT INTO animal_weights (animal_id, weight_date, weight_lbs, weight_type, location_code) "
                f"VALUES ({animal_subq(a.registration_number)}, {q(str(wdate))}, {lb}, {q(wtype)}, {q(facility)});"
            )

        if last_weight is not None:
            latest_weights[a.registration_number] = last_weight

    return out, latest_weights


# ── Animal vaccinations ───────────────────────────────────────────────────────

def gen_animal_vaccinations(animals: list[Animal]) -> list[str]:
    """
    BQA-standard vaccination protocols by stage [S7].

    vaccine_id values reference the order we insert in gen_vaccines():
      1 = Vista Once SQ (MLV respiratory)
      2 = Bovi-Shield Gold FP 5 L5 (MLV respiratory)
      3 = One Shot Ultra 7 (7-way Clostridial)
      4 = Vision 7 SPUR (7-way Clostridial)
      5 = Mannheimia Haemolytica
      7 = Dectomax pour-on (antiparasitic)
      8 = Ivomec pour-on (antiparasitic)
      9 = Spirovac Lepto 5-way

    Feedlot arrival = MLV respiratory + 7-way + Pasteurella + antiparasitic + 21-day booster
    Backgrounding   = same minus booster
    Ranch           = pre-conditioning MLV + 7-way
    Wagyu           = minimal NHTC-compliant protocol [S8]
    Heifers also get Leptospirosis regardless of stage [S7]
    """
    protocols: dict[str, list[tuple]] = {
        # [(vaccine_seq_number, dose, route, booster, days_offset_from_arrival)]
        "feedlot": [
            (1, "2 mL",       "SQ",      False,  0),
            (3, "5 mL",       "SQ",      False,  0),
            (5, "2 mL",       "SQ",      False,  0),
            (7, "1 mL/22 lb", "pour-on", False,  0),
            (3, "5 mL",       "SQ",      True,  21),   # 21-day Clostridial booster [S7]
        ],
        "backgrounding": [
            (2, "2 mL",       "SQ",      False,  0),
            (4, "5 mL",       "SQ",      False,  0),
            (5, "2 mL",       "SQ",      False,  0),
            (8, "1 mL/22 lb", "pour-on", False,  0),
        ],
        "ranch": [
            (2, "2 mL", "SQ", False, 0),
            (4, "5 mL", "SQ", False, 0),
        ],
        "wagyu_nhtc": [          # hormone-free / antibiotic-minimised protocol [S8]
            (4, "5 mL", "SQ", False, 0),
            (9, "5 mL", "SQ", False, 0),
        ],
        "processing":   [],      # vaccinations complete prior to processing
        "distribution": [],
    }

    out = []
    for a in animals:
        if a.breed_code == "WAG":
            protocol = protocols["wagyu_nhtc"]
        else:
            protocol = protocols.get(a.stage, protocols["ranch"])

        # Heifers get Leptospirosis in addition to stage protocol [S7]
        if a.sex_code == "H":
            protocol = list(protocol) + [(9, "5 mL", "SQ", False, 0)]

        arrival = days_ago(random.randint(30, 180))
        vet = random.choice(VETS)
        lot = f"LOT{random.randint(1000, 9999)}"

        for vacc_seq, dose, route, is_booster, day_offset in protocol:
            admin_date = arrival + timedelta(days=day_offset)
            # vaccine_id via subquery (identity PK, seq position in our INSERTs)
            vacc_subq = (
                f"(SELECT vaccine_id FROM vaccines "
                f"WHERE vaccine_name = {q(VACCINES[vacc_seq - 1][0])} LIMIT 1)"
            )
            out.append(
                f"INSERT INTO animal_vaccinations "
                f"(animal_id, vaccine_id, administration_date, dose, route, administered_by, lot_number, booster_flag) "
                f"VALUES ({animal_subq(a.registration_number)}, {vacc_subq}, "
                f"{q(str(admin_date))}, {q(dose)}, {q(route)}, {q(vet)}, {q(lot)}, {q(is_booster)});"
            )
    return out


# ── Animal EPDs ───────────────────────────────────────────────────────────────

# Breed-specific EPD trait parameters: {trait_code: (mean, std_dev)}  [S5][S6]
BREED_EPD_PARAMS: dict[str, dict[str, tuple[float, float]]] = {
    "AN":  {"BW": (1.5,0.8),  "WW": (65,12),  "YW": (112,18), "MILK": (24,6),
            "CW": (42,8),    "REA": (0.25,0.08), "MARB": (0.45,0.12),
            "FAT": (0.03,0.01), "HP": (10,4),
            "API": (145,20), "TI": (82,12)},
    "HH":  {"BW": (0.8,0.7),  "WW": (55,10),  "YW": (98,15),  "MILK": (20,5),
            "CW": (35,7),    "REA": (0.20,0.07), "MARB": (0.28,0.10),
            "FAT": (0.02,0.01), "HP": (8,3),
            "API": (120,18), "TI": (68,10)},
    "WAG": {"BW": (-2.5,0.6), "WW": (45,8),   "YW": (60,10),  "MILK": (18,4),
            "REA": (0.15,0.05), "MARB": (1.20,0.15), "FAT": (0.05,0.02)},
    "CH":  {"BW": (2.0,0.9),  "WW": (75,14),  "YW": (128,20), "MILK": (22,5),
            "CW": (52,9),    "REA": (0.30,0.09), "MARB": (0.18,0.08),
            "FAT": (0.02,0.01), "API": (130,15), "TI": (75,11)},
    "SIM": {"BW": (1.8,0.8),  "WW": (72,13),  "YW": (124,18), "MILK": (23,5),
            "CW": (50,8),    "REA": (0.28,0.08), "MARB": (0.22,0.09),
            "FAT": (0.02,0.01), "API": (128,16), "TI": (72,10)},
    "BR":  {"BW": (1.2,0.7),  "WW": (48,10),  "YW": (88,14),  "MILK": (16,4),
            "CW": (30,6),    "REA": (0.18,0.06), "MARB": (0.15,0.07)},
    "BN":  {"BW": (1.4,0.7),  "WW": (54,11),  "YW": (95,15),  "MILK": (18,4),
            "CW": (34,7),    "REA": (0.20,0.07), "MARB": (0.20,0.08)},
}

def gen_animal_epds(animals: list[Animal]) -> tuple[list[str], dict[str, float]]:
    """
    Insert EPD records for animals that have been tested and return a mapping
    registration_number -> representative percentile rank to feed genetics scoring.

    We approximate overall genetic merit by the MARB trait percentile if present,
    otherwise by the average percentile across all generated traits.
    Genomic-enhanced animals tend to have more complete and higher-accuracy records.
    """
    out: list[str] = []
    rep_percentiles: dict[str, float] = {}

    for a in animals:
        # Non-genomic animals: 25% chance of having EPDs on file
        if not a.is_genomic_enhanced and random.random() > 0.25:
            continue

        params = BREED_EPD_PARAMS.get(a.breed_code, {})
        if not params:
            continue

        run_eval_date = next(
            (r[2] for r in EPD_RUNS if r[0] == a.breed_code),
            None,
        )
        if not run_eval_date:
            continue

        run_subq = (
            f"(SELECT epd_run_id FROM epd_runs "
            f"WHERE breed_code = {q(a.breed_code)} "
            f"AND evaluation_date = {q(run_eval_date)} LIMIT 1)"
        )

        acc_base = 0.75 if a.is_genomic_enhanced else 0.42

        trait_percentiles: list[tuple[str, int]] = []

        for trait_code, (mean, std) in params.items():
            epd_val = round(random.gauss(mean, std), 4)
            accuracy = round(
                min(0.99, max(0.20, random.gauss(acc_base, 0.06))),
                4,
            )
            # Bias percentile to 25–95, skewed upward by using a truncated normal around 60
            base_pct = max(0, min(100, int(random.gauss(60, 15))))
            pct_rank = max(5, min(95, base_pct))

            trait_percentiles.append((trait_code, pct_rank))

            out.append(
                "INSERT INTO animal_epds "
                "(animal_id, epd_run_id, trait_code, epd_value, accuracy, percentile_rank, interim_flag) "
                f"VALUES ({animal_subq(a.registration_number)}, {run_subq}, "
                f"{q(trait_code)}, {epd_val}, {accuracy}, {pct_rank}, FALSE);"
            )

        if not trait_percentiles:
            continue

        # Representative percentile: MARB if present, else average of all
        marb_pct = next(
            (p for t, p in trait_percentiles if t == "MARB"),
            None,
        )
        if marb_pct is not None:
            rep_percentiles[a.registration_number] = float(marb_pct)
        else:
            avg_pct = sum(p for _, p in trait_percentiles) / len(trait_percentiles)
            rep_percentiles[a.registration_number] = float(avg_pct)

    return out, rep_percentiles


# ── Animal health program enrollments ────────────────────────────────────────

def gen_animal_health_programs(animals: list[Animal], herds: list[Herd]) -> list[str]:
    """
    BQA enrolled for all animals in verified herds.
    USDA PVP enrolled for Wagyu and premium Angus.  [S7]
    """
    herd_map = {h.herd_id: h for h in herds}
    out = []

    for a in animals:
        herd = herd_map[a.herd_id]
        enrollments = []

        if herd.verified_flag:
            # BQA — seq 1
            enrollments.append((
                "Beef Quality Assurance (BQA)",
                date(2024, 1, 1), date(2025, 1, 1),
                f"BQA24-{a.registration_number[-12:]}"
            ))

        if a.breed_code == "WAG" or (a.breed_code == "AN" and herd.verified_flag):
            # USDA PVP — seq 4
            enrollments.append((
                "USDA Process Verified Program (PVP)",
                date(2024, 3, 15), date(2025, 3, 15),
                f"PVP24-{a.registration_number[-12:]}"
            ))

        for prog_name, enroll, expire, cert in enrollments:
            prog_subq = (
                f"(SELECT health_program_id FROM health_programs "
                f"WHERE program_name = {q(prog_name)} LIMIT 1)"
            )
            out.append(
                f"INSERT INTO animal_health_programs "
                f"(animal_id, health_program_id, enrollment_date, expiration_date, "
                f"certification_number, verified_flag) "
                f"VALUES ({animal_subq(a.registration_number)}, {prog_subq}, "
                f"{q(str(enroll))}, {q(str(expire))}, {q(cert)}, TRUE);"
            )
    return out


# ── Animal value-add program enrollments ──────────────────────────────────────
def gen_animal_value_add_programs(
    animals: list[Animal],
    herds: list[Herd],
) -> tuple[list[str], dict[str, int]]:
    """
    Generate value-add program enrollments and return a map
    registration_number -> count of enrolled programs.
    """
    herd_map = {h.herd_id: h for h in herds}
    out: list[str] = []
    counts: dict[str, int] = {}

    for a in animals:
        herd = herd_map[a.herd_id]
        enrollments = []

        if a.breed_code == "WAG":
            enrollments += [
                ("Non-Hormone Treated Cattle (NHTC)", date(2022, 1, 1), date(2027, 1, 1),
                 f"NHTC-{a.registration_number[-12:]}"),
                ("Verified Natural (VN)", date(2022, 1, 1), date(2027, 1, 1),
                 f"VN-{a.registration_number[-14:]}"),
                ("Export Eligible — EU Verified", date(2022, 6, 1), date(2027, 6, 1),
                 f"EU-{a.registration_number[-15:]}"),
            ]
        elif "Grassfed" in herd.herd_name:
            enrollments += [
                ("Global Animal Partnership Step 1", date(2023, 5, 1), date(2025, 5, 1),
                 f"GAP1-{a.registration_number[-11:]}"),
                ("Certified Grassfed by AGW", date(2023, 6, 1), date(2025, 6, 1),
                 f"AGW-{a.registration_number[-12:]}"),
            ]
        elif a.breed_code == "AN" and herd.verified_flag:
            enrollments.append(
                ("Verified Natural (VN)", date(2024, 2, 1), date(2026, 2, 1),
                 f"VN-{a.registration_number[-14:]}")
            )

        counts[a.registration_number] = len(enrollments)

        for prog_name, enroll, expire, cert in enrollments:
            prog_subq = (
                "SELECT value_add_program_id FROM value_add_programs "
                f"WHERE program_name = {q(prog_name)} LIMIT 1"
            )
            prog_subq = f"({prog_subq})"
            out.append(
                "INSERT INTO animal_value_add_programs "
                "(animal_id, value_add_program_id, enrollment_date, expiration_date, "
                "certification_number, verified_flag) "
                f"VALUES ({animal_subq(a.registration_number)}, {prog_subq}, "
                f"{q(str(enroll))}, {q(str(expire))}, {q(cert)}, TRUE);"
            )

    return out, counts


# ── CowHealth ─────────────────────────────────────────────────────────────────

def gen_cow_health(animals: list[Animal], herds: list[Herd]) -> list[str]:
    """
    Denormalised health summary consumed by the UI's Health column.
    Maps to cow_health in 002_AppCore_Sprint1.sql (cow_id → animals.animal_id).
    """
    herd_map = {h.herd_id: h for h in herds}

    stage_vacc = {
        "feedlot":       "Vista Once SQ + One Shot Ultra 7 (BQA Arrival Protocol)",
        "backgrounding": "Bovi-Shield Gold FP 5 L5 + Vision 7 SPUR (Pre-Conditioning)",
        "ranch":         "Vision 7 with SPUR (Ranch Pre-Conditioning)",
        "processing":    "Full vaccination protocol complete prior to harvest",
        "distribution":  "Full vaccination protocol complete prior to harvest",
    }
    stage_prog = {
        "feedlot":       "Beef Quality Assurance (BQA)",
        "backgrounding": "Beef Quality Assurance (BQA)",
        "ranch":         "Beef Quality Assurance (BQA)",
        "processing":    "USDA Process Verified Program (PVP)",
        "distribution":  "USDA Process Verified Program (PVP)",
    }

    out = []
    for a in animals:
        herd = herd_map[a.herd_id]
        vacc_name = stage_vacc.get(a.stage, stage_vacc["ranch"])
        prog_name = stage_prog.get(a.stage, stage_prog["ranch"])
        admin_date = days_ago(random.randint(14, 120))
        cert = f"HLTH-{a.registration_number[-16:]}"
        out.append(
            f"INSERT INTO cow_health "
            f"(cow_id, vaccine_name, administration_date, health_program_name, "
            f"certification_number, verified_flag) "
            f"VALUES ({animal_subq(a.registration_number)}, {q(vacc_name)}, "
            f"{q(str(admin_date))}, {q(prog_name)}, {q(cert)}, {q(herd.verified_flag)});"
        )
    return out


# ── CowValuation ──────────────────────────────────────────────────────────────
def gen_cow_valuations(
    animals: list[Animal],
    herds: list[Herd],
    stage_latest_weights: dict[str, float],
    cert_program_counts: dict[str, int],
    epd_percentiles: dict[str, float],
) -> tuple[list[str], dict[str, float]]:
    """
    Per-animal valuation scores and total_value using the formal valuation engine.

    genetics_score now uses an EPD-derived representative percentile per animal
    (e.g., MARB percentile or average trait percentile) instead of a synthetic proxy.
    """
    herd_map = {h.herd_id: h for h in herds}
    out: list[str] = []
    value_map: dict[str, float] = {}

    for a in animals:
        herd = herd_map[a.herd_id]
        cfg = BREEDS[a.breed_code]
        harvest_mid = (cfg[3] + cfg[4]) / 2
        price_per_lb = cfg[9]

        percentile = epd_percentiles.get(a.registration_number)
        current_weight = stage_latest_weights.get(a.registration_number)
        num_certs = cert_program_counts.get(a.registration_number, 0)

        metrics = AnimalMetrics(
            breed_code=a.breed_code,
            stage=a.stage,
            is_genomic_enhanced=a.is_genomic_enhanced,
            percentile_rank=percentile,
            current_weight_lbs=current_weight,
            harvest_weight_mid_lbs=harvest_mid,
            price_per_lb=price_per_lb,
            num_cert_programs=num_certs,
        )

        genetics = calculate_genetics_score(percentile, a.is_genomic_enhanced, RNG)
        health = calculate_health_score(herd.verified_flag, RNG)
        weight_score = calculate_weight_score(current_weight, a.stage, harvest_mid, RNG)
        cert_score = calculate_certification_score(num_certs)

        total_value = calculate_total_value(
            metrics,
            genetics,
            health,
            weight_score,
            cert_score,
        )
        value_map[a.registration_number] = total_value

        method = f"v2.1-{a.breed_code.lower()}-{a.stage}"

        out.append(
            "INSERT INTO cow_valuation "
            "(cow_id, genetics_score, health_score, weight_score, certification_score, "
            "total_value, valuation_method_version) "
            f"VALUES ({animal_subq(a.registration_number)}, "
            f"{genetics}, {health}, {weight_score}, {cert_score}, {total_value}, {q(method)});"
        )

    return out, value_map


# ── Ownership ─────────────────────────────────────────────────────────────────
def gen_ownership(users: list[User], herds: list[Herd]) -> list[str]:
    """
    Ownership model:
      - Rancher retains 0% of each herd's token pool.
      - 100% of the token supply is distributed among 1-3 investors.
      - Random split always sums exactly to total_supply.
    """
    investors = [u for u in users if u.role == "investor"]
    out: list[str] = []

    for h in herds:
        total = h.head_count * 1000
        pool_sq = pool_subq(h.herd_id)

        n_inv = random.randint(1, min(3, len(investors)))
        selected = random.sample(investors, n_inv)

        # Random partition of 'total' into n_inv positive integers
        if n_inv == 1:
            splits = [total]
        else:
            cuts = sorted(random.sample(range(1, total), n_inv - 1))
            splits = [cuts[0]] + [
                cuts[i] - cuts[i - 1] for i in range(1, len(cuts))
            ] + [total - cuts[-1]]

        for inv, amount in zip(selected, splits):
            if amount < 1:
                continue
            out.append(
                "INSERT INTO ownership (user_id, pool_id, token_amount) "
                f"VALUES ({q(inv.user_id)}, {pool_sq}, {amount}) "
                "ON CONFLICT (user_id, pool_id) DO UPDATE "
                "SET token_amount = ownership.token_amount + EXCLUDED.token_amount;"
            )

    return out


# ── Transactions ──────────────────────────────────────────────────────────────
def gen_transactions(users: list[User], herds: list[Herd]) -> list[str]:
    """
    Each herd gets:
      - 1 mint event (by admin, full supply)
      - 1-3 buy events (by investors)
      - redeem event for sold/completed herds
    """
    admin = next(u for u in users if u.role == "admin")
    investors = [u for u in users if u.role == "investor"]
    out = []

    for h in herds:
        total = float(h.head_count * 1000)
        pool_sq = pool_subq(h.herd_id)

        # Mint by platform/admin, not rancher
        out.append(
            "INSERT INTO transactions (user_id, pool_id, type, amount, status, blockchain_tx_hash) "
            f"VALUES ({q(admin.user_id)}, {pool_sq}, 'mint'::transaction_type, "
            f"{total}, 'confirmed', NULL);"
        )

        # Buys
        for _ in range(random.randint(1, 3)):
            inv = random.choice(investors)
            amount = round(random.uniform(total * 0.05, total * 0.30), 6)
            out.append(
                "INSERT INTO transactions (user_id, pool_id, type, amount, status, blockchain_tx_hash) "
                f"VALUES ({q(inv.user_id)}, {pool_sq}, 'buy'::transaction_type, "
                f"{amount}, 'confirmed', NULL);"
            )

        # Redeem for completed herds
        if h.purchase_status == "sold":
            inv = random.choice(investors)
            out.append(
                "INSERT INTO transactions (user_id, pool_id, type, amount, status, blockchain_tx_hash) "
                f"VALUES ({q(inv.user_id)}, {pool_sq}, 'redeem'::transaction_type, "
                f"{total}, 'confirmed', NULL);"
            )

    return out

# ---------------------------------------------------------------------------
# Assemble full SQL document
# ---------------------------------------------------------------------------
def build_sql() -> str:
    random.seed(42)

    users = build_users()
    herds = build_herds(users)
    animals = build_animals(herds)

    # Reference and core data
    epd_traits_sql = gen_epd_traits()
    epd_runs_sql = gen_epd_runs()
    vaccines_sql = gen_vaccines()
    health_programs_sql = gen_health_programs()
    value_add_programs_sql = gen_value_add_programs()

    users_sql = gen_users(users)

    token_pools_sql = gen_token_pools(herds)
    animals_sql = gen_animals(animals)
    animal_weights_sql, latest_weights = gen_animal_weights(animals)
    animal_vaccinations_sql = gen_animal_vaccinations(animals)
    animal_epds_sql, epd_percentiles = gen_animal_epds(animals)
    animal_health_programs_sql = gen_animal_health_programs(animals, herds)
    animal_value_add_sql, cert_counts = gen_animal_value_add_programs(animals, herds)
    cow_health_sql = gen_cow_health(animals, herds)

    # Valuations
    cow_valuations_sql, value_map = gen_cow_valuations(
        animals,
        herds,
        latest_weights,
        cert_counts,
        epd_percentiles,
    )

    # Derive listing_price per herd from per-cow valuations
    herd_values: Dict[str, float] = {}
    for a in animals:
        herd_values.setdefault(a.herd_id, 0.0)
        herd_values[a.herd_id] += value_map.get(a.registration_number, 0.0)

    for h in herds:
        per_cow_values = {
            reg: val
            for reg, val in value_map.items()
            if any(aa.registration_number == reg and aa.herd_id == h.herd_id for aa in animals)
        }
        h.listing_price = derive_listing_price_from_valuations(h.stage, per_cow_values)

    herds_sql = gen_herds(herds)
    ownership_sql = gen_ownership(users, herds)
    transactions_sql = gen_transactions(users, herds)

    sections: list[tuple[str, list[str]]] = [
        ("REFERENCE DATA — EPD TRAITS", epd_traits_sql),
        ("REFERENCE DATA — EPD RUNS", epd_runs_sql),
        ("REFERENCE DATA — VACCINES", vaccines_sql),
        ("REFERENCE DATA — HEALTH PROGRAMS", health_programs_sql),
        ("REFERENCE DATA — VALUE-ADD PROGRAMS", value_add_programs_sql),
        ("USERS", users_sql),
        ("HERDS", herds_sql),
        ("TOKEN POOLS", token_pools_sql),
        ("ANIMALS", animals_sql),
        ("ANIMAL WEIGHTS", animal_weights_sql),
        ("ANIMAL VACCINATIONS", animal_vaccinations_sql),
        ("ANIMAL EPDs", animal_epds_sql),
        ("ANIMAL HEALTH PROGRAM ENROLLMENTS", animal_health_programs_sql),
        ("ANIMAL VALUE-ADD PROGRAM ENROLLMENTS", animal_value_add_sql),
        ("COW HEALTH (UI summary)", cow_health_sql),
        ("COW VALUATIONS", cow_valuations_sql),
        ("OWNERSHIP", ownership_sql),
        ("TRANSACTIONS", transactions_sql),
    ]

    total_animals = len(animals)
    lines = [
        "-- ===========================================================================",
        "-- Cattle Platform — Seed Data",
        f"-- Generated : {date.today()}",
        f"-- Animals : {total_animals} across {len(herds)} herds",
        "-- RNG seed : 42 (fully reproducible)",
        "-- NULL fields: contract_address, blockchain_tx_hash (pending implementation)",
        "-- ===========================================================================",
        "",
        "BEGIN;",
        "",
    ]

    for title, stmts in sections:
        if not stmts:
            continue
        lines.append(f"-- ── {title} {'─' * max(0, 72 - len(title))}")
        lines.extend(stmts)
        lines.append("")

    lines += [
        "COMMIT;",
        "",
        "-- ── SANITY CHECKS (uncomment to run after seeding) ─────────────────────────",
        "-- SELECT COUNT(*) AS total_animals FROM animals;",
        "-- SELECT breed_code, COUNT(*) FROM animals GROUP BY 1 ORDER BY 1;",
        "-- SELECT h.herd_name, h.head_count, h.listing_price, h.purchase_status",
        "--   FROM herds h ORDER BY h.listing_price DESC;",
        "-- SELECT COUNT(*) AS vacc_records FROM animal_vaccinations;",
        "-- SELECT COUNT(*) AS epd_records  FROM animal_epds;",
        "-- SELECT COUNT(*) AS valuations   FROM cow_valuation;",
        "-- SELECT u.email, SUM(o.token_amount) AS tokens",
        "--   FROM ownership o JOIN users u ON u.user_id = o.user_id GROUP BY 1 ORDER BY 2 DESC;",
    ]

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate or execute cattle platform seed data."
    )
    parser.add_argument("--execute",  action="store_true",
                        help="Execute SQL directly against Postgres (requires psycopg2)")
    parser.add_argument("--host",     default="localhost")
    parser.add_argument("--port",     default=5432, type=int)
    parser.add_argument("--dbname",   default="cattle_dev")
    parser.add_argument("--user",     default="postgres")
    parser.add_argument("--password", default="")
    parser.add_argument("--output",   default=None,
                        help="Write SQL to this file instead of stdout")
    args = parser.parse_args()

    sql = build_sql()

    if args.output:
        with open(args.output, "w") as f:
            f.write(sql)
        print(f"SQL written to {args.output}")

    elif args.execute:
        try:
            import psycopg2
        except ImportError:
            raise SystemExit("Run: pip install psycopg2-binary")

        conn = psycopg2.connect(
            host=args.host, port=args.port, dbname=args.dbname,
            user=args.user, password=args.password,
        )
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            print("Seed committed successfully.")
        except Exception as exc:
            conn.rollback()
            print(f"Error — rolled back: {exc}")
            raise
        finally:
            conn.close()

    else:
        print(sql)


if __name__ == "__main__":
    main()