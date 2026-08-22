-- Allow OCDU Department Managers to make the final plan decision only within
-- the department scope enforced by the planning decision API.

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.name IN (
  'planning_records.final_approve',
  'planning_records.reject',
  'planning_records.history',
  'planning_records.attachments',
  'planning_records.read'
)
WHERE LOWER(r.name) IN (
  'director',
  'manager',
  'ocdu director',
  'agricultural value chain monitoring manager',
  'manufacturing value chain monitoring manager',
  'investment monitoring manager',
  'job creation monitoring manager'
);
