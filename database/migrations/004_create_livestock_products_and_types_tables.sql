CREATE TABLE IF NOT EXISTS livestock_products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  code VARCHAR(80) NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX livestock_products_is_active_index (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS livestock_product_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  livestock_product_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY livestock_product_types_type_name_unique (livestock_product_id, name),
  INDEX livestock_product_types_livestock_product_id_index (livestock_product_id),
  INDEX livestock_product_types_is_active_index (is_active),
  CONSTRAINT livestock_product_types_livestock_product_id_fk FOREIGN KEY (livestock_product_id) REFERENCES livestock_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
