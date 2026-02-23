-- Provided EPD / health data tables

-- 1) MASTER ANIMAL TABLE
CREATE TABLE IF NOT EXISTS animals (
  animal_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  registration_number VARCHAR(40),
  official_id VARCHAR(60), -- EID / tag / tattoo
  animal_name VARCHAR(120),
  breed_code VARCHAR(20),
  sex_code CHAR(1), -- B,C,H,S
  birth_date DATE,
  sire_registration_number VARCHAR(40),
  dam_registration_number VARCHAR(40),
  is_genomic_enhanced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_animals_reg_breed
ON animals (breed_code, registration_number);

-- 2) LIVE WEIGHT HISTORY
CREATE TABLE IF NOT EXISTS animal_weights (
  weight_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  animal_id BIGINT NOT NULL REFERENCES animals(animal_id),
  weight_date DATE NOT NULL,
  weight_lbs DECIMAL(10,2) NOT NULL,
  weight_type VARCHAR(30), -- birth, weaning, yearling, sale, etc.
  location_code VARCHAR(60), -- ranch, yard, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_weights_animal
ON animal_weights (animal_id, weight_date);

-- 3) EPD TRAIT DICTIONARY
CREATE TABLE IF NOT EXISTS epd_traits (
  trait_code VARCHAR(20) PRIMARY KEY,
  trait_name VARCHAR(80) NOT NULL,
  trait_category VARCHAR(30) NOT NULL,
  unit_of_measure VARCHAR(20),
  description VARCHAR(300),
  is_index BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

-- 4) EPD RUNS (EVALUATION RELEASES)
CREATE TABLE IF NOT EXISTS epd_runs (
  epd_run_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  breed_code VARCHAR(20) NOT NULL,
  source_system VARCHAR(80),
  evaluation_date DATE NOT NULL,
  import_batch_id VARCHAR(80),
  notes VARCHAR(300),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_epd_runs_breed_date
ON epd_runs (breed_code, evaluation_date);

-- 5) ANIMAL EPD VALUES
CREATE TABLE IF NOT EXISTS animal_epds (
  animal_epd_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  animal_id BIGINT NOT NULL REFERENCES animals(animal_id),
  epd_run_id BIGINT NOT NULL REFERENCES epd_runs(epd_run_id),
  trait_code VARCHAR(20) NOT NULL REFERENCES epd_traits(trait_code),
  epd_value DECIMAL(12,4),
  accuracy DECIMAL(6,4),
  percentile_rank DECIMAL(6,2),
  interim_flag BOOLEAN DEFAULT FALSE,
  data_source_ref VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_animal_epds_run_trait
ON animal_epds (animal_id, epd_run_id, trait_code);

-- 6) VACCINATION MASTER LIST
CREATE TABLE IF NOT EXISTS vaccines (
  vaccine_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vaccine_name VARCHAR(120) NOT NULL,
  manufacturer VARCHAR(120),
  vaccine_type VARCHAR(60), -- viral, clostridial, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7) ANIMAL VACCINATION RECORDS
CREATE TABLE IF NOT EXISTS animal_vaccinations (
  animal_vacc_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  animal_id BIGINT NOT NULL REFERENCES animals(animal_id),
  vaccine_id BIGINT NOT NULL REFERENCES vaccines(vaccine_id),
  administration_date DATE NOT NULL,
  dose VARCHAR(40),
  route VARCHAR(40), -- IM, SQ, oral
  administered_by VARCHAR(120),
  lot_number VARCHAR(60),
  booster_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_animal_vacc
ON animal_vaccinations (animal_id, administration_date);

-- 8) HEALTH PROGRAM MASTER TABLE
CREATE TABLE IF NOT EXISTS health_programs (
  health_program_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_name VARCHAR(120) NOT NULL,
  program_description VARCHAR(300),
  certifying_body VARCHAR(120), -- e.g., IMI Global
  active_flag BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9) ANIMAL HEALTH PROGRAM ENROLLMENT
CREATE TABLE IF NOT EXISTS animal_health_programs (
  animal_health_prog_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  animal_id BIGINT NOT NULL REFERENCES animals(animal_id),
  health_program_id BIGINT NOT NULL REFERENCES health_programs(health_program_id),
  enrollment_date DATE,
  expiration_date DATE,
  certification_number VARCHAR(80),
  verified_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_animal_health_program
ON animal_health_programs (animal_id);

-- 10) VALUE-ADD PROGRAM MASTER TABLE
CREATE TABLE IF NOT EXISTS value_add_programs (
  value_add_program_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_name VARCHAR(120) NOT NULL,
  program_type VARCHAR(60), -- NHTC, GAP, Verified Natural, etc.
  certifying_body VARCHAR(120),
  description VARCHAR(300),
  active_flag BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11) ANIMAL VALUE-ADD ENROLLMENT
CREATE TABLE IF NOT EXISTS animal_value_add_programs (
  animal_value_add_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  animal_id BIGINT NOT NULL REFERENCES animals(animal_id),
  value_add_program_id BIGINT NOT NULL REFERENCES value_add_programs(value_add_program_id),
  enrollment_date DATE,
  expiration_date DATE,
  certification_number VARCHAR(80),
  verified_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_animal_value_add
ON animal_value_add_programs (animal_id);
