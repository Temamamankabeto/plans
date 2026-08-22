CREATE TABLE IF NOT EXISTS planning_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  office_id BIGINT UNSIGNED NOT NULL,
  directorate_id BIGINT UNSIGNED NULL,
  team_id BIGINT UNSIGNED NULL,
  worktype_id BIGINT UNSIGNED NULL,

  record_type ENUM('plan','achievement') NOT NULL,
  period_type ENUM('annual','monthly') NOT NULL,

  crop_type_id BIGINT UNSIGNED NULL,
  crop_id BIGINT UNSIGNED NULL,
  livestock_product_id BIGINT UNSIGNED NULL,
  livestock_product_type_id BIGINT UNSIGNED NULL,

  fiscal_year VARCHAR(20) NOT NULL,
  month TINYINT UNSIGNED NULL,

  cultivated_land_area DECIMAL(18,2) NULL DEFAULT 0,
  productivity DECIMAL(18,2) NULL DEFAULT 0,
  production_volume DECIMAL(18,2) NULL DEFAULT 0,
  population BIGINT UNSIGNED NULL DEFAULT 0,

  status ENUM('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_planning_records_office (office_id),
  INDEX idx_planning_records_directorate (directorate_id),
  INDEX idx_planning_records_team (team_id),
  INDEX idx_planning_records_worktype (worktype_id),
  INDEX idx_planning_records_record_type (record_type),
  INDEX idx_planning_records_period (period_type, fiscal_year, month),
  INDEX idx_planning_records_status (status),
  INDEX idx_planning_records_crop (crop_type_id, crop_id),
  INDEX idx_planning_records_livestock (livestock_product_id, livestock_product_type_id),

  CONSTRAINT fk_planning_records_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_planning_records_directorate FOREIGN KEY (directorate_id) REFERENCES directorates(id) ON DELETE SET NULL,
  CONSTRAINT fk_planning_records_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_planning_records_worktype FOREIGN KEY (worktype_id) REFERENCES work_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_planning_records_crop_type FOREIGN KEY (crop_type_id) REFERENCES crop_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_planning_records_crop FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE SET NULL,
  CONSTRAINT fk_planning_records_livestock_product FOREIGN KEY (livestock_product_id) REFERENCES livestock_products(id) ON DELETE SET NULL,
  CONSTRAINT fk_planning_records_livestock_product_type FOREIGN KEY (livestock_product_type_id) REFERENCES livestock_product_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_planning_records_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_planning_records_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_planning_records_month CHECK (
    (period_type = 'annual' AND month IS NULL) OR
    (period_type = 'monthly' AND month BETWEEN 1 AND 12)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
