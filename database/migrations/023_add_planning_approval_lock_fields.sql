-- Add review/comment and lock fields for President Office managers.

SET @db_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='approval_comment') = 0,
  'ALTER TABLE planning_records ADD COLUMN approval_comment TEXT NULL AFTER approved_by',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='approved_at') = 0,
  'ALTER TABLE planning_records ADD COLUMN approved_at TIMESTAMP NULL AFTER approval_comment',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='is_locked') = 0,
  'ALTER TABLE planning_records ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER approved_at',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND INDEX_NAME='idx_planning_records_locked') = 0,
  'CREATE INDEX idx_planning_records_locked ON planning_records (is_locked)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
