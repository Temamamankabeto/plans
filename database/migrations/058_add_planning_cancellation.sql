-- Preserve approved planning history while allowing authorized cancellation.
-- Draft deletion needs no schema change.

ALTER TABLE planning_records
  MODIFY COLUMN plan_status ENUM(
    'draft','submitted','verified','director_approved','accepted','returned',
    'submitted_team_leader','verified_team_leader','submitted_director','rejected',
    'approved_director','finally_approved','cancelled'
  ) NOT NULL DEFAULT 'draft',
  MODIFY COLUMN achievement_status ENUM(
    'draft','submitted','verified','director_approved','accepted','returned',
    'submitted_team_leader','verified_team_leader','submitted_director','rejected',
    'approved_director','cancelled'
  ) NOT NULL DEFAULT 'draft';

ALTER TABLE planning_record_workflow_history
  MODIFY COLUMN action ENUM(
    'submit','verify','approve','final_approve','return','reject','comment','cancel'
  ) NOT NULL;
