import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { pagination } from "@/lib/server/crud";
import { created, fail, ok, paginated } from "@/lib/server/response";

function normalizeStatus(value: unknown) {
  return value === "inactive" || value === false || value === 0 || value === "0" ? 0 : 1;
}

function makeCode(name: string, livestockProductId: string | number) {
  return `${livestockProductId}_${name}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function unit(value: unknown, fallback: string) {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

export async function GET(request: NextRequest) {
  const all = request.nextUrl.searchParams.get("all");
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "all";
  const livestockProductId = request.nextUrl.searchParams.get("livestock_product_id");

  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push("(c.name LIKE ? OR ct.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (livestockProductId && livestockProductId !== "all") {
    where.push("c.livestock_product_id = ?");
    params.push(livestockProductId);
  }

  if (status === "active") where.push("c.is_active = 1");
  if (status === "inactive") where.push("c.is_active = 0");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const selectSql = `
    SELECT
      c.id,
      c.livestock_product_id,
      c.name,
      c.code,
      COALESCE(c.number_unit, 'Head') AS number_unit,
      COALESCE(c.productivity_unit, 'Unit/Head') AS productivity_unit,
      COALESCE(c.production_unit, 'Unit') AS production_unit,
      c.is_active,
      c.created_at,
      c.updated_at,
      ct.name AS livestock_product_name
    FROM livestock_product_types c
    INNER JOIN livestock_products ct ON ct.id = c.livestock_product_id
    ${whereSql}
  `;

  if (all) {
    const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC, c.name ASC`, params);
    return ok(rows, "Livestock Product Types fetched successfully");
  }

  const { page, perPage, offset } = pagination(request);
  const countRows = await query<any[]>(
    `SELECT COUNT(*) AS total FROM livestock_product_types c INNER JOIN livestock_products ct ON ct.id = c.livestock_product_id ${whereSql}`,
    params,
  );
  const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC, c.name ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]);

  return paginated(rows, page, perPage, Number(countRows[0]?.total ?? 0));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const livestockProductId = Number(body.livestock_product_id);
  const name = String(body.name ?? "").trim();
  const numberUnit = unit(body.number_unit, "Head");
  const productivityUnit = unit(body.productivity_unit, "Unit/Head");
  const productionUnit = unit(body.production_unit, "Unit");
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!livestockProductId) return fail("Livestock Product Type is required", 422);
  if (!name) return fail("Livestock Product Type name is required", 422);

  const livestockProductRows = await query<any[]>("SELECT id FROM livestock_products WHERE id = ? LIMIT 1", [livestockProductId]);
  if (!livestockProductRows.length) return fail("Selected livestock product does not exist", 422);

  const duplicateRows = await query<any[]>(
    "SELECT id FROM livestock_product_types WHERE livestock_product_id = ? AND LOWER(name) = LOWER(?) LIMIT 1",
    [livestockProductId, name],
  );
  if (duplicateRows.length) return fail("Livestock Product Type name already exists for this livestock product", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, livestockProductId);
  const result = await execute(
    "INSERT INTO livestock_product_types (livestock_product_id, name, code, number_unit, productivity_unit, production_unit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [livestockProductId, name, code, numberUnit, productivityUnit, productionUnit, isActive],
  );

  return created(
    {
      id: result.insertId,
      livestock_product_id: livestockProductId,
      name,
      code,
      number_unit: numberUnit,
      productivity_unit: productivityUnit,
      production_unit: productionUnit,
      is_active: Boolean(isActive),
    },
    "Livestock Product Type created successfully",
  );
}
