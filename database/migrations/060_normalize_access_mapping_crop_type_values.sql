-- Normalize legacy free-text crop-type mappings to the canonical active master-data name.
-- This is additive data correction and does not delete mappings or master data.

UPDATE IGNORE organization_access_mappings oam
INNER JOIN crop_types ct
  ON oam.scope_type = 'crop_type'
 AND (
      LOWER(TRIM(oam.scope_value)) = LOWER(TRIM(ct.name))
      OR LOWER(TRIM(oam.scope_value)) = LOWER(TRIM(ct.code))
      OR TRIM(oam.scope_value) = CAST(ct.id AS CHAR)
      OR (
        LOWER(ct.name) = 'cash crops'
        AND LOWER(oam.scope_value) IN ('cash', 'cash crop', 'cash crops')
      )
      OR (
        LOWER(ct.name) = 'spice crops'
        AND LOWER(oam.scope_value) IN ('spice', 'spices', 'spice crop', 'spice crops', 'spices crop', 'spices crops')
      )
      OR (
        LOWER(ct.name) = 'fruit crops'
        AND LOWER(oam.scope_value) IN ('fruit', 'fruits', 'fruit crop', 'fruit crops')
      )
      OR (
        LOWER(ct.name) = 'cereal crops'
        AND LOWER(oam.scope_value) IN ('cereal', 'cereals', 'cereal crop', 'cereal crops')
      )
      OR (
        LOWER(ct.name) = 'pulse crops'
        AND LOWER(oam.scope_value) IN ('pulse', 'pulses', 'pulse crop', 'pulse crops')
      )
      OR (
        LOWER(ct.name) = 'oil seed crops'
        AND LOWER(oam.scope_value) IN ('oil seed', 'oil seeds', 'oil seed crop', 'oil seed crops')
      )
      OR (
        LOWER(ct.name) = 'vegetable crops'
        AND LOWER(oam.scope_value) IN ('vegetable', 'vegetables', 'vegetable crop', 'vegetable crops')
      )
    )
SET oam.scope_value = ct.name
WHERE oam.scope_type = 'crop_type'
  AND ct.is_active = 1
  AND BINARY oam.scope_value <> BINARY ct.name;
