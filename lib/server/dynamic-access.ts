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
  const rows = await query<any[]>(
    `SELECT oam.*, r.name AS role_name, s.scope_value,
            CASE
              WHEN oam.team_id IS NOT NULL THEN 4
              WHEN oam.directorate_id IS NOT NULL THEN 3
              WHEN oam.department_id IS NOT NULL THEN 2
              WHEN oam.office_id IS NOT NULL THEN 1
              ELSE 0
            END AS organization_specificity
     FROM organization_access_mappings oam
     INNER JOIN user_roles ur ON ur.role_id=oam.role_id AND ur.user_id=?
     INNER JOIN roles r ON r.id=oam.role_id
     INNER JOIN users u ON u.id=ur.user_id
     LEFT JOIN organization_access_mapping_scopes s ON s.access_mapping_id=oam.id
     WHERE oam.is_active=1
       AND (oam.office_id IS NULL OR oam.office_id=u.office_id)
       AND (oam.department_id IS NULL OR oam.department_id=u.department_id)
       AND (oam.directorate_id IS NULL OR oam.directorate_id=u.directorate_id)
       AND (oam.team_id IS NULL OR oam.team_id=u.team_id)
     ORDER BY organization_specificity DESC, oam.id, s.scope_value`,
    [userId],
  );

  // A generic role mapping must never leak scopes into a more-specific Team/Directorate mapping.
  // Resolve specificity independently for each module so a user may legitimately have Crop and Livestock.
  const bestByModule = new Map<string, number>();
  for (const row of rows) {
    const module = String(row.module ?? "").trim().toLowerCase();
    const score = Number(row.organization_specificity ?? 0);
    bestByModule.set(module, Math.max(bestByModule.get(module) ?? -1, score));
  }
  return rows.filter((row) => {
    const module = String(row.module ?? "").trim().toLowerCase();
    return Number(row.organization_specificity ?? 0) === bestByModule.get(module);
  });
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
