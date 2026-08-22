import { NextRequest } from "next/server";
import { departmentSchema } from "@/lib/schemas/department.schema";
import { getAuthUser } from "@/lib/server/auth";
import { pagination } from "@/lib/server/crud";
import { query, transaction } from "@/lib/server/db";
import { created, fail, ok, paginated } from "@/lib/server/response";

function can(auth: Awaited<ReturnType<typeof getAuthUser>>, permission: string) {
  if (!auth) return false;
  if (auth.roles?.includes("Super Admin")) return true;
  return auth.permissions?.some((item) =>
    [permission, permission.replace(".view", ".read"), permission.replace(".read", ".view")].includes(item),
  );
}

function makeCode(name: string, officeId: number) {
  return `${officeId}_${name}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function auditContext(request: NextRequest) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "departments.view")) return fail("You do not have permission to view departments", 403);

  const all = request.nextUrl.searchParams.get("all");
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "all";
  const officeId = request.nextUrl.searchParams.get("office_id");
  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push("(dp.name LIKE ? OR dp.code LIKE ? OR o.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (officeId && officeId !== "all") {
    where.push("dp.office_id = ?");
    params.push(officeId);
  }
  if (status === "active") where.push("dp.is_active = 1");
  if (status === "inactive") where.push("dp.is_active = 0");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const selectSql = `
    SELECT dp.id, dp.office_id, dp.name, dp.code, dp.description,
           dp.is_active, dp.created_at, dp.updated_at,
           o.name AS office_name,
           COUNT(DISTINCT d.id) AS directorates_count
    FROM departments dp
    INNER JOIN offices o ON o.id = dp.office_id
    LEFT JOIN directorates d ON d.department_id = dp.id
    ${whereSql}
    GROUP BY dp.id, dp.office_id, dp.name, dp.code, dp.description, dp.is_active, dp.created_at, dp.updated_at, o.name
  `;

  if (all) {
    const rows = await query<any[]>(`${selectSql} ORDER BY o.name, dp.name`, params);
    return ok(rows, "Departments fetched successfully");
  }

  const { page, perPage, offset } = pagination(request);
  const count = await query<any[]>(
    `SELECT COUNT(*) total FROM departments dp INNER JOIN offices o ON o.id = dp.office_id ${whereSql}`,
    params,
  );
  const rows = await query<any[]>(`${selectSql} ORDER BY o.name, dp.name LIMIT ? OFFSET ?`, [...params, perPage, offset]);
  return paginated(rows, page, perPage, Number(count[0]?.total ?? 0), "Departments fetched successfully");
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  if (!can(auth, "departments.create")) return fail("You do not have permission to create departments", 403);

  const parsed = departmentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid department data", 422);
  const data = parsed.data;

  const office = await query<any[]>("SELECT id FROM offices WHERE id = ? AND is_active = 1 LIMIT 1", [data.office_id]);
  if (!office.length) return fail("Selected office does not exist or is inactive", 422);

  const duplicate = await query<any[]>(
    "SELECT id FROM departments WHERE office_id = ? AND LOWER(name) = LOWER(?) LIMIT 1",
    [data.office_id, data.name],
  );
  if (duplicate.length) return fail("Department name already exists in the selected office", 409);

  const code = data.code || makeCode(data.name, data.office_id);
  const codeDuplicate = await query<any[]>("SELECT id FROM departments WHERE code = ? LIMIT 1", [code]);
  if (codeDuplicate.length) return fail("Department code already exists", 409);

  const audit = auditContext(request);
  const department = await transaction(async (connection) => {
    const [result]: any = await connection.execute(
      `INSERT INTO departments (office_id, directorate_id, name, code, description, is_active)
       VALUES (?, NULL, ?, ?, ?, ?)`,
      [data.office_id, data.name, code, data.description || null, data.is_active ? 1 : 0],
    );
    const createdDepartment = { id: result.insertId, ...data, code };
    await connection.execute(
      `INSERT INTO audit_logs
       (user_id, action, module, entity_type, entity_id, message, after_data, ip_address, user_agent)
       VALUES (?, 'created', 'organization', 'department', ?, ?, ?, ?, ?)`,
      [auth.id, String(result.insertId), `Created department ${data.name}`, JSON.stringify(createdDepartment), audit.ip, audit.userAgent],
    );
    return createdDepartment;
  });

  return created(department, "Department created successfully");
}
