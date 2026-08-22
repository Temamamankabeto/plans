export type AccessModule = "crop" | "livestock" | "trade" | "job" | "agribusiness" | "mechanization" | "all";
export type AccessScopeType = "crop_type" | "livestock_product" | "trade_group" | "all";

export type OrganizationAccessMapping = {
  id: number;
  office_id: number;
  directorate_id: number | null;
  department_id: number | null;
  team_id: number | null;
  role_id: number;
  module: AccessModule;
  scope_type: AccessScopeType;
  scope_value: string | null;
  can_create_annual_plan: boolean | number;
  can_divide_monthly_plan: boolean | number;
  can_update_achievement: boolean | number;
  can_view_report: boolean | number;
  can_comment: boolean | number;
  can_approve: boolean | number;
  is_active: boolean | number;
  office_name?: string;
  directorate_name?: string | null;
  department_name?: string | null;
  team_name?: string | null;
  role_name?: string;
};

export type AccessMappingPayload = Omit<OrganizationAccessMapping, "id" | "office_name" | "directorate_name" | "department_name" | "team_name" | "role_name">;
