import { query, transaction } from "@/lib/server/db";
import type { PoolConnection } from "mysql2/promise";
import { isSuperAdmin } from "@/lib/server/planning-record-rules";
import { createUserNotification } from "@/lib/server/notifications";
import { getOcduIdentity } from "@/lib/server/ocdu-access";

export type PlanningWorkflowRole =
  | "expert"
  | "team_leader"
  | "director"
  | "ocdu_director"
  | "ocdu_manager"
  | "ocdu_adviser"
  | "super_admin"
  | "none";

export type PlanningWorkflowTarget = "plan" | "achievement";
export type PlanningWorkflowAction =
  | "submit"
  | "verify"
  | "approve"
  | "final_approve"
  | "return"
  | "reject"
  | "comment";

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function roleText(user: any, roles: string[] = []) {
  return [
    ...roles,
    user?.role,
    user?.display_role,
    user?.name,
    user?.email,
    user?.office_name,
    user?.directorate_name,
    user?.department_name,
    user?.team_name,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
}

export function getPlanningWorkflowRole(user: any, roles: string[] = []): PlanningWorkflowRole {
  if (isSuperAdmin(roles)) return "super_admin";

  const text = roleText(user, roles);
  const assignedRoles = [...roles, user?.role, user?.display_role]
    .map(normalize)
    .filter(Boolean);
  const ocdu = getOcduIdentity(user, roles);
  const hasAssignedRole = (...names: string[]) =>
    assignedRoles.some((role) => names.includes(role));
  const isDirector = hasAssignedRole("director");
  const isPresidentOffice = ["president", "presedant", "presedent", "pirezidaant"]
    .some((name) => text.includes(name));
  const isOcdu = text.includes("ocdu") || text.includes("office_coordination_and_delivery");
  const isMonitoringManager =
    text.includes("value_chain_monitoring_manager") ||
    text.includes("investment_monitoring_manager") ||
    text.includes("job_creation_monitoring_manager");
  const isMonitoringAdviser =
    text.includes("monitoring_and_evaluation_advisory") ||
    text.includes("monitoring_and_evaluation_adviser");

  if (ocdu.isOcdu && ocdu.isDirector) return "ocdu_director";
  if (ocdu.isOcdu && ocdu.isManager) return "ocdu_manager";
  if (ocdu.isOcdu && ocdu.isAdviser) return "ocdu_adviser";
  if (isDirector && isPresidentOffice && isOcdu) return "ocdu_director";
  if (isPresidentOffice && isOcdu && isMonitoringManager) return "ocdu_manager";
  if (isPresidentOffice && isOcdu && isMonitoringAdviser) return "ocdu_adviser";
  if (hasAssignedRole("team_leader", "teamleader", "teamlead")) return "team_leader";
  if (isDirector) return "director";
  if (hasAssignedRole("expert")) return "expert";
  return "none";
}

export function workflowStatus(record: any, target: PlanningWorkflowTarget) {
  const value = target === "plan" ? record?.plan_status : record?.achievement_status;
  if (value) {
    const legacy: Record<string, string> = {
      submitted: workflowSubmittedRole(record, target) === "team_leader" ? "submitted_director" : "submitted_team_leader",
      verified: "verified_team_leader",
      director_approved: "approved_director",
      accepted: target === "plan" ? "finally_approved" : "approved_director",
    };
    return legacy[String(value)] ?? String(value);
  }
  if (target === "plan") {
    if (record?.status === "approved") return "accepted";
    if (record?.status === "submitted") return "submitted";
    if (record?.status === "rejected") return "returned";
  }
  return "draft";
}

export function workflowSubmittedRole(record: any, target: PlanningWorkflowTarget) {
  return String(target === "plan" ? record?.plan_submitted_by_role ?? "" : record?.achievement_submitted_by_role ?? "");
}

export function validateWorkflowAction(
  record: any,
  target: PlanningWorkflowTarget,
  action: PlanningWorkflowAction,
  actorRole: PlanningWorkflowRole,
  actorId: number,
) {
  const status = workflowStatus(record, target);
  const submittedRole = workflowSubmittedRole(record, target);

  if (target === "achievement" && record?.period_type !== "monthly") {
    return "Achievements can only be processed on monthly planning records.";
  }

  if (action === "comment") {
    return ["team_leader", "director", "ocdu_director", "ocdu_manager", "ocdu_adviser", "super_admin"].includes(actorRole)
      ? null
      : "You are not allowed to comment on this record.";
  }

  if (action === "submit") {
    if (!["expert", "team_leader", "director"].includes(actorRole)) return "Only an Expert, Team Leader, or Director can submit this record.";
    if (Number(record?.created_by) !== actorId) return "Only the record creator can submit it.";
    return ["draft", "returned", "rejected"].includes(status) ? null : "Only a draft, returned, or rejected record can be submitted.";
  }

  if (action === "verify") {
    if (!["team_leader", "super_admin"].includes(actorRole)) return "Only a Team Leader can verify this record.";
    if (status !== "submitted_team_leader" || submittedRole !== "expert") {
      return "Only an Expert submission awaiting Team Leader verification can be verified.";
    }
    return null;
  }

  if (action === "approve") {
    if (!["director", "super_admin"].includes(actorRole)) return "Only a Director can approve this record.";
    const verifiedExpertSubmission = status === "verified_team_leader";
    const directTeamLeaderSubmission = status === "submitted_director" && submittedRole === "team_leader";
    return verifiedExpertSubmission || directTeamLeaderSubmission
      ? null
      : "The Director can approve only a Team Leader-verified record or a record submitted directly by a Team Leader.";
  }

  if (action === "final_approve") {
    if (!["ocdu_director", "ocdu_manager", "super_admin"].includes(actorRole)) return "Only the OCDU Director or assigned Department Manager can give final approval.";
    if (target !== "plan") return "Achievements do not require OCDU final approval.";
    return status === "approved_director" ? null : "Only Director-approved plans can receive final OCDU approval.";
  }

  if (action === "return" || action === "reject") {
    const canTeamLeaderReturn = actorRole === "team_leader" && status === "submitted_team_leader" && submittedRole === "expert";
    const canDirectorReturn =
      actorRole === "director" &&
      (status === "verified_team_leader" || (status === "submitted_director" && submittedRole === "team_leader"));
    const canOcduReturn = ["ocdu_director", "ocdu_manager"].includes(actorRole) && target === "plan" && status === "approved_director";
    return canTeamLeaderReturn || canDirectorReturn || canOcduReturn || actorRole === "super_admin"
      ? null
      : "This record is not at your approval stage.";
  }

  return "Unsupported workflow action.";
}

function columns(target: PlanningWorkflowTarget) {
  const prefix = target === "plan" ? "plan" : "achievement";
  return {
    status: `${prefix}_status`,
    comment: `${prefix}_comment`,
    submittedBy: `${prefix}_submitted_by`,
    submittedRole: `${prefix}_submitted_by_role`,
    submittedAt: `${prefix}_submitted_at`,
    verifiedBy: `${prefix}_verified_by`,
    verifiedAt: `${prefix}_verified_at`,
    directorApprovedBy: `${prefix}_director_approved_by`,
    directorApprovedAt: `${prefix}_director_approved_at`,
    acceptedBy: `${prefix}_accepted_by`,
    acceptedAt: `${prefix}_accepted_at`,
  };
}

async function notifyUser(userId: unknown, title: string, message: string, record: any) {
  const id = Number(userId);
  if (!id) return;
  await createUserNotification({
    userId: id,
    title,
    message,
    redirectUrl: `/dashboard/planning-records?work=${record.module_type ?? "crop"}`,
    entityType: "planning_record",
    entityId: record.id,
  });
}

async function notifyScopedApprovers(record: any, roleName: string, title: string, message: string) {
  const rows = roleName === "ocdu_director"
    ? await query<any[]>(
        `SELECT DISTINCT u.id
         FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         LEFT JOIN offices o ON o.id = u.office_id
         LEFT JOIN directorates d ON d.id = u.directorate_id
         WHERE LOWER(r.name) LIKE '%director%'
           AND (LOWER(o.name) LIKE '%president%' OR LOWER(o.name) LIKE '%presedant%' OR LOWER(o.name) LIKE '%presedent%' OR LOWER(o.name) LIKE '%pirezidaant%')
           AND (LOWER(d.name) LIKE '%ocdu%' OR LOWER(d.name) LIKE '%coordination%delivery%')`,
      ).catch(() => [])
    : await query<any[]>(
        `SELECT DISTINCT u.id
         FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE LOWER(REPLACE(REPLACE(r.name, ' ', '_'), '-', '_')) = ?
           AND u.office_id = ? AND u.directorate_id = ?
           AND (? <> 'team_leader' OR COALESCE(u.team_id, 0) = COALESCE(?, 0))`,
        [roleName, record.office_id, record.directorate_id, roleName, record.team_id],
      ).catch(() => []);

  await Promise.all(rows.map((row) => notifyUser(row.id, title, message, record)));
}

export async function applyWorkflowAction(options: {
  record: any;
  target: PlanningWorkflowTarget;
  action: PlanningWorkflowAction;
  actorId: number;
  actorRole: PlanningWorkflowRole;
  comment?: string | null;
  connection?: PoolConnection;
  suppressNotifications?: boolean;
}) {
  const { record, target, action, actorId, actorRole } = options;
  const comment = String(options.comment ?? "").trim() || null;
  const field = columns(target);
  const subject = target === "plan" ? "Plan" : "Achievement";
  const fromStatus = workflowStatus(record, target);

  async function persist(sql: string, params: unknown[], toStatus: string) {
    const write = async (connection: PoolConnection) => {
      await connection.execute(sql, params as never);
      await connection.execute(
        `INSERT INTO planning_record_workflow_history
          (planning_record_id, target, action, from_status, to_status, comment, acted_by, acted_as)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.id, target, action, fromStatus, toStatus, comment, actorId, actorRole],
      );
    };
    if (options.connection) await write(options.connection);
    else await transaction(write);
  }

  if (action === "comment") {
    await persist(`UPDATE planning_records SET ${field.comment} = ? WHERE id = ?`, [comment, record.id], fromStatus);
    if (!options.suppressNotifications) {
      await notifyUser(record.created_by, `${subject} commented`, comment || `${subject} comment updated.`, record);
    }
    return `${subject} comment saved successfully`;
  }

  if (action === "submit") {
    if (actorRole === "director") {
      await persist(
        `UPDATE planning_records
         SET ${field.status} = 'approved_director', ${field.comment} = NULL,
             ${field.submittedBy} = ?, ${field.submittedRole} = ?, ${field.submittedAt} = NOW(),
             ${field.verifiedBy} = NULL, ${field.verifiedAt} = NULL,
             ${field.directorApprovedBy} = ?, ${field.directorApprovedAt} = NOW(),
             ${field.acceptedBy} = NULL, ${field.acceptedAt} = NULL,
             status = ?, approved_by = ?, approved_at = NOW(),
             approval_comment = NULL, is_locked = ?
         WHERE id = ?`,
        [
          actorId,
          actorRole,
          actorId,
          target === "achievement" ? "approved" : "submitted",
          actorId,
          target === "achievement" ? 1 : 0,
          record.id,
        ],
        "approved_director",
      );
      if (!options.suppressNotifications && target === "plan") {
        await notifyScopedApprovers(
          record,
          "ocdu_director",
          `${subject} awaiting final approval`,
          `${subject} was submitted by the Director and is ready for OCDU final approval.`,
        );
      }
      return target === "plan"
        ? `${subject} submitted by Director for OCDU final approval`
        : `${subject} submitted and approved by Director successfully`;
    }

    const submittedStatus = actorRole === "team_leader" ? "submitted_director" : "submitted_team_leader";
    await persist(
      `UPDATE planning_records
       SET ${field.status} = ?, ${field.comment} = NULL,
           ${field.submittedBy} = ?, ${field.submittedRole} = ?, ${field.submittedAt} = NOW(),
           ${field.verifiedBy} = NULL, ${field.verifiedAt} = NULL,
           ${field.directorApprovedBy} = NULL, ${field.directorApprovedAt} = NULL,
           ${field.acceptedBy} = NULL, ${field.acceptedAt} = NULL,
           status = 'submitted', approved_by = NULL, approved_at = NULL,
           approval_comment = NULL, is_locked = 0
       WHERE id = ?`,
      [submittedStatus, actorId, actorRole, record.id],
      submittedStatus,
    );
    const nextRole = actorRole === "expert" ? "team_leader" : "director";
    if (!options.suppressNotifications) {
      await notifyScopedApprovers(record, nextRole, `${subject} awaiting review`, `${subject} has been submitted for your review.`);
    }
    return `${subject} submitted successfully`;
  }

  if (action === "verify") {
    await persist(
      `UPDATE planning_records
       SET ${field.status} = 'verified_team_leader', ${field.comment} = ?,
           ${field.verifiedBy} = ?, ${field.verifiedAt} = NOW()
       WHERE id = ?`,
      [comment, actorId, record.id],
      "verified_team_leader",
    );
    if (!options.suppressNotifications) {
      await notifyUser(record.created_by, `${subject} verified`, comment || `Your ${subject.toLowerCase()} was verified by the Team Leader.`, record);
      await notifyScopedApprovers(record, "director", `${subject} awaiting approval`, `${subject} was verified and is awaiting Directorate approval.`);
    }
    return `${subject} verified successfully`;
  }

  if (action === "approve") {
    await persist(
      `UPDATE planning_records
       SET ${field.status} = 'approved_director', ${field.comment} = ?,
           ${field.directorApprovedBy} = ?, ${field.directorApprovedAt} = NOW()
           ${target === "achievement" ? ", status = 'approved', approved_by = ?, approved_at = NOW(), approval_comment = ?, is_locked = 1" : ""}
       WHERE id = ?`,
      target === "achievement"
        ? [comment, actorId, actorId, comment, record.id]
        : [comment, actorId, record.id],
      "approved_director",
    );
    if (!options.suppressNotifications) {
      await notifyUser(record.created_by, `${subject} approved by Director`, comment || `Your ${subject.toLowerCase()} was approved by the Director.`, record);
      if (target === "plan") {
        await notifyScopedApprovers(record, "ocdu_director", `${subject} awaiting final approval`, `${subject} was approved by a Director and is ready for OCDU final approval.`);
      }
    }
    return `${subject} approved by Director successfully`;
  }

  if (action === "final_approve") {
    await persist(
      `UPDATE planning_records
       SET ${field.status} = 'finally_approved', ${field.comment} = ?,
           ${field.acceptedBy} = ?, ${field.acceptedAt} = NOW(),
           status = 'approved', approved_by = ?, approved_at = NOW(), approval_comment = ?, is_locked = ?
       WHERE id = ?`,
      [comment, actorId, actorId, comment, target === "achievement" ? 1 : 0, record.id],
      "finally_approved",
    );
    if (!options.suppressNotifications) {
      await notifyUser(record.created_by, `${subject} finally approved`, comment || `Your ${subject.toLowerCase()} received final OCDU approval.`, record);
    }
    return `${subject} finally approved successfully`;
  }

  const endStatus = action === "reject" ? "rejected" : "returned";
  await persist(
    `UPDATE planning_records
     SET ${field.status} = ?, ${field.comment} = ?,
         status = 'rejected', is_locked = 0
     WHERE id = ?`,
    [endStatus, comment, record.id],
    endStatus,
  );
  if (!options.suppressNotifications) {
    await notifyUser(
      record.created_by,
      `${subject} ${action === "reject" ? "rejected" : "returned"}`,
      comment || `Your ${subject.toLowerCase()} was ${action === "reject" ? "rejected" : "returned for correction"}.`,
      record,
    );
  }
  return `${subject} ${action === "reject" ? "rejected" : "returned"} successfully`;
}

export async function applyWorkflowBundleAction(options: {
  records: any[];
  target: PlanningWorkflowTarget;
  action: PlanningWorkflowAction;
  actorId: number;
  actorRole: PlanningWorkflowRole;
  comment?: string | null;
}) {
  let message = "";
  await transaction(async (connection) => {
    for (const record of options.records) {
      message = await applyWorkflowAction({
        ...options,
        record,
        connection,
        suppressNotifications: true,
      });
    }
  });

  const representative = options.records[0];
  const subject = options.target === "plan" ? "Plan package" : "Achievement batch";
  if (options.action === "submit") {
    const nextRole = options.actorRole === "expert" ? "team_leader" : "director";
    await notifyScopedApprovers(representative, nextRole, `${subject} awaiting review`, `${subject} was submitted for review.`);
  } else if (options.action === "verify") {
    await notifyScopedApprovers(representative, "director", `${subject} awaiting approval`, `${subject} was verified by the Team Leader.`);
  } else if (options.action === "approve" && options.target === "plan") {
    await notifyScopedApprovers(representative, "ocdu_director", `${subject} awaiting final approval`, `${subject} was approved by the Director.`);
  }
  await notifyUser(
    representative.created_by,
    `${subject} workflow updated`,
    options.comment || `${subject} is now ${options.action.replace(/_/g, " ")}.`,
    representative,
  );

  return message;
}
