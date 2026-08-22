-- Ensure Expert users can see and use their dynamically assigned planning workspace.
-- Access Mapping still controls module, crop type and allowed write actions.

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'dashboard.view',
  'planning_records.read',
  'planning_records.create',
  'planning_records.update',
  'planning_records.history',
  'planning_records.attachments',
  'reports.read'
)
WHERE LOWER(REPLACE(REPLACE(TRIM(r.name), ' ', '_'), '-', '_')) = 'expert';
