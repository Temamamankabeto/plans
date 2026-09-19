export type AccessModule = "crop" | "livestock" | "trade" | "job" | "agribusiness" | "mechanization" | "all";
export type AccessScopeType = "crop_type" | "livestock_type" | "trade_group" | "all";

export type OrganizationAccessMapping = {
  id: number;
  role_id: number;
  module: AccessModule;
  scope_type: AccessScopeType;
  scope_value: string | null;
  scope_values: string[];
  can_create_annual_plan: boolean | number;
  can_divide_monthly_plan: boolean | number;
  can_update_achievement: boolean | number;
  can_view_report: boolean | number;
  can_comment: boolean | number;
  can_approve: boolean | number;
  is_active: boolean | number;
  role_name?: string;
};

export type AccessMappingPayload = {
  role_id: number;
  module: AccessModule;
  scope_type: AccessScopeType;
  scope_values: string[];
  can_create_annual_plan: boolean;
  can_divide_monthly_plan: boolean;
  can_update_achievement: boolean;
  can_view_report: boolean;
  can_comment: boolean;
  can_approve: boolean;
  is_active: boolean;
};
