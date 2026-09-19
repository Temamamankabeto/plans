-- Canonicalize the Fresh Fruits & Vegetable Trade team to the Trade Office structure
-- created by migration 073. This is intentionally non-destructive: users, access mappings,
-- planning records and trade records are remapped before the legacy duplicate team is disabled.

SET @trade_office_id := (
  SELECT id FROM offices
  WHERE code='BTRI' OR name='Bureau of Trade and Regional Integration'
  ORDER BY (code='BTRI') DESC, id ASC LIMIT 1
);
SET @trade_department_id := (
  SELECT id FROM departments
  WHERE office_id=@trade_office_id
    AND (code='BTRI-OMLD' OR LOWER(TRIM(name))='oromia market linkage department')
  ORDER BY (code='BTRI-OMLD') DESC, id ASC LIMIT 1
);
SET @fv_directorate_id := (
  SELECT id FROM directorates
  WHERE office_id=@trade_office_id
    AND (code='BTRI-FV' OR LOWER(TRIM(name))='fruit and vegetable trade director')
  ORDER BY (code='BTRI-FV') DESC, id ASC LIMIT 1
);
SET @canonical_team_id := (
  SELECT id FROM teams
  WHERE directorate_id=@fv_directorate_id
    AND (code='BTRI-FRESH-FV' OR LOWER(TRIM(name))='fresh fruits and vegetable trade team')
  ORDER BY (code='BTRI-FRESH-FV') DESC, id ASC LIMIT 1
);

-- Mark legacy duplicate team IDs. These include the wording visible in the old User form.
DROP TEMPORARY TABLE IF EXISTS tmp_fv_legacy_teams;
CREATE TEMPORARY TABLE tmp_fv_legacy_teams (id BIGINT UNSIGNED PRIMARY KEY);
INSERT IGNORE INTO tmp_fv_legacy_teams (id)
SELECT t.id
FROM teams t
WHERE t.id <> @canonical_team_id
  AND (
    LOWER(TRIM(t.name)) IN (
      'fresh fruits and vegetable team trade',
      'fresh fruit and vegetable team trade',
      'fresh fruits and vegetable trade team',
      'fresh fruit and vegetable trade team'
    )
    OR LOWER(REPLACE(REPLACE(TRIM(t.name), '&', 'and'), '  ', ' ')) = 'fresh fruits and vegetable team trade'
  );

-- Users must carry the same canonical Office -> Department -> Directorate -> Team IDs
-- as the access mapping. This prevents unrelated Team Leader mappings from being selected.
UPDATE users u
JOIN tmp_fv_legacy_teams x ON x.id=u.team_id
SET u.office_id=@trade_office_id,
    u.department_id=@trade_department_id,
    u.directorate_id=@fv_directorate_id,
    u.team_id=@canonical_team_id
WHERE @canonical_team_id IS NOT NULL;

-- Preserve historical planning/trade data while moving its organization scope to the canonical IDs.
UPDATE planning_records p
JOIN tmp_fv_legacy_teams x ON x.id=p.team_id
SET p.office_id=@trade_office_id,
    p.directorate_id=@fv_directorate_id,
    p.team_id=@canonical_team_id
WHERE @canonical_team_id IS NOT NULL;

UPDATE trade_records tr
JOIN tmp_fv_legacy_teams x ON x.id=tr.team_id
SET tr.office_id=@trade_office_id,
    tr.directorate_id=@fv_directorate_id,
    tr.team_id=@canonical_team_id
WHERE @canonical_team_id IS NOT NULL;

-- Move any access mapping accidentally created against the legacy duplicate to the canonical team.
UPDATE organization_access_mappings oam
JOIN tmp_fv_legacy_teams x ON x.id=oam.team_id
SET oam.office_id=@trade_office_id,
    oam.department_id=@trade_department_id,
    oam.directorate_id=@fv_directorate_id,
    oam.team_id=@canonical_team_id
WHERE @canonical_team_id IS NOT NULL;

-- Hide only the duplicate team records after all references have been remapped.
UPDATE teams t
JOIN tmp_fv_legacy_teams x ON x.id=t.id
SET t.is_active=0
WHERE @canonical_team_id IS NOT NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_fv_legacy_teams;
