import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { pagination } from "@/lib/server/crud";
import { execute, query } from "@/lib/server/db";
import { created, fail, ok, paginated } from "@/lib/server/response";

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
function makeCode(name: string, directorateId: string | number) {
  return `${directorateId}_${name}`.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "teams.view")) return fail("You do not have permission to view teams", 403);

  const all = request.nextUrl.searchParams.get("all");
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "all";
  const officeId = request.nextUrl.searchParams.get("office_id");
  const departmentId = request.nextUrl.searchParams.get("department_id");
  const directorateId = request.nextUrl.searchParams.get("directorate_id");
  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push("(t.name LIKE ? OR d.name LIKE ? OR dp.name LIKE ? OR o.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (officeId && officeId !== "all") { where.push("d.office_id = ?"); params.push(officeId); }
  if (departmentId && departmentId !== "all") { where.push("d.department_id = ?"); params.push(departmentId); }
  if (directorateId && directorateId !== "all") { where.push("t.directorate_id = ?"); params.push(directorateId); }
  if (status === "active") where.push("t.is_active = 1");
  if (status === "inactive") where.push("t.is_active = 0");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const selectSql = `
    SELECT t.id,t.directorate_id,d.department_id,d.office_id,t.name,t.code,t.is_active,t.created_at,t.updated_at,
           d.name AS directorate_name,dp.name AS department_name,o.name AS office_name
    FROM teams t
    INNER JOIN directorates d ON d.id = t.directorate_id
    LEFT JOIN departments dp ON dp.id = d.department_id
    INNER JOIN offices o ON o.id = d.office_id
    ${whereSql}
  `;

  if (all) {
    const rows = await query<any[]>(`${selectSql} ORDER BY o.name ASC, dp.name ASC, d.name ASC, t.name ASC`, params);
    return ok(rows, "Teams fetched successfully");
  }
  const { page, perPage, offset } = pagination(request);
  const countRows = await query<any[]>(
    `SELECT COUNT(*) AS total FROM teams t INNER JOIN directorates d ON d.id=t.directorate_id LEFT JOIN departments dp ON dp.id=d.department_id INNER JOIN offices o ON o.id=d.office_id ${whereSql}`,
    params,
  );
  const rows = await query<any[]>(`${selectSql} ORDER BY o.name ASC, dp.name ASC, d.name ASC, t.name ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]);
  return paginated(rows, page, perPage, Number(countRows[0]?.total ?? 0));
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "teams.create")) return fail("You do not have permission to create teams", 403);

  const body = await request.json().catch(() => ({}));
  const directorateId = Number(body.directorate_id);
  const name = String(body.name ?? "").trim();
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);
  if (!directorateId) return fail("Directorate is required", 422);
  if (!name) return fail("Team name is required", 422);

  const directorateRows = await query<any[]>("SELECT id FROM directorates WHERE id = ? AND department_id IS NOT NULL AND is_active = 1 LIMIT 1", [directorateId]);
  if (!directorateRows.length) return fail("Selected directorate does not exist, is inactive, or has no department parent", 422);
  const duplicateRows = await query<any[]>("SELECT id FROM teams WHERE directorate_id = ? AND LOWER(name) = LOWER(?) LIMIT 1", [directorateId, name]);
  if (duplicateRows.length) return fail("Team name already exists for this directorate", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, directorateId);
  const result = await execute("INSERT INTO teams (directorate_id, name, code, is_active) VALUES (?, ?, ?, ?)", [directorateId, name, code, isActive]);
  return created({ id: result.insertId, directorate_id: directorateId, name, code, is_active: Boolean(isActive) }, "Team created successfully");
}
