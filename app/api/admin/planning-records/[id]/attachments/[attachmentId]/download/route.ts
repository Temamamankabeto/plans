import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { fail } from "@/lib/server/response";
import { getPlanningWorkflowRole } from "@/lib/server/planning-workflow";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const auth = await getAuthUser(request);
  if (!auth?.id) return fail("Unauthenticated", 401);
  if (!(auth.permissions ?? []).some((permission) => ["planning_records.attachments", "*", "all"].includes(permission))) {
    return fail("Missing required permission: planning_records.attachments", 403);
  }

  const { id, attachmentId } = await params;
  const users = await query<any[]>(
    `SELECT u.*, o.name AS office_name, d.name AS directorate_name, dp.name AS department_name
     FROM users u
     LEFT JOIN offices o ON o.id = u.office_id
     LEFT JOIN directorates d ON d.id = u.directorate_id
     LEFT JOIN departments dp ON dp.id = u.department_id
     WHERE u.id = ? LIMIT 1`,
    [auth.id],
  );
  const user = users[0];
  const role = getPlanningWorkflowRole(user, auth.roles);
  const rows = await query<any[]>(
    `SELECT a.*, pr.office_id
     FROM planning_record_attachments a
     INNER JOIN planning_records pr ON pr.id = a.planning_record_id
     WHERE a.id = ? AND a.planning_record_id = ?
       AND (? = 1 OR pr.office_id = ?)
     LIMIT 1`,
    [
      attachmentId,
      id,
      ["ocdu_director", "ocdu_manager", "ocdu_adviser", "super_admin"].includes(role) ? 1 : 0,
      user?.office_id ?? 0,
    ],
  );
  const attachment = rows[0];
  if (!attachment) return fail("Supporting evidence not found in your assigned scope", 404);

  const storageRoot = path.resolve(process.cwd(), "storage");
  const absolutePath = path.resolve(storageRoot, String(attachment.storage_path));
  if (!absolutePath.startsWith(`${storageRoot}${path.sep}`)) return fail("Invalid evidence path", 400);

  const bytes = await readFile(absolutePath).catch(() => null);
  if (!bytes) return fail("Supporting evidence file is unavailable", 404);
  const safeName = String(attachment.original_name).replace(/[\r\n"]/g, "_");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
