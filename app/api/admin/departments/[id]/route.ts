import { NextRequest } from "next/server";
import { departmentSchema } from "@/lib/schemas/department.schema";
import { getAuthUser } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

function can(auth: Awaited<ReturnType<typeof getAuthUser>>, permission: string) {
  if (!auth) return false;
  if (auth.roles?.includes("Super Admin")) return true;
  return auth.permissions?.some((item) =>
    [permission, permission.replace(".view", ".read"), permission.replace(".read", ".view")].includes(item),
  );
}

function makeCode(name: string, officeId: number) {
  return `${officeId}_${name}`.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
}

function auditContext(request: NextRequest) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

const selectSql = `
  SELECT dp.id, dp.office_id, dp.name, dp.code, dp.description, dp.is_active, dp.created_at, dp.updated_at,
         o.name AS office_name, COUNT(DISTINCT d.id) AS directorates_count
  FROM departments dp
  INNER JOIN offices o ON o.id = dp.office_id
  LEFT JOIN directorates d ON d.department_id = dp.id
  WHERE dp.id = ?
  GROUP BY dp.id, dp.office_id, dp.name, dp.code, dp.description, dp.is_active, dp.created_at, dp.updated_at, o.name
  LIMIT 1
`;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "departments.view")) return fail("You do not have permission to view departments", 403);
  const { id } = await params;
  const rows = await query<any[]>(selectSql, [id]);
  if (!rows.length) return fail("Department not found", 404);
  return ok(rows[0], "Department fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "departments.update")) return fail("You do not have permission to update departments", 403);
  const { id } = await params;
  const beforeRows = await query<any[]>(selectSql, [id]);
  if (!beforeRows.length) return fail("Department not found", 404);

  const parsed = departmentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid department data", 422);
  const data = parsed.data;

  const office = await query<any[]>("SELECT id FROM offices WHERE id = ? LIMIT 1", [data.office_id]);
  if (!office.length) return fail("Selected office does not exist", 422);

  const duplicate = await query<any[]>(
    "SELECT id FROM departments WHERE office_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1",
    [data.office_id, data.name, id],
  );
  if (duplicate.length) return fail("Department name already exists in the selected office", 409);

  const code = data.code || makeCode(data.name, data.office_id);
  const codeDuplicate = await query<any[]>("SELECT id FROM departments WHERE code = ? AND id <> ? LIMIT 1", [code, id]);
  if (codeDuplicate.length) return fail("Department code already exists", 409);

  const after = { id: Number(id), ...data, code };
  const audit = auditContext(request);
  await transaction(async (connection) => {
    await connection.execute(
      "UPDATE departments SET office_id = ?, directorate_id = NULL, name = ?, code = ?, description = ?, is_active = ? WHERE id = ?",
      [data.office_id, data.name, code, data.description || null, data.is_active ? 1 : 0, id],
    );
    await connection.execute(
      `INSERT INTO audit_logs
       (user_id, action, module, entity_type, entity_id, message, before_data, after_data, ip_address, user_agent)
       VALUES (?, 'updated', 'organization', 'department', ?, ?, ?, ?, ?, ?)`,
      [auth.id, id, `Updated department ${data.name}`, JSON.stringify(beforeRows[0]), JSON.stringify(after), audit.ip, audit.userAgent],
    );
  });
  return ok(after, "Department updated successfully");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "departments.delete")) return fail("You do not have permission to delete departments", 403);
  const { id } = await params;
  const rows = await query<any[]>(selectSql, [id]);
  if (!rows.length) return fail("Department not found", 404);

  const linked = await query<any[]>("SELECT COUNT(*) total FROM directorates WHERE department_id = ?", [id]);
  if (Number(linked[0]?.total ?? 0) > 0) return fail("Department has linked directorates. Disable it instead of deleting it.", 409);

  const audit = auditContext(request);
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM departments WHERE id = ?", [id]);
    await connection.execute(
      `INSERT INTO audit_logs
       (user_id, action, module, entity_type, entity_id, message, before_data, ip_address, user_agent)
       VALUES (?, 'deleted', 'organization', 'department', ?, ?, ?, ?, ?)`,
      [auth.id, id, `Deleted department ${rows[0].name}`, JSON.stringify(rows[0]), audit.ip, audit.userAgent],
    );
  });
  return ok(null, "Department deleted successfully");
}
