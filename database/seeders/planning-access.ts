import { query } from "@/lib/server/db";
import type { PlanningRecordFormInput } from "@/types/location/planning-record.type";
import { isSuperAdmin } from "@/lib/server/planning-record-rules";

type ScopeModule = "crop" | "livestock" | "all";

export interface PlanningAccessScope {
  module: ScopeModule;
  canWrite: boolean;
  reportOnly: boolean;
  canReview: boolean;
  cropTypeNames: string[];
  livestockProductNames: string[];
}

const PRESIDENT_REVIEWER_PHONES = new Set([
  "+251900000502", // Agricultural Value Chain Delivery Manager
  "+251900000503", // Manufacturing Value Chain Delivery Manager
]);

const cropAccessByPhone: Record<string, PlanningAccessScope> = {
  "+251900000101": { module: "crop", canWrite: false, reportOnly: true, canReview: false, cropTypeNames: ["Cash Crops"], livestockProductNames: [] },
  "+251900000102": { module: "crop", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: ["Cash Crops"], livestockProductNames: [] },
  "+251900000103": { module: "crop", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: ["Spice Crops"], livestockProductNames: [] },
  "+251900000104": { module: "crop", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: ["Fruit Crops"], livestockProductNames: [] },
  "+251900000105": { module: "crop", canWrite: false, reportOnly: true, canReview: false, cropTypeNames: ["Cereal Crops", "Pulse Crops", "Oil Seed Crops", "Vegetable Crops"], livestockProductNames: [] },
  "+251900000106": { module: "crop", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: ["Cereal Crops"], livestockProductNames: [] },
  "+251900000107": { module: "crop", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: ["Pulse Crops"], livestockProductNames: [] },
  "+251900000108": { module: "crop", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: ["Oil Seed Crops"], livestockProductNames: [] },
  "+251900000109": { module: "crop", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: ["Vegetable Crops"], livestockProductNames: [] },
};

const livestockAccessByPhone: Record<string, PlanningAccessScope> = {
  "+251900000110": {
    module: "livestock",
    canWrite: false,
    reportOnly: true,
    canReview: false,
    cropTypeNames: [],
    livestockProductNames: ["Live Animals and Meat", "Dairy", "Poultry and Fish", "Animal Feed and Nutrition", "Apiculture and Honey"],
  },
  "+251900000111": { module: "livestock", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: [], livestockProductNames: ["Live Animals and Meat"] },
  "+251900000112": { module: "livestock", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: [], livestockProductNames: ["Dairy"] },
  "+251900000113": { module: "livestock", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: [], livestockProductNames: ["Poultry and Fish"] },
  "+251900000114": { module: "livestock", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: [], livestockProductNames: ["Apiculture and Honey"] },
  "+251900000115": { module: "livestock", canWrite: true, reportOnly: false, canReview: false, cropTypeNames: [], livestockProductNames: ["Animal Feed and Nutrition"] },
};

function normalizePhone(phone: unknown) {
  return String(phone ?? "").replace(/\s+/g, "").trim();
}

export function isPresidentPlanningReviewer(user: any) {
  return PRESIDENT_REVIEWER_PHONES.has(normalizePhone(user?.phone));
}

export function getPlanningAccessScope(user: any, roles: string[] = []): PlanningAccessScope {
  if (isSuperAdmin(roles)) {
    return { module: "all", canWrite: true, reportOnly: false, canReview: true, cropTypeNames: [], livestockProductNames: [] };
  }

  if (isPresidentPlanningReviewer(user)) {
    return { module: "all", canWrite: false, reportOnly: true, canReview: true, cropTypeNames: [], livestockProductNames: [] };
  }

  const phone = normalizePhone(user?.phone);
  return cropAccessByPhone[phone] ?? livestockAccessByPhone[phone] ?? {
    module: "all",
    canWrite: false,
    reportOnly: true,
    canReview: false,
    cropTypeNames: [],
    livestockProductNames: [],
  };
}

function addInFilter(where: string[], params: unknown[], expression: string, values: string[]) {
  if (!values.length) return;
  where.push(`${expression} IN (${values.map(() => "?").join(", ")})`);
  params.push(...values);
}

export function applyPlanningReadScope(where: string[], params: unknown[], user: any, roles: string[] = [], alias = "pr") {
  if (isSuperAdmin(roles)) return;

  const scope = getPlanningAccessScope(user, roles);

  if (isPresidentPlanningReviewer(user)) {
    if (scope.module !== "all") {
      where.push(`${alias}.module_type = ?`);
      params.push(scope.module);
    }
    return;
  }

  const officeId = user?.office_id;
  const directorateId = user?.directorate_id;
  const teamId = user?.team_id;

  if (officeId) {
    where.push(`${alias}.office_id = ?`);
    params.push(officeId);
  }

  if (directorateId) {
    where.push(`${alias}.directorate_id = ?`);
    params.push(directorateId);
  }

  if (teamId) {
    where.push(`${alias}.team_id = ?`);
    params.push(teamId);
  }

  if (scope.module !== "all") {
    where.push(`${alias}.module_type = ?`);
    params.push(scope.module);
  }

  addInFilter(where, params, "cty.name", scope.cropTypeNames);
  addInFilter(where, params, "lp.name", scope.livestockProductNames);
}

export async function validatePlanningWriteScope(data: PlanningRecordFormInput, user: any, roles: string[] = []) {
  if (isSuperAdmin(roles)) return null;

  const scope = getPlanningAccessScope(user, roles);
  if (!scope.canWrite) return "You have report-only access for this planning module.";

  if (scope.module !== "all" && data.module_type !== scope.module) {
    return `You can only create ${scope.module} planning records.`;
  }

  if (data.module_type === "crop" && scope.cropTypeNames.length) {
    const rows = await query<any[]>("SELECT name FROM crop_types WHERE id = ? LIMIT 1", [data.crop_type_id]);
    const cropTypeName = rows[0]?.name;
    if (!cropTypeName || !scope.cropTypeNames.includes(cropTypeName)) {
      return `You can only create records for: ${scope.cropTypeNames.join(", ")}.`;
    }
  }

  if (data.module_type === "livestock" && scope.livestockProductNames.length) {
    const rows = await query<any[]>("SELECT name FROM livestock_products WHERE id = ? LIMIT 1", [data.livestock_product_id]);
    const productName = rows[0]?.name;
    if (!productName || !scope.livestockProductNames.includes(productName)) {
      return `You can only create records for: ${scope.livestockProductNames.join(", ")}.`;
    }
  }

  return null;
}

export function canReviewPlanningRecords(user: any, roles: string[] = []) {
  return isSuperAdmin(roles) || getPlanningAccessScope(user, roles).canReview;
}
