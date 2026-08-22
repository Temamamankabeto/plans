import type { PlanningModuleType, PlanningPeriodType, PlanningRecordFormInput, PlanningRecordStatus, PlanningRecordType } from "@/types/location/planning-record.type";

type ValidationResult<T> =
  | { valid: true; data: T; errors: Record<string, never> }
  | { valid: false; data: null; errors: Record<string, string> };

const modules: PlanningModuleType[] = ["crop", "livestock"];
const periodTypes: PlanningPeriodType[] = ["annual", "monthly"];
const statuses: PlanningRecordStatus[] = ["draft", "submitted", "approved", "rejected"];

function nullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "" || value === "none" || value === "all") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function metricNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : NaN;
}

function calculatedProductivity(production: number, base: number) {
  if (production > 0 && base > 0) return Number((production / base).toFixed(4));
  return 0;
}

export function validatePlanningRecordInput(input: Partial<PlanningRecordFormInput>): ValidationResult<PlanningRecordFormInput> {
  const errors: Record<string, string> = {};

  const moduleType = String(input.module_type ?? "crop") as PlanningModuleType;
  const recordType = "plan" as PlanningRecordType;
  const periodType = String(input.period_type ?? "annual") as PlanningPeriodType;
  const fiscalYear = String(input.fiscal_year ?? "").trim();
  const month = periodType === "monthly" ? nullableNumber(input.month) : null;
  const status = String(input.status ?? "draft") as PlanningRecordStatus;

  const cropTypeId = nullableNumber(input.crop_type_id);
  const cropId = nullableNumber(input.crop_id);
  const livestockProductId = nullableNumber(input.livestock_product_id);
  const livestockProductTypeId = nullableNumber(input.livestock_product_type_id);

  const planLandArea = metricNumber(input.plan_land_area);
  const planProduction = metricNumber(input.plan_production);
  const planPopulation = metricNumber(input.plan_population);
  const achievementLandArea = periodType === "monthly" ? metricNumber(input.achievement_land_area) : 0;
  const achievementProduction = periodType === "monthly" ? metricNumber(input.achievement_production) : 0;
  const achievementPopulation = periodType === "monthly" ? metricNumber(input.achievement_population) : 0;

  if (!modules.includes(moduleType)) errors.module_type = "Module type must be crop or livestock";
  if (!periodTypes.includes(periodType)) errors.period_type = "Period type must be annual or monthly";
  if (!fiscalYear) errors.fiscal_year = "Fiscal year is required";
  if (periodType === "monthly" && (!month || month < 1 || month > 13)) errors.month = "A valid Ethiopian reporting month is required";
  if (!statuses.includes(status)) errors.status = "Invalid status";

  if (moduleType === "crop") {
    if (!cropTypeId) errors.crop_type_id = "Crop type is required";
    if (!cropId) errors.crop_id = "Crop is required";
  }

  if (moduleType === "livestock") {
    if (!livestockProductId) errors.livestock_product_id = "Livestock product is required";
    if (!livestockProductTypeId) errors.livestock_product_type_id = "Livestock product type is required";
  }

  [
    ["plan_land_area", planLandArea],
    ["plan_production", planProduction],
    ["achievement_land_area", achievementLandArea],
    ["achievement_production", achievementProduction],
    ["plan_population", planPopulation],
    ["achievement_population", achievementPopulation],
  ].forEach(([key, value]) => {
    if (Number.isNaN(value)) errors[String(key)] = "Value must be zero or greater";
  });

  if (moduleType === "crop" && planLandArea <= 0 && planProduction <= 0) errors.plan_production = "Plan land area or production is required";
  if (moduleType === "livestock" && planPopulation <= 0 && planProduction <= 0) errors.plan_production = "Plan number or production is required";

  if (Object.keys(errors).length) return { valid: false, data: null, errors };

  const planBase = moduleType === "crop" ? planLandArea : planPopulation;
  const achievementBase = moduleType === "crop" ? achievementLandArea : achievementPopulation;

  return {
    valid: true,
    errors: {},
    data: {
      office_id: nullableNumber(input.office_id),
      directorate_id: nullableNumber(input.directorate_id),
      team_id: nullableNumber(input.team_id),
      worktype_id: nullableNumber(input.worktype_id),
      module_type: moduleType,
      record_type: recordType,
      period_type: periodType,
      crop_type_id: moduleType === "crop" ? cropTypeId : null,
      crop_id: moduleType === "crop" ? cropId : null,
      specification: moduleType === "crop" ? String(input.specification ?? "").trim() || null : null,
      livestock_product_id: moduleType === "livestock" ? livestockProductId : null,
      livestock_product_type_id: moduleType === "livestock" ? livestockProductTypeId : null,
      fiscal_year: fiscalYear,
      month: month as number | null,
      plan_land_area: moduleType === "crop" ? planLandArea : 0,
      plan_productivity: calculatedProductivity(planProduction, planBase),
      plan_production: planProduction,
      achievement_land_area: periodType === "monthly" && moduleType === "crop" ? achievementLandArea : 0,
      achievement_productivity: periodType === "monthly" ? calculatedProductivity(achievementProduction, achievementBase) : 0,
      achievement_production: periodType === "monthly" ? achievementProduction : 0,
      plan_population: moduleType === "livestock" ? planPopulation : 0,
      achievement_population: periodType === "monthly" && moduleType === "livestock" ? achievementPopulation : 0,
      achievement_remark: periodType === "monthly" ? String(input.achievement_remark ?? "").trim() || null : null,
      status,
    },
  };
}
