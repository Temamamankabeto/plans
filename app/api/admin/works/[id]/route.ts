import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await query<any[]>(
    `SELECT
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
     WHERE c.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows.length) return fail("Work not found", 404);
  return ok(rows[0], "Work fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const workTypeId = Number(body.work_type_id);
  const name = String(body.name ?? "").trim();
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!workTypeId) return fail("Work type is required", 422);
  if (!name) return fail("Work name is required", 422);

  const existingRows = await query<any[]>("SELECT id FROM works WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Work not found", 404);

  const workTypeRows = await query<any[]>("SELECT id FROM work_types WHERE id = ? LIMIT 1", [workTypeId]);
  if (!workTypeRows.length) return fail("Selected work type does not exist", 422);

  const duplicateRows = await query<any[]>(
    "SELECT id FROM works WHERE work_type_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1",
    [workTypeId, name, id],
  );
  if (duplicateRows.length) return fail("Work name already exists for this work type", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name, workTypeId);
  await execute("UPDATE works SET work_type_id = ?, name = ?, code = ?, is_active = ? WHERE id = ?", [
    workTypeId,
    name,
    code,
    isActive,
    id,
  ]);

  return ok(
    {
      id: Number(id),
      work_type_id: workTypeId,
      name,
      code,
      is_active: Boolean(isActive),
    },
    "Work updated successfully",
  );
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existingRows = await query<any[]>("SELECT id FROM works WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Work not found", 404);

  await execute("DELETE FROM works WHERE id = ?", [id]);
  return ok(null, "Work deleted successfully");
}
