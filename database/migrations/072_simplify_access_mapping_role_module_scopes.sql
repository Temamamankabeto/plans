-- Role -> Module -> multiple scopes.
-- Organization scope now comes from the logged-in user's Office/Department/Directorate/Team.
ALTER TABLE organization_access_mappings MODIFY office_id BIGINT UNSIGNED NULL;

CREATE TABLE IF NOT EXISTS organization_access_mapping_scopes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  access_mapping_id BIGINT UNSIGNED NOT NULL,
  scope_value VARCHAR(191) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_oam_scopes_mapping
    FOREIGN KEY (access_mapping_id) REFERENCES organization_access_mappings(id) ON DELETE CASCADE,
  UNIQUE KEY uq_oam_scope_value (access_mapping_id, scope_value),
  INDEX idx_oam_scope_value (scope_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO organization_access_mapping_scopes (access_mapping_id, scope_value)
SELECT id, scope_value
FROM organization_access_mappings
WHERE scope_value IS NOT NULL AND TRIM(scope_value) <> '';

-- Existing mappings become role/module mappings. User organization is no longer duplicated here.
UPDATE organization_access_mappings
SET office_id = NULL, department_id = NULL, directorate_id = NULL, team_id = NULL;

-- Normalize the old livestock scope name to the new Livestock Type scope.
UPDATE organization_access_mappings
SET scope_type = 'livestock_type'
WHERE scope_type = 'livestock_product';
