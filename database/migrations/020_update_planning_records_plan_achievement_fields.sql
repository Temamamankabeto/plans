CREATE TABLE IF NOT EXISTS planning_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fiscal_year VARCHAR(20) NOT NULL DEFAULT '2026',
  annual_plan_open TINYINT(1) NOT NULL DEFAULT 1,
  annual_achievement_open TINYINT(1) NOT NULL DEFAULT 1,
  monthly_plan_open TINYINT(1) NOT NULL DEFAULT 1,
  monthly_achievement_open TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO planning_settings (id, fiscal_year, annual_plan_open, annual_achievement_open, monthly_plan_open, monthly_achievement_open)
VALUES (1, YEAR(CURDATE()), 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE id = id;

SET @db_name = DATABASE();

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
  "ALTER TABLE planning_records ADD COLUMN plan_productivity DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER plan_land_area",
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
  "ALTER TABLE planning_records ADD COLUMN achievement_productivity DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER achievement_land_area",
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
  plan_land_area = COALESCE(NULLIF(plan_land_area, 0), cultivated_land_area, 0),
  plan_productivity = COALESCE(NULLIF(plan_productivity, 0), productivity, 0),
  plan_production = COALESCE(NULLIF(plan_production, 0), production_volume, 0),
  plan_population = COALESCE(NULLIF(plan_population, 0), population, 0)
WHERE record_type = 'plan';

UPDATE planning_records
SET
  achievement_land_area = COALESCE(NULLIF(achievement_land_area, 0), cultivated_land_area, 0),
  achievement_productivity = COALESCE(NULLIF(achievement_productivity, 0), productivity, 0),
  achievement_production = COALESCE(NULLIF(achievement_production, 0), production_volume, 0),
  achievement_population = COALESCE(NULLIF(achievement_population, 0), population, 0)
WHERE record_type = 'achievement';
