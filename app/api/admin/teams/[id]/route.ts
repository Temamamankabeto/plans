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
function normalizeStatus(value: unknown) { return value === "inactive" || value === false || value === 0 || value === "0" ? 0 : 1; }
function makeCode(name: string, directorateId: string | number) { return `${directorateId}_${name}`.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80); }
const selectSql = `
  SELECT t.id,t.directorate_id,d.department_id,d.office_id,t.name,t.code,t.is_active,t.created_at,t.updated_at,
         d.name AS directorate_name,dp.name AS department_name,o.name AS office_name
  FROM teams t
  INNER JOIN directorates d ON d.id=t.directorate_id
  LEFT JOIN departments dp ON dp.id=d.department_id
  INNER JOIN offices o ON o.id=d.office_id
  WHERE t.id=? LIMIT 1
`;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "teams.view")) return fail("You do not have permission to view teams", 403);
  const { id } = await params;
  const rows = await query<any[]>(selectSql, [id]);
  if (!rows.length) return fail("Team not found", 404);
  return ok(rows[0], "Team fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "teams.update")) return fail("You do not have permission to update teams", 403);
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const directorateId = Number(body.directorate_id);
  const name = String(body.name ?? "").trim();
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);
  if (!directorateId) return fail("Directorate is required", 422);
  if (!name) return fail("Team name is required", 422);

  const existingRows = await query<any[]>("SELECT id FROM teams WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Team not found", 404);
  const directorateRows = await query<any[]>("SELECT id FROM directorates WHERE id = ? AND department_id IS NOT NULL LIMIT 1", [directorateId]);
  if (!directorateRows.length) return fail("Selected directorate does not exist or has no department parent", 422);
  const duplicateRows = await query<any[]>("SELECT id FROM teams WHERE directorate_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1", [directorateId, name, id]);
  if (duplicateRows.length) return fail("Team name already exists for this directorate", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, directorateId);
  await execute("UPDATE teams SET directorate_id = ?, name = ?, code = ?, is_active = ? WHERE id = ?", [directorateId, name, code, isActive, id]);
  return ok({ id: Number(id), directorate_id: directorateId, name, code, is_active: Boolean(isActive) }, "Team updated successfully");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "teams.delete")) return fail("You do not have permission to delete teams", 403);
  const { id } = await params;
  const existingRows = await query<any[]>("SELECT id FROM teams WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Team not found", 404);
  await execute("DELETE FROM teams WHERE id = ?", [id]);
  return ok(null, "Team deleted successfully");
}
