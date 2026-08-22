import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { getAuthUser } from "@/lib/server/auth";
import { getUserAccessMappings } from "@/lib/server/dynamic-access";
import { pagination } from "@/lib/server/crud";
import { validatePlanningRecordInput } from "@/lib/schemas/planning-record.schema";
import { created, fail, ok, paginated } from "@/lib/server/response";
import { entryAllowed, fiscalYearAllowed, getAnnualPlan, getPlanningSettings, isSuperAdmin, savePlanningRecord, validatePlanningBusinessRules } from "@/lib/server/planning-record-rules";
import { applyPlanningReadScope, validatePlanningWriteScope } from "@/lib/server/planning-access";
import { getPlanningWorkflowRole } from "@/lib/server/planning-workflow";

const selectSql = `
  SELECT
    pr.*,
    o.name AS office_name,
    d.name AS directorate_name,
    t.name AS team_name,
    wt.name AS work_type_name,
    cty.name AS crop_type_name,
    c.name AS crop_name,
    lp.name AS livestock_product_name,
    lpt.name AS livestock_product_type_name,
    creator.name AS created_by_name,
    approver.name AS approved_by_name
  FROM planning_records pr
  INNER JOIN offices o ON o.id = pr.office_id
  LEFT JOIN directorates d ON d.id = pr.directorate_id
  LEFT JOIN teams t ON t.id = pr.team_id
  LEFT JOIN work_types wt ON wt.id = pr.worktype_id
  LEFT JOIN crop_types cty ON cty.id = pr.crop_type_id
  LEFT JOIN crops c ON c.id = pr.crop_id
  LEFT JOIN livestock_products lp ON lp.id = pr.livestock_product_id
  LEFT JOIN livestock_product_types lpt ON lpt.id = pr.livestock_product_type_id
  LEFT JOIN users creator ON creator.id = pr.created_by
  LEFT JOIN users approver ON approver.id = pr.approved_by
`;

async function getUserContext(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.id) return { auth: null, user: null };
  const rows = await query<any[]>("SELECT u.*, o.name AS office_name, d.name AS directorate_name, dp.name AS department_name, t.name AS team_name FROM users u LEFT JOIN offices o ON o.id = u.office_id LEFT JOIN directorates d ON d.id = u.directorate_id LEFT JOIN departments dp ON dp.id = u.department_id LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = ? LIMIT 1", [auth.id]);
  const user = rows[0] ?? null;
  if (user) user.access_mappings = await getUserAccessMappings(Number(auth.id));
  return { auth, user };
}

export async function GET(request: NextRequest) {
  const { auth, user } = await getUserContext(request);
  if (!auth || !user) return fail("Unauthenticated", 401);

  const all = request.nextUrl.searchParams.get("all");
  const report = request.nextUrl.searchParams.get("report") === "1";
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const moduleType = request.nextUrl.searchParams.get("module_type") ?? "all";
  const periodType = request.nextUrl.searchParams.get("period_type") ?? "all";
  const recordType = request.nextUrl.searchParams.get("record_type") ?? "all";
  const status = request.nextUrl.searchParams.get("status") ?? "all";
  const workflowStatus = request.nextUrl.searchParams.get("workflow_status") ?? "all";
  const fiscalYear = request.nextUrl.searchParams.get("fiscal_year")?.trim() ?? "";

  const where: string[] = [];
  const params: unknown[] = [];

  const workflowRole = getPlanningWorkflowRole(user, auth.roles);
  const hasCrossOfficeMonitoring = ["ocdu_director", "ocdu_manager", "ocdu_adviser"].includes(workflowRole);
  if (!hasCrossOfficeMonitoring) {
    applyPlanningReadScope(where, params, user, auth.roles, "pr");
  }

  if (hasCrossOfficeMonitoring) {
    where.push(
      "(pr.plan_status IN ('approved_director','finally_approved') OR pr.achievement_status = 'approved_director')",
    );

    const department = String(user.department_name ?? "").toLowerCase();
    if (department.includes("agricultural value chain")) {
      where.push("pr.module_type IN ('crop','livestock')");
    } else if (department.includes("manufacturing")) {
      where.push("(LOWER(COALESCE(wt.name,'')) LIKE '%manufactur%' OR LOWER(COALESCE(pr.specification,'')) LIKE '%manufactur%')");
    } else if (department.includes("investment")) {
      where.push("(LOWER(COALESCE(wt.name,'')) LIKE '%investment%' OR LOWER(COALESCE(pr.specification,'')) LIKE '%investment%')");
    } else if (department.includes("job creation")) {
      where.push("(LOWER(COALESCE(wt.name,'')) LIKE '%job%' OR LOWER(COALESCE(pr.specification,'')) LIKE '%employment%')");
    }
  }

  if (search) {
    where.push(`(o.name LIKE ? OR d.name LIKE ? OR t.name LIKE ? OR c.name LIKE ? OR pr.specification LIKE ? OR lp.name LIKE ? OR lpt.name LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (moduleType !== "all") {
    where.push("pr.module_type = ?");
    params.push(moduleType);
  }
  if (periodType !== "all") {
    where.push("pr.period_type = ?");
    params.push(periodType);
  }
  if (recordType !== "all") {
    where.push("pr.record_type = ?");
    params.push(recordType);
  }
  if (status !== "all") {
    where.push("pr.status = ?");
    params.push(status);
  }
  if (workflowStatus !== "all") {
    where.push("(pr.plan_status = ? OR pr.achievement_status = ?)");
    params.push(workflowStatus, workflowStatus);
  }
  if (fiscalYear) {
    where.push("pr.fiscal_year = ?");
    params.push(fiscalYear);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  if (all || report) {
    const rows = await query<any[]>(`${selectSql} ${whereSql} ORDER BY pr.created_at DESC, pr.id DESC`, params);
    return ok(rows, report ? "Planning report fetched successfully" : "Planning records fetched successfully");
  }

  const { page, perPage, offset } = pagination(request);
  const countRows = await query<any[]>(`${selectSql.replace(/SELECT[\s\S]*?FROM planning_records pr/, "SELECT COUNT(*) AS total FROM planning_records pr")} ${whereSql}`, params);
  const rows = await query<any[]>(`${selectSql} ${whereSql} ORDER BY pr.created_at DESC, pr.id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]);

  return paginated(rows, page, perPage, Number(countRows[0]?.total ?? 0), "Planning records fetched successfully");
}

export async function POST(request: NextRequest) {
  const { auth, user } = await getUserContext(request);
  if (!auth || !user) return fail("Unauthenticated", 401);

  const body = await request.json().catch(() => ({}));
  const validation = validatePlanningRecordInput(body);
  if (!validation.valid) return fail("Validation failed", 422, validation.errors);

  const data = validation.data;
  const finalOfficeId = user.office_id ?? data.office_id;
  const finalDirectorateId = user.directorate_id ?? data.directorate_id;
  const finalTeamId = user.team_id ?? data.team_id;

  if (!finalOfficeId) return fail("Logged-in user has no assigned office", 422);

  if (data.period_type === "monthly" && !isSuperAdmin(auth.roles)) {
    const annual = await getAnnualPlan(data, finalOfficeId, finalDirectorateId, finalTeamId);
    if (annual && Number(annual.created_by) !== Number(auth.id)) {
      return fail("Only the Annual Plan owner can create its monthly distribution.", 403);
    }
  }

  const scopeError = await validatePlanningWriteScope(data, user, auth.roles);
  if (scopeError) return fail(scopeError, 403);

  const settings = await getPlanningSettings();
  if (!fiscalYearAllowed(settings, data.fiscal_year)) {
    return fail(`Planning entry is allowed only for Ethiopian fiscal year ${settings.fiscal_year}`, 422);
  }
  if (!isSuperAdmin(auth.roles) && !entryAllowed(settings, data.period_type, data.period_type === 'monthly' && (Number(data.achievement_land_area ?? 0) > 0 || Number(data.achievement_population ?? 0) > 0 || Number(data.achievement_productivity ?? 0) > 0 || Number(data.achievement_production ?? 0) > 0))) {
    return fail(`${data.record_type === "plan" ? "Plan" : "Achievement"} entry is currently closed by Super Admin`, 403);
  }

  const businessError = await validatePlanningBusinessRules(data, finalOfficeId, finalDirectorateId, finalTeamId);
  if (businessError) return fail(businessError, 422);

  const saved = await savePlanningRecord(data, user, Number(auth.id));
  return created(saved, "Planning record created successfully");
}
