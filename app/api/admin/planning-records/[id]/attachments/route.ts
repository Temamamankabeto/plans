import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { execute, query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";
import { getPlanningWorkflowRole } from "@/lib/server/planning-workflow";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth?.id) return fail("Unauthenticated", 401);
  if (!(auth.permissions ?? []).some((permission) => ["planning_records.attachments", "*", "all"].includes(permission))) {
    return fail("Missing required permission: planning_records.attachments", 403);
  }

  const { id } = await params;
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
  const records = await query<any[]>(
    `SELECT id FROM planning_records
     WHERE id = ?
       AND (? = 1 OR office_id = ?) LIMIT 1`,
    [id, ["ocdu_director", "ocdu_manager", "ocdu_adviser", "super_admin"].includes(role) ? 1 : 0, user?.office_id ?? 0],
  );
  if (!records.length) return fail("Planning record not found in your assigned scope", 404);

  const rows = await query<any[]>(
    `SELECT a.id, a.target, a.original_name, a.mime_type, a.size_bytes,
            a.created_at, a.uploaded_by, u.name AS uploaded_by_name,
            CONCAT('/api/admin/planning-records/', a.planning_record_id, '/attachments/', a.id, '/download') AS download_url
     FROM planning_record_attachments a
     INNER JOIN users u ON u.id = a.uploaded_by
     WHERE a.planning_record_id = ?
     ORDER BY a.created_at DESC, a.id DESC`,
    [id],
  );
  return ok(rows, "Supporting evidence fetched successfully");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth?.id) return fail("Unauthenticated", 401);
  if (!(auth.permissions ?? []).some((permission) => ["planning_records.attachments", "*", "all"].includes(permission))) {
    return fail("Missing required permission: planning_records.attachments", 403);
  }

  const { id } = await params;
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
  const mayAttachToScopedRecord = ["team_leader", "director", "ocdu_director", "super_admin"].includes(role);
  const records = await query<any[]>(
    `SELECT id FROM planning_records
     WHERE id = ?
       AND (? = 1 OR created_by = ?)
       AND (? = 1 OR office_id = ?)
     LIMIT 1`,
    [
      id,
      mayAttachToScopedRecord ? 1 : 0,
      auth.id,
      ["ocdu_director", "super_admin"].includes(role) ? 1 : 0,
      user?.office_id ?? 0,
    ],
  );
  if (!records.length) return fail("Planning record not found", 404);

  const formData = await request.formData();
  const target = String(formData.get("target") ?? "achievement");
  const file = formData.get("file");
  if (!["plan", "achievement"].includes(target)) return fail("Invalid attachment target", 422);
  if (!(file instanceof File)) return fail("Supporting evidence file is required", 422);
  if (!ALLOWED_TYPES.has(file.type)) return fail("Only PDF, JPG, PNG, DOCX, and XLSX evidence files are allowed", 422);
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return fail("Evidence file must not exceed 10 MB", 422);

  const safeExtension = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const storedName = `${randomUUID()}${safeExtension}`;
  const relativeDirectory = path.join("planning-evidence", String(id));
  const absoluteDirectory = path.join(process.cwd(), "storage", relativeDirectory);
  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(path.join(absoluteDirectory, storedName), Buffer.from(await file.arrayBuffer()), { flag: "wx" });

  const storagePath = path.join(relativeDirectory, storedName);
  let result;
  try {
    result = await execute(
      `INSERT INTO planning_record_attachments
        (planning_record_id, target, original_name, stored_name, storage_path, mime_type, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, target, file.name, storedName, storagePath, file.type, file.size, auth.id],
    );
  } catch (error) {
    await unlink(path.join(absoluteDirectory, storedName)).catch(() => undefined);
    throw error;
  }

  return ok(
    {
      id: result.insertId,
      target,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      download_url: `/api/admin/planning-records/${id}/attachments/${result.insertId}/download`,
    },
    "Supporting evidence uploaded successfully",
    undefined,
    201,
  );
}
