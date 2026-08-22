export type RoleDashboardScope =
  | "super_admin"
  | "head_of_office"
  | "deputy_head_of_office"
  | "director"
  | "team_leader"
  | "expert"
  | "agriculture_coffee_tea_director"
  | "agriculture_fruit_director"
  | "agriculture_crop_director"
  | "agriculture_livestock_director"
  | "agriculture_job_creation_director"
  | "agriculture_vegetable_expert"
  | "cooperative_market_director"
  | "cooperative_job_creation_director"
  | "industry_value_addition_director"
  | "industry_job_creation_director"
  | "trade_coffee_tea_spice_director"
  | "trade_fruit_vegetable_director"
  | "trade_crop_director"
  | "trade_livestock_director"
  | "president_agriculture_value_chain_manager"
  | "president_manufacturing_value_chain_manager"
  | "president_investment_manager"
  | "president_job_creation_manager";

export type DashboardTab = "plan" | "achievement" | "report";

export type RoleDashboardFilters = {
  fiscal_year?: string;
  quarter?: string;
  month?: string;
  office?: string;
  value_chain?: string;
  indicator?: string;
  status?: string;
  date_preset?: "" | "all" | "this_week" | "this_month" | "custom";
  date_from?: string;
  date_to?: string;
};

export type DashboardPlanRow = {
  id: number | string;
  plan_no?: string | null;
  office?: string | null;
  directorate?: string | null;
  value_chain?: string | null;
  indicator?: string | null;
  unit?: string | null;
  annual_target?: number | string | null;
  quarterly_target?: number | string | null;
  month?: string | null;
  fiscal_year?: string | null;
  status?: string | null;
};

export type DashboardAchievementRow = {
  id: number | string;
  achievement_no?: string | null;
  office?: string | null;
  directorate?: string | null;
  value_chain?: string | null;
  indicator?: string | null;
  unit?: string | null;
  target?: number | string | null;
  achieved?: number | string | null;
  achievement_percent?: number | string | null;
  fiscal_year?: string | null;
  period?: string | null;
  status?: string | null;
  submitted_at?: string | null;
};

export type DashboardReportRow = {
  id: number | string;
  office?: string | null;
  report_type?: string | null;
  value_chain?: string | null;
  period?: string | null;
  total_target?: number | string | null;
  total_achieved?: number | string | null;
  performance_percent?: number | string | null;
  status?: string | null;
};

export type RoleDashboardChartRow = {
  label?: string | null;
  name?: string | null;
  value: number | string;
};

export type RoleDashboardCharts = Record<string, RoleDashboardChartRow[]>;

export type RoleDashboardData = {
  plans: DashboardPlanRow[];
  achievements: DashboardAchievementRow[];
  reports: DashboardReportRow[];
  charts: RoleDashboardCharts;
};

export type RoleDashboardResponse = {
  success: boolean;
  message: string;
  data: RoleDashboardData;
  meta?: Record<string, unknown>;
};
