CREATE TABLE IF NOT EXISTS livestock_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  livestock_type_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_livestock_category_type_name (livestock_type_id, name),
  KEY idx_livestock_categories_type (livestock_type_id),
  CONSTRAINT fk_livestock_categories_type FOREIGN KEY (livestock_type_id) REFERENCES livestock_types(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livestock_products' AND COLUMN_NAME='livestock_category_id');
SET @sql := IF(@has_col=0, 'ALTER TABLE livestock_products ADD COLUMN livestock_category_id BIGINT UNSIGNED NULL AFTER livestock_type_id', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livestock_products' AND INDEX_NAME='idx_livestock_products_category');
SET @sql := IF(@has_idx=0, 'ALTER TABLE livestock_products ADD KEY idx_livestock_products_category (livestock_category_id)', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_fk := (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='livestock_products' AND CONSTRAINT_NAME='fk_livestock_products_category');
SET @sql := IF(@has_fk=0, 'ALTER TABLE livestock_products ADD CONSTRAINT fk_livestock_products_category FOREIGN KEY (livestock_category_id) REFERENCES livestock_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
