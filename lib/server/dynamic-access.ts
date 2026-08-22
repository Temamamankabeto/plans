import { query } from "@/lib/server/db";

export type DynamicAccessMapping = {
  id: number;
  office_id: number;
  directorate_id: number | null;
  department_id: number | null;
  team_id: number | null;
  role_id: number;
  role_name: string;
  module: string;
  scope_type: string;
  scope_value: string | null;
  can_create_annual_plan: number;
  can_divide_monthly_plan: number;
  can_update_achievement: number;
  can_view_report: number;
  can_comment: number;
  can_approve: number;
};

export async function getUserAccessMappings(userId: number): Promise<DynamicAccessMapping[]> {
  return query<any[]>(
    `SELECT oam.*, r.name AS role_name
     FROM organization_access_mappings oam
     INNER JOIN user_roles ur ON ur.role_id = oam.role_id AND ur.user_id = ?
     INNER JOIN roles r ON r.id = oam.role_id
     INNER JOIN users u ON u.id = ur.user_id
     WHERE oam.is_active = 1
       AND oam.office_id = u.office_id
       AND (oam.directorate_id IS NULL OR oam.directorate_id = u.directorate_id)
       AND (oam.department_id IS NULL OR oam.department_id = u.department_id)
       AND (oam.team_id IS NULL OR oam.team_id = u.team_id)
     ORDER BY
       (oam.team_id IS NOT NULL) DESC,
       (oam.department_id IS NOT NULL) DESC,
       (oam.directorate_id IS NOT NULL) DESC,
       oam.id ASC`,
    [userId],
  );
}

export function hasDynamicAction(mappings: DynamicAccessMapping[], action: "create" | "monthly" | "achievement" | "report" | "comment" | "approve", module?: string) {
  const field = {
    create: "can_create_annual_plan",
    monthly: "can_divide_monthly_plan",
    achievement: "can_update_achievement",
    report: "can_view_report",
    comment: "can_comment",
    approve: "can_approve",
  }[action] as keyof DynamicAccessMapping;

  return mappings.some((mapping) => (!module || mapping.module === module || mapping.module === "all") && Number(mapping[field] ?? 0) === 1);
}

export function dynamicScopeValues(mappings: DynamicAccessMapping[], module: string, scopeType: string) {
  return [...new Set(mappings
    .filter((mapping) => (mapping.module === module || mapping.module === "all") && mapping.scope_type === scopeType && mapping.scope_value)
    .map((mapping) => String(mapping.scope_value))
  )];
}
