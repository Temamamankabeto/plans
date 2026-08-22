export type PlanningModuleAccess = "crop" | "livestock" | "none" | "all";

export type PlanningActionAccess = {
  module: PlanningModuleAccess;
  canCreateAnnualPlan: boolean;
  canDivideMonthlyPlan: boolean;
  canUpdateMonthlyAchievement: boolean;
  canViewReports: boolean;
  cropTypeNames: string[];
  livestockProductNames: string[];
};

export const defaultPlanningActionAccess: PlanningActionAccess = {
  module: "none",
  canCreateAnnualPlan: false,
  canDivideMonthlyPlan: false,
  canUpdateMonthlyAchievement: false,
  canViewReports: false,
  cropTypeNames: [],
  livestockProductNames: [],
};

const agricultureAccessByPhone: Record<string, PlanningActionAccess> = {
  "251900000001": {
    module: "all",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: [],
  },

  "251900000101": {
    module: "crop",
    canCreateAnnualPlan: false,
    canDivideMonthlyPlan: false,
    canUpdateMonthlyAchievement: false,
    canViewReports: true,
    cropTypeNames: ["Cash Crops"],
    livestockProductNames: [],
  },
  "251900000102": {
    module: "crop",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: ["Cash Crops"],
    livestockProductNames: [],
  },
  "251900000103": {
    module: "crop",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: ["Spice Crops"],
    livestockProductNames: [],
  },
  "251900000104": {
    module: "crop",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: ["Fruit Crops"],
    livestockProductNames: [],
  },
  "251900000105": {
    module: "crop",
    canCreateAnnualPlan: false,
    canDivideMonthlyPlan: false,
    canUpdateMonthlyAchievement: false,
    canViewReports: true,
    cropTypeNames: ["Cereal Crops", "Pulse Crops", "Oil Seed Crops", "Vegetable Crops"],
    livestockProductNames: [],
  },
  "251900000106": {
    module: "crop",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: ["Cereal Crops"],
    livestockProductNames: [],
  },
  "251900000107": {
    module: "crop",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: ["Pulse Crops"],
    livestockProductNames: [],
  },
  "251900000108": {
    module: "crop",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: ["Oil Seed Crops"],
    livestockProductNames: [],
  },
  "251900000109": {
    module: "crop",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: ["Vegetable Crops"],
    livestockProductNames: [],
  },

  "251900000110": {
    module: "livestock",
    canCreateAnnualPlan: false,
    canDivideMonthlyPlan: false,
    canUpdateMonthlyAchievement: false,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: ["Live Animals and Meat", "Dairy", "Poultry and Fish", "Animal Feed and Nutrition", "Apiculture and Honey"],
  },
  "251900000111": {
    module: "livestock",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: ["Live Animals and Meat"],
  },
  "251900000112": {
    module: "livestock",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: ["Dairy"],
  },
  "251900000113": {
    module: "livestock",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: ["Poultry and Fish"],
  },
  "251900000114": {
    module: "livestock",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: ["Apiculture and Honey"],
  },
  "251900000115": {
    module: "livestock",
    canCreateAnnualPlan: true,
    canDivideMonthlyPlan: true,
    canUpdateMonthlyAchievement: true,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: ["Animal Feed and Nutrition"],
  },

  "251900000116": {
    module: "none",
    canCreateAnnualPlan: false,
    canDivideMonthlyPlan: false,
    canUpdateMonthlyAchievement: false,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: [],
  },
  "251900000117": {
    module: "none",
    canCreateAnnualPlan: false,
    canDivideMonthlyPlan: false,
    canUpdateMonthlyAchievement: false,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: [],
  },
  "251900000118": {
    module: "none",
    canCreateAnnualPlan: false,
    canDivideMonthlyPlan: false,
    canUpdateMonthlyAchievement: false,
    canViewReports: true,
    cropTypeNames: [],
    livestockProductNames: [],
  },
};

export function normalizePhone(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export function getPlanningActionAccessByPhone(phone?: string | null): PlanningActionAccess {
  return agricultureAccessByPhone[normalizePhone(phone)] ?? defaultPlanningActionAccess;
}

export function isAgriculturePlanningUser(phone?: string | null) {
  return Boolean(agricultureAccessByPhone[normalizePhone(phone)]);
}
