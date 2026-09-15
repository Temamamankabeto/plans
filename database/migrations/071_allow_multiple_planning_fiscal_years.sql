-- Allow more than one Ethiopian fiscal year to be open for planning at the same time.
-- The legacy fiscal_year column is intentionally retained for backward compatibility.
SET @db := DATABASE();
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'planning_settings' AND COLUMN_NAME = 'fiscal_years'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE planning_settings ADD COLUMN fiscal_years TEXT NULL AFTER fiscal_year',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE planning_settings
SET fiscal_years = CONCAT('["', REPLACE(fiscal_year, '"', '\\"'), '"]')
WHERE (fiscal_years IS NULL OR TRIM(fiscal_years) = '') AND fiscal_year IS NOT NULL AND TRIM(fiscal_year) <> '';
