import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await query<any[]>(
    `SELECT
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
     WHERE c.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows.length) return fail("Crop not found", 404);
  return ok(rows[0], "Crop fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const cropTypeId = Number(body.crop_type_id);
  const name = String(body.name ?? "").trim();
  const landAreaUnit = unit(body.land_area_unit, "Ha");
  const productivityUnit = unit(body.productivity_unit, "Qt/Ha");
  const productionUnit = unit(body.production_unit, "Qt");
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!cropTypeId) return fail("Crop type is required", 422);
  if (!name) return fail("Crop name is required", 422);

  const existingRows = await query<any[]>("SELECT id FROM crops WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Crop not found", 404);

  const cropTypeRows = await query<any[]>("SELECT id FROM crop_types WHERE id = ? LIMIT 1", [cropTypeId]);
  if (!cropTypeRows.length) return fail("Selected crop type does not exist", 422);

  const duplicateRows = await query<any[]>(
    "SELECT id FROM crops WHERE crop_type_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1",
    [cropTypeId, name, id],
  );
  if (duplicateRows.length) return fail("Crop name already exists for this crop type", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, cropTypeId);
  await execute(
    "UPDATE crops SET crop_type_id = ?, name = ?, code = ?, land_area_unit = ?, productivity_unit = ?, production_unit = ?, is_active = ? WHERE id = ?",
    [cropTypeId, name, code, landAreaUnit, productivityUnit, productionUnit, isActive, id],
  );

  return ok(
    {
      id: Number(id),
      crop_type_id: cropTypeId,
      name,
      code,
      land_area_unit: landAreaUnit,
      productivity_unit: productivityUnit,
      production_unit: productionUnit,
      is_active: Boolean(isActive),
    },
    "Crop updated successfully",
  );
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existingRows = await query<any[]>("SELECT id FROM crops WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Crop not found", 404);

  await execute("DELETE FROM crops WHERE id = ?", [id]);
  return ok(null, "Crop deleted successfully");
}
