-- Correct organization hierarchy to: Office -> Department -> Directorate -> Team.
-- Non-destructive: legacy departments.directorate_id is preserved for compatibility,
-- while new/updated CRUD uses directorates.department_id as the authoritative parent.

SET @department_id_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'directorates' AND COLUMN_NAME = 'department_id'
);
SET @sql := IF(
  @department_id_exists = 0,
  'ALTER TABLE directorates ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER office_id, ADD INDEX directorates_department_id_index (department_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Safely backfill only directorates that have exactly one legacy department child.
UPDATE directorates d
JOIN (
  SELECT directorate_id, MIN(id) AS department_id
  FROM departments
  WHERE directorate_id IS NOT NULL
  GROUP BY directorate_id
  HAVING COUNT(*) = 1
) legacy ON legacy.directorate_id = d.id
SET d.department_id = COALESCE(d.department_id, legacy.department_id)
WHERE d.department_id IS NULL;

SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'directorates'
    AND CONSTRAINT_NAME = 'directorates_department_id_fk'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE directorates ADD CONSTRAINT directorates_department_id_fk FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
