import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { getUserAccessMappings } from "@/lib/server/dynamic-access";
import { applyPlanningReadScope } from "@/lib/server/planning-access";
import { fail, ok } from "@/lib/server/response";
import {
  applyWorkflowBundleAction,
  getPlanningWorkflowRole,
  type PlanningWorkflowAction,
  validateWorkflowAction,
} from "@/lib/server/planning-workflow";

const MAX_BULK_RECORDS = 100;

export async function POST(request: NextRequest) {
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
  user.access_mappings = await getUserAccessMappings(Number(auth.id));

  const body = await request.json().catch(() => ({}));
  const ids = [...new Set(
    (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((id: number) => Number.isInteger(id) && id > 0),
  )].slice(0, MAX_BULK_RECORDS) as number[];
  const action = String(body.action ?? "").trim().toLowerCase() as PlanningWorkflowAction;
  const comment = String(body.comment ?? "").trim() || null;

  if (!ids.length) return fail("Select at least one monthly achievement", 422);
  if (!["verify", "approve", "return", "reject"].includes(action)) {
    return fail("Invalid bulk workflow action", 422);
  }
  if (["return", "reject"].includes(action) && !comment) {
    return fail(`${action === "reject" ? "Rejection" : "Return"} reason is required`, 422);
  }

  const actorRole = getPlanningWorkflowRole(user, auth.roles);
  const requiredPermission =
    action === "verify"
      ? "planning_records.bulk_verify"
      : action === "approve"
        ? "planning_records.bulk_approve"
        : "planning_records.reject";
  if (actorRole !== "super_admin" && !(auth.permissions ?? []).includes(requiredPermission)) {
    return fail(`Missing required permission: ${requiredPermission}`, 403);
  }

  const where = [
    `pr.id IN (${ids.map(() => "?").join(",")})`,
    "pr.period_type = 'monthly'",
  ];
  const values: unknown[] = [...ids];
  if (!["ocdu_director", "super_admin"].includes(actorRole)) {
    applyPlanningReadScope(where, values, user, auth.roles, "pr");
  }

  const records = await query<any[]>(
    `SELECT pr.*
     FROM planning_records pr
     INNER JOIN offices o ON o.id = pr.office_id
     LEFT JOIN directorates d ON d.id = pr.directorate_id
     LEFT JOIN teams t ON t.id = pr.team_id
     LEFT JOIN crop_types cty ON cty.id = pr.crop_type_id
     LEFT JOIN livestock_products lp ON lp.id = pr.livestock_product_id
     WHERE ${where.join(" AND ")}
     ORDER BY pr.id`,
    values,
  );

  const processed: number[] = [];
  const skipped: Array<{ id: number; reason: string }> = [];
  const eligible: any[] = [];
  const found = new Set(records.map((record) => Number(record.id)));
  ids.filter((id) => !found.has(id)).forEach((id) => skipped.push({ id, reason: "Record not found in your assigned scope" }));

  for (const record of records) {
    const error = validateWorkflowAction(
      record,
      "achievement",
      action,
      actorRole,
      Number(auth.id),
    );
    if (error) {
      skipped.push({ id: Number(record.id), reason: error });
      continue;
    }

    eligible.push(record);
    processed.push(Number(record.id));
  }

  if (eligible.length) {
    await applyWorkflowBundleAction({
      records: eligible,
      target: "achievement",
      action,
      actorId: Number(auth.id),
      actorRole,
      comment,
    });
  }

  return ok(
    { processed, skipped },
    `${processed.length} achievement${processed.length === 1 ? "" : "s"} processed successfully`,
    { requested: ids.length, processed: processed.length, skipped: skipped.length },
  );
}
