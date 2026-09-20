-- Distinguish Crop, Livestock and Livestock Product plans while preserving existing records.
ALTER TABLE trade_records
  ADD COLUMN access_module VARCHAR(40) NULL AFTER commodity_group;

UPDATE trade_records
SET access_module = CASE
  WHEN scope_type = 'livestock_type' THEN 'livestock'
  ELSE 'crop'
END
WHERE access_module IS NULL OR TRIM(access_module) = '';

CREATE INDEX idx_trade_records_access_module ON trade_records(access_module);
