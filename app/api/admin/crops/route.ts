import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { pagination } from "@/lib/server/crud";
import { created, fail, ok, paginated } from "@/lib/server/response";

function normalizeStatus(value: unknown) {
  return value === "inactive" || value === false || value === 0 || value === "0" ? 0 : 1;
}

function makeCode(name: string, cropTypeId: string | number) {
  return `${cropTypeId}_${name}`
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
  const cropTypeId = request.nextUrl.searchParams.get("crop_type_id");

  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push("(c.name LIKE ? OR ct.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (cropTypeId && cropTypeId !== "all") {
    where.push("c.crop_type_id = ?");
    params.push(cropTypeId);
  }

  if (status === "active") where.push("c.is_active = 1");
  if (status === "inactive") where.push("c.is_active = 0");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const selectSql = `
    SELECT
      c.id,
      c.crop_type_id,
      c.name,
      c.code,
      COALESCE(c.land_area_unit, 'Ha') AS land_area_unit,
      COALESCE(c.productivity_unit, 'Qt/Ha') AS productivity_unit,
      COALESCE(c.production_unit, 'Qt') AS production_unit,
      c.is_active,
      c.created_at,
      c.updated_at,
      ct.name AS crop_type_name
    FROM crops c
    INNER JOIN crop_types ct ON ct.id = c.crop_type_id
    ${whereSql}
  `;

  if (all) {
    const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC, c.name ASC`, params);
    return ok(rows, "Crops fetched successfully");
  }

  const { page, perPage, offset } = pagination(request);
  const countRows = await query<any[]>(
    `SELECT COUNT(*) AS total FROM crops c INNER JOIN crop_types ct ON ct.id = c.crop_type_id ${whereSql}`,
    params,
  );
  const rows = await query<any[]>(`${selectSql} ORDER BY ct.name ASC, c.name ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]);

  return paginated(rows, page, perPage, Number(countRows[0]?.total ?? 0));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const cropTypeId = Number(body.crop_type_id);
  const name = String(body.name ?? "").trim();
  const landAreaUnit = unit(body.land_area_unit, "Ha");
  const productivityUnit = unit(body.productivity_unit, "Qt/Ha");
  const productionUnit = unit(body.production_unit, "Qt");
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!cropTypeId) return fail("Crop type is required", 422);
  if (!name) return fail("Crop name is required", 422);

  const cropTypeRows = await query<any[]>("SELECT id FROM crop_types WHERE id = ? LIMIT 1", [cropTypeId]);
  if (!cropTypeRows.length) return fail("Selected crop type does not exist", 422);

  const duplicateRows = await query<any[]>(
    "SELECT id FROM crops WHERE crop_type_id = ? AND LOWER(name) = LOWER(?) LIMIT 1",
    [cropTypeId, name],
  );
  if (duplicateRows.length) return fail("Crop name already exists for this crop type", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, cropTypeId);
  const result = await execute(
    "INSERT INTO crops (crop_type_id, name, code, land_area_unit, productivity_unit, production_unit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [cropTypeId, name, code, landAreaUnit, productivityUnit, productionUnit, isActive],
  );

  return created(
    {
      id: result.insertId,
      crop_type_id: cropTypeId,
      name,
      code,
      land_area_unit: landAreaUnit,
      productivity_unit: productivityUnit,
      production_unit: productionUnit,
      is_active: Boolean(isActive),
    },
    "Crop created successfully",
  );
}
