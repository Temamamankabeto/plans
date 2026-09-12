-- Synchronize the base Plan & Achievement permissions required by the Director role.
-- This is intentionally additive/non-destructive: it does not remove or alter any
-- existing permissions, access mappings, workflow history, plans, or achievements.
--
-- Director sidebar items require:
--   planning_records.read
--   reports.read
--
-- The current Team-Leader-first workflow also allows Directors to create/update
-- their own plan and achievement records, and to review/approve Team Leader submissions.

INSERT IGNORE INTO permissions (name, description) VALUES
  ('planning_records.read', 'View planning and achievement records'),
  ('planning_records.create', 'Create planning records'),
  ('planning_records.update', 'Update planning and achievement records'),
  ('planning_records.comment', 'Comment on planning and achievement records'),
  ('planning_records.director_approve', 'Approve Team Leader submissions at Directorate level'),
  ('planning_records.history', 'View planning workflow history'),
  ('planning_records.attachments', 'Manage planning supporting evidence'),
  ('reports.read', 'View planning and achievement reports');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'planning_records.read',
  'planning_records.create',
  'planning_records.update',
  'planning_records.comment',
  'planning_records.director_approve',
  'planning_records.history',
  'planning_records.attachments',
  'reports.read'
)
WHERE LOWER(REPLACE(REPLACE(TRIM(r.name), ' ', '_'), '-', '_')) = 'director';
