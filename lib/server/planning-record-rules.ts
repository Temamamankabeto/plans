import { query, transaction } from "@/lib/server/db";
import type { PoolConnection } from "mysql2/promise";
import type { PlanningRecordFormInput } from "@/types/location/planning-record.type";

export function nullable(value: unknown) {
  return value === undefined || value === null || value === "" || value === "none" ? null : value;
}

export function isSuperAdmin(roles: string[] = []) {
  return roles.some((role) => role.toLowerCase().replace(/[\s-]+/g, "_") === "super_admin");
}

export async function getPlanningSettings() {
  const rows = await query<any[]>("SELECT * FROM planning_settings WHERE id = 1 LIMIT 1").catch(() => []);
  return rows[0] ?? {
    annual_plan_open: 1,
    annual_achievement_open: 0,
    monthly_plan_open: 1,
    monthly_achievement_open: 1,
  };
}

export function entryAllowed(settings: any, periodType: string, hasAchievementValues = false) {
  if (periodType === "annual") return Number(settings.annual_plan_open) === 1;
  if (hasAchievementValues) return Number(settings.monthly_achievement_open) === 1;
  return Number(settings.monthly_plan_open) === 1;
}

export function fiscalYearAllowed(settings: any, fiscalYear: unknown) {
  return String(fiscalYear ?? "").trim() === String(settings?.fiscal_year ?? "").trim();
}

function identityWhere(data: PlanningRecordFormInput, officeId: unknown, directorateId: unknown, teamId: unknown) {
  const params: unknown[] = [officeId, nullable(directorateId), nullable(teamId), data.module_type, data.fiscal_year];
  let sql = `
    office_id = ?
    AND COALESCE(directorate_id,0) = COALESCE(?,0)
    AND COALESCE(team_id,0) = COALESCE(?,0)
    AND module_type = ?
    AND record_type = 'plan'
    AND fiscal_year = ?
  `;

  if (data.module_type === "crop") {
    sql += `
      AND crop_type_id = ?
      AND crop_id = ?
      AND COALESCE(specification,'') = COALESCE(?, '')
    `;
    params.push(data.crop_type_id, data.crop_id, data.specification ?? "");
  } else {
    sql += `
      AND livestock_product_id = ?
      AND livestock_product_type_id = ?
    `;
    params.push(data.livestock_product_id, data.livestock_product_type_id);
  }

  return { sql, params };
}

export async function getAnnualPlan(data: PlanningRecordFormInput, officeId: unknown, directorateId: unknown, teamId: unknown) {
  const identity = identityWhere(data, officeId, directorateId, teamId);
  const rows = await query<any[]>(`SELECT * FROM planning_records WHERE ${identity.sql} AND period_type = 'annual' LIMIT 1`, identity.params);
  return rows[0] ?? null;
}

export async function ensureNoDuplicateRecord(data: PlanningRecordFormInput, officeId: unknown, directorateId: unknown, teamId: unknown, exceptId?: number | string) {
  if (data.record_type !== "plan") return "Achievements are updated on existing monthly plan rows. Create a plan first.";

  const identity = identityWhere(data, officeId, directorateId, teamId);
  const params = [...identity.params, data.period_type, nullable(data.month)];
  let sql = `SELECT id FROM planning_records WHERE ${identity.sql} AND period_type = ? AND COALESCE(month,0) = COALESCE(?,0)`;
  if (exceptId) {
    sql += " AND id <> ?";
    params.push(exceptId);
  }

  const rows = await query<any[]>(`${sql} LIMIT 1`, params);
  if (!rows.length) return null;

  if (data.period_type === "annual") return "Annual Plan already exists for the same fiscal year, organization, item and specification.";
  return "Duplicate Monthly Plan is not allowed for the same fiscal year, organization, item, specification and month.";
}

export async function ensureAnnualPlanExistsForMonthly(data: PlanningRecordFormInput, officeId: unknown, directorateId: unknown, teamId: unknown) {
  if (data.period_type !== "monthly") return null;
  const annual = await getAnnualPlan(data, officeId, directorateId, teamId);
  if (!annual) return "Create the Annual Plan before creating its monthly distribution.";
  const annualStatus = String(annual.plan_status ?? annual.status ?? "draft");
  if (!["draft", "returned", "rejected"].includes(annualStatus)) {
    return "Monthly distribution can be changed only while the Annual Plan is draft, returned, or rejected.";
  }
  return null;
}

function planBaseValue(data: PlanningRecordFormInput) {
  return Number(data.module_type === "crop" ? data.plan_land_area ?? 0 : data.plan_population ?? 0);
}

export async function ensureMonthlyPlanWithinAnnualPlan(data: PlanningRecordFormInput, officeId: unknown, directorateId: unknown, teamId: unknown, exceptId?: number | string) {
  if (data.period_type !== "monthly") return null;

  const annual = await getAnnualPlan(data, officeId, directorateId, teamId);
  if (!annual) return "Create Annual Plan first before creating monthly plan.";

  const identity = identityWhere(data, officeId, directorateId, teamId);
  const monthlyParams = [...identity.params];
  let monthlySql = `SELECT
      COALESCE(SUM(plan_land_area),0) AS land_area,
      COALESCE(SUM(plan_population),0) AS population,
      COALESCE(SUM(plan_production),0) AS production
    FROM planning_records
    WHERE ${identity.sql} AND period_type = 'monthly'`;
  if (exceptId) {
    monthlySql += " AND id <> ?";
    monthlyParams.push(exceptId);
  }

  const sumRows = await query<any[]>(monthlySql, monthlyParams);
  const sums = sumRows[0] ?? {};
  const baseName = data.module_type === "crop" ? "Land Area" : "Number";
  const annualBase = Number(data.module_type === "crop" ? annual.plan_land_area : annual.plan_population);
  const allocatedBase = Number(data.module_type === "crop" ? sums.land_area : sums.population) + planBaseValue(data);
  const annualProduction = Number(annual.plan_production ?? 0);
  const allocatedProduction = Number(sums.production ?? 0) + Number(data.plan_production ?? 0);

  if (allocatedBase > annualBase) return `Monthly ${baseName} cannot exceed Annual Planned ${baseName}.`;
  if (allocatedProduction > annualProduction) return "Monthly Production cannot exceed Annual Planned Production.";
  return null;
}

export async function validatePlanningBusinessRules(data: PlanningRecordFormInput, officeId: unknown, directorateId: unknown, teamId: unknown, exceptId?: number | string) {
  const duplicate = await ensureNoDuplicateRecord(data, officeId, directorateId, teamId, exceptId);
  if (duplicate) return duplicate;

  const annualPlan = await ensureAnnualPlanExistsForMonthly(data, officeId, directorateId, teamId);
  if (annualPlan) return annualPlan;

  const monthlyPlan = await ensureMonthlyPlanWithinAnnualPlan(data, officeId, directorateId, teamId, exceptId);
  if (monthlyPlan) return monthlyPlan;

  return null;
}

async function resolveAnnualPlanId(data: PlanningRecordFormInput, officeId: unknown, directorateId: unknown, teamId: unknown) {
  if (data.period_type !== "monthly") return null;
  const annual = await getAnnualPlan(data, officeId, directorateId, teamId);
  return annual?.id ?? null;
}

function planningValues(data: PlanningRecordFormInput, user: any, authId: number, annualPlanId: unknown, approvedBy: unknown = null) {
  const finalOfficeId = user.office_id ?? data.office_id;
  const finalDirectorateId = user.directorate_id ?? data.directorate_id;
  const finalTeamId = user.team_id ?? data.team_id;

  return {
    finalOfficeId,
    finalDirectorateId,
    finalTeamId,
    values: [
      nullable(annualPlanId),
      finalOfficeId,
      nullable(finalDirectorateId),
      nullable(finalTeamId),
      nullable(data.worktype_id),
      data.module_type,
      "plan",
      data.period_type,
      nullable(data.crop_type_id),
      nullable(data.crop_id),
      nullable(data.specification),
      nullable(data.livestock_product_id),
      nullable(data.livestock_product_type_id),
      data.fiscal_year,
      nullable(data.month),
      data.plan_land_area ?? 0,
      data.plan_productivity ?? 0,
      data.plan_production ?? 0,
      data.achievement_land_area ?? 0,
      data.achievement_productivity ?? 0,
      data.achievement_production ?? 0,
      data.plan_population ?? 0,
      data.achievement_population ?? 0,
      data.status ?? "draft",
      authId,
      nullable(approvedBy),
    ],
  };
}

export async function savePlanningRecord(data: PlanningRecordFormInput, user: any, authId: number, approvedBy: unknown = null, recordId?: number | string) {
  const finalOfficeId = user.office_id ?? data.office_id;
  const finalDirectorateId = user.directorate_id ?? data.directorate_id;
  const finalTeamId = user.team_id ?? data.team_id;
  const annualPlanId = await resolveAnnualPlanId(data, finalOfficeId, finalDirectorateId, finalTeamId);
  const values = planningValues(data, user, authId, annualPlanId, approvedBy);

  const savedId = await transaction(async (connection: PoolConnection) => {
    if (recordId) {
      await connection.execute(
        `UPDATE planning_records SET
          annual_plan_id = ?, office_id = ?, directorate_id = ?, team_id = ?, worktype_id = ?, module_type = ?, record_type = ?, period_type = ?,
          crop_type_id = ?, crop_id = ?, specification = ?, livestock_product_id = ?, livestock_product_type_id = ?,
          fiscal_year = ?, month = ?, plan_land_area = ?, plan_productivity = ?, plan_production = ?,
          achievement_land_area = ?, achievement_productivity = ?, achievement_production = ?,
          plan_population = ?, achievement_population = ?, status = ?, approved_by = ?
         WHERE id = ?`,
        [...values.values.slice(0, 24), values.values[25], recordId],
      );
      return Number(recordId);
    }

    const [result]: any = await connection.execute(
      `INSERT INTO planning_records (
        annual_plan_id, office_id, directorate_id, team_id, worktype_id, module_type, record_type, period_type,
        crop_type_id, crop_id, specification, livestock_product_id, livestock_product_type_id,
        fiscal_year, month, plan_land_area, plan_productivity, plan_production,
        achievement_land_area, achievement_productivity, achievement_production,
        plan_population, achievement_population, status, created_by, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values.values,
    );
    return Number(result.insertId);
  });

  return { id: savedId, ...data, record_type: "plan", annual_plan_id: annualPlanId, office_id: values.finalOfficeId, directorate_id: values.finalDirectorateId, team_id: values.finalTeamId };
}
