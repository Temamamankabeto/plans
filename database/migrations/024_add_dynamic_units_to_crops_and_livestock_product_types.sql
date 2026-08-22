ALTER TABLE crops
  ADD COLUMN IF NOT EXISTS land_area_unit VARCHAR(50) NOT NULL DEFAULT 'Ha' AFTER code,
  ADD COLUMN IF NOT EXISTS productivity_unit VARCHAR(50) NOT NULL DEFAULT 'Qt/Ha' AFTER land_area_unit,
  ADD COLUMN IF NOT EXISTS production_unit VARCHAR(50) NOT NULL DEFAULT 'Qt' AFTER productivity_unit;

ALTER TABLE livestock_product_types
  ADD COLUMN IF NOT EXISTS number_unit VARCHAR(50) NOT NULL DEFAULT 'Head' AFTER code,
  ADD COLUMN IF NOT EXISTS productivity_unit VARCHAR(80) NOT NULL DEFAULT 'Unit/Head' AFTER number_unit,
  ADD COLUMN IF NOT EXISTS production_unit VARCHAR(80) NOT NULL DEFAULT 'Unit' AFTER productivity_unit;
