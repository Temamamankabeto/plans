-- Separate Trade Market Type (commodity_group) from the assigned Crop/Livestock Type.
-- Existing records remain valid; new records store scope_type/scope_value.
ALTER TABLE trade_records
  ADD COLUMN IF NOT EXISTS scope_type VARCHAR(40) NULL AFTER commodity_group,
  ADD COLUMN IF NOT EXISTS scope_value VARCHAR(191) NULL AFTER scope_type;

CREATE INDEX IF NOT EXISTS trade_records_scope_value_index
  ON trade_records (scope_type, scope_value);
