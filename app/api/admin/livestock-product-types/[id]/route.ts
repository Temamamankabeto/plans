import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await query<any[]>(
    `SELECT
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
     WHERE c.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows.length) return fail("Livestock Product Type not found", 404);
  return ok(rows[0], "Livestock Product Type fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const livestockProductId = Number(body.livestock_product_id);
  const name = String(body.name ?? "").trim();
  const numberUnit = unit(body.number_unit, "Head");
  const productivityUnit = unit(body.productivity_unit, "Unit/Head");
  const productionUnit = unit(body.production_unit, "Unit");
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!livestockProductId) return fail("Livestock Product Type is required", 422);
  if (!name) return fail("Livestock Product Type name is required", 422);

  const existingRows = await query<any[]>("SELECT id FROM livestock_product_types WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Livestock Product Type not found", 404);

  const livestockProductRows = await query<any[]>("SELECT id FROM livestock_products WHERE id = ? LIMIT 1", [livestockProductId]);
  if (!livestockProductRows.length) return fail("Selected livestock product does not exist", 422);

  const duplicateRows = await query<any[]>(
    "SELECT id FROM livestock_product_types WHERE livestock_product_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1",
    [livestockProductId, name, id],
  );
  if (duplicateRows.length) return fail("Livestock Product Type name already exists for this livestock product", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, livestockProductId);
  await execute(
    "UPDATE livestock_product_types SET livestock_product_id = ?, name = ?, code = ?, number_unit = ?, productivity_unit = ?, production_unit = ?, is_active = ? WHERE id = ?",
    [livestockProductId, name, code, numberUnit, productivityUnit, productionUnit, isActive, id],
  );

  return ok(
    {
      id: Number(id),
      livestock_product_id: livestockProductId,
      name,
      code,
      number_unit: numberUnit,
      productivity_unit: productivityUnit,
      production_unit: productionUnit,
      is_active: Boolean(isActive),
    },
    "Livestock Product Type updated successfully",
  );
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existingRows = await query<any[]>("SELECT id FROM livestock_product_types WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Livestock Product Type not found", 404);

  await execute("DELETE FROM livestock_product_types WHERE id = ?", [id]);
  return ok(null, "Livestock Product Type deleted successfully");
}
