CREATE TABLE IF NOT EXISTS livestock_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  code VARCHAR(80) NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX livestock_types_is_active_index (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'livestock_products'
    AND COLUMN_NAME = 'livestock_type_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE livestock_products ADD COLUMN livestock_type_id BIGINT UNSIGNED NULL AFTER id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'livestock_products'
    AND INDEX_NAME = 'livestock_products_livestock_type_id_index'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE livestock_products ADD INDEX livestock_products_livestock_type_id_index (livestock_type_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'livestock_products'
    AND CONSTRAINT_NAME = 'livestock_products_livestock_type_id_fk'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE livestock_products ADD CONSTRAINT livestock_products_livestock_type_id_fk FOREIGN KEY (livestock_type_id) REFERENCES livestock_types(id) ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
