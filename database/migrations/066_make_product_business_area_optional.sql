-- Products are now source-driven (crop/livestock), so business area is optional.
-- Existing work_type_id values and relationships are preserved.
SET @is_nullable := (SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='work_type_id' LIMIT 1);
SET @sql := IF(@is_nullable='NO', 'ALTER TABLE works MODIFY COLUMN work_type_id BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
