import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { execute, query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

function can(auth: Awaited<ReturnType<typeof getAuthUser>>, permission: string) {
  if (!auth) return false;
  if (auth.roles?.includes("Super Admin")) return true;
  return auth.permissions?.some((item) =>
    [permission, permission.replace(".view", ".read"), permission.replace(".read", ".view")].includes(item),
  );
}

function normalizeStatus(value: unknown) {
  return value === "inactive" || value === false || value === 0 || value === "0" ? 0 : 1;
}
function makeCode(name: string, departmentId: string | number) {
  return `${departmentId}_${name}`.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
}

const selectSql = `
  SELECT d.id,d.office_id,d.department_id,d.name,d.code,d.is_active,d.created_at,d.updated_at,
         o.name AS office_name,dp.name AS department_name
  FROM directorates d
  INNER JOIN offices o ON o.id = d.office_id
  LEFT JOIN departments dp ON dp.id = d.department_id
  WHERE d.id = ? LIMIT 1
`;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "directorates.view")) return fail("You do not have permission to view directorates", 403);
  const { id } = await params;
  const rows = await query<any[]>(selectSql, [id]);
  if (!rows.length) return fail("Directorate not found", 404);
  return ok(rows[0], "Directorate fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "directorates.update")) return fail("You do not have permission to update directorates", 403);
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const officeId = Number(body.office_id);
  const departmentId = Number(body.department_id);
  const name = String(body.name ?? "").trim();
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!officeId) return fail("Office is required", 422);
  if (!departmentId) return fail("Department is required", 422);
  if (!name) return fail("Directorate name is required", 422);

  const existingRows = await query<any[]>(selectSql, [id]);
  if (!existingRows.length) return fail("Directorate not found", 404);
  const departmentRows = await query<any[]>(
    "SELECT id FROM departments WHERE id = ? AND office_id = ? LIMIT 1",
    [departmentId, officeId],
  );
  if (!departmentRows.length) return fail("Selected department does not belong to the selected office", 422);

  const duplicateRows = await query<any[]>(
    "SELECT id FROM directorates WHERE department_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1",
    [departmentId, name, id],
  );
  if (duplicateRows.length) return fail("Directorate name already exists for this department", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, departmentId);
  await execute("UPDATE directorates SET office_id = ?, department_id = ?, name = ?, code = ?, is_active = ? WHERE id = ?", [officeId, departmentId, name, code, isActive, id]);
  return ok({ id: Number(id), office_id: officeId, department_id: departmentId, name, code, is_active: Boolean(isActive) }, "Directorate updated successfully");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "directorates.delete")) return fail("You do not have permission to delete directorates", 403);
  const { id } = await params;
  const existingRows = await query<any[]>("SELECT id FROM directorates WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Directorate not found", 404);
  const linkedTeams = await query<any[]>("SELECT COUNT(*) total FROM teams WHERE directorate_id = ?", [id]);
  if (Number(linkedTeams[0]?.total ?? 0) > 0) return fail("Directorate has linked teams. Disable it instead of deleting it.", 409);
  await execute("DELETE FROM directorates WHERE id = ?", [id]);
  return ok(null, "Directorate deleted successfully");
}
