import { query } from "@/lib/server/db";

export type DynamicAccessMapping = {
  id: number;
  office_id: number | null;
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
  is_active: number;
};

export async function getUserAccessMappings(userId: number): Promise<DynamicAccessMapping[]> {
  return query<any[]>(
    `SELECT oam.*, r.name AS role_name, s.scope_value
     FROM organization_access_mappings oam
     INNER JOIN user_roles ur ON ur.role_id = oam.role_id AND ur.user_id = ?
     INNER JOIN roles r ON r.id = oam.role_id
     LEFT JOIN organization_access_mapping_scopes s ON s.access_mapping_id = oam.id
     WHERE oam.is_active = 1
     ORDER BY r.name, oam.module, oam.id, s.scope_value`,
    [userId],
  );
}

export function hasDynamicAction(
  mappings: DynamicAccessMapping[],
  action: "create" | "monthly" | "achievement" | "report" | "comment" | "approve",
  module?: string,
) {
  const field = {
    create: "can_create_annual_plan",
    monthly: "can_divide_monthly_plan",
    achievement: "can_update_achievement",
    report: "can_view_report",
    comment: "can_comment",
    approve: "can_approve",
  }[action] as keyof DynamicAccessMapping;

  return mappings.some(
    (mapping) =>
      (!module || mapping.module === module || mapping.module === "all") &&
      Number(mapping[field] ?? 0) === 1,
  );
}

export function dynamicScopeValues(mappings: DynamicAccessMapping[], module: string, scopeType: string) {
  return [...new Set(
    mappings
      .filter(
        (mapping) =>
          (mapping.module === module || mapping.module === "all") &&
          mapping.scope_type === scopeType &&
          mapping.scope_value,
      )
      .map((mapping) => String(mapping.scope_value)),
  )];
}
