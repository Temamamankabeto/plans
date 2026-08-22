-- Migration: initial plan and achievement schema

CREATE TABLE IF NOT EXISTS offices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  code VARCHAR(80) NOT NULL UNIQUE,
  type VARCHAR(80) NOT NULL DEFAULT 'office',
  parent_id BIGINT UNSIGNED NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX offices_parent_id_index (parent_id),
  CONSTRAINT offices_parent_id_fk FOREIGN KEY (parent_id) REFERENCES offices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS directorates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  office_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY directorates_office_name_unique (office_id, name),
  INDEX directorates_office_id_index (office_id),
  CONSTRAINT directorates_office_id_fk FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fk FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_id_fk FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(80) NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  office_id BIGINT UNSIGNED NULL,
  department_id BIGINT UNSIGNED NULL,
  address VARCHAR(255) NULL,
  professional_level VARCHAR(50) NULL,
  signature_url VARCHAR(255) NULL,
  stamp_url VARCHAR(255) NULL,
  titer_url VARCHAR(255) NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX users_office_id_index (office_id),
  INDEX users_department_id_index (department_id),
  CONSTRAINT users_office_id_fk FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL,
  CONSTRAINT users_department_id_fk FOREIGN KEY (department_id) REFERENCES directorates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT user_roles_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_role_id_fk FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  office_id BIGINT UNSIGNED NOT NULL,
  directorate_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  plan_no VARCHAR(80) NULL UNIQUE,
  fiscal_year VARCHAR(20) NOT NULL,
  quarter VARCHAR(20) NULL,
  month VARCHAR(20) NULL,
  value_chain VARCHAR(191) NOT NULL,
  indicator VARCHAR(191) NOT NULL,
  unit VARCHAR(80) NOT NULL,
  annual_target DECIMAL(18,2) NOT NULL DEFAULT 0,
  quarterly_target DECIMAL(18,2) NULL,
  status ENUM('draft','submitted','reviewed','approved','returned') NOT NULL DEFAULT 'draft',
  remark TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX plans_office_fiscal_index (office_id, fiscal_year),
  INDEX plans_status_index (status),
  CONSTRAINT plans_office_id_fk FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE RESTRICT,
  CONSTRAINT plans_directorate_id_fk FOREIGN KEY (directorate_id) REFERENCES directorates(id) ON DELETE SET NULL,
  CONSTRAINT plans_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  achievement_no VARCHAR(80) NULL UNIQUE,
  achieved DECIMAL(18,2) NOT NULL DEFAULT 0,
  report_date DATE NOT NULL,
  period VARCHAR(80) NULL,
  evidence_file_path VARCHAR(255) NULL,
  status ENUM('draft','submitted','reviewed','approved','returned') NOT NULL DEFAULT 'submitted',
  remark TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX achievements_plan_report_index (plan_id, report_date),
  CONSTRAINT achievements_plan_id_fk FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(191) NOT NULL,
  module VARCHAR(191) NULL,
  entity_type VARCHAR(191) NOT NULL,
  entity_id VARCHAR(80) NULL,
  message TEXT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  ip_address VARCHAR(80) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX audit_logs_user_id_index (user_id),
  INDEX audit_logs_entity_index (entity_type, entity_id),
  CONSTRAINT audit_logs_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
