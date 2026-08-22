import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { execute, query, transaction } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";
import { parseOfficePayload } from "@/lib/schemas/office.schema";

function makeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function validationError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.flatten().fieldErrors);
  }
  return null;
}

function duplicateError(error: any) {
  if (error?.code !== "ER_DUP_ENTRY") return null;
  const message = String(error?.sqlMessage ?? "");
  if (message.includes("code")) return fail("Office code already exists", 409);
  if (message.includes("name")) return fail("Office name already exists", 409);
  return fail("Office already exists", 409);
}

async function findOffice(id: number) {
  const rows = await query<any[]>(
    `SELECT
      o.id,
      o.name,
      o.code,
      o.type,
      o.parent_id,
      p.name AS parent_name,
      o.description,
      o.is_active,
      o.created_at,
      o.updated_at,
      COUNT(DISTINCT d.id) AS directorates_count,
      COUNT(DISTINCT u.id) AS users_count,
      COUNT(DISTINCT pl.id) AS plans_count
    FROM offices o
    LEFT JOIN offices p ON p.id = o.parent_id
    LEFT JOIN directorates d ON d.office_id = o.id
    LEFT JOIN users u ON u.office_id = o.id
    LEFT JOIN plans pl ON pl.office_id = o.id
    WHERE o.id = ?
    GROUP BY o.id, p.name
    LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const officeId = Number(id);
  if (!Number.isInteger(officeId) || officeId <= 0) return fail("Invalid office id", 422);

  const office = await findOffice(officeId);
  if (!office) return fail("Office not found", 404);

  return ok(office, "Office fetched successfully");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const officeId = Number(id);
  if (!Number.isInteger(officeId) || officeId <= 0) return fail("Invalid office id", 422);

  try {
    const existing = await findOffice(officeId);
    if (!existing) return fail("Office not found", 404);

    const payload = parseOfficePayload(await request.json().catch(() => ({})));
    if (payload.parent_id && Number(payload.parent_id) === officeId) {
      return fail("An office cannot be its own parent", 422);
    }

    const code = payload.code ? makeCode(payload.code) : makeCode(payload.name);
    if (!code) return fail("Office code is required", 422);

    await transaction(async (connection) => {
      await connection.execute(
        `UPDATE offices
         SET name = ?, code = ?, type = ?, parent_id = ?, description = ?, is_active = ?
         WHERE id = ?`,
        [payload.name, code, payload.type ?? "office", payload.parent_id ?? null, payload.description ?? null, payload.is_active ? 1 : 0, officeId]
      );
    });

    return ok(await findOffice(officeId), "Office updated successfully");
  } catch (error: any) {
    const invalid = validationError(error);
    if (invalid) return invalid;
    const duplicate = duplicateError(error);
    if (duplicate) return duplicate;
    return fail(error?.message || "Office update failed", 500);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const officeId = Number(id);
  if (!Number.isInteger(officeId) || officeId <= 0) return fail("Invalid office id", 422);

  try {
    const office = await findOffice(officeId);
    if (!office) return fail("Office not found", 404);

    const usageRows = await query<any[]>(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE office_id = ?) AS users_count,
        (SELECT COUNT(*) FROM directorates WHERE office_id = ?) AS directorates_count,
        (SELECT COUNT(*) FROM plans WHERE office_id = ?) AS plans_count,
        (SELECT COUNT(*) FROM offices WHERE parent_id = ?) AS children_count`,
      [officeId, officeId, officeId, officeId]
    );

    const usage = usageRows[0];
    const totalUsage = Number(usage?.users_count ?? 0) + Number(usage?.directorates_count ?? 0) + Number(usage?.plans_count ?? 0) + Number(usage?.children_count ?? 0);
    if (totalUsage > 0) {
      return fail("This office is already used by users, directorates, child offices, or plans. Disable it instead of deleting.", 409, usage);
    }

    await execute("DELETE FROM offices WHERE id = ?", [officeId]);
    return ok(null, "Office deleted successfully");
  } catch (error: any) {
    return fail(error?.message || "Office deletion failed", 500);
  }
}
