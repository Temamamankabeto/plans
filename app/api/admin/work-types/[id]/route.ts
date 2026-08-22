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
       ct.name,
       ct.code,
       ct.is_active,
       ct.created_at,
       ct.updated_at,
       COUNT(c.id) AS works_count
     FROM work_types ct
     LEFT JOIN works c ON c.work_type_id = ct.id
     WHERE ct.id = ?
     GROUP BY ct.id, ct.name, ct.code, ct.is_active, ct.created_at, ct.updated_at
     LIMIT 1`,
    [id],
  );

  if (!rows.length) return fail("Work type not found", 404);
  return ok(rows[0], "Work type fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const isActive = normalizeStatus(body.is_active ?? body.status ?? true);

  if (!name) return fail("Work type name is required", 422);

  const existingRows = await query<any[]>("SELECT id FROM work_types WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Work type not found", 404);

  const duplicateRows = await query<any[]>("SELECT id FROM work_types WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1", [name, id]);
  if (duplicateRows.length) return fail("Work type name already exists", 409);

  const code = body.code ? String(body.code).trim() : makeCode(name);
  await execute("UPDATE work_types SET name = ?, code = ?, is_active = ? WHERE id = ?", [name, code, isActive, id]);

  return ok(
    {
      id: Number(id),
      name,
      code,
      is_active: Boolean(isActive),
    },
    "Work type updated successfully",
  );
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existingRows = await query<any[]>("SELECT id FROM work_types WHERE id = ? LIMIT 1", [id]);
  if (!existingRows.length) return fail("Work type not found", 404);

  await execute("DELETE FROM work_types WHERE id = ?", [id]);
  return ok(null, "Work type deleted successfully");
}
