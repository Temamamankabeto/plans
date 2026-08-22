INSERT INTO roles (name, description)
VALUES
  ('Manager', 'Management-level plan review, approval, monitoring, and reporting access controlled by organizational assignment.'),
  ('Adviser', 'Advisory-level plan review, commenting, monitoring, and reporting access controlled by organizational assignment.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'dashboard.view',
  'planning_records.read',
  'planning_records.comment',
  'planning_records.approve',
  'reports.read',
  'reports.view',
  'trade_records.read',
  'trade_records.comment',
  'trade_records.approve',
  'trade_reports.read'
)
WHERE r.name = 'Manager';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'dashboard.view',
  'planning_records.read',
  'planning_records.comment',
  'reports.read',
  'reports.view',
  'trade_records.read',
  'trade_records.comment',
  'trade_reports.read'
)
WHERE r.name = 'Adviser';
