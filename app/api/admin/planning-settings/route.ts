import { NextRequest } from "next/server";
import { execute, query, transaction } from "@/lib/server/db";
import { getAuthUser } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/response";

function boolValue(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}

async function ensureSettingsTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS planning_settings (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      fiscal_year VARCHAR(20) NOT NULL DEFAULT '2026',
      annual_plan_open TINYINT(1) NOT NULL DEFAULT 1,
      annual_achievement_open TINYINT(1) NOT NULL DEFAULT 1,
      monthly_plan_open TINYINT(1) NOT NULL DEFAULT 1,
      monthly_achievement_open TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await execute(`
    INSERT INTO planning_settings (id, fiscal_year, annual_plan_open, annual_achievement_open, monthly_plan_open, monthly_achievement_open)
    VALUES (1, YEAR(CURDATE()), 1, 1, 1, 1)
    ON DUPLICATE KEY UPDATE id = id
  `);
}

function isSuperAdmin(roles: string[] = []) {
  return roles.some((role) => role.toLowerCase().replace(/[\s-]+/g, "_") === "super_admin");
}

function auditContext(request: NextRequest) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

function validEthiopianFiscalYear(value: string) {
  return /^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= 2200;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return fail("Unauthenticated", 401);

  await ensureSettingsTable();
  const rows = await query<any[]>("SELECT * FROM planning_settings WHERE id = 1 LIMIT 1");
  return ok(rows[0], "Planning settings fetched successfully");
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || !isSuperAdmin(user.roles)) return fail("Only Super Admin can update planning settings", 403);

  await ensureSettingsTable();
  const body = await request.json().catch(() => ({}));
  const fiscalYear = String(body.fiscal_year ?? "").trim();
  if (!validEthiopianFiscalYear(fiscalYear)) {
    return fail("Fiscal year must be a valid four-digit Ethiopian year", 422);
  }

  const beforeRows = await query<any[]>("SELECT * FROM planning_settings WHERE id = 1 LIMIT 1");
  const after = {
    fiscal_year: fiscalYear,
    annual_plan_open: boolValue(body.annual_plan_open),
    annual_achievement_open: 0,
    monthly_plan_open: boolValue(body.monthly_plan_open),
    monthly_achievement_open: boolValue(body.monthly_achievement_open),
  };
  const audit = auditContext(request);

  await transaction(async (connection) => {
    await connection.execute(
      `UPDATE planning_settings SET
        fiscal_year = ?,
        annual_plan_open = ?,
        annual_achievement_open = 0,
        monthly_plan_open = ?,
        monthly_achievement_open = ?
       WHERE id = 1`,
      [after.fiscal_year, after.annual_plan_open, after.monthly_plan_open, after.monthly_achievement_open],
    );
    await connection.execute(
      `INSERT INTO audit_logs
       (user_id, action, module, entity_type, entity_id, message, before_data, after_data, ip_address, user_agent)
       VALUES (?, 'updated', 'settings', 'planning_settings', '1', ?, ?, ?, ?, ?)`,
      [
        user.id,
        `Updated planning settings for Ethiopian fiscal year ${fiscalYear}`,
        JSON.stringify(beforeRows[0] ?? null),
        JSON.stringify(after),
        audit.ip,
        audit.userAgent,
      ],
    );
  });

  const rows = await query<any[]>("SELECT * FROM planning_settings WHERE id = 1 LIMIT 1");
  return ok(rows[0], "Planning settings updated successfully");
}
