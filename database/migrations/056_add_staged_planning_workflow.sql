-- Expert -> Team Leader verification -> Director approval -> OCDU final approval.
-- Existing accepted records remain finally approved.

SET @db_name = DATABASE();

CREATE TABLE IF NOT EXISTS planning_record_workflow_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_record_id BIGINT UNSIGNED NOT NULL,
  target ENUM('plan','achievement') NOT NULL,
  action ENUM('submit','verify','approve','final_approve','return','comment') NOT NULL,
  from_status VARCHAR(40) NOT NULL,
  to_status VARCHAR(40) NOT NULL,
  comment TEXT NULL,
  acted_by BIGINT UNSIGNED NOT NULL,
  acted_as VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_planning_workflow_record (planning_record_id, target, created_at),
  INDEX idx_planning_workflow_actor (acted_by, created_at),
  CONSTRAINT fk_planning_workflow_record FOREIGN KEY (planning_record_id) REFERENCES planning_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_planning_workflow_actor FOREIGN KEY (acted_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE planning_records
  MODIFY COLUMN plan_status ENUM('draft','submitted','verified','director_approved','accepted','returned') NOT NULL DEFAULT 'draft',
  MODIFY COLUMN achievement_status ENUM('draft','submitted','verified','director_approved','accepted','returned') NOT NULL DEFAULT 'draft';

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_submitted_by') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_submitted_by BIGINT UNSIGNED NULL AFTER plan_comment', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO permissions (name, description) VALUES
  ('planning_records.verify', 'Verify Expert plans and achievements at Team Leader level'),
  ('planning_records.director_approve', 'Approve verified plans and achievements at Directorate level'),
  ('planning_records.final_approve', 'Give final OCDU approval to Director-approved plans and achievements')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
INNER JOIN permissions p ON p.name IN ('planning_records.read','planning_records.comment','planning_records.verify')
WHERE LOWER(REPLACE(REPLACE(r.name, ' ', '_'), '-', '_')) = 'team_leader';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
INNER JOIN permissions p ON p.name IN (
  'planning_records.read',
  'planning_records.comment',
  'planning_records.director_approve',
  'planning_records.final_approve',
  'reports.read'
)
WHERE LOWER(REPLACE(REPLACE(r.name, ' ', '_'), '-', '_')) = 'director';

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_submitted_by_role') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_submitted_by_role VARCHAR(40) NULL AFTER plan_submitted_by', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_submitted_at') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_submitted_at TIMESTAMP NULL AFTER plan_submitted_by_role', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_verified_by') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_verified_by BIGINT UNSIGNED NULL AFTER plan_submitted_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_verified_at') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_verified_at TIMESTAMP NULL AFTER plan_verified_by', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_director_approved_by') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_director_approved_by BIGINT UNSIGNED NULL AFTER plan_verified_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='plan_director_approved_at') = 0,
  'ALTER TABLE planning_records ADD COLUMN plan_director_approved_at TIMESTAMP NULL AFTER plan_director_approved_by', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_submitted_by') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_submitted_by BIGINT UNSIGNED NULL AFTER achievement_comment', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_submitted_by_role') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_submitted_by_role VARCHAR(40) NULL AFTER achievement_submitted_by', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_submitted_at') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_submitted_at TIMESTAMP NULL AFTER achievement_submitted_by_role', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_verified_by') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_verified_by BIGINT UNSIGNED NULL AFTER achievement_submitted_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_verified_at') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_verified_at TIMESTAMP NULL AFTER achievement_verified_by', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_director_approved_by') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_director_approved_by BIGINT UNSIGNED NULL AFTER achievement_verified_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND COLUMN_NAME='achievement_director_approved_at') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_director_approved_at TIMESTAMP NULL AFTER achievement_director_approved_by', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND INDEX_NAME='idx_planning_records_plan_workflow') = 0,
  'CREATE INDEX idx_planning_records_plan_workflow ON planning_records (plan_status, office_id, directorate_id, team_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='planning_records' AND INDEX_NAME='idx_planning_records_achievement_workflow') = 0,
  'CREATE INDEX idx_planning_records_achievement_workflow ON planning_records (achievement_status, office_id, directorate_id, team_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
