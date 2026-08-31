import { NextRequest } from "next/server";
import { execute, query, transaction } from "@/lib/server/db";
import { getAuthUser } from "@/lib/server/auth";
import { getUserAccessMappings } from "@/lib/server/dynamic-access";
import { validatePlanningRecordInput } from "@/lib/schemas/planning-record.schema";
import { fail, ok } from "@/lib/server/response";
import { entryAllowed, fiscalYearAllowed, getPlanningSettings, isSuperAdmin, savePlanningRecord, validatePlanningBusinessRules } from "@/lib/server/planning-record-rules";
import { applyPlanningReadScope, validatePlanningWriteScope } from "@/lib/server/planning-access";
import {
  applyWorkflowAction,
  getPlanningWorkflowRole,
  validateWorkflowAction,
  workflowStatus,
  type PlanningWorkflowTarget,
} from "@/lib/server/planning-workflow";

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

async function scopedRecordExists(id: string, user: any, roles: string[] = []) {
  const where = ["pr.id = ?"];
  const params: unknown[] = [id];

  // Only the OCDU Director has a cross-office final-approval scope.
  if (!["ocdu_director", "ocdu_manager", "ocdu_adviser", "super_admin"].includes(getPlanningWorkflowRole(user, roles))) {
    applyPlanningReadScope(where, params, user, roles, "pr");
  }

  const rows = await query<any[]>(`${selectSql} WHERE ${where.join(" AND ")} LIMIT 1`, params);
  return rows[0] ?? null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { auth, user } = await getAuthContext(request);
  if (!auth || !user) return fail("Unauthenticated", 401);

  const { id } = await params;
  const record = await scopedRecordExists(id, user, auth.roles);
  if (!record) return fail("Planning record not found", 404);
  return ok(record, "Planning record fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { auth, user } = await getAuthContext(request);
  if (!auth || !user) return fail("Unauthenticated", 401);

  const { id } = await params;
  const existing = await scopedRecordExists(id, user, auth.roles);
  if (!existing) return fail("Planning record not found", 404);

  const body = await request.json().catch(() => ({}));
  const workflowTarget = String((body as any).workflow_target ?? "plan") as PlanningWorkflowTarget;
  const requestedSubmit = String((body as any).workflow_action ?? "") === "submit";
  const actorRole = getPlanningWorkflowRole(user, auth.roles);
  const currentWorkflowStatus = workflowStatus(existing, workflowTarget);
  if (requestedSubmit && workflowTarget === "plan" && existing.period_type === "monthly") {
    return fail("Submit the Annual Plan package after completing all 12 monthly distributions.", 422);
  }
  if (
    requestedSubmit &&
    workflowTarget === "achievement" &&
    !String((body as any).achievement_remark ?? existing.achievement_remark ?? "").trim()
  ) {
    return fail("Progress explanation or remark is required before submitting an achievement.", 422);
  }

  if (["finally_approved", "approved_director"].includes(currentWorkflowStatus)) {
    return fail(`The finally approved ${workflowTarget} is locked and cannot be edited.`, 403);
  }
  if (!["draft", "returned", "rejected"].includes(currentWorkflowStatus)) {
    return fail("A submitted planning record cannot be edited until it is returned.", 403);
  }
  if (
    workflowTarget === "achievement" &&
    !["approved_director", "finally_approved"].includes(workflowStatus(existing, "plan"))
  ) {
    return fail("Achievement can be recorded only against a Director-approved monthly plan.", 422);
  }
  if (!isSuperAdmin(auth.roles) && Number(existing.created_by) !== Number(auth.id)) {
    return fail("Only the record creator can edit or submit this planning record.", 403);
  }

  const validation = validatePlanningRecordInput(body);
  if (!validation.valid) return fail("Validation failed", 422, validation.errors);
  const data = validation.data;

  const finalOfficeId = user.office_id ?? data.office_id;
  const finalDirectorateId = user.directorate_id ?? data.directorate_id;
  const finalTeamId = user.team_id ?? data.team_id;

  if (!finalOfficeId) return fail("Logged-in user has no assigned office", 422);

  const scopeError = await validatePlanningWriteScope(data, user, auth.roles);
  if (scopeError) return fail(scopeError, 403);

  const settings = await getPlanningSettings();
  if (!fiscalYearAllowed(settings, data.fiscal_year)) {
    return fail(`Planning entry is allowed only for Ethiopian fiscal year ${settings.fiscal_year}`, 422);
  }
  if (!isSuperAdmin(auth.roles) && !entryAllowed(settings, data.period_type, data.period_type === 'monthly' && (Number(data.achievement_land_area ?? 0) > 0 || Number(data.achievement_population ?? 0) > 0 || Number(data.achievement_productivity ?? 0) > 0 || Number(data.achievement_production ?? 0) > 0))) {
    return fail(`${data.record_type === "plan" ? "Plan" : "Achievement"} entry is currently closed by Super Admin`, 403);
  }

  // Achievement entry updates values on an existing, already-approved monthly
  // plan row. Monthly allocation rules apply only when the plan distribution
  // itself is created or edited; applying them here would incorrectly require
  // the approved Annual Plan to be reopened.
  if (workflowTarget === "plan") {
    const businessError = await validatePlanningBusinessRules(
      data,
      finalOfficeId,
      finalDirectorateId,
      finalTeamId,
      id,
    );
    if (businessError) return fail(businessError, 422);
  }

  const saved = await savePlanningRecord(
    data,
    user,
    Number(auth.id),
    (body as any).approved_by ?? existing.approved_by ?? null,
    id,
  );
  if (workflowTarget === "achievement") {
    await execute(
      "UPDATE planning_records SET achievement_remark = ? WHERE id = ?",
      [String((body as any).achievement_remark ?? "").trim() || null, id],
    );
  }

  if (requestedSubmit || (workflowTarget === "plan" && data.status === "submitted")) {
    const workflowError = validateWorkflowAction(existing, workflowTarget, "submit", actorRole, Number(auth.id));
    if (workflowError) return fail(workflowError, 403);
    const message = await applyWorkflowAction({
      record: existing,
      target: workflowTarget,
      action: "submit",
      actorId: Number(auth.id),
      actorRole,
    });
    return ok(saved, message);
  }

  return ok(saved, "Planning record updated successfully");
}


export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { auth, user } = await getAuthContext(request);
  if (!auth || !user) return fail("Unauthenticated", 401);

  const { id } = await params;
  const existing = await scopedRecordExists(id, user, auth.roles);
  if (!existing) return fail("Planning record not found", 404);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "comment").trim().toLowerCase();
  const comment = String(body.comment ?? "").trim();
  const target = String(body.target ?? "plan") as PlanningWorkflowTarget;
  const actorRole = getPlanningWorkflowRole(user, auth.roles);

  if (action === "cancel") {
    if (target !== "plan" || existing.period_type !== "annual") {
      return fail("Only an Annual Plan can be cancelled.", 422);
    }
    if (!["super_admin", "ocdu_director", "ocdu_manager"].includes(actorRole)) {
      return fail("Only Super Admin or an authorized OCDU final approver can cancel a finally approved Annual Plan.", 403);
    }
    if (workflowStatus(existing, "plan") !== "finally_approved") {
      return fail("Only a finally approved Annual Plan can be cancelled. Draft plans should be deleted and submitted plans should be returned.", 422);
    }
    if (!comment) return fail("Cancellation reason is required.", 422);

    await transaction(async (connection) => {
      const childRows = await connection.query(
        "SELECT id, plan_status, achievement_status FROM planning_records WHERE annual_plan_id = ?",
        [existing.id],
      );
      const children = (childRows as any)[0] as Array<{ id: number; plan_status: string; achievement_status: string }>;

      await connection.execute(
        `UPDATE planning_records
         SET plan_status = 'cancelled', status = 'rejected', is_locked = 1,
             plan_comment = ?, approval_comment = ?, updated_at = NOW()
         WHERE id = ?`,
        [comment, comment, existing.id],
      );
      await connection.execute(
        `INSERT INTO planning_record_workflow_history
           (planning_record_id, target, action, from_status, to_status, comment, acted_by, acted_as)
         VALUES (?, 'plan', 'cancel', ?, 'cancelled', ?, ?, ?)`,
        [existing.id, workflowStatus(existing, "plan"), comment, Number(auth.id), actorRole],
      );

      for (const child of children) {
        await connection.execute(
          `UPDATE planning_records
           SET plan_status = 'cancelled', achievement_status = 'cancelled', status = 'rejected',
               is_locked = 1, plan_comment = ?, achievement_comment = ?, approval_comment = ?, updated_at = NOW()
           WHERE id = ?`,
          [comment, comment, comment, child.id],
        );
        await connection.execute(
          `INSERT INTO planning_record_workflow_history
             (planning_record_id, target, action, from_status, to_status, comment, acted_by, acted_as)
           VALUES (?, 'plan', 'cancel', ?, 'cancelled', ?, ?, ?)`,
          [child.id, child.plan_status || 'draft', comment, Number(auth.id), actorRole],
        );
      }
    });

    return ok(null, "Annual Plan cancelled successfully. Its monthly distributions are preserved for audit but excluded from active approved planning.");
  }

  if (!["comment", "approve"].includes(action)) {
    return fail("Invalid review action.", 422);
  }

  const stagedAction =
    action === "comment"
      ? "comment"
      : actorRole === "team_leader"
        ? "verify"
        : actorRole === "director"
          ? "approve"
          : "final_approve";
  const requiredPermission =
    stagedAction === "verify"
      ? "planning_records.verify"
      : stagedAction === "approve"
        ? "planning_records.director_approve"
        : stagedAction === "final_approve"
          ? "planning_records.final_approve"
          : null;
  if (requiredPermission && actorRole !== "super_admin" && !(auth.permissions ?? []).includes(requiredPermission)) {
    return fail(`Missing required permission: ${requiredPermission}`, 403);
  }
  const workflowError = validateWorkflowAction(existing, target, stagedAction, actorRole, Number(auth.id));
  if (workflowError) return fail(workflowError, 403);

  const message = await applyWorkflowAction({
    record: existing,
    target,
    action: stagedAction,
    actorId: Number(auth.id),
    actorRole,
    comment,
  });
  return ok(null, message);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { auth, user } = await getAuthContext(request);
  if (!auth || !user) return fail("Unauthenticated", 401);

  const { id } = await params;
  const existing = await scopedRecordExists(id, user, auth.roles);
  if (!existing) return fail("Planning record not found", 404);

  const planState = workflowStatus(existing, "plan");
  if (planState !== "draft") {
    return fail("Only a draft plan can be permanently deleted. Submitted plans must be returned; finally approved plans must be cancelled instead.", 422);
  }
  if (!isSuperAdmin(auth.roles) && Number(existing.created_by) !== Number(auth.id)) {
    return fail("Only the draft plan creator or Super Admin can delete this plan.", 403);
  }
  if (existing.period_type === "annual") {
    const children = await query<any[]>("SELECT id FROM planning_records WHERE annual_plan_id = ? LIMIT 1", [existing.id]);
    if (children.length) {
      return fail("This Annual Plan already has monthly distributions. Remove the draft monthly distributions first, or correct the Annual Plan instead.", 422);
    }
  }

  await execute("DELETE FROM planning_records WHERE id = ?", [id]);
  return ok(null, "Draft planning record deleted successfully");
}
