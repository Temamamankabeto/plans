import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { ok } from "@/lib/server/response";

function quarterSql() {
  return `
    CASE
      WHEN month BETWEEN 1 AND 3 THEN 'Q1'
      WHEN month BETWEEN 4 AND 6 THEN 'Q2'
      WHEN month BETWEEN 7 AND 9 THEN 'Q3'
      WHEN month BETWEEN 10 AND 12 THEN 'Q4'
      ELSE 'Annual'
    END
  `;
}

export async function GET(request: NextRequest) {
  const moduleType = request.nextUrl.searchParams.get("module_type") ?? "crop";
  const metric = request.nextUrl.searchParams.get("metric") ?? request.nextUrl.searchParams.get("record_type") ?? "plan";
  const fiscalYear = request.nextUrl.searchParams.get("fiscal_year") ?? new Date().getFullYear().toString();
  const baseField = moduleType === "crop"
    ? metric === "achievement" ? "achievement_land_area" : "plan_land_area"
    : metric === "achievement" ? "achievement_population" : "plan_population";
  const productionField = metric === "achievement" ? "achievement_production" : "plan_production";

  const rows = await query<any[]>(
    `SELECT
      ${quarterSql()} AS quarter,
      COALESCE(SUM(${baseField}), 0) AS base_total,
      COALESCE(SUM(${productionField}), 0) AS production_total,
      CASE WHEN COALESCE(SUM(${baseField}), 0) > 0 THEN COALESCE(SUM(${productionField}), 0) / COALESCE(SUM(${baseField}), 0) ELSE 0 END AS productivity,
      COUNT(*) AS record_count
    FROM planning_records
    WHERE module_type = ?
      AND record_type = 'plan'
      AND fiscal_year = ?
      AND period_type = 'monthly'
    GROUP BY quarter
    ORDER BY FIELD(quarter, 'Q1', 'Q2', 'Q3', 'Q4')`,
    [moduleType, fiscalYear],
  );

  const annual = rows.reduce(
    (total, row) => {
      total.base_total += Number(row.base_total ?? 0);
      total.production_total += Number(row.production_total ?? 0);
      total.record_count += Number(row.record_count ?? 0);
      return total;
    },
    { base_total: 0, production_total: 0, record_count: 0 },
  );

  return ok({
    quarters: rows,
    annual: {
      ...annual,
      productivity: annual.base_total > 0 ? annual.production_total / annual.base_total : 0,
    },
  }, "Planning summary calculated from monthly plan rows successfully");
}
