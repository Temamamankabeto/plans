CREATE TABLE IF NOT EXISTS work_crop (
  work_id BIGINT UNSIGNED NOT NULL,
  crop_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (work_id, crop_id),
  KEY idx_work_crop_crop_id (crop_id),
  CONSTRAINT fk_work_crop_work FOREIGN KEY (work_id) REFERENCES works(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_work_crop_crop FOREIGN KEY (crop_id) REFERENCES crops(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_livestock (
  work_id BIGINT UNSIGNED NOT NULL,
  livestock_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (work_id, livestock_id),
  KEY idx_work_livestock_livestock_id (livestock_id),
  CONSTRAINT fk_work_livestock_work FOREIGN KEY (work_id) REFERENCES works(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_work_livestock_livestock FOREIGN KEY (livestock_id) REFERENCES livestock_products(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Preserve every existing single-source assignment while enabling many-to-many assignments.
INSERT IGNORE INTO work_crop (work_id, crop_id)
SELECT id, crop_id FROM works WHERE source_type='crop' AND crop_id IS NOT NULL;

INSERT IGNORE INTO work_livestock (work_id, livestock_id)
SELECT id, livestock_product_id FROM works WHERE source_type='livestock' AND livestock_product_id IS NOT NULL;
