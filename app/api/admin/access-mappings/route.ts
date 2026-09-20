import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { created, fail, ok } from "@/lib/server/response";

const allowedModules = new Set(["crop", "crop_product", "livestock", "livestock_product", "trade", "job", "agribusiness", "mechanization", "all"]);
const allowedScopeTypes = new Set(["all", "crop_type", "crop_product", "livestock_type", "livestock_product", "trade_group"]);

function flag(value: unknown) { return value === true || value === 1 || value === "1" ? 1 : 0; }
function nullableId(value: unknown) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function roleLevel(roleName: string) {
  if (["Team Leader", "Expert"].includes(roleName)) return "team";
  if (roleName === "Director") return "directorate";
  if (["Manager", "Adviser"].includes(roleName)) return "department";
  return "office";
}

async function resolveOrganization(roleName: string, body: any) {
  const level = roleLevel(roleName);
  const officeId = nullableId(body.office_id);
  const departmentId = nullableId(body.department_id);
  const directorateId = nullableId(body.directorate_id);
  const teamId = nullableId(body.team_id);

  if (level === "team") {
    if (!teamId) return { error: "Team is required for Team Leader and Expert mappings" };
    const rows = await query<any[]>(`
      SELECT t.id AS team_id, d.id AS directorate_id, d.department_id, d.office_id
      FROM teams t INNER JOIN directorates d ON d.id=t.directorate_id
      WHERE t.id=? AND COALESCE(t.is_active,1)=1 LIMIT 1`, [teamId]);
    return rows[0] ? { ...rows[0], error: null } : { error: "Selected team does not exist or is inactive" };
  }
  if (level === "directorate") {
    if (!directorateId) return { error: "Directorate is required for Director mappings" };
    const rows = await query<any[]>(`
      SELECT NULL AS team_id, d.id AS directorate_id, d.department_id, d.office_id
      FROM directorates d WHERE d.id=? AND COALESCE(d.is_active,1)=1 LIMIT 1`, [directorateId]);
    return rows[0] ? { ...rows[0], error: null } : { error: "Selected directorate does not exist or is inactive" };
  }
  if (level === "department") {
    if (!departmentId) return { error: "Department is required for Manager and Adviser mappings" };
    const rows = await query<any[]>(`
      SELECT NULL AS team_id, NULL AS directorate_id, dp.id AS department_id, dp.office_id
      FROM departments dp WHERE dp.id=? AND dp.is_active=1 LIMIT 1`, [departmentId]);
    return rows[0] ? { ...rows[0], error: null } : { error: "Selected department does not exist or is inactive" };
  }
  if (!officeId) return { error: "Office is required for this role mapping" };
  const rows = await query<any[]>(`
    SELECT NULL AS team_id, NULL AS directorate_id, NULL AS department_id, o.id AS office_id
    FROM offices o WHERE o.id=? AND o.is_active=1 LIMIT 1`, [officeId]);
  return rows[0] ? { ...rows[0], error: null } : { error: "Selected office does not exist or is inactive" };
}

async function canonicalScopeValues(scopeType: string, input: unknown) {
  if (scopeType === "all") return { values: [] as string[], error: null as string | null };
  const raw = Array.isArray(input) ? input : [];
  const requested = [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))];
  if (!requested.length) return { values: [], error: "Select at least one scope value" };
  if (scopeType === "crop_product" || scopeType === "livestock_product") {
    const sourceType = scopeType === "crop_product" ? "crop" : "livestock";
    const placeholders = requested.map(() => "?").join(",");
    const rows = await query<any[]>(`SELECT DISTINCT name FROM works WHERE source_type=? AND name IN (${placeholders}) AND is_active=1`, [sourceType, ...requested]);
    const values = rows.map((row) => String(row.name));
    if (values.length !== requested.length) return { values: [], error: "One or more selected products do not exist or are inactive" };
    return { values, error: null };
  }
  const table = scopeType === "crop_type" ? "crop_types" : scopeType === "livestock_type" ? "livestock_types" : null;
  if (!table) return { values: requested, error: null };
  const placeholders = requested.map(() => "?").join(",");
  const rows = await query<any[]>(`SELECT name FROM ${table} WHERE name IN (${placeholders}) AND is_active=1`, requested);
  const values = rows.map((row) => String(row.name));
  if (values.length !== requested.length) return { values: [], error: "One or more selected scope values do not exist or are inactive" };
  return { values, error: null };
}

const mappingSelect = `
SELECT oam.*, r.name AS role_name, o.name AS office_name, dp.name AS department_name,
       d.name AS directorate_name, t.name AS team_name
FROM organization_access_mappings oam
INNER JOIN roles r ON r.id=oam.role_id
LEFT JOIN offices o ON o.id=oam.office_id
LEFT JOIN departments dp ON dp.id=oam.department_id
LEFT JOIN directorates d ON d.id=oam.directorate_id
LEFT JOIN teams t ON t.id=oam.team_id
`;

async function attachScopes(rows: any[]) {
  if (!rows.length) return rows;
  const ids = rows.map(r => Number(r.id));
  const placeholders = ids.map(() => "?").join(",");
  const scopes = await query<any[]>(
    `SELECT access_mapping_id, scope_value
     FROM organization_access_mapping_scopes
     WHERE access_mapping_id IN (${placeholders})
     ORDER BY id`,
    ids,
  );
  const byId = new Map<number, string[]>();
  for (const scope of scopes) {
    const id = Number(scope.access_mapping_id);
    const values = byId.get(id) ?? [];
    values.push(String(scope.scope_value));
    byId.set(id, values);
  }
  return rows.map(row => ({ ...row, scope_values: byId.get(Number(row.id)) ?? [] }));
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth || !auth.roles?.includes("Super Admin")) return fail("Forbidden", 403);
  const rows = await query<any[]>(
    `${mappingSelect}
     ORDER BY r.name, o.name, dp.name, d.name, t.name, oam.module, oam.id`
  );
  return ok(await attachScopes(rows), "Access mappings fetched successfully");
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

  const roleRows = await query<any[]>("SELECT id,name FROM roles WHERE id=? LIMIT 1", [roleId]);
  if (!roleRows.length) return fail("Selected role does not exist", 422);
  const organization = await resolveOrganization(String(roleRows[0].name), body);
  if (organization.error) return fail(String(organization.error), 422);

  const resolved = await canonicalScopeValues(scopeType, body.scope_values);
  if (resolved.error) return fail(resolved.error, 422);

  const duplicate = await query<any[]>(
    `SELECT id FROM organization_access_mappings
     WHERE role_id=? AND module=? AND office_id <=> ? AND department_id <=> ?
       AND directorate_id <=> ? AND team_id <=> ? AND is_active=1 LIMIT 1`,
    [roleId, module, organization.office_id, organization.department_id, organization.directorate_id, organization.team_id],
  );
  if (duplicate.length) return fail("This role already has an active mapping for the selected organization and module. Edit the existing mapping to change its allowed scopes.", 409);

  const id = await transaction(async (connection) => {
    const [result]: any = await connection.execute(
      `INSERT INTO organization_access_mappings
       (office_id,directorate_id,department_id,team_id,role_id,module,scope_type,scope_value,
        can_create_annual_plan,can_divide_monthly_plan,can_update_achievement,can_view_report,can_comment,can_approve,is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [organization.office_id, organization.directorate_id, organization.department_id, organization.team_id,
       roleId,module,scopeType,null,flag(body.can_create_annual_plan),flag(body.can_divide_monthly_plan),
       flag(body.can_update_achievement),flag(body.can_view_report),flag(body.can_comment),flag(body.can_approve),
       body.is_active === false ? 0 : 1],
    );
    for (const value of resolved.values) {
      await connection.execute("INSERT INTO organization_access_mapping_scopes (access_mapping_id,scope_value) VALUES (?,?)", [result.insertId, value]);
    }
    return result.insertId;
  });

  const rows = await query<any[]>(`${mappingSelect} WHERE oam.id=? LIMIT 1`, [id]);
  return created((await attachScopes(rows))[0] ?? null, "Access mapping created successfully");
}
