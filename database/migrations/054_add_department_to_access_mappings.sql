ALTER TABLE organization_access_mappings
  ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER directorate_id,
  ADD INDEX idx_oam_department (department_id),
  ADD CONSTRAINT fk_oam_department
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;

ALTER TABLE organization_access_mappings
  DROP INDEX uq_oam_scope,
  DROP INDEX idx_oam_lookup,
  ADD UNIQUE KEY uq_oam_scope (
    office_id,
    directorate_id,
    department_id,
    team_id,
    role_id,
    module,
    scope_type,
    scope_value
  ),
  ADD INDEX idx_oam_lookup (
    office_id,
    directorate_id,
    department_id,
    team_id,
    role_id,
    is_active
  );
