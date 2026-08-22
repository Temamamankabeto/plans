CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  office_id BIGINT UNSIGNED NOT NULL,
  directorate_id BIGINT UNSIGNED NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(80) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY departments_code_unique (code),
  UNIQUE KEY departments_scope_name_unique (office_id, directorate_id, name),
  INDEX departments_office_id_index (office_id),
  INDEX departments_directorate_id_index (directorate_id),
  INDEX departments_is_active_index (is_active),
  CONSTRAINT departments_office_id_fk
    FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE RESTRICT,
  CONSTRAINT departments_directorate_id_fk
    FOREIGN KEY (directorate_id) REFERENCES directorates(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name, description)
VALUES
  ('departments.view', 'View departments'),
  ('departments.create', 'Create departments'),
  ('departments.update', 'Update departments'),
  ('departments.delete', 'Delete departments')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
  AND p.name IN ('departments.view', 'departments.create', 'departments.update', 'departments.delete');
