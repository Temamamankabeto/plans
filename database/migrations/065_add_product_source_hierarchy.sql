-- Extend existing works/products without changing existing records or trade contracts.
SET @has_source_type := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='source_type');
SET @sql := IF(@has_source_type=0, "ALTER TABLE works ADD COLUMN source_type ENUM('crop','livestock') NULL AFTER work_type_id", 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_crop_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='crop_id');
SET @sql := IF(@has_crop_id=0, 'ALTER TABLE works ADD COLUMN crop_id BIGINT UNSIGNED NULL AFTER source_type', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_crop_category_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='crop_category_id');
SET @sql := IF(@has_crop_category_id=0, 'ALTER TABLE works ADD COLUMN crop_category_id BIGINT UNSIGNED NULL AFTER crop_id', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_livestock_product_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='livestock_product_id');
SET @sql := IF(@has_livestock_product_id=0, 'ALTER TABLE works ADD COLUMN livestock_product_id BIGINT UNSIGNED NULL AFTER crop_category_id', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_unit := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='unit');
SET @sql := IF(@has_unit=0, "ALTER TABLE works ADD COLUMN unit VARCHAR(50) NULL AFTER code", 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_description := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='description');
SET @sql := IF(@has_description=0, 'ALTER TABLE works ADD COLUMN description TEXT NULL AFTER unit', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_crop_idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND INDEX_NAME='works_crop_id_index');
SET @sql := IF(@has_crop_idx=0, 'ALTER TABLE works ADD INDEX works_crop_id_index (crop_id)', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_crop_cat_idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND INDEX_NAME='works_crop_category_id_index');
SET @sql := IF(@has_crop_cat_idx=0, 'ALTER TABLE works ADD INDEX works_crop_category_id_index (crop_category_id)', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_livestock_idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND INDEX_NAME='works_livestock_product_id_index');
SET @sql := IF(@has_livestock_idx=0, 'ALTER TABLE works ADD INDEX works_livestock_product_id_index (livestock_product_id)', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_crop_fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='works' AND CONSTRAINT_NAME='works_crop_id_fk');
SET @sql := IF(@has_crop_fk=0, 'ALTER TABLE works ADD CONSTRAINT works_crop_id_fk FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE RESTRICT', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_crop_cat_fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='works' AND CONSTRAINT_NAME='works_crop_category_id_fk');
SET @sql := IF(@has_crop_cat_fk=0, 'ALTER TABLE works ADD CONSTRAINT works_crop_category_id_fk FOREIGN KEY (crop_category_id) REFERENCES crop_categories(id) ON DELETE RESTRICT', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @has_livestock_fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='works' AND CONSTRAINT_NAME='works_livestock_product_id_fk');
SET @sql := IF(@has_livestock_fk=0, 'ALTER TABLE works ADD CONSTRAINT works_livestock_product_id_fk FOREIGN KEY (livestock_product_id) REFERENCES livestock_products(id) ON DELETE RESTRICT', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
