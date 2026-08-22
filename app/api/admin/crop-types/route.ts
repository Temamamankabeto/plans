import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { pagination } from "@/lib/server/crud";
import { created, fail, ok, paginated } from "@/lib/server/response";

function normalizeStatus(value: unknown) {
  return value === "inactive" || value === false || value === 0 || value === "0" ? 0 : 1;
}

function makeCode(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  const all = request.nextUrl.searchParams.get("all");
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "all";

  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push("ct.name LIKE ?");
    params.push(`%${search}%`);
  }

  if (status === "active") where.push("ct.is_active = 1");
  if (status === "inactive") where.push("ct.is_active = 0");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const selectSql = `
    SELECT
      ct.id,
      ct.name,
      ct.code,
      ct.is_active,
      ct.created_at,
      ct.updated_at,
      COUNT(c.id) AS crops_count
    FROM crop_types ct
    LEFT JOIN crops c ON c.crop_type_id = ct.id
    ${whereSql}
    GROUP BY ct.id, ct.name, ct.code, ct.is_active, ct.created_at, ct.updated_at
  `;

  if (all) {
    const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC`, params);
    return ok(rows, "Crop types fetched successfully");
  }

  const { page, perPage, offset } = pagination(request);
  const countRows = await query<any[]>(`SELECT COUNT(*) AS total FROM crop_types ct ${whereSql}`, params);
  const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]);

  return paginated(rows, page, perPage, Number(countRows[0]?.total ?? 0));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!name) return fail("Crop type name is required", 422);

  const duplicateRows = await query<any[]>("SELECT id FROM crop_types WHERE LOWER(name) = LOWER(?) LIMIT 1", [name]);
  if (duplicateRows.length) return fail("Crop type name already exists", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name);
  const result = await execute("INSERT INTO crop_types (name, code, is_active) VALUES (?, ?, ?)", [name, code, isActive]);

  return created(
    {
      id: result.insertId,
      name,
      code,
      is_active: Boolean(isActive),
    },
    "Crop type created successfully",
  );
}
