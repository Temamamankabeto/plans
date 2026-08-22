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

function normalizeText(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function scopeContains(values: string[], row: { id?: number; name?: string } | undefined) {
  if (!row) return false;
  const scopeKey = (value: unknown) => normalizeText(value)
    .replace(/\b(crop|crops|type|types)\b/g, "")
    .replace(/\bspices\b/g, "spice")
    .replace(/\bseeds\b/g, "seed")
    .replace(/\s+/g, " ")
    .trim();
  return values.some((value) => Number(value) === Number(row.id) || scopeKey(value) === scopeKey(row.name));
}

function hasValueChainManagerName(user: any, roles: string[] = []) {
  const searchable = [user?.name, user?.email, ...(roles ?? [])].map(normalizeText).join(" ");
  return (
    searchable.includes("agricultural value chain") ||
    searchable.includes("manufacturing value chain") ||
    searchable.includes("value chain delivery manager") ||
    searchable.includes("value chain delivery manger")
  );
}

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


function isPlanningRecordOwnerRole(roles: string[] = []) {
  const normalizedRoles = roles.map((role) => normalizeText(role).replace(/[^a-z0-9]+/g, "_"));
  return normalizedRoles.some((role) => ["expert", "team_leader", "teamleader", "director"].includes(role));
}

function dynamicPlanningScope(user: any, roles: string[] = []): PlanningAccessScope | null {
  const mappings = Array.isArray(user?.access_mappings) ? user.access_mappings : [];
  if (!mappings.length) return null;

  const active = mappings.filter((mapping: any) => Number(mapping?.is_active ?? 1) === 1);
  if (!active.length) return null;

  const modules = [...new Set(active.map((mapping: any) => String(mapping?.module ?? "").toLowerCase()))];
  const module: ScopeModule = modules.includes("all") || (modules.includes("crop") && modules.includes("livestock"))
    ? "all"
    : modules.includes("crop")
      ? "crop"
      : modules.includes("livestock")
        ? "livestock"
        : "all";
  const has = (field: string) => active.some((mapping: any) => Number(mapping?.[field] ?? 0) === 1);
  const cropTypeNames = [...new Set<string>(active
    .filter((mapping: any) => ["crop", "all"].includes(String(mapping?.module ?? "").toLowerCase()) && String(mapping?.scope_type ?? "").toLowerCase() === "crop_type" && mapping?.scope_value)
    .map((mapping: any) => String(mapping.scope_value)))];
  const livestockProductNames = [...new Set<string>(active
    .filter((mapping: any) => ["livestock", "all"].includes(String(mapping?.module ?? "").toLowerCase()) && String(mapping?.scope_type ?? "").toLowerCase() === "livestock_product" && mapping?.scope_value)
    .map((mapping: any) => String(mapping.scope_value)))];
  // Experts, Team Leaders and Directors are plan owners in the approved
  // workflow. Access Mapping restricts their organization/module/data scope;
  // approval and review rights remain controlled separately.
  const canWrite = isPlanningRecordOwnerRole(roles) ||
    has("can_create_annual_plan") ||
    has("can_divide_monthly_plan") ||
    has("can_update_achievement");
  return {
    module,
    canWrite,
    reportOnly: !canWrite,
    canReview: has("can_comment") || has("can_approve"),
    cropTypeNames,
    livestockProductNames,
  };
}

function normalizePhone(phone: unknown) {
  return String(phone ?? "").replace(/\s+/g, "").trim();
}

export function isPresidentPlanningReviewer(user: any, roles: string[] = []) {
  return PRESIDENT_REVIEWER_PHONES.has(normalizePhone(user?.phone)) || hasValueChainManagerName(user, roles);
}

export function getPlanningAccessScope(user: any, roles: string[] = []): PlanningAccessScope {
  if (isSuperAdmin(roles)) {
    return { module: "all", canWrite: true, reportOnly: false, canReview: true, cropTypeNames: [], livestockProductNames: [] };
  }

  if (isPresidentPlanningReviewer(user, roles)) {
    return { module: "all", canWrite: false, reportOnly: true, canReview: true, cropTypeNames: [], livestockProductNames: [] };
  }

  const dynamicScope = dynamicPlanningScope(user, roles);
  if (dynamicScope) return dynamicScope;

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

  if (isPresidentPlanningReviewer(user, roles)) {
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
    const rows = await query<any[]>("SELECT id, name FROM crop_types WHERE id = ? AND is_active = 1 LIMIT 1", [data.crop_type_id]);
    if (!scopeContains(scope.cropTypeNames, rows[0])) {
      return `You can only create records for: ${scope.cropTypeNames.join(", ")}.`;
    }
  }

  if (data.module_type === "livestock" && scope.livestockProductNames.length) {
    const rows = await query<any[]>("SELECT id, name FROM livestock_products WHERE id = ? AND is_active = 1 LIMIT 1", [data.livestock_product_id]);
    if (!scopeContains(scope.livestockProductNames, rows[0])) {
      return `You can only create records for: ${scope.livestockProductNames.join(", ")}.`;
    }
  }

  return null;
}

export function canReviewPlanningRecords(user: any, roles: string[] = []) {
  return isSuperAdmin(roles) || getPlanningAccessScope(user, roles).canReview;
}
