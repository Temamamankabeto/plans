import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { execute, query, transaction } from "@/lib/server/db";
import { created, fail, ok, paginated } from "@/lib/server/response";
import { pagination } from "@/lib/server/crud";
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

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const type = request.nextUrl.searchParams.get("type")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status")?.trim() ?? "all";
  const parentId = request.nextUrl.searchParams.get("parent_id")?.trim() ?? "";
  const all = request.nextUrl.searchParams.get("all") === "1" || request.nextUrl.searchParams.get("all") === "true";

  const clauses: string[] = [];
  const params: unknown[] = [];

  if (search) {
    clauses.push("(o.name LIKE ? OR o.code LIKE ? OR o.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (type && type !== "all") {
    clauses.push("o.type = ?");
    params.push(type);
  }

  if (status === "active") clauses.push("o.is_active = 1");
  if (status === "inactive") clauses.push("o.is_active = 0");

  if (parentId && parentId !== "all") {
    if (parentId === "root") {
      clauses.push("o.parent_id IS NULL");
    } else {
      clauses.push("o.parent_id = ?");
      params.push(Number(parentId));
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const select = `
    SELECT
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
    ${where}
    GROUP BY o.id, p.name
  `;

  if (all) {
    const rows = await query<any[]>(`${select} ORDER BY o.name ASC`, params);
    return ok(rows, "Offices fetched successfully");
  }

  const { page, perPage, offset } = pagination(request);
  const countRows = await query<any[]>(`SELECT COUNT(*) AS total FROM offices o ${where}`, params);
  const rows = await query<any[]>(`${select} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`, [
    ...params,
    perPage,
    offset,
  ]);

  return paginated(rows, page, perPage, Number(countRows[0]?.total ?? 0), "Offices fetched successfully");
}

export async function POST(request: NextRequest) {
  try {
    const payload = parseOfficePayload(await request.json().catch(() => ({})));
    const code = payload.code ? makeCode(payload.code) : makeCode(payload.name);

    if (!code) return fail("Office code is required", 422);

    const result = await transaction(async (connection) => {
      const [insertResult] = await connection.execute<any>(
        `INSERT INTO offices (name, code, type, parent_id, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [payload.name, code, payload.type ?? "office", payload.parent_id ?? null, payload.description ?? null, payload.is_active ? 1 : 0]
      );

      const [rows] = await connection.execute<any[]>(
        `SELECT id, name, code, type, parent_id, description, is_active, created_at, updated_at
         FROM offices WHERE id = ? LIMIT 1`,
        [insertResult.insertId]
      );

      return rows[0];
    });

    return created(result, "Office created successfully");
  } catch (error: any) {
    const invalid = validationError(error);
    if (invalid) return invalid;
    const duplicate = duplicateError(error);
    if (duplicate) return duplicate;
    return fail(error?.message || "Office creation failed", 500);
  }
}
