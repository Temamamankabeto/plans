export type PlanningRecordType = "plan" | "achievement";
export type PlanningPeriodType = "annual" | "monthly";
export type PlanningRecordStatus = "draft" | "submitted" | "approved" | "rejected";
export type PlanningModuleType = "crop" | "livestock";
export type PlanningWorkflowStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "director_approved"
  | "accepted"
  | "returned"
  | "submitted_team_leader"
  | "verified_team_leader"
  | "submitted_director"
  | "rejected"
  | "approved_director"
  | "finally_approved";

export interface PlanningRecordItem {
  id: number;
  annual_plan_id: number | null;
  office_id: number;
  directorate_id: number | null;
  team_id: number | null;
  worktype_id: number | null;
  module_type: PlanningModuleType;
  record_type: PlanningRecordType;
  period_type: PlanningPeriodType;
  crop_type_id: number | null;
  crop_id: number | null;
  specification: string | null;
  livestock_product_id: number | null;
  livestock_product_type_id: number | null;
  fiscal_year: string;
  month: number | null;
  plan_land_area: number | string | null;
  plan_productivity: number | string | null;
  plan_production: number | string | null;
  achievement_land_area: number | string | null;
  achievement_productivity: number | string | null;
  achievement_production: number | string | null;
  plan_population: number | string | null;
  achievement_population: number | string | null;
  status: PlanningRecordStatus;
  created_by: number | null;
  approved_by: number | null;
  plan_status?: PlanningWorkflowStatus;
  achievement_status?: PlanningWorkflowStatus;
  plan_comment?: string | null;
  achievement_comment?: string | null;
  achievement_remark?: string | null;
  plan_submitted_by?: number | null;
  plan_submitted_by_role?: "expert" | "team_leader" | null;
  plan_submitted_at?: string | null;
  plan_verified_by?: number | null;
  plan_verified_at?: string | null;
  plan_director_approved_by?: number | null;
  plan_director_approved_at?: string | null;
  plan_accepted_by?: number | null;
  plan_accepted_at?: string | null;
  achievement_submitted_by?: number | null;
  achievement_submitted_by_role?: "expert" | "team_leader" | null;
  achievement_submitted_at?: string | null;
  achievement_verified_by?: number | null;
  achievement_verified_at?: string | null;
  achievement_director_approved_by?: number | null;
  achievement_director_approved_at?: string | null;
  achievement_accepted_by?: number | null;
  achievement_accepted_at?: string | null;
  approved_at?: string | null;
  approval_comment?: string | null;
  is_locked?: number | boolean | null;
  created_at?: string;
  updated_at?: string;
  office_name?: string | null;
  directorate_name?: string | null;
  team_name?: string | null;
  work_type_name?: string | null;
  crop_type_name?: string | null;
  crop_name?: string | null;
  livestock_product_name?: string | null;
  livestock_product_type_name?: string | null;
  created_by_name?: string | null;
  approved_by_name?: string | null;
}

export interface PlanningRecordFormInput {
  office_id?: number | null;
  directorate_id?: number | null;
  team_id?: number | null;
  worktype_id?: number | null;
  module_type: PlanningModuleType;
  record_type: PlanningRecordType;
  period_type: PlanningPeriodType;
  crop_type_id?: number | null;
  crop_id?: number | null;
  specification?: string | null;
  livestock_product_id?: number | null;
  livestock_product_type_id?: number | null;
  fiscal_year: string;
  month?: number | null;
  plan_land_area?: number | string | null;
  plan_productivity?: number | string | null;
  plan_production?: number | string | null;
  achievement_land_area?: number | string | null;
  achievement_productivity?: number | string | null;
  achievement_production?: number | string | null;
  plan_population?: number | string | null;
  achievement_population?: number | string | null;
  achievement_remark?: string | null;
  status?: PlanningRecordStatus;
}

export interface PlanningSettings {
  id: number;
  fiscal_year: string;
  annual_plan_open: boolean | number;
  annual_achievement_open: boolean | number;
  monthly_plan_open: boolean | number;
  monthly_achievement_open: boolean | number;
}
