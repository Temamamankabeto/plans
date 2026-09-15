CREATE TABLE IF NOT EXISTS crop_type_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  crop_type_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY crop_type_categories_type_name_unique (crop_type_id, name),
  INDEX crop_type_categories_crop_type_id_index (crop_type_id),
  INDEX crop_type_categories_is_active_index (is_active),
  CONSTRAINT crop_type_categories_crop_type_id_fk FOREIGN KEY (crop_type_id) REFERENCES crop_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE crops
  ADD COLUMN crop_type_category_id BIGINT UNSIGNED NULL AFTER crop_type_id,
  ADD INDEX crops_crop_type_category_id_index (crop_type_category_id);

SET @has_crop_type_category_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'crops' AND CONSTRAINT_NAME = 'crops_crop_type_category_id_fk'
);
SET @add_crop_type_category_fk := IF(@has_crop_type_category_fk = 0,
  'ALTER TABLE crops ADD CONSTRAINT crops_crop_type_category_id_fk FOREIGN KEY (crop_type_category_id) REFERENCES crop_type_categories(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @add_crop_type_category_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS crop_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  crop_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY crop_categories_crop_name_unique (crop_id, name),
  INDEX crop_categories_crop_id_index (crop_id),
  INDEX crop_categories_is_active_index (is_active),
  CONSTRAINT crop_categories_crop_id_fk FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO crop_type_categories (crop_type_id, name, code)
SELECT id, 'Small Cereal', 'SMALL_CEREAL' FROM crop_types WHERE LOWER(name) = 'cereal crops';
INSERT IGNORE INTO crop_type_categories (crop_type_id, name, code)
SELECT id, 'Large Cereal', 'LARGE_CEREAL' FROM crop_types WHERE LOWER(name) = 'cereal crops';

INSERT IGNORE INTO crop_categories (crop_id, name, code)
SELECT id, 'Durum Wheat', 'DURUM_WHEAT' FROM crops WHERE LOWER(name) IN ('wheat', 'weat');
INSERT IGNORE INTO crop_categories (crop_id, name, code)
SELECT id, 'Bread Wheat', 'BREAD_WHEAT' FROM crops WHERE LOWER(name) IN ('wheat', 'weat');
