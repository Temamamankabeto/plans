import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { pagination } from "@/lib/server/crud";
import { created, fail, ok, paginated } from "@/lib/server/response";

function normalizeStatus(value: unknown) {
  return value === "inactive" || value === false || value === 0 || value === "0" ? 0 : 1;
}

function makeCode(name: string, workTypeId: string | number) {
  return `${workTypeId}_${name}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  const all = request.nextUrl.searchParams.get("all");
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "all";
  const workTypeId = request.nextUrl.searchParams.get("work_type_id");

  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push("(c.name LIKE ? OR ct.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (workTypeId && workTypeId !== "all") {
    where.push("c.work_type_id = ?");
    params.push(workTypeId);
  }

  if (status === "active") where.push("c.is_active = 1");
  if (status === "inactive") where.push("c.is_active = 0");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const selectSql = `
    SELECT
      c.id,
      c.work_type_id,
      c.name,
      c.code,
      c.is_active,
      c.created_at,
      c.updated_at,
      ct.name AS work_type_name
    FROM works c
    INNER JOIN work_types ct ON ct.id = c.work_type_id
    ${whereSql}
  `;

  if (all) {
    const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC, c.name ASC`, params);
    return ok(rows, "Works fetched successfully");
  }

  const { page, perPage, offset } = pagination(request);
  const countRows = await query<any[]>(
    `SELECT COUNT(*) AS total FROM works c INNER JOIN work_types ct ON ct.id = c.work_type_id ${whereSql}`,
    params,
  );
  const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC, c.name ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]);

  return paginated(rows, page, perPage, Number(countRows[0]?.total ?? 0));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const workTypeId = Number(body.work_type_id);
  const name = String(body.name ?? "").trim();
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!workTypeId) return fail("Work type is required", 422);
  if (!name) return fail("Work name is required", 422);

  const workTypeRows = await query<any[]>("SELECT id FROM work_types WHERE id = ? LIMIT 1", [workTypeId]);
  if (!workTypeRows.length) return fail("Selected work type does not exist", 422);

  const duplicateRows = await query<any[]>(
    "SELECT id FROM works WHERE work_type_id = ? AND LOWER(name) = LOWER(?) LIMIT 1",
    [workTypeId, name],
  );
  if (duplicateRows.length) return fail("Work name already exists for this work type", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, workTypeId);
  const result = await execute("INSERT INTO works (work_type_id, name, code, is_active) VALUES (?, ?, ?, ?)", [
    workTypeId,
    name,
    code,
    isActive,
  ]);

  return created(
    {
      id: result.insertId,
      work_type_id: workTypeId,
      name,
      code,
      is_active: Boolean(isActive),
    },
    "Work created successfully",
  );
}
