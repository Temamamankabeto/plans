-- Add sex to livestock master records without deleting existing data.
SET @sex_col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livestock_products' AND COLUMN_NAME='sex');
SET @sql := IF(@sex_col_exists=0, "ALTER TABLE livestock_products ADD COLUMN sex ENUM('male','female') NULL AFTER name", 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- The original schema made livestock name globally unique. Sex requires Male/Female rows for the same livestock.
SET @name_unique_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livestock_products' AND INDEX_NAME='name' AND NON_UNIQUE=0);
SET @sql := IF(@name_unique_exists>0, 'ALTER TABLE livestock_products DROP INDEX name', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @composite_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livestock_products' AND INDEX_NAME='livestock_products_type_name_sex_unique');
SET @sql := IF(@composite_exists=0, 'ALTER TABLE livestock_products ADD UNIQUE KEY livestock_products_type_name_sex_unique (livestock_type_id, name, sex)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sex_index_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livestock_products' AND INDEX_NAME='livestock_products_sex_index');
SET @sql := IF(@sex_index_exists=0, 'ALTER TABLE livestock_products ADD INDEX livestock_products_sex_index (sex)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
