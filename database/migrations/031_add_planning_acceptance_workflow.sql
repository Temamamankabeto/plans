-- Add acceptance/comment workflow for plans and achievements.
-- Annual plans and monthly plan rows can be accepted by Agricultural Value Chain Delivery Manager.
-- Accepted plan/achievement sections are locked from later user edits.

SET @db_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_status') = 0,
  "ALTER TABLE planning_records ADD COLUMN plan_status ENUM('draft','submitted','accepted','returned') NOT NULL DEFAULT 'draft' AFTER status",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_status') = 0,
  "ALTER TABLE planning_records ADD COLUMN achievement_status ENUM('draft','submitted','accepted','returned') NOT NULL DEFAULT 'draft' AFTER plan_status",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_comment') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_comment TEXT NULL AFTER achievement_status',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_comment') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_comment TEXT NULL AFTER plan_comment',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_accepted_by') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_accepted_by BIGINT UNSIGNED NULL AFTER achievement_comment',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_accepted_by') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_accepted_by BIGINT UNSIGNED NULL AFTER plan_accepted_by',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_accepted_at') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_accepted_at TIMESTAMP NULL AFTER achievement_accepted_by',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_accepted_at') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_accepted_at TIMESTAMP NULL AFTER plan_accepted_at',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE planning_records
SET plan_status = CASE
  WHEN status = 'approved' THEN 'accepted'
  WHEN status = 'submitted' THEN 'submitted'
  WHEN status = 'rejected' THEN 'returned'
  ELSE 'draft'
END
WHERE plan_status = 'draft';
