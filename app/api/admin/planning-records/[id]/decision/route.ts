import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { getAuthUser } from "@/lib/server/auth";
import { getUserAccessMappings } from "@/lib/server/dynamic-access";
import { fail, ok } from "@/lib/server/response";
import { applyPlanningReadScope } from "@/lib/server/planning-access";
import { applyOcduPlanningScope } from "@/lib/server/ocdu-access";
import {
  applyWorkflowAction,
  applyWorkflowBundleAction,
  getPlanningWorkflowRole,
  type PlanningWorkflowAction,
  type PlanningWorkflowTarget,
  validateWorkflowAction,
} from "@/lib/server/planning-workflow";

const selectSql = `
  SELECT pr.*
  FROM planning_records pr
  INNER JOIN offices o ON o.id = pr.office_id
  LEFT JOIN directorates d ON d.id = pr.directorate_id
  LEFT JOIN teams t ON t.id = pr.team_id
  LEFT JOIN work_types wt ON wt.id = pr.worktype_id
  LEFT JOIN crop_types cty ON cty.id = pr.crop_type_id
  LEFT JOIN livestock_products lp ON lp.id = pr.livestock_product_id
`;

async function getAuthContext(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.id) return { auth: null, user: null };

  const rows = await query<any[]>(
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
  const user = rows[0] ?? null;
  if (user) user.access_mappings = await getUserAccessMappings(Number(auth.id));
  return { auth, user };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { auth, user } = await getAuthContext(request);
  if (!auth || !user) return fail("Unauthenticated", 401);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const target = String(body.target ?? "plan").trim().toLowerCase() as PlanningWorkflowTarget;
  const action = String(body.action ?? "comment").trim().toLowerCase() as PlanningWorkflowAction;
  const comment = String(body.comment ?? "").trim() || null;

  if (!["plan", "achievement"].includes(target)) return fail("Invalid decision target", 422);
  if (!["submit", "verify", "approve", "final_approve", "return", "reject", "comment"].includes(action)) {
    return fail("Invalid workflow action", 422);
  }
  if (["return", "reject"].includes(action) && !comment) {
    return fail(`${action === "reject" ? "Rejection" : "Return"} reason is required`, 422);
  }

  const actorRole = getPlanningWorkflowRole(user, auth.roles);
  const requiredPermission =
    action === "verify"
      ? "planning_records.verify"
      : action === "approve"
        ? "planning_records.director_approve"
        : action === "final_approve"
          ? "planning_records.final_approve"
          : action === "reject"
            ? "planning_records.reject"
            : null;
  if (
    requiredPermission &&
    actorRole !== "super_admin" &&
    !(auth.permissions ?? []).includes(requiredPermission)
  ) {
    return fail(`Missing required permission: ${requiredPermission}`, 403);
  }

  const where = ["pr.id = ?"];
  const values: unknown[] = [id];

  // OCDU has a cross-office final-approval queue. All other actors remain
  // restricted by their assigned office/directorate/team and access mapping.
  if (actorRole === "ocdu_manager") {
    applyOcduPlanningScope(where, values, user, auth.roles, "pr", "wt");
  } else if (!["ocdu_director", "ocdu_adviser", "super_admin"].includes(actorRole)) {
    applyPlanningReadScope(where, values, user, auth.roles, "pr");
  }

  const rows = await query<any[]>(`${selectSql} WHERE ${where.join(" AND ")} LIMIT 1`, values);
  const record = rows[0];
  if (!record) return fail("Planning record not found in your assigned scope", 404);
  if (target === "plan" && record.period_type === "monthly" && action !== "comment") {
    return fail("Monthly plan workflow actions must be applied from the parent Annual Plan so both move together.", 422);
  }

  let records = [record];
  if (target === "plan" && record.period_type === "annual" && action !== "comment") {
    const monthly = await query<any[]>(
      "SELECT * FROM planning_records WHERE annual_plan_id = ? AND period_type = 'monthly' ORDER BY month, id",
      [record.id],
    );

    if (action === "submit") {
      const reportingMonths = monthly.filter((item) => Number(item.month) >= 1 && Number(item.month) <= 13);
      if (!reportingMonths.length) {
        return fail("Create at least one monthly distribution before submitting the plan.", 422);
      }

      const annualBase = Number(record.module_type === "crop" ? record.plan_land_area : record.plan_population);
      const monthlyBase = reportingMonths.reduce(
        (sum, item) => sum + Number(item.module_type === "crop" ? item.plan_land_area : item.plan_population),
        0,
      );
      const annualProduction = Number(record.plan_production ?? 0);
      const monthlyProduction = reportingMonths.reduce((sum, item) => sum + Number(item.plan_production ?? 0), 0);
      const equal = (left: number, right: number) => Math.abs(left - right) <= 0.01;
      if (!equal(annualBase, monthlyBase) || !equal(annualProduction, monthlyProduction)) {
        return fail(
          "The total of the entered monthly targets must equal the Annual Plan target before submission.",
          422,
          {
            annual_base: annualBase,
            monthly_base: monthlyBase,
            annual_production: annualProduction,
            monthly_production: monthlyProduction,
            distributed_months: reportingMonths.length,
          },
        );
      }
    }
    records = [record, ...monthly];
  }

  for (const workflowRecord of records) {
    const workflowError = validateWorkflowAction(
      workflowRecord,
      target,
      action,
      actorRole,
      Number(auth.id),
    );
    if (workflowError) return fail(workflowError, 403, { record_id: workflowRecord.id });
  }

  const message = records.length > 1
    ? await applyWorkflowBundleAction({
        records,
        target,
        action,
        actorId: Number(auth.id),
        actorRole,
        comment,
      })
    : await applyWorkflowAction({
      record,
      target,
      action,
      actorId: Number(auth.id),
      actorRole,
      comment,
    });

  return ok(
    { affected_record_ids: records.map((item) => Number(item.id)) },
    records.length > 1 ? `${message}; ${records.length} annual/monthly records updated together` : message,
  );
}
