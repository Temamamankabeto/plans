import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { getUserAccessMappings } from "@/lib/server/dynamic-access";
import { applyPlanningReadScope } from "@/lib/server/planning-access";
import { fail, ok } from "@/lib/server/response";
import { getPlanningWorkflowRole } from "@/lib/server/planning-workflow";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const where = ["pr.id = ?"];
  const values: unknown[] = [id];
  const role = getPlanningWorkflowRole(user, auth.roles);
  if (!["ocdu_director", "ocdu_manager", "ocdu_adviser", "super_admin"].includes(role)) {
    applyPlanningReadScope(where, values, user, auth.roles, "pr");
  }

  const allowed = await query<any[]>(
    `SELECT pr.id
     FROM planning_records pr
     INNER JOIN offices o ON o.id = pr.office_id
     LEFT JOIN directorates d ON d.id = pr.directorate_id
     LEFT JOIN teams t ON t.id = pr.team_id
     LEFT JOIN crop_types cty ON cty.id = pr.crop_type_id
     LEFT JOIN livestock_products lp ON lp.id = pr.livestock_product_id
     WHERE ${where.join(" AND ")} LIMIT 1`,
    values,
  );
  if (!allowed.length) return fail("Planning record not found in your assigned scope", 404);

  const history = await query<any[]>(
    `SELECT h.*, u.name AS acted_by_name
     FROM planning_record_workflow_history h
     INNER JOIN users u ON u.id = h.acted_by
     WHERE h.planning_record_id = ?
     ORDER BY h.created_at DESC, h.id DESC`,
    [id],
  );
  return ok(history, "Approval history fetched successfully");
}
