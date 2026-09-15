CREATE TABLE IF NOT EXISTS livestock_product_category (
  livestock_product_id BIGINT UNSIGNED NOT NULL,
  livestock_category_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (livestock_product_id, livestock_category_id),
  KEY idx_lpc_category (livestock_category_id),
  CONSTRAINT fk_lpc_livestock FOREIGN KEY (livestock_product_id) REFERENCES livestock_products(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_lpc_category FOREIGN KEY (livestock_category_id) REFERENCES livestock_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Preserve all existing single-category assignments by moving them into the pivot table.
INSERT IGNORE INTO livestock_product_category (livestock_product_id, livestock_category_id)
SELECT id, livestock_category_id
FROM livestock_products
WHERE livestock_category_id IS NOT NULL;
