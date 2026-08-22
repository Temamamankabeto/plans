import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { canAccessOcduReports, getOcduIdentity } from "@/lib/server/ocdu-access";
import { fail, ok } from "@/lib/server/response";

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.id) return fail("Unauthenticated", 401);

  const users = await query<any[]>(
    `SELECT u.*, o.name AS office_name, d.name AS directorate_name,
            dp.name AS department_name, t.name AS team_name
     FROM users u
     LEFT JOIN offices o ON o.id = u.office_id
     LEFT JOIN directorates d ON d.id = u.directorate_id
     LEFT JOIN departments dp ON dp.id = u.department_id
     LEFT JOIN teams t ON t.id = u.team_id
     WHERE u.id = ? LIMIT 1`,
    [auth.id],
  );
  const user = users[0];
  if (!user) return fail("User profile not found", 404);
  if (!canAccessOcduReports(user, auth.roles)) return fail("OCDU report access is not assigned to this user", 403);

  const identity = getOcduIdentity(user, auth.roles);
  const requestedScope = String(request.nextUrl.searchParams.get("scope") ?? "").trim().toLowerCase();
  const scope = identity.isDirector && requestedScope && requestedScope !== "all"
    ? requestedScope
    : identity.isDirector || identity.scope === "monitoring_evaluation"
      ? "all"
      : identity.scope;
  const fiscalYear = String(request.nextUrl.searchParams.get("fiscal_year") ?? "").trim();
  const officeId = Number(request.nextUrl.searchParams.get("office_id") ?? 0);

  const planningWhere = [
    "(pr.plan_status IN ('approved_director','finally_approved') OR pr.achievement_status = 'approved_director')",
  ];
  const planningParams: unknown[] = [];
  if (fiscalYear) { planningWhere.push("pr.fiscal_year = ?"); planningParams.push(fiscalYear); }
  if (officeId > 0) { planningWhere.push("pr.office_id = ?"); planningParams.push(officeId); }

  if (scope === "manufacturing") {
    planningWhere.push("(LOWER(COALESCE(wt.name,'')) LIKE '%manufactur%' OR LOWER(COALESCE(pr.specification,'')) LIKE '%manufactur%' OR LOWER(COALESCE(pr.specification,'')) LIKE '%industry%')");
  } else if (scope === "investment") {
    planningWhere.push("(LOWER(COALESCE(wt.name,'')) LIKE '%investment%' OR LOWER(COALESCE(pr.specification,'')) LIKE '%investment%')");
  } else if (scope === "job_creation") {
    planningWhere.push("(LOWER(COALESCE(wt.name,'')) LIKE '%job%' OR LOWER(COALESCE(wt.name,'')) LIKE '%employment%' OR LOWER(COALESCE(pr.specification,'')) LIKE '%employment%')");
  }

  const includePlanning = ["all", "agriculture", "manufacturing", "investment", "job_creation"].includes(scope);
  const planningRows = includePlanning ? await query<any[]>(
    `SELECT pr.id, pr.office_id, o.name AS office_name, pr.directorate_id,
            d.name AS directorate_name, pr.team_id, t.name AS team_name,
            pr.fiscal_year, pr.month, pr.period_type, pr.module_type,
            COALESCE(c.name, lp.name, pr.specification, wt.name, 'Planning indicator') AS indicator,
            CASE WHEN pr.module_type = 'crop' THEN pr.plan_land_area ELSE pr.plan_population END AS plan_value,
            CASE WHEN pr.module_type = 'crop' THEN pr.achievement_land_area ELSE pr.achievement_population END AS achievement_value,
            pr.plan_status, pr.achievement_status,
            pr.plan_director_approved_at AS approved_at,
            approver.name AS approved_by_name
     FROM planning_records pr
     INNER JOIN offices o ON o.id = pr.office_id
     LEFT JOIN directorates d ON d.id = pr.directorate_id
     LEFT JOIN teams t ON t.id = pr.team_id
     LEFT JOIN work_types wt ON wt.id = pr.worktype_id
     LEFT JOIN crops c ON c.id = pr.crop_id
     LEFT JOIN livestock_products lp ON lp.id = pr.livestock_product_id
     LEFT JOIN users approver ON approver.id = pr.plan_director_approved_by
     WHERE ${planningWhere.join(" AND ")}
     ORDER BY o.name, pr.fiscal_year DESC, pr.month`,
    planningParams,
  ) : [];

  const tradeWhere = ["tr.status = 'approved'"];
  const tradeParams: unknown[] = [];
  if (fiscalYear) { tradeWhere.push("tr.fiscal_year = ?"); tradeParams.push(fiscalYear); }
  if (officeId > 0) { tradeWhere.push("tr.office_id = ?"); tradeParams.push(officeId); }
  if (scope === "manufacturing") {
    tradeWhere.push("(LOWER(tr.stage) LIKE '%manufactur%' OR LOWER(tr.stage) LIKE '%industry%' OR LOWER(tr.stage) LIKE '%value addition%')");
  } else if (scope === "investment") {
    tradeWhere.push("(LOWER(tr.stage) LIKE '%investment%' OR LOWER(tr.commodity_group) LIKE '%investment%' OR LOWER(tr.commodity) LIKE '%investment%')");
  } else if (scope === "job_creation") {
    tradeWhere.push("(tr.employment_male_plan > 0 OR tr.employment_female_plan > 0 OR tr.employment_male_achievement > 0 OR tr.employment_female_achievement > 0)");
  }

  const includeTrade = ["all", "manufacturing", "investment", "job_creation"].includes(scope);
  const tradeRows = includeTrade ? await query<any[]>(
    `SELECT tr.id, tr.office_id, o.name AS office_name, tr.directorate_id,
            d.name AS directorate_name, tr.team_id, t.name AS team_name,
            tr.fiscal_year, tr.month, tr.period_type, tr.commodity_group,
            tr.commodity, tr.stage, tr.plan_product, tr.achievement_product,
            tr.employment_male_plan, tr.employment_female_plan,
            tr.employment_male_achievement, tr.employment_female_achievement,
            tr.approved_at, approver.name AS approved_by_name
     FROM trade_records tr
     INNER JOIN offices o ON o.id = tr.office_id
     LEFT JOIN directorates d ON d.id = tr.directorate_id
     LEFT JOIN teams t ON t.id = tr.team_id
     LEFT JOIN users approver ON approver.id = tr.approved_by
     WHERE ${tradeWhere.join(" AND ")}
     ORDER BY o.name, tr.fiscal_year DESC, tr.month`,
    tradeParams,
  ) : [];

  const rows = [
    ...planningRows.map((row) => ({
      ...row,
      source: "planning",
      category: row.module_type === "livestock" ? "Livestock" : "Agriculture",
      plan_value: number(row.plan_value),
      achievement_value: number(row.achievement_value),
    })),
    ...tradeRows.map((row) => {
      const employmentPlan = number(row.employment_male_plan) + number(row.employment_female_plan);
      const employmentAchievement = number(row.employment_male_achievement) + number(row.employment_female_achievement);
      const isEmployment = scope === "job_creation";
      return {
        ...row,
        source: "trade",
        category: isEmployment ? "Job Creation" : row.stage || "Trade / Value Addition",
        indicator: `${row.commodity_group} - ${row.commodity}`,
        plan_value: isEmployment ? employmentPlan : number(row.plan_product),
        achievement_value: isEmployment ? employmentAchievement : number(row.achievement_product),
        plan_status: "approved",
        achievement_status: "approved",
      };
    }),
  ];

  const offices = await query<any[]>("SELECT id, name FROM offices WHERE is_active = 1 ORDER BY name");
  const totalPlan = rows.reduce((sum, row) => sum + number(row.plan_value), 0);
  const totalAchievement = rows.reduce((sum, row) => sum + number(row.achievement_value), 0);
  const officeCount = new Set(rows.map((row) => Number(row.office_id))).size;

  return ok(rows, "OCDU consolidated report fetched successfully", {
    scope,
    department: user.department_name,
    offices,
    total_records: rows.length,
    participating_offices: officeCount,
    total_plan: totalPlan,
    total_achievement: totalAchievement,
    performance_percent: totalPlan > 0 ? Number(((totalAchievement / totalPlan) * 100).toFixed(2)) : 0,
  });
}
