-- Use Ethiopian fiscal year defaults for the Planning & Achievement module.
-- This is non-destructive and only corrects old Gregorian-style defaults such as 2026.

UPDATE planning_settings
SET fiscal_year = '2018'
WHERE id = 1
  AND fiscal_year REGEXP '^[0-9]+$'
  AND CAST(fiscal_year AS UNSIGNED) >= 2024;
