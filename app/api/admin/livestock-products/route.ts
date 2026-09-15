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
      ct.livestock_type_id,
      ct.livestock_category_id,
      lc.name AS livestock_category_name,
      lt.name AS livestock_type_name,
      ct.name,
      ct.sex,
      ct.code,
      ct.is_active,
      ct.created_at,
      ct.updated_at,
      COUNT(c.id) AS livestock_product_types_count
    FROM livestock_products ct
    LEFT JOIN livestock_types lt ON lt.id = ct.livestock_type_id
    LEFT JOIN livestock_categories lc ON lc.id = ct.livestock_category_id
    LEFT JOIN livestock_product_types c ON c.livestock_product_id = ct.id
    ${whereSql}
    GROUP BY ct.id, ct.livestock_type_id, ct.livestock_category_id, lc.name, lt.name, ct.name, ct.sex, ct.code, ct.is_active, ct.created_at, ct.updated_at
  `;

  if (all) {
    const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC`, params);
    return ok(rows, "Livestock products fetched successfully");
  }

  const { page, perPage, offset } = pagination(request);
  const countRows = await query<any[]>(`SELECT COUNT(*) AS total FROM livestock_products ct ${whereSql}`, params);
  const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]);

  return paginated(rows, page, perPage, Number(countRows[0]?.total ?? 0));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const livestockTypeId = body.livestock_type_id ? Number(body.livestock_type_id) : null;
  const livestockCategoryId = body.livestock_category_id ? Number(body.livestock_category_id) : null;
  const sex = String(body.sex ?? "").trim().toLowerCase();
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!name) return fail("Livestock name is required", 422);
  if (!livestockTypeId) return fail("Livestock Type is required", 422);
  if (!livestockCategoryId) return fail("Livestock Category is required", 422);
  if (sex !== "male" && sex !== "female") return fail("Sex must be Male or Female", 422);
  if (!(await query<any[]>("SELECT id FROM livestock_categories WHERE id=? AND livestock_type_id=? AND is_active=1", [livestockCategoryId, livestockTypeId])).length) return fail("Selected Livestock Category does not belong to the selected Livestock Type or is inactive", 422);
  if (livestockTypeId && !(await query<any[]>("SELECT id FROM livestock_types WHERE id=? AND is_active=1", [livestockTypeId])).length) return fail("Selected Livestock Type does not exist or is inactive", 422);

  const duplicateRows = await query<any[]>("SELECT id FROM livestock_products WHERE livestock_type_id = ? AND livestock_category_id = ? AND LOWER(name) = LOWER(?) AND sex = ? LIMIT 1", [livestockTypeId, livestockCategoryId, name, sex]);
  if (duplicateRows.length) return fail(`A ${sex} ${name} already exists in the selected Livestock Type`, 409);

  const code = body.code ? String(body.code).trim() : `${makeCode(name)}_${sex.toUpperCase()}`;
  const result = await execute("INSERT INTO livestock_products (livestock_type_id, livestock_category_id, name, sex, code, is_active) VALUES (?, ?, ?, ?, ?, ?)", [livestockTypeId, livestockCategoryId, name, sex, code, isActive]);

  return created(
    {
      id: result.insertId,
      livestock_type_id: livestockTypeId,
      livestock_category_id: livestockCategoryId,
      name,
      sex,
      code,
      is_active: Boolean(isActive),
    },
    "Livestock Product created successfully",
  );
}
