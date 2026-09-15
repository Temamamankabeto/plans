import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await query<any[]>(
    `SELECT
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
     LEFT JOIN livestock_types lt ON lt.id=ct.livestock_type_id
     LEFT JOIN livestock_categories lc ON lc.id=ct.livestock_category_id
     LEFT JOIN livestock_product_types c ON c.livestock_product_id = ct.id
     WHERE ct.id = ?
     GROUP BY ct.id, ct.livestock_type_id, ct.livestock_category_id, lc.name, lt.name, ct.name, ct.sex, ct.code, ct.is_active, ct.created_at, ct.updated_at
     LIMIT 1`,
    [id],
  );

  if (!rows.length) return fail("Livestock Product not found", 404);
  return ok(rows[0], "Livestock Product fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const existingRows = await query<any[]>("SELECT id FROM livestock_products WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Livestock Product not found", 404);

  const duplicateRows = await query<any[]>("SELECT id FROM livestock_products WHERE livestock_type_id = ? AND livestock_category_id = ? AND LOWER(name) = LOWER(?) AND sex = ? AND id <> ? LIMIT 1", [livestockTypeId, livestockCategoryId, name, sex, id]);
  if (duplicateRows.length) return fail(`A ${sex} ${name} already exists in the selected Livestock Type`, 409);

  const code = body.code ? String(body.code).trim() : `${makeCode(name)}_${sex.toUpperCase()}`;
  if (!(await query<any[]>("SELECT id FROM livestock_types WHERE id=? AND is_active=1",[livestockTypeId])).length) return fail("Selected Livestock Type does not exist or is inactive",422);
  await execute("UPDATE livestock_products SET livestock_type_id=?, livestock_category_id=?, name = ?, sex = ?, code = ?, is_active = ? WHERE id = ?", [livestockTypeId, livestockCategoryId, name, sex, code, isActive, id]);

  return ok(
    {
      id: Number(id),
      livestock_type_id: livestockTypeId,
      livestock_category_id: livestockCategoryId,
      name,
      sex,
      code,
      is_active: Boolean(isActive),
    },
    "Livestock Product updated successfully",
  );
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existingRows = await query<any[]>("SELECT id FROM livestock_products WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Livestock Product not found", 404);

  await execute("DELETE FROM livestock_products WHERE id = ?", [id]);
  return ok(null, "Livestock Product deleted successfully");
}
