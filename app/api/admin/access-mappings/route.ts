import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { created, fail, ok } from "@/lib/server/response";

const selectSql = `SELECT oam.*, o.name office_name, d.name directorate_name, dp.name department_name, t.name team_name, r.name role_name
FROM organization_access_mappings oam
INNER JOIN offices o ON o.id=oam.office_id
LEFT JOIN directorates d ON d.id=oam.directorate_id
LEFT JOIN departments dp ON dp.id=oam.department_id
LEFT JOIN teams t ON t.id=oam.team_id
INNER JOIN roles r ON r.id=oam.role_id`;

function flag(value: unknown) { return value === true || value === 1 || value === "1" ? 1 : 0; }
function nullableId(value: unknown) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
const allowedModules = new Set(["crop", "livestock", "trade", "job", "agribusiness", "mechanization", "all"]);
const allowedScopeTypes = new Set(["all", "crop_type", "livestock_product", "trade_group"]);

async function canonicalScopeValue(scopeType: string, value: string | null) {
  if (scopeType === "all") return { value: null, error: null };
  if (!value) return { value: null, error: "Scope value is required for the selected scope type" };
  const table = scopeType === "crop_type" ? "crop_types" : scopeType === "livestock_product" ? "livestock_products" : null;
  if (!table) return { value, error: null };
  const numericId = Number(value);
  const rows = await query<any[]>(
    `SELECT name FROM ${table} WHERE ${Number.isInteger(numericId) && numericId > 0 ? "id = ?" : "LOWER(name) = LOWER(?)"} AND is_active = 1 LIMIT 1`,
    [Number.isInteger(numericId) && numericId > 0 ? numericId : value],
  );
  return rows[0]?.name
    ? { value: String(rows[0].name), error: null }
    : { value: null, error: `Selected ${scopeType.replaceAll("_", " ")} does not exist or is inactive` };
}

async function validateOrganizationScope(
  officeId: number,
  directorateId: number | null,
  departmentId: number | null,
  teamId: number | null,
) {
  const officeRows = await query<any[]>("SELECT id FROM offices WHERE id=? LIMIT 1", [officeId]);
  if (!officeRows.length) return "Selected office does not exist";

  if ((departmentId || teamId) && !directorateId) return "Select a directorate before selecting a department or team";

  if (departmentId) {
    const rows = await query<any[]>("SELECT id FROM departments WHERE id=? AND office_id=? AND is_active=1 LIMIT 1", [departmentId, officeId]);
    if (!rows.length) return "Selected department does not belong to selected office";
  }

  if (directorateId) {
    if (!departmentId) return "Select department before selecting directorate";
    const rows = await query<any[]>("SELECT id FROM directorates WHERE id=? AND office_id=? AND department_id=? LIMIT 1", [directorateId, officeId, departmentId]);
    if (!rows.length) return "Selected directorate does not belong to selected department";
  }

  if (teamId) {
    const rows = await query<any[]>("SELECT id FROM teams WHERE id=? AND directorate_id=? LIMIT 1", [teamId, directorateId]);
    if (!rows.length) return "Selected team does not belong to selected directorate";
  }

  return null;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth || !auth.roles?.includes("Super Admin")) return fail("Forbidden", 403);
  const rows = await query<any[]>(`${selectSql} ORDER BY o.name,d.name,dp.name,t.name,r.name,oam.module,oam.scope_value`);
  return ok(rows, "Access mappings fetched successfully");
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth || !auth.roles?.includes("Super Admin")) return fail("Forbidden", 403);
  const body = await request.json().catch(() => ({}));
  const officeId = nullableId(body.office_id);
  const directorateId = nullableId(body.directorate_id);
  const departmentId = nullableId(body.department_id);
  const teamId = nullableId(body.team_id);
  const roleId = nullableId(body.role_id);
  const module = String(body.module ?? "").trim();
  const scopeType = String(body.scope_type ?? "all").trim();
  const rawScopeValue = scopeType === "all" ? null : String(body.scope_value ?? "").trim() || null;
  if (!officeId || !roleId || !module) return fail("Office, role and module are required", 422);
  if (!allowedModules.has(module)) return fail("Invalid access module", 422);
  if (!allowedScopeTypes.has(scopeType)) return fail("Invalid scope type", 422);
  const resolvedScope = await canonicalScopeValue(scopeType, rawScopeValue);
  if (resolvedScope.error) return fail(resolvedScope.error, 422);
  const scopeValue = resolvedScope.value;

  const roleRows = await query<any[]>("SELECT id,name FROM roles WHERE id=? LIMIT 1", [roleId]);
  if (!roleRows.length) return fail("Selected role does not exist", 422);
  if (["Manager", "Adviser"].includes(String(roleRows[0].name)) && !departmentId) {
    return fail("Department is required for Manager and Adviser access mappings", 422);
  }

  const scopeError = await validateOrganizationScope(officeId, directorateId, departmentId, teamId);
  if (scopeError) return fail(scopeError, 422);

  const duplicate = await query<any[]>(
    `SELECT id FROM organization_access_mappings
     WHERE office_id=? AND directorate_id <=> ? AND department_id <=> ? AND team_id <=> ?
       AND role_id=? AND module=? AND scope_type=? AND scope_value <=> ?
     LIMIT 1`,
    [officeId, directorateId, departmentId, teamId, roleId, module, scopeType, scopeValue],
  );
  if (duplicate.length) return fail("An identical access mapping already exists", 409);

  const id = await transaction(async (connection) => {
    const [result]: any = await connection.execute(
      `INSERT INTO organization_access_mappings
      (office_id,directorate_id,department_id,team_id,role_id,module,scope_type,scope_value,can_create_annual_plan,can_divide_monthly_plan,can_update_achievement,can_view_report,can_comment,can_approve,is_active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [officeId,directorateId,departmentId,teamId,roleId,module,scopeType,scopeValue,flag(body.can_create_annual_plan),flag(body.can_divide_monthly_plan),flag(body.can_update_achievement),flag(body.can_view_report),flag(body.can_comment),flag(body.can_approve),body.is_active === false ? 0 : 1]
    );
    return result.insertId;
  });
  const rows = await query<any[]>(`${selectSql} WHERE oam.id=? LIMIT 1`, [id]);
  return created(rows[0], "Access mapping created successfully");
}
