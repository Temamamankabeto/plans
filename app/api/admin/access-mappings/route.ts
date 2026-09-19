import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { created, fail, ok } from "@/lib/server/response";

const allowedModules = new Set(["crop", "livestock", "trade", "job", "agribusiness", "mechanization", "all"]);
const allowedScopeTypes = new Set(["all", "crop_type", "livestock_type", "trade_group"]);

function flag(value: unknown) { return value === true || value === 1 || value === "1" ? 1 : 0; }
function nullableId(value: unknown) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }

async function canonicalScopeValues(scopeType: string, input: unknown) {
  if (scopeType === "all") return { values: [] as string[], error: null as string | null };
  const raw = Array.isArray(input) ? input : [];
  const requested = [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))];
  if (!requested.length) return { values: [], error: "Select at least one scope value" };

  const table = scopeType === "crop_type" ? "crop_types" : scopeType === "livestock_type" ? "livestock_types" : null;
  if (!table) return { values: requested, error: null };

  const placeholders = requested.map(() => "?").join(",");
  const rows = await query<any[]>(`SELECT name FROM ${table} WHERE name IN (${placeholders}) AND is_active=1`, requested);
  const values = rows.map((row) => String(row.name));
  if (values.length !== requested.length) return { values: [], error: "One or more selected scope values do not exist or are inactive" };
  return { values, error: null };
}

const selectOneSql = `
SELECT oam.*, r.name AS role_name,
       COALESCE(JSON_ARRAYAGG(s.scope_value), JSON_ARRAY()) AS scope_values
FROM organization_access_mappings oam
INNER JOIN roles r ON r.id=oam.role_id
LEFT JOIN organization_access_mapping_scopes s ON s.access_mapping_id=oam.id
`;

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth || !auth.roles?.includes("Super Admin")) return fail("Forbidden", 403);
  const rows = await query<any[]>(
    `${selectOneSql}
     GROUP BY oam.id, r.name
     ORDER BY r.name, oam.module, oam.id`
  );
  return ok(rows.map((row) => ({
    ...row,
    scope_values: typeof row.scope_values === "string" ? JSON.parse(row.scope_values) : (row.scope_values ?? []).filter(Boolean),
  })), "Access mappings fetched successfully");
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth || !auth.roles?.includes("Super Admin")) return fail("Forbidden", 403);
  const body = await request.json().catch(() => ({}));
  const roleId = nullableId(body.role_id);
  const module = String(body.module ?? "").trim();
  const scopeType = String(body.scope_type ?? "all").trim();

  if (!roleId || !module) return fail("Role and module are required", 422);
  if (!allowedModules.has(module)) return fail("Invalid access module", 422);
  if (!allowedScopeTypes.has(scopeType)) return fail("Invalid scope type", 422);

  const roleRows = await query<any[]>("SELECT id FROM roles WHERE id=? LIMIT 1", [roleId]);
  if (!roleRows.length) return fail("Selected role does not exist", 422);

  const resolved = await canonicalScopeValues(scopeType, body.scope_values);
  if (resolved.error) return fail(resolved.error, 422);

  const duplicate = await query<any[]>(
    "SELECT id FROM organization_access_mappings WHERE role_id=? AND module=? AND is_active=1 LIMIT 1",
    [roleId, module],
  );
  if (duplicate.length) return fail("This role already has an active mapping for the selected module", 409);

  const id = await transaction(async (connection) => {
    const [result]: any = await connection.execute(
      `INSERT INTO organization_access_mappings
       (office_id,directorate_id,department_id,team_id,role_id,module,scope_type,scope_value,
        can_create_annual_plan,can_divide_monthly_plan,can_update_achievement,can_view_report,can_comment,can_approve,is_active)
       VALUES (NULL,NULL,NULL,NULL,?,?,?,?,?,?,?,?,?,?,?)`,
      [roleId,module,scopeType,null,flag(body.can_create_annual_plan),flag(body.can_divide_monthly_plan),
       flag(body.can_update_achievement),flag(body.can_view_report),flag(body.can_comment),flag(body.can_approve),
       body.is_active === false ? 0 : 1],
    );
    for (const value of resolved.values) {
      await connection.execute(
        "INSERT INTO organization_access_mapping_scopes (access_mapping_id,scope_value) VALUES (?,?)",
        [result.insertId, value],
      );
    }
    return result.insertId;
  });

  const rows = await query<any[]>(`${selectOneSql} WHERE oam.id=? GROUP BY oam.id,r.name LIMIT 1`, [id]);
  const row = rows[0];
  if (row) row.scope_values = typeof row.scope_values === "string" ? JSON.parse(row.scope_values) : (row.scope_values ?? []).filter(Boolean);
  return created(row, "Access mapping created successfully");
}
