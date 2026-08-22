import api from "@/lib/api";
import type {
  DashboardTab,
  RoleDashboardFilters,
  RoleDashboardResponse,
  RoleDashboardScope,
} from "@/types/dashboard/role-dashboard.type";

function clean(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "" && value !== "all",
    ),
  );
}

export const roleDashboardService = {
  async summary(scope: RoleDashboardScope, tab: DashboardTab, filters: RoleDashboardFilters = {}) {
    const response = await api.get<RoleDashboardResponse>("/admin/dashboard/plan-achievement-summary", {
      params: clean({
        scope,
        tab,
        ...filters,
        period: filters.date_preset,
      }),
    });

    return response.data;
  },
};
