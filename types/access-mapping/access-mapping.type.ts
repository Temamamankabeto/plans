export type AccessModule = "crop" | "crop_product" | "livestock" | "livestock_product" | "trade" | "job" | "agribusiness" | "mechanization" | "all";
export type AccessScopeType = "crop_type" | "crop_product" | "livestock_type" | "livestock_product" | "trade_group" | "all";
export type AccessOrganizationLevel = "office" | "department" | "directorate" | "team";

export type OrganizationOption = {
  id: number;
  name: string;
  label: string;
  office_id: number | null;
  department_id: number | null;
  directorate_id: number | null;
  team_id: number | null;
};

export type AccessOrganizationOptions = {
  offices: OrganizationOption[];
  departments: OrganizationOption[];
  directorates: OrganizationOption[];
  teams: OrganizationOption[];
};

export type OrganizationAccessMapping = {
  id: number;
  office_id: number | null;
  department_id: number | null;
  directorate_id: number | null;
  team_id: number | null;
  office_name?: string | null;
  department_name?: string | null;
  directorate_name?: string | null;
  team_name?: string | null;
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
  office_id: number | null;
  department_id: number | null;
  directorate_id: number | null;
  team_id: number | null;
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
