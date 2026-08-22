-- Department-scoped consolidated reporting for Office of President / OCDU users.
-- The API additionally enforces Office, Directorate, Department and role scope.

INSERT INTO permissions (name, description) VALUES
  ('ocdu_reports.read', 'View OCDU reports restricted to the user assigned department')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'ocdu_reports.read',
  'planning_records.read',
  'planning_records.history',
  'planning_monitoring.cross_office',
  'planning_monitoring.consolidated_reports',
  'reports.read',
  'trade_records.read'
)
WHERE LOWER(r.name) IN (
  'manager',
  'adviser',
  'advisor',
  'ocdu director',
  'agricultural value chain monitoring manager',
  'manufacturing value chain monitoring manager',
  'investment monitoring manager',
  'job creation monitoring manager',
  'monitoring and evaluation advisory'
);
