CREATE TABLE IF NOT EXISTS teams (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  directorate_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY teams_directorate_name_unique (directorate_id, name),
  INDEX teams_directorate_id_index (directorate_id),
  INDEX teams_is_active_index (is_active),
  CONSTRAINT teams_directorate_id_fk FOREIGN KEY (directorate_id) REFERENCES directorates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
