ALTER TABLE users
  ADD COLUMN directorate_id BIGINT UNSIGNED NULL AFTER office_id,
  ADD INDEX users_directorate_id_index (directorate_id);

UPDATE users
SET directorate_id = department_id
WHERE department_id IS NOT NULL;

ALTER TABLE users
  DROP FOREIGN KEY users_department_id_fk,
  DROP INDEX users_department_id_index;

UPDATE users SET department_id = NULL;

ALTER TABLE users
  ADD INDEX users_department_id_index (department_id),
  ADD CONSTRAINT users_directorate_id_fk
    FOREIGN KEY (directorate_id) REFERENCES directorates(id) ON DELETE SET NULL,
  ADD CONSTRAINT users_department_id_fk
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
