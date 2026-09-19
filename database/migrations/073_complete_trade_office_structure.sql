-- Complete the Trade Office organization requested for team-based Trade planning.
-- Safe/idempotent: existing records are reused by name/code.

INSERT INTO offices (name,code,type,is_active)
VALUES ('Bureau of Trade and Regional Integration','BTRI','office',1)
ON DUPLICATE KEY UPDATE is_active=1;

SET @trade_office_id := (
  SELECT id FROM offices
  WHERE code='BTRI' OR name='Bureau of Trade and Regional Integration'
  ORDER BY (code='BTRI') DESC LIMIT 1
);

INSERT INTO departments (office_id,directorate_id,name,code,is_active)
SELECT @trade_office_id,NULL,'Oromia Market Linkage Department','BTRI-OMLD',1
WHERE @trade_office_id IS NOT NULL
ON DUPLICATE KEY UPDATE office_id=VALUES(office_id),is_active=1;

SET @trade_department_id := (
  SELECT id FROM departments WHERE office_id=@trade_office_id AND name='Oromia Market Linkage Department' LIMIT 1
);

INSERT INTO directorates (office_id,department_id,name,code,is_active) VALUES
(@trade_office_id,@trade_department_id,'Coffee, Tea and Spice Trade Director','BTRI-CTS',1),
(@trade_office_id,@trade_department_id,'Crop Market Director','BTRI-CROP',1),
(@trade_office_id,@trade_department_id,'Fruit and Vegetable Trade Director','BTRI-FV',1),
(@trade_office_id,@trade_department_id,'Livestock Trade Director','BTRI-LIVE',1)
ON DUPLICATE KEY UPDATE department_id=VALUES(department_id),code=VALUES(code),is_active=1;

SET @cts_dir := (SELECT id FROM directorates WHERE office_id=@trade_office_id AND name='Coffee, Tea and Spice Trade Director' LIMIT 1);
SET @crop_dir := (SELECT id FROM directorates WHERE office_id=@trade_office_id AND name='Crop Market Director' LIMIT 1);
SET @fv_dir := (SELECT id FROM directorates WHERE office_id=@trade_office_id AND name='Fruit and Vegetable Trade Director' LIMIT 1);
SET @live_dir := (SELECT id FROM directorates WHERE office_id=@trade_office_id AND name='Livestock Trade Director' LIMIT 1);

INSERT INTO teams (directorate_id,name,code,is_active) VALUES
(@cts_dir,'Coffee, Tea and Spices Trade Team','BTRI-CTS-TEAM',1),
(@crop_dir,'Cereal Trade Team','BTRI-CEREAL',1),
(@crop_dir,'Oil Seed Trade Team','BTRI-OIL',1),
(@crop_dir,'Pulse Trade Team','BTRI-PULSE',1),
(@fv_dir,'Fresh Fruits and Vegetable Trade Team','BTRI-FRESH-FV',1),
(@live_dir,'Live Animals Trade Team','BTRI-LIVE-ANIMAL',1)
ON DUPLICATE KEY UPDATE code=VALUES(code),is_active=1;
