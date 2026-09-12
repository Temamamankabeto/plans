ALTER TABLE trade_records
  ADD COLUMN value_type ENUM('price','cost') NOT NULL DEFAULT 'price' AFTER unit;

UPDATE trade_records
SET value_type = 'price'
WHERE value_type IS NULL OR value_type NOT IN ('price','cost');
