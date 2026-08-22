-- Fix planning_records schema for Annual Plan -> Monthly Plan -> Achievement workflow.
-- This migration is intentionally new so it will run even if an older planning_records migration was already applied.

SET @db_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='annual_plan_id') = 0,
  'ALTER TABLE planning_records ADD COLUMN annual_plan_id BIGINT UNSIGNED NULL AFTER id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='module_type') = 0,
  "ALTER TABLE planning_records ADD COLUMN module_type ENUM('crop','livestock') NOT NULL DEFAULT 'crop' AFTER worktype_id",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='specification') = 0,
  'ALTER TABLE planning_records ADD COLUMN specification VARCHAR(255) NULL AFTER crop_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_land_area') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_land_area DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER month',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_productivity') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_productivity DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER plan_land_area',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_production') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_production DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER plan_productivity',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_land_area') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_land_area DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER plan_production',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_productivity') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_productivity DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER achievement_land_area',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_production') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_production DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER achievement_productivity',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_population') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_population DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER achievement_production',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_population') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_population DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER plan_population',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill new plan columns from older legacy columns, if legacy data exists.
UPDATE planning_records
SET
  plan_land_area = COALESCE(NULLIF(plan_land_area, 0), cultivated_land_area, 0),
  plan_productivity = COALESCE(NULLIF(plan_productivity, 0), productivity, 0),
  plan_production = COALESCE(NULLIF(plan_production, 0), production_volume, 0),
  plan_population = COALESCE(NULLIF(plan_population, 0), population, 0)
WHERE record_type = 'plan';

-- Link existing monthly plan rows to their annual plan where possible.
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

-- Add indexes only when they do not already exist.
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND INDEX_NAME='idx_planning_records_annual_plan') = 0,
  'CREATE INDEX idx_planning_records_annual_plan ON planning_records (annual_plan_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
