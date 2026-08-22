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

function makeCode(name: string, departmentId: string | number) {
  return `${departmentId}_${name}`.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "directorates.view")) return fail("You do not have permission to view directorates", 403);

  const all = request.nextUrl.searchParams.get("all");
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "all";
  const officeId = request.nextUrl.searchParams.get("office_id");
  const departmentId = request.nextUrl.searchParams.get("department_id");
  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push("(d.name LIKE ? OR dp.name LIKE ? OR o.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (officeId && officeId !== "all") {
    where.push("d.office_id = ?");
    params.push(officeId);
  }
  if (departmentId && departmentId !== "all") {
    where.push("d.department_id = ?");
    params.push(departmentId);
  }
  if (status === "active") where.push("d.is_active = 1");
  if (status === "inactive") where.push("d.is_active = 0");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const selectSql = `
    SELECT d.id, d.office_id, d.department_id, d.name, d.code, d.is_active, d.created_at, d.updated_at,
           o.name AS office_name, dp.name AS department_name
    FROM directorates d
    INNER JOIN offices o ON o.id = d.office_id
    LEFT JOIN departments dp ON dp.id = d.department_id
    ${whereSql}
  `;

  if (all) {
    const rows = await query<any[]>(`${selectSql} ORDER BY o.name ASC, dp.name ASC, d.name ASC`, params);
    return ok(rows, "Directorates fetched successfully");
  }

  const { page, perPage, offset } = pagination(request);
  const countRows = await query<any[]>(
    `SELECT COUNT(*) AS total FROM directorates d INNER JOIN offices o ON o.id = d.office_id LEFT JOIN departments dp ON dp.id = d.department_id ${whereSql}`,
    params,
  );
  const rows = await query<any[]>(`${selectSql} ORDER BY o.name ASC, dp.name ASC, d.name ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]);
  return paginated(rows, page, perPage, Number(countRows[0]?.total ?? 0));
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "directorates.create")) return fail("You do not have permission to create directorates", 403);

  const body = await request.json().catch(() => ({}));
  const officeId = Number(body.office_id);
  const departmentId = Number(body.department_id);
  const name = String(body.name ?? "").trim();
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!officeId) return fail("Office is required", 422);
  if (!departmentId) return fail("Department is required", 422);
  if (!name) return fail("Directorate name is required", 422);

  const departmentRows = await query<any[]>(
    "SELECT id FROM departments WHERE id = ? AND office_id = ? AND is_active = 1 LIMIT 1",
    [departmentId, officeId],
  );
  if (!departmentRows.length) return fail("Selected department does not belong to the selected office or is inactive", 422);

  const duplicateRows = await query<any[]>(
    "SELECT id FROM directorates WHERE department_id = ? AND LOWER(name) = LOWER(?) LIMIT 1",
    [departmentId, name],
  );
  if (duplicateRows.length) return fail("Directorate name already exists for this department", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, departmentId);
  const result = await execute(
    "INSERT INTO directorates (office_id, department_id, name, code, is_active) VALUES (?, ?, ?, ?, ?)",
    [officeId, departmentId, name, code, isActive],
  );

  return created({ id: result.insertId, office_id: officeId, department_id: departmentId, name, code, is_active: Boolean(isActive) }, "Directorate created successfully");
}
