CREATE TABLE IF NOT EXISTS planning_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  annual_plan_id BIGINT UNSIGNED NULL,
  office_id BIGINT UNSIGNED NOT NULL,
  directorate_id BIGINT UNSIGNED NULL,
  team_id BIGINT UNSIGNED NULL,
  worktype_id BIGINT UNSIGNED NULL,
  module_type ENUM('crop','livestock') NOT NULL DEFAULT 'crop',
  record_type ENUM('plan','achievement') NOT NULL DEFAULT 'plan',
  period_type ENUM('annual','monthly') NOT NULL DEFAULT 'annual',
  crop_type_id BIGINT UNSIGNED NULL,
  crop_id BIGINT UNSIGNED NULL,
  specification VARCHAR(255) NULL,
  livestock_product_id BIGINT UNSIGNED NULL,
  livestock_product_type_id BIGINT UNSIGNED NULL,
  fiscal_year VARCHAR(20) NOT NULL,
  month TINYINT UNSIGNED NULL,
  cultivated_land_area DECIMAL(18,2) NULL DEFAULT 0,
  productivity DECIMAL(18,4) NULL DEFAULT 0,
  production_volume DECIMAL(18,2) NULL DEFAULT 0,
  population DECIMAL(18,2) NULL DEFAULT 0,
  plan_land_area DECIMAL(18,2) NOT NULL DEFAULT 0,
  plan_productivity DECIMAL(18,4) NOT NULL DEFAULT 0,
  plan_production DECIMAL(18,2) NOT NULL DEFAULT 0,
  achievement_land_area DECIMAL(18,2) NOT NULL DEFAULT 0,
  achievement_productivity DECIMAL(18,4) NOT NULL DEFAULT 0,
  achievement_production DECIMAL(18,2) NOT NULL DEFAULT 0,
  plan_population DECIMAL(18,2) NOT NULL DEFAULT 0,
  achievement_population DECIMAL(18,2) NOT NULL DEFAULT 0,
  status ENUM('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_planning_records_annual_plan (annual_plan_id),
  INDEX idx_planning_records_scope (office_id, directorate_id, team_id, fiscal_year),
  INDEX idx_planning_records_type (module_type, record_type, period_type),
  INDEX idx_planning_records_crop (crop_type_id, crop_id),
  INDEX idx_planning_records_livestock (livestock_product_id, livestock_product_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS planning_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fiscal_year VARCHAR(20) NOT NULL DEFAULT '2026',
  annual_plan_open TINYINT(1) NOT NULL DEFAULT 1,
  annual_achievement_open TINYINT(1) NOT NULL DEFAULT 0,
  monthly_plan_open TINYINT(1) NOT NULL DEFAULT 1,
  monthly_achievement_open TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO planning_settings (id, fiscal_year, annual_plan_open, annual_achievement_open, monthly_plan_open, monthly_achievement_open)
VALUES (1, YEAR(CURDATE()), 1, 0, 1, 1)
ON DUPLICATE KEY UPDATE id = id;

SET @db_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='annual_plan_id') = 0,
  "ALTER TABLE planning_records ADD COLUMN annual_plan_id BIGINT UNSIGNED NULL AFTER id",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='module_type') = 0,
  "ALTER TABLE planning_records ADD COLUMN module_type ENUM('crop','livestock') NOT NULL DEFAULT 'crop' AFTER worktype_id",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='specification') = 0,
  "ALTER TABLE planning_records ADD COLUMN specification VARCHAR(255) NULL AFTER crop_id",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_land_area') = 0,
  "ALTER TABLE planning_records ADD COLUMN plan_land_area DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER month",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_productivity') = 0,
  "ALTER TABLE planning_records ADD COLUMN plan_productivity DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER plan_land_area",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_production') = 0,
  "ALTER TABLE planning_records ADD COLUMN plan_production DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER plan_productivity",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_land_area') = 0,
  "ALTER TABLE planning_records ADD COLUMN achievement_land_area DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER plan_production",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_productivity') = 0,
  "ALTER TABLE planning_records ADD COLUMN achievement_productivity DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER achievement_land_area",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_production') = 0,
  "ALTER TABLE planning_records ADD COLUMN achievement_production DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER achievement_productivity",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_population') = 0,
  "ALTER TABLE planning_records ADD COLUMN plan_population DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER achievement_production",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_population') = 0,
  "ALTER TABLE planning_records ADD COLUMN achievement_population DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER plan_population",
  "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE planning_records
SET
  record_type = 'plan',
  plan_land_area = COALESCE(NULLIF(plan_land_area, 0), cultivated_land_area, 0),
  plan_productivity = COALESCE(NULLIF(plan_productivity, 0), productivity, 0),
  plan_production = COALESCE(NULLIF(plan_production, 0), production_volume, 0),
  plan_population = COALESCE(NULLIF(plan_population, 0), population, 0)
WHERE record_type = 'plan';

UPDATE planning_records monthly
JOIN planning_records annual ON annual.period_type = 'annual'
  AND annual.record_type = 'plan'
  AND annual.office_id = monthly.office_id
  AND COALESCE(annual.directorate_id,0) = COALESCE(monthly.directorate_id,0)
  AND COALESCE(annual.team_id,0) = COALESCE(monthly.team_id,0)
  AND annual.module_type = monthly.module_type
  AND annual.fiscal_year = monthly.fiscal_year
  AND COALESCE(annual.crop_type_id,0) = COALESCE(monthly.crop_type_id,0)
  AND COALESCE(annual.crop_id,0) = COALESCE(monthly.crop_id,0)
  AND COALESCE(annual.specification,'') = COALESCE(monthly.specification,'')
  AND COALESCE(annual.livestock_product_id,0) = COALESCE(monthly.livestock_product_id,0)
  AND COALESCE(annual.livestock_product_type_id,0) = COALESCE(monthly.livestock_product_type_id,0)
SET monthly.annual_plan_id = annual.id
WHERE monthly.period_type = 'monthly' AND monthly.annual_plan_id IS NULL;
