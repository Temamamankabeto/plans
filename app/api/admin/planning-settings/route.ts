import { NextRequest } from "next/server";
import { execute, query, transaction } from "@/lib/server/db";
import { getAuthUser } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/response";

function boolValue(value: unknown) { return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0; }
function validYear(value: string) { return /^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= 2200; }
function isSuperAdmin(roles: string[] = []) { return roles.some((role) => role.toLowerCase().replace(/[\s-]+/g, "_") === "super_admin"); }
function auditContext(request: NextRequest) { return { ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") }; }

function normalizeYears(value: unknown, legacy?: unknown): string[] {
  let values: unknown[] = [];
  if (Array.isArray(value)) values = value;
  else if (typeof value === "string" && value.trim()) { try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) values = parsed; } catch {} }
  if (!values.length && legacy != null) values = [legacy];
  return [...new Set(values.map((v) => String(v).trim()).filter(validYear))].sort((a, b) => Number(b) - Number(a));
}
function serialize(row: any) { const years = normalizeYears(row?.fiscal_years, row?.fiscal_year); return { ...row, fiscal_year: years[0] ?? String(row?.fiscal_year ?? ""), fiscal_years: years }; }

async function ensureSettingsTable() {
  await execute(`CREATE TABLE IF NOT EXISTS planning_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, fiscal_year VARCHAR(20) NOT NULL DEFAULT '2026', fiscal_years TEXT NULL,
    annual_plan_open TINYINT(1) NOT NULL DEFAULT 1, annual_achievement_open TINYINT(1) NOT NULL DEFAULT 1,
    monthly_plan_open TINYINT(1) NOT NULL DEFAULT 1, monthly_achievement_open TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const cols = await query<any[]>(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='planning_settings' AND COLUMN_NAME='fiscal_years'`);
  if (!cols.length) await execute("ALTER TABLE planning_settings ADD COLUMN fiscal_years TEXT NULL AFTER fiscal_year");
  await execute(`INSERT INTO planning_settings (id, fiscal_year, fiscal_years, annual_plan_open, annual_achievement_open, monthly_plan_open, monthly_achievement_open)
    VALUES (1, YEAR(CURDATE()), CONCAT('[\"', YEAR(CURDATE()), '\"]'), 1, 1, 1, 1) ON DUPLICATE KEY UPDATE id=id`);
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request); if (!user) return fail("Unauthenticated", 401);
  await ensureSettingsTable(); const rows = await query<any[]>("SELECT * FROM planning_settings WHERE id=1 LIMIT 1");
  return ok(serialize(rows[0]), "Planning settings fetched successfully");
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request); if (!user || !isSuperAdmin(user.roles)) return fail("Only Super Admin can update planning settings", 403);
  await ensureSettingsTable(); const body = await request.json().catch(() => ({}));
  const years = normalizeYears(body.fiscal_years, body.fiscal_year);
  if (!years.length) return fail("Add at least one valid four-digit Ethiopian fiscal year", 422);
  if (years.length > 20) return fail("A maximum of 20 fiscal years can be enabled at once", 422);
  const beforeRows = await query<any[]>("SELECT * FROM planning_settings WHERE id=1 LIMIT 1");
  const after = { fiscal_year: years[0], fiscal_years: years, annual_plan_open: boolValue(body.annual_plan_open), annual_achievement_open: 0, monthly_plan_open: boolValue(body.monthly_plan_open), monthly_achievement_open: boolValue(body.monthly_achievement_open) };
  const audit = auditContext(request);
  await transaction(async (connection) => {
    await connection.execute(`UPDATE planning_settings SET fiscal_year=?, fiscal_years=?, annual_plan_open=?, annual_achievement_open=0, monthly_plan_open=?, monthly_achievement_open=? WHERE id=1`, [after.fiscal_year, JSON.stringify(years), after.annual_plan_open, after.monthly_plan_open, after.monthly_achievement_open]);
    await connection.execute(`INSERT INTO audit_logs (user_id,action,module,entity_type,entity_id,message,before_data,after_data,ip_address,user_agent) VALUES (?, 'updated','settings','planning_settings','1',?,?,?,?,?)`, [user.id, `Updated planning settings for Ethiopian fiscal years ${years.join(", ")}`, JSON.stringify(beforeRows[0] ?? null), JSON.stringify(after), audit.ip, audit.userAgent]);
  });
  const rows = await query<any[]>("SELECT * FROM planning_settings WHERE id=1 LIMIT 1");
  return ok(serialize(rows[0]), "Planning settings updated successfully");
}
