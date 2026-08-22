-- Expanded plan and achievement workflow.
-- This migration is additive and preserves all existing records and audit history.

SET @db_name = DATABASE();

INSERT INTO roles (name, description) VALUES
  ('OCDU Director', 'Final approval and consolidated monitoring across participating offices.'),
  ('Agricultural Value Chain Monitoring Manager', 'Reviews Agriculture and Livestock plans, achievements, corrections, and consolidated reports.'),
  ('Manufacturing Value Chain Monitoring Manager', 'Monitors Manufacturing and value-addition plans, achievements, and performance gaps.'),
  ('Investment Monitoring Manager', 'Monitors investment plans, projects, achievements, delays, and consolidated performance.'),
  ('Job Creation Monitoring Manager', 'Monitors cross-office employment plans, achievements, evidence, and performance.'),
  ('Monitoring and Evaluation Advisory', 'Provides high-level cross-office monitoring, data-quality, trend, and executive analysis.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

ALTER TABLE planning_records
  MODIFY COLUMN plan_status ENUM(
    'draft',
    'submitted',
    'verified',
    'director_approved',
    'accepted',
    'returned',
    'submitted_team_leader',
    'verified_team_leader',
    'submitted_director',
    'rejected',
    'approved_director',
    'finally_approved'
  ) NOT NULL DEFAULT 'draft',
  MODIFY COLUMN achievement_status ENUM(
    'draft',
    'submitted',
    'verified',
    'director_approved',
    'accepted',
    'returned',
    'submitted_team_leader',
    'verified_team_leader',
    'submitted_director',
    'rejected',
    'approved_director'
  ) NOT NULL DEFAULT 'draft';

UPDATE planning_records
SET plan_status = CASE plan_status
  WHEN 'submitted' THEN IF(plan_submitted_by_role = 'team_leader', 'submitted_director', 'submitted_team_leader')
  WHEN 'verified' THEN 'verified_team_leader'
  WHEN 'director_approved' THEN 'approved_director'
  WHEN 'accepted' THEN 'finally_approved'
  ELSE plan_status
END;

UPDATE planning_records
SET achievement_status = CASE achievement_status
  WHEN 'submitted' THEN IF(achievement_submitted_by_role = 'team_leader', 'submitted_director', 'submitted_team_leader')
  WHEN 'verified' THEN 'verified_team_leader'
  WHEN 'director_approved' THEN 'approved_director'
  WHEN 'accepted' THEN 'approved_director'
  ELSE achievement_status
END;

ALTER TABLE planning_record_workflow_history
  MODIFY COLUMN action ENUM(
    'submit',
    'verify',
    'approve',
    'final_approve',
    'return',
    'reject',
    'comment'
  ) NOT NULL;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'planning_records' AND COLUMN_NAME = 'achievement_remark') = 0,
  'ALTER TABLE planning_records ADD COLUMN achievement_remark TEXT NULL AFTER achievement_comment',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS planning_record_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  planning_record_id BIGINT UNSIGNED NOT NULL,
  target ENUM('plan','achievement') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_planning_attachment_record (planning_record_id, target),
  CONSTRAINT fk_planning_attachment_record
    FOREIGN KEY (planning_record_id) REFERENCES planning_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_planning_attachment_user
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name, description) VALUES
  ('planning_records.bulk_verify', 'Bulk verify eligible monthly achievements'),
  ('planning_records.bulk_approve', 'Bulk approve eligible monthly achievements'),
  ('planning_records.reject', 'Reject eligible plans and achievements with a reason'),
  ('planning_records.history', 'View complete planning approval history'),
  ('planning_records.attachments', 'Upload and download planning supporting evidence'),
  ('planning_monitoring.cross_office', 'View Director-approved records across participating offices'),
  ('planning_monitoring.consolidated_reports', 'Produce consolidated cross-office monitoring reports')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'planning_records.history',
  'planning_records.attachments'
)
WHERE LOWER(REPLACE(REPLACE(r.name, ' ', '_'), '-', '_')) = 'expert';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'planning_records.read',
  'planning_records.comment',
  'planning_records.verify',
  'planning_records.bulk_verify',
  'planning_records.reject',
  'planning_records.history',
  'planning_records.attachments',
  'reports.read'
)
WHERE LOWER(REPLACE(REPLACE(r.name, ' ', '_'), '-', '_')) = 'team_leader';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'planning_records.read',
  'planning_records.comment',
  'planning_records.director_approve',
  'planning_records.bulk_approve',
  'planning_records.reject',
  'planning_records.history',
  'planning_records.attachments',
  'reports.read'
)
WHERE LOWER(REPLACE(REPLACE(r.name, ' ', '_'), '-', '_')) = 'director';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'planning_records.read',
  'planning_records.comment',
  'planning_records.history',
  'planning_records.attachments',
  'planning_monitoring.cross_office',
  'planning_monitoring.consolidated_reports',
  'reports.read'
)
WHERE LOWER(r.name) IN (
  'ocdu director',
  'agricultural value chain monitoring manager',
  'manufacturing value chain monitoring manager',
  'investment monitoring manager',
  'job creation monitoring manager',
  'monitoring and evaluation advisory'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'planning_records.read',
  'planning_records.comment',
  'planning_records.final_approve',
  'planning_records.reject',
  'planning_records.history',
  'planning_records.attachments',
  'planning_monitoring.cross_office',
  'planning_monitoring.consolidated_reports',
  'reports.read'
)
WHERE LOWER(r.name) = 'ocdu director';
