"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SplitSquareHorizontal,
  Target,
  Trash2,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { validatePlanningRecordInput } from "@/lib/schemas/planning-record.schema";
import { authService, type AuthUser } from "@/services/auth/auth.service";
import type {
  PlanningModuleType,
  PlanningRecordFormInput,
  PlanningRecordItem,
  PlanningSettings,
} from "@/types/location/planning-record.type";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  };
};

type OptionItem = {
  id: number;
  name: string;
  crop_type_id?: number;
  livestock_product_id?: number;
};
type WorkflowHistoryItem = {
  id: number;
  target: WorkflowTarget;
  action: string;
  from_status: string;
  to_status: string;
  comment?: string | null;
  acted_by_name: string;
  acted_as: string;
  created_at: string;
};
type EvidenceItem = {
  id: number;
  target: WorkflowTarget;
  original_name: string;
  download_url: string;
  uploaded_by_name: string;
  created_at: string;
};

type ModalMode = "annual" | "monthly-plan" | "achievement";
type WorkflowTarget = "plan" | "achievement";
type WorkflowAction = "verify" | "approve" | "final_approve" | "return" | "reject";
type ClientWorkflowRole = "expert" | "team_leader" | "director" | "ocdu_director" | "ocdu_manager" | "super_admin" | "none";

const ETHIOPIAN_MONTHS = [
  [1, "Fulbaana"],
  [2, "Onkololeessa"],
  [3, "Sadaasa"],
  [4, "Mudde"],
  [5, "Amajjii"],
  [6, "Guraandhala"],
  [7, "Bitootessa"],
  [8, "Ebla"],
  [9, "Caamsaa"],
  [10, "Waxabajjii"],
  [11, "Adooleessa"],
  [12, "Hagayya"],
  [13, "Qaammee"],
] as const;

function getCurrentEthiopianFiscalYear() {
  const today = new Date();
  const gregorianYear = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  return String(gregorianYear - (month > 8 || (month === 8 && day >= 11) ? 7 : 8));
}

function getFiscalYears(baseYear = getCurrentEthiopianFiscalYear()) {
  const base = Number(baseYear);
  return Array.from({ length: 8 }, (_, index) => String(base - 2 + index));
}

const emptyForm: PlanningRecordFormInput = {
  module_type: "crop",
  record_type: "plan",
  period_type: "annual",
  crop_type_id: null,
  crop_id: null,
  specification: "",
  livestock_product_id: null,
  livestock_product_type_id: null,
  fiscal_year: getCurrentEthiopianFiscalYear(),
  month: null,
  plan_land_area: 0,
  plan_productivity: 0,
  plan_production: 0,
  achievement_land_area: 0,
  achievement_productivity: 0,
  achievement_production: 0,
  plan_population: 0,
  achievement_population: 0,
  status: "draft",
};

async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !body?.success) {
    throw new Error(body?.message || "Request failed");
  }

  return body;
}

function toNumberOrNull(value: string) {
  return value === "none" ? null : Number(value);
}

function n(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function calculateProduction(base: unknown, productivity: unknown) {
  return round(n(base) * n(productivity));
}

function formatNumber(value: unknown) {
  return n(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function statusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Awaiting Review",
    verified: "Verified by Team Leader",
    director_approved: "Approved by Director",
    accepted: "Final Approved",
    returned: "Returned",
    submitted_team_leader: "Submitted to Team Leader",
    verified_team_leader: "Verified by Team Leader",
    submitted_director: "Submitted to Director",
    rejected: "Rejected",
    approved_director: "Approved by Director",
    finally_approved: "Finally Approved by OCDU Director",
  };
  return labels[String(value ?? "draft")] ?? String(value ?? "draft").replace(/_/g, " ");
}

function clientWorkflowRole(user: AuthUser | null, roles: string[]): ClientWorkflowRole {
  const normalizeRole = (value: unknown) => String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const assignedRoles = [...roles, ...(user?.roles ?? []), user?.role]
    .map(normalizeRole)
    .filter(Boolean);
  const hasAssignedRole = (...names: string[]) =>
    assignedRoles.some((role) => names.includes(role));
  const organizationText = [
    user?.office?.name,
    user?.directorate?.name,
    user?.department?.name,
    user?.team?.name,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");

  if (hasAssignedRole("super_admin")) return "super_admin";
  if (
    hasAssignedRole("director") &&
    (organizationText.includes("president") || organizationText.includes("presedant") || organizationText.includes("presedent") || organizationText.includes("pirezidaant")) &&
    (organizationText.includes("ocdu") || (organizationText.includes("coordination") && organizationText.includes("delivery")))
  ) return "ocdu_director";
  if (
    hasAssignedRole("manager") &&
    (organizationText.includes("president") || organizationText.includes("presedant") || organizationText.includes("presedent") || organizationText.includes("pirezidaant")) &&
    (organizationText.includes("ocdu") || (organizationText.includes("coordination") && organizationText.includes("delivery")))
  ) return "ocdu_manager";
  if (hasAssignedRole("team_leader", "teamleader", "teamlead")) return "team_leader";
  if (hasAssignedRole("director")) return "director";
  if (hasAssignedRole("expert")) return "expert";
  return "none";
}

function recordWorkflowStatus(record: PlanningRecordItem, target: WorkflowTarget) {
  return target === "plan"
    ? record.plan_status ?? (record.status === "approved" ? "accepted" : record.status === "rejected" ? "returned" : record.status)
    : record.achievement_status ?? "draft";
}

function recordSubmittedRole(record: PlanningRecordItem, target: WorkflowTarget) {
  return target === "plan" ? record.plan_submitted_by_role : record.achievement_submitted_by_role;
}

function monthName(month?: number | string | null) {
  return ETHIOPIAN_MONTHS.find(([id]) => id === Number(month))?.[1] ?? "-";
}

function planBaseValue(record: PlanningRecordItem) {
  return record.module_type === "crop" ? n(record.plan_land_area) : n(record.plan_population);
}

function achievementBaseValue(record: PlanningRecordItem) {
  return record.module_type === "crop"
    ? n(record.achievement_land_area)
    : n(record.achievement_population);
}

function getCropTypeName(record: PlanningRecordItem) {
  return (record as any).crop_type_name ?? "-";
}

function getCropName(record: PlanningRecordItem) {
  return (record as any).crop_name ?? "-";
}

function getLivestockProductName(record: PlanningRecordItem) {
  return (record as any).livestock_product_name ?? "-";
}

function getLivestockProductTypeName(record: PlanningRecordItem) {
  return (record as any).livestock_product_type_name ?? "-";
}

function buildPayload(form: PlanningRecordFormInput): PlanningRecordFormInput {
  const planBase = form.module_type === "crop" ? n(form.plan_land_area) : n(form.plan_population);
  const achievementBase = form.module_type === "crop"
    ? n(form.achievement_land_area)
    : n(form.achievement_population);

  const planProduction = calculateProduction(planBase, form.plan_productivity);
  const achievementProduction = form.period_type === "monthly"
    ? calculateProduction(achievementBase, form.achievement_productivity)
    : 0;

  return {
    ...form,
    record_type: "plan",
    plan_production: planProduction,
    achievement_production: achievementProduction,
    achievement_land_area: form.period_type === "monthly" ? form.achievement_land_area : 0,
    achievement_population: form.period_type === "monthly" ? form.achievement_population : 0,
  };
}

function recordToForm(
  record: PlanningRecordItem,
  overrides: Partial<PlanningRecordFormInput> = {},
): PlanningRecordFormInput {
  return {
    module_type: record.module_type,
    record_type: "plan",
    period_type: record.period_type,
    crop_type_id: record.crop_type_id ? Number(record.crop_type_id) : null,
    crop_id: record.crop_id ? Number(record.crop_id) : null,
    specification: record.specification ?? "",
    livestock_product_id: record.livestock_product_id ? Number(record.livestock_product_id) : null,
    livestock_product_type_id: record.livestock_product_type_id
      ? Number(record.livestock_product_type_id)
      : null,
    fiscal_year: record.fiscal_year,
    month: record.month ? Number(record.month) : null,
    plan_land_area: n(record.plan_land_area),
    plan_productivity: n(record.plan_productivity),
    plan_production: n(record.plan_production),
    achievement_land_area: n(record.achievement_land_area),
    achievement_productivity: n(record.achievement_productivity),
    achievement_production: n(record.achievement_production),
    plan_population: n(record.plan_population),
    achievement_population: n(record.achievement_population),
    achievement_remark: record.achievement_remark ?? "",
    status: record.status ?? "draft",
    ...overrides,
  };
}


type ClientPlanningAccessScope = {
  module: "crop" | "livestock" | "all" | "none";
  canWrite: boolean;
  canCreateAnnualPlan?: boolean;
  canDivideMonthlyPlan?: boolean;
  canUpdateAchievement?: boolean;
  canViewReport?: boolean;
  reportOnly: boolean;
  cropTypeNames: string[];
  livestockProductNames: string[];
};

const ALL_CROP_TYPE_NAMES = [
  "Cash Crops",
  "Spice Crops",
  "Fruit Crops",
  "Cereal Crops",
  "Pulse Crops",
  "Oil Seed Crops",
  "Vegetable Crops",
];

const ALL_LIVESTOCK_PRODUCT_NAMES = [
  "Live Animals and Meat",
  "Dairy",
  "Poultry and Fish",
  "Animal Feed and Nutrition",
  "Apiculture and Honey",
];

function norm(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
}

function scopeAllowsOption(assignedValues: string[], option: OptionItem) {
  if (!assignedValues.length) return true;
  const scopeKey = (value: unknown) => norm(value)
    .replace(/\b(crop|crops|type|types)\b/g, "")
    .replace(/\bspices\b/g, "spice")
    .replace(/\bseeds\b/g, "seed")
    .replace(/\s+/g, " ")
    .trim();
  const optionName = scopeKey(option.name);
  return assignedValues.some((value) => scopeKey(value) === optionName || Number(value) === Number(option.id));
}

function containsText(value: unknown, needle: string) {
  return norm(value).includes(norm(needle));
}

function getClientPlanningAccessScope(user: any, roles: string[] = []): ClientPlanningAccessScope {
  const resolvedRoles = [
    ...roles,
    ...(Array.isArray(user?.roles) ? user.roles : []),
    user?.role,
  ].filter(Boolean);
  const normalizedRoles = resolvedRoles.map((role) => norm(role).replace(/[^a-z0-9]+/g, "_"));
  const isPlanningRecordOwner = normalizedRoles.some((role) =>
    ["team_leader", "teamleader", "teamlead", "director"].includes(role),
  );
  const isExpertRole = normalizedRoles.includes("expert");
  const mappings = Array.isArray(user?.access_mappings) ? user.access_mappings : [];
  if (mappings.length) {
    const activeMappings = mappings.filter((mapping: any) => Number(mapping?.is_active ?? 1) === 1);
    const modules = [...new Set(activeMappings.map((mapping: any) => String(mapping?.module ?? "").toLowerCase()))];
    const module = modules.includes("all") || (modules.includes("crop") && modules.includes("livestock"))
      ? "all"
      : modules.includes("crop")
        ? "crop"
        : modules.includes("livestock")
          ? "livestock"
          : "none";
    const has = (field: string) => activeMappings.some((mapping: any) => Number(mapping?.[field] ?? 0) === 1);
    const cropTypeNames = [...new Set<string>(activeMappings
      .filter((mapping: any) => ["crop", "all"].includes(String(mapping?.module ?? "").toLowerCase()) && String(mapping?.scope_type ?? "").toLowerCase() === "crop_type" && mapping?.scope_value)
      .map((mapping: any) => String(mapping.scope_value)))];
    const livestockProductNames = [...new Set<string>(activeMappings
      .filter((mapping: any) => ["livestock", "all"].includes(String(mapping?.module ?? "").toLowerCase()) && String(mapping?.scope_type ?? "").toLowerCase() === "livestock_product" && mapping?.scope_value)
      .map((mapping: any) => String(mapping.scope_value)))];
    const canCreateAnnualPlan = !isExpertRole && (isPlanningRecordOwner || has("can_create_annual_plan"));
    const canDivideMonthlyPlan = !isExpertRole && (isPlanningRecordOwner || has("can_divide_monthly_plan"));
    const canUpdateAchievement = !isExpertRole && (isPlanningRecordOwner || has("can_update_achievement"));
    const canViewReport = has("can_view_report");
    const canWrite = canCreateAnnualPlan || canDivideMonthlyPlan || canUpdateAchievement;
    return { module, canWrite, canCreateAnnualPlan, canDivideMonthlyPlan, canUpdateAchievement, canViewReport, reportOnly: !canWrite, cropTypeNames, livestockProductNames };
  }

  if (normalizedRoles.includes("super_admin")) {
    return { module: "all", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: [] };
  }

  if (isExpertRole) {
    return {
      module: "all",
      canWrite: false,
      canCreateAnnualPlan: false,
      canDivideMonthlyPlan: false,
      canUpdateAchievement: false,
      canViewReport: true,
      reportOnly: true,
      cropTypeNames: [],
      livestockProductNames: [],
    };
  }

  const office = user?.office?.name ?? user?.office_name;
  const directorate = user?.directorate?.name ?? user?.directorate_name;
  const team = user?.team?.name ?? user?.team_name;
  const phone = String(user?.phone ?? "").replace(/\s+/g, "").trim();
  const name = user?.name;

  if (containsText(office, "President") && containsText(name, "Agricultural Value Chain")) {
    return {
      module: "all",
      canWrite: false,
      reportOnly: true,
      cropTypeNames: ALL_CROP_TYPE_NAMES,
      livestockProductNames: ALL_LIVESTOCK_PRODUCT_NAMES,
    };
  }

  const byPhone: Record<string, ClientPlanningAccessScope> = {
    "+251900000101": { module: "crop", canWrite: false, reportOnly: true, cropTypeNames: ["Cash Crops"], livestockProductNames: [] },
    "+251900000102": { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Cash Crops"], livestockProductNames: [] },
    "+251900000103": { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Spice Crops"], livestockProductNames: [] },
    "+251900000104": { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Fruit Crops"], livestockProductNames: [] },
    "+251900000105": { module: "crop", canWrite: false, reportOnly: true, cropTypeNames: ["Cereal Crops", "Pulse Crops", "Oil Seed Crops", "Vegetable Crops"], livestockProductNames: [] },
    "+251900000106": { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Cereal Crops"], livestockProductNames: [] },
    "+251900000107": { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Pulse Crops"], livestockProductNames: [] },
    "+251900000108": { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Oil Seed Crops"], livestockProductNames: [] },
    "+251900000109": { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Vegetable Crops"], livestockProductNames: [] },
    "+251900000110": { module: "livestock", canWrite: false, reportOnly: true, cropTypeNames: [], livestockProductNames: ALL_LIVESTOCK_PRODUCT_NAMES },
    "+251900000111": { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Live Animals and Meat"] },
    "+251900000112": { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Dairy"] },
    "+251900000113": { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Poultry and Fish"] },
    "+251900000114": { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Apiculture and Honey"] },
    "+251900000115": { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Animal Feed and Nutrition"] },
  };
  if (byPhone[phone]) return byPhone[phone];

  if (!containsText(office, "Agriculture")) {
    return { module: "none", canWrite: false, reportOnly: true, cropTypeNames: [], livestockProductNames: [] };
  }

  if (containsText(directorate, "Coffee") && containsText(directorate, "Spice")) {
    if (containsText(team, "Coffee")) return { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Cash Crops"], livestockProductNames: [] };
    return { module: "crop", canWrite: false, reportOnly: true, cropTypeNames: ["Cash Crops"], livestockProductNames: [] };
  }
  if (containsText(directorate, "Spice Development")) return { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Spice Crops"], livestockProductNames: [] };
  if (containsText(directorate, "Fruit Development")) return { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Fruit Crops"], livestockProductNames: [] };
  if (containsText(directorate, "Crop Development")) {
    if (containsText(team, "Cereal")) return { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Cereal Crops"], livestockProductNames: [] };
    if (containsText(team, "Pulse")) return { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Pulse Crops"], livestockProductNames: [] };
    if (containsText(team, "Oil Seed")) return { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Oil Seed Crops"], livestockProductNames: [] };
    if (containsText(team, "Vegetable")) return { module: "crop", canWrite: true, reportOnly: false, cropTypeNames: ["Vegetable Crops"], livestockProductNames: [] };
    return { module: "crop", canWrite: false, reportOnly: true, cropTypeNames: ["Cereal Crops", "Pulse Crops", "Oil Seed Crops", "Vegetable Crops"], livestockProductNames: [] };
  }
  if (containsText(directorate, "Livestock")) {
    if (containsText(team, "Live Animals") || containsText(team, "Meat")) return { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Live Animals and Meat"] };
    if (containsText(team, "Dairy")) return { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Dairy"] };
    if (containsText(team, "Poultry") || containsText(team, "Fish")) return { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Poultry and Fish"] };
    if (containsText(team, "Apiculture") || containsText(team, "Honey")) return { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Apiculture and Honey"] };
    if (containsText(team, "Animal Feed") || containsText(team, "Nutrition")) return { module: "livestock", canWrite: true, reportOnly: false, cropTypeNames: [], livestockProductNames: ["Animal Feed and Nutrition"] };
    return { module: "livestock", canWrite: false, reportOnly: true, cropTypeNames: [], livestockProductNames: ALL_LIVESTOCK_PRODUCT_NAMES };
  }

  return { module: "none", canWrite: false, reportOnly: true, cropTypeNames: [], livestockProductNames: [] };
}

export function PlanningRecordsPage() {
  const searchParams = useSearchParams();
  const activeModule: PlanningModuleType = searchParams.get("work") === "livestock" ? "livestock" : "crop";
  const planningModuleHref = (module: PlanningModuleType) => {
    const parameters = new URLSearchParams(searchParams.toString());
    parameters.set("work", module);
    return `/dashboard/planning-records?${parameters.toString()}`;
  };

  const [annualPlans, setAnnualPlans] = useState<PlanningRecordItem[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<PlanningRecordItem[]>([]);
  const [cropTypes, setCropTypes] = useState<OptionItem[]>([]);
  const [crops, setCrops] = useState<OptionItem[]>([]);
  const [livestockProducts, setLivestockProducts] = useState<OptionItem[]>([]);
  const [livestockProductTypes, setLivestockProductTypes] = useState<OptionItem[]>([]);
  const [settings, setSettings] = useState<PlanningSettings | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, last_page: 1, per_page: 10, current_page: 1 });
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("annual");
  const [selectedAnnual, setSelectedAnnual] = useState<PlanningRecordItem | null>(null);
  const [selectedMonthly, setSelectedMonthly] = useState<PlanningRecordItem | null>(null);
  const [form, setForm] = useState<PlanningRecordFormInput>({ ...emptyForm });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getStoredUser());
  const [workflowRecord, setWorkflowRecord] = useState<PlanningRecordItem | null>(null);
  const [workflowTarget, setWorkflowTarget] = useState<WorkflowTarget>("plan");
  const [workflowAction, setWorkflowAction] = useState<WorkflowAction>("verify");
  const [workflowComment, setWorkflowComment] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [selectedAchievementIds, setSelectedAchievementIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<"verify" | "approve" | "return" | "reject" | null>(null);
  const [bulkComment, setBulkComment] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [auditRecord, setAuditRecord] = useState<PlanningRecordItem | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryItem[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [removeRecord, setRemoveRecord] = useState<PlanningRecordItem | null>(null);
  const [cancelRecord, setCancelRecord] = useState<PlanningRecordItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [removeLoading, setRemoveLoading] = useState(false);

  const storedRoles = authService.getStoredRoles();
  const workflowRole = clientWorkflowRole(currentUser, storedRoles);
  const rawAccessScope = getClientPlanningAccessScope(currentUser, storedRoles) as ClientPlanningAccessScope;
  const resolvedRoleNames = [workflowRole, currentUser?.role, ...(currentUser?.roles ?? []), ...storedRoles]
    .map((role) => norm(role).replace(/[^a-z0-9]+/g, "_"));
  const isPlanningRecordOwner = resolvedRoleNames.some((role) =>
    ["team_leader", "teamleader", "teamlead", "director"].includes(role),
  );
  const isExpertRole = resolvedRoleNames.includes("expert");
  const accessScope: ClientPlanningAccessScope = {
    ...rawAccessScope,
    canWrite: !isExpertRole && (rawAccessScope.canWrite || isPlanningRecordOwner),
    canCreateAnnualPlan: !isExpertRole && (isPlanningRecordOwner || rawAccessScope.canCreateAnnualPlan || rawAccessScope.canWrite),
    canDivideMonthlyPlan: !isExpertRole && (isPlanningRecordOwner || rawAccessScope.canDivideMonthlyPlan || rawAccessScope.canWrite),
    canUpdateAchievement: !isExpertRole && (isPlanningRecordOwner || rawAccessScope.canUpdateAchievement || rawAccessScope.canWrite),
    canViewReport: rawAccessScope.canViewReport ?? true,
    reportOnly: isExpertRole ? true : (isPlanningRecordOwner ? false : rawAccessScope.reportOnly),
  };
  const canUseCurrentModule = accessScope.module === "all" || accessScope.module === activeModule;
  const canWriteCurrentModule = accessScope.canWrite && canUseCurrentModule;
  const canCreateAnnualPlan = accessScope.canCreateAnnualPlan && canUseCurrentModule;
  const canDivideMonthlyPlan = accessScope.canDivideMonthlyPlan && canUseCurrentModule;
  const canUpdateAchievement = accessScope.canUpdateAchievement && canUseCurrentModule;
  const fiscalYearOptions = settings?.fiscal_year
    ? [settings.fiscal_year]
    : getFiscalYears(getCurrentEthiopianFiscalYear());
  const availableCropTypes = useMemo(() => {
    if (accessScope.module === "none" || accessScope.module === "livestock") return [];
    if (!accessScope.cropTypeNames.length) return cropTypes;
    return cropTypes.filter((item) => scopeAllowsOption(accessScope.cropTypeNames, item));
  }, [cropTypes, accessScope.module, accessScope.cropTypeNames.join("|")]);

  const availableLivestockProducts = useMemo(() => {
    if (accessScope.module === "none" || accessScope.module === "crop") return [];
    if (!accessScope.livestockProductNames.length) return livestockProducts;
    return livestockProducts.filter((item) => scopeAllowsOption(accessScope.livestockProductNames, item));
  }, [livestockProducts, accessScope.module, accessScope.livestockProductNames.join("|")]);

  const defaultCropType = availableCropTypes[0];
  const defaultLivestockProduct = availableLivestockProducts[0];

  const filteredCrops = useMemo(
    () => crops.filter((item) => {
      const allowedTypeIds = new Set(availableCropTypes.map((type) => Number(type.id)));
      if (!allowedTypeIds.has(Number(item.crop_type_id))) return false;
      return !form.crop_type_id || Number(item.crop_type_id) === Number(form.crop_type_id);
    }),
    [crops, form.crop_type_id, availableCropTypes],
  );

  const filteredLivestockProductTypes = useMemo(
    () => livestockProductTypes.filter((item) => {
      const allowedProductIds = new Set(availableLivestockProducts.map((product) => Number(product.id)));
      if (!allowedProductIds.has(Number(item.livestock_product_id))) return false;
      return !form.livestock_product_id || Number(item.livestock_product_id) === Number(form.livestock_product_id);
    }),
    [livestockProductTypes, form.livestock_product_id, availableLivestockProducts],
  );

  useEffect(() => {
    if (!formOpen || modalMode !== "annual") return;
    if (activeModule === "crop" && availableCropTypes.length) {
      const cropType = availableCropTypes.find((item) => Number(item.id) === Number(form.crop_type_id)) ?? availableCropTypes[0];
      const cropsForType = crops.filter((item) => Number(item.crop_type_id) === Number(cropType.id));
      const crop = cropsForType.find((item) => Number(item.id) === Number(form.crop_id)) ?? cropsForType[0];
      if (Number(form.crop_type_id) !== Number(cropType.id) || Number(form.crop_id) !== Number(crop?.id)) {
        setForm((current) => ({ ...current, crop_type_id: cropType.id, crop_id: crop?.id ?? null }));
      }
    }
    if (activeModule === "livestock" && availableLivestockProducts.length) {
      const product = availableLivestockProducts.find((item) => Number(item.id) === Number(form.livestock_product_id)) ?? availableLivestockProducts[0];
      const productTypes = livestockProductTypes.filter((item) => Number(item.livestock_product_id) === Number(product.id));
      const productType = productTypes.find((item) => Number(item.id) === Number(form.livestock_product_type_id)) ?? productTypes[0];
      if (Number(form.livestock_product_id) !== Number(product.id) || Number(form.livestock_product_type_id) !== Number(productType?.id)) {
        setForm((current) => ({ ...current, livestock_product_id: product.id, livestock_product_type_id: productType?.id ?? null }));
      }
    }
  }, [activeModule, availableCropTypes, availableLivestockProducts, crops, form.crop_id, form.crop_type_id, form.livestock_product_id, form.livestock_product_type_id, formOpen, livestockProductTypes, modalMode]);

  const planOpen = Number(settings?.annual_plan_open ?? 1) === 1;
  const monthlyPlanOpen = Number(settings?.monthly_plan_open ?? 1) === 1;
  const achievementOpen = Number(settings?.monthly_achievement_open ?? 1) === 1;

  useEffect(() => {
    let cancelled = false;

    apiRequest<AuthUser>("/api/auth/me")
      .then((response) => {
        if (cancelled || !response.data) return;
        setCurrentUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
        localStorage.setItem("roles", JSON.stringify(response.data.roles ?? []));
        localStorage.setItem("permissions", JSON.stringify(response.data.permissions ?? []));
      })
      .catch(() => {
        // Keep the existing stored session when the refresh request is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyForSelectedAnnual = useMemo(() => {
    if (!selectedAnnual) return [];

    return monthlyPlans
      .filter((item) => Number(item.annual_plan_id) === Number(selectedAnnual.id))
      .sort((a, b) => Number(a.month ?? 0) - Number(b.month ?? 0));
  }, [monthlyPlans, selectedAnnual]);

  const monthlyTotals = useMemo(() => {
    return monthlyForSelectedAnnual.reduce(
      (total, row) => {
        total.planBase += planBaseValue(row);
        total.planProduction += n(row.plan_production);
        total.achievementBase += achievementBaseValue(row);
        total.achievementProduction += n(row.achievement_production);
        return total;
      },
      { planBase: 0, planProduction: 0, achievementBase: 0, achievementProduction: 0 },
    );
  }, [monthlyForSelectedAnnual]);
  const eligibleAchievementRows = monthlyForSelectedAnnual.filter((row) => {
    if (workflowRole === "team_leader") return canPerformWorkflowAction(row, "achievement", "verify");
    if (workflowRole === "director") return canPerformWorkflowAction(row, "achievement", "approve");
    if (workflowRole === "super_admin") {
      return canPerformWorkflowAction(row, "achievement", "verify") || canPerformWorkflowAction(row, "achievement", "approve");
    }
    return false;
  });
  const canBulkReviewAchievements = eligibleAchievementRows.length > 0;

  async function fetchOptions() {
    const results = await Promise.allSettled([
      apiRequest<OptionItem[]>("/api/admin/crop-types?all=1&status=active"),
      apiRequest<OptionItem[]>("/api/admin/crops?all=1&status=active"),
      apiRequest<OptionItem[]>("/api/admin/livestock-products?all=1&status=active"),
      apiRequest<OptionItem[]>("/api/admin/livestock-product-types?all=1&status=active"),
      apiRequest<PlanningSettings>("/api/admin/planning-settings"),
    ]);
    const [cropTypeList, cropList, livestockProductList, livestockProductTypeList, settingsData] = results;
    if (cropTypeList.status === "fulfilled") setCropTypes(cropTypeList.value.data);
    if (cropList.status === "fulfilled") setCrops(cropList.value.data);
    if (livestockProductList.status === "fulfilled") setLivestockProducts(livestockProductList.value.data);
    if (livestockProductTypeList.status === "fulfilled") setLivestockProductTypes(livestockProductTypeList.value.data);
    if (settingsData.status === "fulfilled") setSettings(settingsData.value.data);
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") {
      toast.error(failed.reason instanceof Error ? failed.reason.message : "Some planning options could not be loaded");
    }
  }

  async function fetchAnnualPlans(nextPage = page) {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        per_page: "10",
        search,
        module_type: activeModule,
        record_type: "plan",
        period_type: "annual",
      });

      const response = await apiRequest<PlanningRecordItem[]>(`/api/admin/planning-records?${params.toString()}`);

      setAnnualPlans(response.data);
      setMeta({
        total: Number(response.meta?.total ?? 0),
        last_page: Number(response.meta?.last_page ?? 1),
        per_page: Number(response.meta?.per_page ?? 10),
        current_page: Number(response.meta?.current_page ?? nextPage),
      });
      setPage(nextPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load annual plans");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMonthlyPlans() {
    const response = await apiRequest<PlanningRecordItem[]>(
      `/api/admin/planning-records?all=1&module_type=${activeModule}&record_type=plan&period_type=monthly`,
    );

    setMonthlyPlans(response.data);
  }

  async function refreshAll(nextPage = page) {
    await Promise.all([fetchAnnualPlans(nextPage), fetchMonthlyPlans()]);
  }

  useEffect(() => {
    fetchOptions().catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load page data"));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => refreshAll(1), 250);
    return () => window.clearTimeout(timeout);
  }, [search, activeModule]);

  function updateForm<K extends keyof PlanningRecordFormInput>(key: K, value: PlanningRecordFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setNumericField<K extends keyof PlanningRecordFormInput>(key: K, value: string) {
    updateForm(key, Number(value || 0) as PlanningRecordFormInput[K]);
  }

  function openAnnualCreate() {
    if (!canCreateAnnualPlan) {
      toast.error("You do not have permission to create an annual plan for this module.");
      return;
    }
    setSelectedAnnual(null);
    setSelectedMonthly(null);
    setModalMode("annual");
    setForm({
      ...emptyForm,
      module_type: activeModule,
      period_type: "annual",
      fiscal_year: settings?.fiscal_year ?? getCurrentEthiopianFiscalYear(),
      crop_type_id: activeModule === "crop" ? defaultCropType?.id ?? null : null,
      livestock_product_id: activeModule === "livestock" ? defaultLivestockProduct?.id ?? null : null,
      status: "draft",
    });
    setFormOpen(true);
  }

  function openAnnualEdit(record: PlanningRecordItem) {
    setSelectedAnnual(record);
    setSelectedMonthly(null);
    setModalMode("annual");
    setForm(recordToForm(record, { period_type: "annual", status: record.status ?? "draft" }));
    setFormOpen(true);
  }

  function openDetail(record: PlanningRecordItem) {
    setSelectedAnnual(record);
    setSelectedAchievementIds([]);
    setDetailOpen(true);
  }

  function openMonthlyCreate(annual: PlanningRecordItem) {
    if (!canDivideMonthlyPlan) {
      toast.error("You do not have permission to divide this annual plan.");
      return;
    }
    if (workflowRole !== "super_admin" && Number(annual.created_by) !== Number(currentUser?.id)) {
      toast.error("Only the Annual Plan owner can create its monthly distribution.");
      return;
    }
    if (!["draft", "returned", "rejected"].includes(recordWorkflowStatus(annual, "plan"))) {
      toast.error("Monthly distribution can be created only while the Annual Plan is editable.");
      return;
    }
    setSelectedAnnual(annual);
    setSelectedMonthly(null);
    setDetailOpen(false);
    setModalMode("monthly-plan");
    setForm(
      recordToForm(annual, {
        period_type: "monthly",
        month: null,
        plan_land_area: 0,
        plan_population: 0,
        plan_productivity: n(annual.plan_productivity),
        plan_production: 0,
        achievement_land_area: 0,
        achievement_population: 0,
        achievement_productivity: 0,
        achievement_production: 0,
        status: "draft",
      }),
    );
    setFormOpen(true);
  }

  function openMonthlyPlanEdit(monthly: PlanningRecordItem) {
    if (!canWriteCurrentModule || !["draft", "returned"].includes(recordWorkflowStatus(monthly, "plan"))) {
      toast.error("This monthly plan is read only.");
      return;
    }
    setSelectedMonthly(monthly);
    setDetailOpen(false);
    setModalMode("monthly-plan");
    setForm(recordToForm(monthly));
    setFormOpen(true);
  }

  function openAchievement(monthly: PlanningRecordItem) {
    if (
      !canWriteCurrentModule ||
      !["approved_director", "finally_approved"].includes(recordWorkflowStatus(monthly, "plan")) ||
      !["draft", "returned", "rejected"].includes(recordWorkflowStatus(monthly, "achievement"))
    ) {
      toast.error("This achievement is read only.");
      return;
    }
    setSelectedMonthly(monthly);
    setDetailOpen(false);
    setEvidenceFile(null);
    setModalMode("achievement");
    setForm(recordToForm(monthly));
    setFormOpen(true);
  }

  async function uploadEvidence(recordId: number, file: File) {
    const token = localStorage.getItem("token");
    const body = new FormData();
    body.append("target", "achievement");
    body.append("file", file);
    const response = await fetch(`/api/admin/planning-records/${recordId}/attachments`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) throw new Error(result?.message || "Evidence upload failed");
  }

  async function downloadEvidence(item: EvidenceItem) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(item.download_url, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || "Unable to download evidence");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.original_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to download evidence");
    }
  }

  function canPerformWorkflowAction(record: PlanningRecordItem, target: WorkflowTarget, action: WorkflowAction) {
    const status = recordWorkflowStatus(record, target);
    const submittedRole = recordSubmittedRole(record, target);
    if (workflowRole === "super_admin") return true;
    if (action === "verify") return workflowRole === "team_leader" && status === "submitted_team_leader" && submittedRole === "expert";
    if (action === "approve") {
      return workflowRole === "director" && (status === "verified_team_leader" || (status === "submitted_director" && submittedRole === "team_leader"));
    }
    if (action === "final_approve") return ["ocdu_director", "ocdu_manager"].includes(workflowRole) && target === "plan" && status === "approved_director";
    if (action === "return" || action === "reject") {
      return (
        (workflowRole === "team_leader" && status === "submitted_team_leader" && submittedRole === "expert") ||
        (workflowRole === "director" && (status === "verified_team_leader" || (status === "submitted_director" && submittedRole === "team_leader"))) ||
        (["ocdu_director", "ocdu_manager"].includes(workflowRole) && target === "plan" && status === "approved_director")
      );
    }
    return false;
  }

  function openWorkflowDecision(record: PlanningRecordItem, target: WorkflowTarget, action: WorkflowAction) {
    setDetailOpen(false);
    setWorkflowRecord(record);
    setWorkflowTarget(target);
    setWorkflowAction(action);
    setWorkflowComment("");
  }

  async function openEvidenceAndHistory(record: PlanningRecordItem) {
    setDetailOpen(false);
    setAuditRecord(record);
    setAuditLoading(true);
    try {
      const [history, evidence] = await Promise.all([
        apiRequest<WorkflowHistoryItem[]>(`/api/admin/planning-records/${record.id}/history`),
        apiRequest<EvidenceItem[]>(`/api/admin/planning-records/${record.id}/attachments`),
      ]);
      setWorkflowHistory(history.data);
      setEvidenceItems(evidence.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load evidence and approval history");
    } finally {
      setAuditLoading(false);
    }
  }

  async function submitWorkflowDecision() {
    if (!workflowRecord) return;
    if (["return", "reject"].includes(workflowAction) && !workflowComment.trim()) {
      toast.error(`${workflowAction === "reject" ? "Rejection" : "Return"} reason is required.`);
      return;
    }

    setWorkflowLoading(true);
    try {
      const response = await apiRequest<null>(`/api/admin/planning-records/${workflowRecord.id}/decision`, {
        method: "POST",
        body: JSON.stringify({
          target: workflowTarget,
          action: workflowAction,
          comment: workflowComment,
        }),
      });
      toast.success(response.message);
      setWorkflowRecord(null);
      setWorkflowComment("");
      await refreshAll(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete workflow action");
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function submitBulkDecision() {
    if (!bulkAction || !selectedAchievementIds.length) return;
    if (["return", "reject"].includes(bulkAction) && !bulkComment.trim()) {
      toast.error(`${bulkAction === "reject" ? "Rejection" : "Return"} reason is required.`);
      return;
    }

    setBulkLoading(true);
    try {
      const response = await apiRequest<{ processed: number[]; skipped: Array<{ id: number; reason: string }> }>(
        "/api/admin/planning-records/bulk-decision",
        {
          method: "POST",
          body: JSON.stringify({ ids: selectedAchievementIds, action: bulkAction, comment: bulkComment }),
        },
      );
      toast.success(response.message);
      if (response.data.skipped.length) {
        toast.warning(`${response.data.skipped.length} ineligible record(s) were skipped.`);
      }
      setSelectedAchievementIds([]);
      setBulkAction(null);
      setBulkComment("");
      await refreshAll(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to process selected achievements");
    } finally {
      setBulkLoading(false);
    }
  }

  function openBulkDecision(action: "verify" | "approve" | "return" | "reject") {
    setDetailOpen(false);
    setBulkComment("");
    setBulkAction(action);
  }


  async function deleteDraftPlan() {
    if (!removeRecord) return;
    setRemoveLoading(true);
    try {
      const response = await apiRequest<null>(`/api/admin/planning-records/${removeRecord.id}`, { method: "DELETE" });
      toast.success(response.message);
      setRemoveRecord(null);
      if (selectedAnnual?.id === removeRecord.id) setDetailOpen(false);
      await refreshAll(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete draft plan");
    } finally {
      setRemoveLoading(false);
    }
  }

  async function cancelApprovedPlan() {
    if (!cancelRecord) return;
    if (!cancelReason.trim()) {
      toast.error("Cancellation reason is required.");
      return;
    }
    setRemoveLoading(true);
    try {
      const response = await apiRequest<null>(`/api/admin/planning-records/${cancelRecord.id}`, {
        method: "PATCH",
        body: JSON.stringify({ target: "plan", action: "cancel", comment: cancelReason.trim() }),
      });
      toast.success(response.message);
      setCancelRecord(null);
      setCancelReason("");
      if (selectedAnnual?.id === cancelRecord.id) setDetailOpen(false);
      await refreshAll(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel approved plan");
    } finally {
      setRemoveLoading(false);
    }
  }

  async function submitMonthlyTarget(record: PlanningRecordItem, target: WorkflowTarget) {
    setSaving(true);
    try {
      const payload = buildPayload(recordToForm(record, target === "plan" ? { status: "submitted" } : undefined));
      const response = await apiRequest<PlanningRecordItem>(`/api/admin/planning-records/${record.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...payload,
          workflow_target: target,
          workflow_action: "submit",
        }),
      });
      toast.success(response.message);
      await refreshAll(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to submit ${target}`);
    } finally {
      setSaving(false);
    }
  }

  async function submitAnnualPlan(record: PlanningRecordItem) {
    setSaving(true);

    try {
      const response = await apiRequest<{ affected_record_ids: number[] }>(
        `/api/admin/planning-records/${record.id}/decision`,
        {
          method: "POST",
          body: JSON.stringify({ target: "plan", action: "submit" }),
        },
      );

      toast.success(response.message);
      await refreshAll(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit annual and monthly plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildPayload(form);
    const validation = validatePlanningRecordInput(payload);

    if (!validation.valid) {
      toast.error(Object.values(validation.errors)[0] ?? "Invalid record data");
      return;
    }

    setSaving(true);

    try {
      if (modalMode === "annual" && selectedAnnual) {
        await apiRequest<PlanningRecordItem>(`/api/admin/planning-records/${selectedAnnual.id}`, {
          method: "PUT",
          body: JSON.stringify(validation.data),
        });
        toast.success("Annual plan updated successfully");
      } else if ((modalMode === "monthly-plan" || modalMode === "achievement") && selectedMonthly) {
        await apiRequest<PlanningRecordItem>(`/api/admin/planning-records/${selectedMonthly.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...validation.data,
            workflow_target: modalMode === "achievement" ? "achievement" : "plan",
          }),
        });
        if (modalMode === "achievement" && evidenceFile) {
          await uploadEvidence(Number(selectedMonthly.id), evidenceFile);
        }
        toast.success(modalMode === "achievement" ? "Achievement saved successfully" : "Monthly plan updated successfully");
      } else {
        await apiRequest<PlanningRecordItem>("/api/admin/planning-records", {
          method: "POST",
          body: JSON.stringify(validation.data),
        });
        toast.success(modalMode === "annual" ? "Annual plan saved as draft" : "Monthly plan saved successfully");
      }

      setFormOpen(false);
      await refreshAll(modalMode === "annual" && !selectedAnnual ? 1 : page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save record");
    } finally {
      setSaving(false);
    }
  }

  function renderReadonlyIdentity() {
    if (form.module_type === "crop") {
      const cropType = cropTypes.find((item) => Number(item.id) === Number(form.crop_type_id));
      const crop = crops.find((item) => Number(item.id) === Number(form.crop_id));

      return (
        <div className="grid gap-4 md:grid-cols-3">
          <ReadonlyField label="Fiscal Year" value={`${form.fiscal_year} E.C.`} />
          <ReadonlyField label="Crop Type" value={cropType?.name ?? "-"} />
          <ReadonlyField label="Crop" value={crop?.name ?? "-"} />
        </div>
      );
    }

    const product = livestockProducts.find((item) => Number(item.id) === Number(form.livestock_product_id));
    const type = livestockProductTypes.find((item) => Number(item.id) === Number(form.livestock_product_type_id));

    return (
      <div className="grid gap-4 md:grid-cols-3">
        <ReadonlyField label="Fiscal Year" value={`${form.fiscal_year} E.C.`} />
        <ReadonlyField label="Livestock Product" value={product?.name ?? "-"} />
        <ReadonlyField label="Livestock Product Type" value={type?.name ?? "-"} />
      </div>
    );
  }

  function renderAnnualIdentityFields() {
    if (form.module_type === "crop") {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Crop Type</Label>
            <Select
              value={form.crop_type_id ? String(form.crop_type_id) : undefined}
              onValueChange={(value) => setForm((current) => ({ ...current, crop_type_id: toNumberOrNull(value), crop_id: null }))}
              disabled={modalMode !== "annual"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select crop type" />
              </SelectTrigger>
              <SelectContent>
                {availableCropTypes.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!availableCropTypes.length && (
              <p className="text-xs text-destructive">No active crop type matches this role's Access Mapping.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Crop</Label>
            <Select
              value={form.crop_id ? String(form.crop_id) : undefined}
              onValueChange={(value) => updateForm("crop_id", toNumberOrNull(value) as any)}
              disabled={modalMode !== "annual"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select crop" />
              </SelectTrigger>
              <SelectContent>
                {filteredCrops.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {Boolean(form.crop_type_id) && !filteredCrops.length && (
              <p className="text-xs text-destructive">No active crop is registered under the assigned crop type.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Specification</Label>
            <Input
              value={form.specification ?? ""}
              onChange={(event) => updateForm("specification", event.target.value as any)}
              disabled={modalMode !== "annual"}
              placeholder="Example: Red Coffee"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Livestock Product</Label>
          <Select
            value={form.livestock_product_id ? String(form.livestock_product_id) : "none"}
            onValueChange={(value) => setForm((current) => ({ ...current, livestock_product_id: toNumberOrNull(value), livestock_product_type_id: null }))}
            disabled={modalMode !== "annual"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {availableLivestockProducts.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Livestock Product Type</Label>
          <Select
            value={form.livestock_product_type_id ? String(form.livestock_product_type_id) : "none"}
            onValueChange={(value) => updateForm("livestock_product_type_id", toNumberOrNull(value) as any)}
            disabled={modalMode !== "annual"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select product type" />
            </SelectTrigger>
            <SelectContent>
              {filteredLivestockProductTypes.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  function renderPlanInputs(disabled: boolean) {
    const baseLabel = form.module_type === "crop" ? "Land Area" : "Number";
    const baseValue = form.module_type === "crop" ? form.plan_land_area : form.plan_population;
    const production = calculateProduction(baseValue, form.plan_productivity);

    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>{modalMode === "annual" ? `Annual ${baseLabel}` : `Monthly Plan ${baseLabel}`}</Label>
          <Input
            type="number"
            value={baseValue ?? 0}
            disabled={disabled}
            onChange={(event) => {
              if (form.module_type === "crop") {
                setNumericField("plan_land_area", event.target.value);
              } else {
                setNumericField("plan_population", event.target.value);
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>{modalMode === "annual" ? "Annual Productivity" : "Monthly Plan Productivity"}</Label>
          <Input
            type="number"
            value={form.plan_productivity ?? 0}
            disabled={disabled}
            onChange={(event) => setNumericField("plan_productivity", event.target.value)}
          />
        </div>

        <ReadonlyField
          label={modalMode === "annual" ? "Annual Production" : "Monthly Plan Production"}
          value={formatNumber(production)}
        />
      </div>
    );
  }

  function renderMonthlyPlanReadonlySection() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <ReadonlyField label={form.module_type === "crop" ? "Planned Land Area" : "Planned Number"} value={formatNumber(form.module_type === "crop" ? form.plan_land_area : form.plan_population)} />
          <ReadonlyField label="Planned Productivity" value={formatNumber(form.plan_productivity)} />
          <ReadonlyField label="Planned Production" value={formatNumber(calculateProduction(form.module_type === "crop" ? form.plan_land_area : form.plan_population, form.plan_productivity))} />
        </CardContent>
      </Card>
    );
  }

  function renderAchievementInputs() {
    const baseLabel = form.module_type === "crop" ? "Achieved Land Area" : "Achieved Number";
    const baseValue = form.module_type === "crop" ? form.achievement_land_area : form.achievement_population;
    const production = calculateProduction(baseValue, form.achievement_productivity);

    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>{baseLabel}</Label>
          <Input
            type="number"
            value={baseValue ?? 0}
            disabled={!achievementOpen || !canUpdateAchievement}
            onChange={(event) => {
              if (form.module_type === "crop") {
                setNumericField("achievement_land_area", event.target.value);
              } else {
                setNumericField("achievement_population", event.target.value);
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Achieved Productivity</Label>
          <Input
            type="number"
            value={form.achievement_productivity ?? 0}
            disabled={!achievementOpen || !canUpdateAchievement}
            onChange={(event) => setNumericField("achievement_productivity", event.target.value)}
          />
        </div>

        <ReadonlyField label="Achieved Production" value={formatNumber(production)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {activeModule === "crop" ? "Crop Annual Plans" : "Livestock Annual Plans"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {canWriteCurrentModule
              ? "Create annual plans, submit them, divide them into Ethiopian monthly plans, then insert achievement for each saved month."
              : "Report-only access. You can view submitted planning and achievement records for your assigned scope."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {accessScope.module === "all" && (
            <>
              <Button variant={activeModule === "crop" ? "default" : "outline"} size="sm" asChild>
                <Link href={planningModuleHref("crop")}>Agriculture</Link>
              </Button>
              <Button variant={activeModule === "livestock" ? "default" : "outline"} size="sm" asChild>
                <Link href={planningModuleHref("livestock")}>Livestock</Link>
              </Button>
            </>
          )}
          <Badge variant={planOpen ? "secondary" : "outline"}>Annual Plan {planOpen ? "Open" : "Closed"}</Badge>
          <Badge variant={monthlyPlanOpen ? "secondary" : "outline"}>Monthly Plan {monthlyPlanOpen ? "Open" : "Closed"}</Badge>
          <Badge variant={achievementOpen ? "secondary" : "outline"}>Achievement {achievementOpen ? "Open" : "Closed"}</Badge>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search annual plans..."
              className="pl-9"
            />
          </div>

          <Button variant="outline" asChild>
            <Link href={`/dashboard/planning-records/reports?work=${activeModule}`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              See Report
            </Link>
          </Button>

          {canCreateAnnualPlan && (
            <Button onClick={openAnnualCreate} disabled={!planOpen || !canUseCurrentModule}>
              <Plus className="mr-2 h-4 w-4" />
              Create Annual Plan
            </Button>
          )}

          <Button variant="outline" onClick={() => refreshAll(page)} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fiscal Year</TableHead>
                {activeModule === "crop" ? <TableHead>Crop Type</TableHead> : <TableHead>Livestock Product</TableHead>}
                {activeModule === "crop" ? <TableHead>Crop</TableHead> : <TableHead>Product Type</TableHead>}
                <TableHead className="text-right">Planned {activeModule === "crop" ? "Land Area" : "Number"}</TableHead>
                <TableHead className="text-right">Planned Productivity</TableHead>
                <TableHead className="text-right">Planned Production</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : annualPlans.length ? (
                annualPlans.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.fiscal_year} E.C.</TableCell>
                    <TableCell>{activeModule === "crop" ? getCropTypeName(record) : getLivestockProductName(record)}</TableCell>
                    <TableCell>{activeModule === "crop" ? getCropName(record) : getLivestockProductTypeName(record)}</TableCell>
                    <TableCell className="text-right">{formatNumber(planBaseValue(record))}</TableCell>
                    <TableCell className="text-right">{formatNumber(record.plan_productivity)}</TableCell>
                    <TableCell className="text-right">{formatNumber(calculateProduction(planBaseValue(record), record.plan_productivity))}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel(recordWorkflowStatus(record, "plan"))}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Open actions for ${record.fiscal_year} plan`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(record)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEvidenceAndHistory(record)}>
                            Approval History & Evidence
                          </DropdownMenuItem>
                          {canWriteCurrentModule &&
                            Number(record.created_by) === Number(currentUser?.id) &&
                            ["draft", "returned", "rejected"].includes(recordWorkflowStatus(record, "plan")) && (
                            <>
                              <DropdownMenuItem onClick={() => openAnnualEdit(record)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => submitAnnualPlan(record)}>
                                <Send className="mr-2 h-4 w-4" />
                                Submit
                              </DropdownMenuItem>
                            </>
                          )}
                          {canPerformWorkflowAction(record, "plan", "verify") && (
                            <DropdownMenuItem onClick={() => openWorkflowDecision(record, "plan", "verify")}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Verify Plan
                            </DropdownMenuItem>
                          )}
                          {canPerformWorkflowAction(record, "plan", "approve") && (
                            <DropdownMenuItem onClick={() => openWorkflowDecision(record, "plan", "approve")}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve Plan
                            </DropdownMenuItem>
                          )}
                          {canPerformWorkflowAction(record, "plan", "final_approve") && (
                            <DropdownMenuItem onClick={() => openWorkflowDecision(record, "plan", "final_approve")}>
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Final Approve
                            </DropdownMenuItem>
                          )}
                          {canPerformWorkflowAction(record, "plan", "return") && (
                            <DropdownMenuItem onClick={() => openWorkflowDecision(record, "plan", "return")}>
                              <Send className="mr-2 h-4 w-4 rotate-180" />
                              Return Plan
                            </DropdownMenuItem>
                          )}
                          {canPerformWorkflowAction(record, "plan", "reject") && (
                            <DropdownMenuItem onClick={() => openWorkflowDecision(record, "plan", "reject")}>
                              Reject Plan
                            </DropdownMenuItem>
                          )}
                          {Number(record.created_by) === Number(currentUser?.id) && recordWorkflowStatus(record, "plan") === "draft" && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setRemoveRecord(record)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Draft Plan
                            </DropdownMenuItem>
                          )}
                          {["super_admin", "ocdu_director", "ocdu_manager"].includes(workflowRole) && record.period_type === "annual" && recordWorkflowStatus(record, "plan") === "finally_approved" && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setCancelRecord(record); setCancelReason(""); }}>
                              <Ban className="mr-2 h-4 w-4" />
                              Cancel Approved Plan
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {canWriteCurrentModule && (
                            <DropdownMenuItem onClick={() => openMonthlyCreate(record)} disabled={!["draft", "returned", "rejected"].includes(recordWorkflowStatus(record, "plan")) || !monthlyPlanOpen}>
                            <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                            Divide into Months
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                    No annual plans found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>Total: {meta.total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refreshAll(page - 1)} disabled={loading || page <= 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => refreshAll(page + 1)} disabled={loading || page >= meta.last_page}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="flex h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none flex-col overflow-hidden p-4 sm:max-w-none sm:p-6">
          <DialogHeader className="shrink-0 border-b pb-3">
            <DialogTitle>Annual Plan Detail</DialogTitle>
          </DialogHeader>

          {selectedAnnual && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-1">
              <Card>
                <CardContent className="grid gap-4 p-4 md:grid-cols-4">
                  <ReadonlyPlain label="Fiscal Year" value={`${selectedAnnual.fiscal_year} E.C.`} />
                  <ReadonlyPlain label={activeModule === "crop" ? "Crop" : "Livestock Product"} value={activeModule === "crop" ? getCropName(selectedAnnual) : getLivestockProductName(selectedAnnual)} />
                  <ReadonlyPlain label="Specification / Type" value={activeModule === "crop" ? selectedAnnual.specification ?? "-" : getLivestockProductTypeName(selectedAnnual)} />
                  <ReadonlyPlain label="Status" value={statusLabel(recordWorkflowStatus(selectedAnnual, "plan"))} />
                  <ReadonlyPlain label={activeModule === "crop" ? "Land Area" : "Number"} value={formatNumber(planBaseValue(selectedAnnual))} />
                  <ReadonlyPlain label="Productivity" value={formatNumber(selectedAnnual.plan_productivity)} />
                  <ReadonlyPlain label="Production" value={formatNumber(calculateProduction(planBaseValue(selectedAnnual), selectedAnnual.plan_productivity))} />
                  <ReadonlyPlain label="Remaining" value={formatNumber(planBaseValue(selectedAnnual) - monthlyTotals.planBase)} />
                </CardContent>
              </Card>

              {canWriteCurrentModule && (
                <div className="flex justify-end">
                  <Button onClick={() => openMonthlyCreate(selectedAnnual)} disabled={!["draft", "returned", "rejected"].includes(recordWorkflowStatus(selectedAnnual, "plan")) || !monthlyPlanOpen}>
                    <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                    Divide Annual Plan into Monthly Plan
                  </Button>
                </div>
              )}

              {(
                canPerformWorkflowAction(selectedAnnual, "plan", "verify") ||
                canPerformWorkflowAction(selectedAnnual, "plan", "approve") ||
                canPerformWorkflowAction(selectedAnnual, "plan", "final_approve") ||
                canPerformWorkflowAction(selectedAnnual, "plan", "return") ||
                canPerformWorkflowAction(selectedAnnual, "plan", "reject")
              ) && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">Annual and Monthly Plan Package Review</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        This decision updates the Annual Plan and all of its monthly distributions together.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {canPerformWorkflowAction(selectedAnnual, "plan", "verify") && (
                        <Button size="sm" onClick={() => openWorkflowDecision(selectedAnnual, "plan", "verify")}>Verify Plan Package</Button>
                      )}
                      {canPerformWorkflowAction(selectedAnnual, "plan", "approve") && (
                        <Button size="sm" onClick={() => openWorkflowDecision(selectedAnnual, "plan", "approve")}>Approve Plan Package</Button>
                      )}
                      {canPerformWorkflowAction(selectedAnnual, "plan", "final_approve") && (
                        <Button size="sm" onClick={() => openWorkflowDecision(selectedAnnual, "plan", "final_approve")}>Final Approve Package</Button>
                      )}
                      {canPerformWorkflowAction(selectedAnnual, "plan", "return") && (
                        <Button size="sm" variant="outline" onClick={() => openWorkflowDecision(selectedAnnual, "plan", "return")}>Return Package</Button>
                      )}
                      {canPerformWorkflowAction(selectedAnnual, "plan", "reject") && (
                        <Button size="sm" variant="destructive" onClick={() => openWorkflowDecision(selectedAnnual, "plan", "reject")}>Reject Package</Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              )}

              <Card className="w-full overflow-hidden">
                {canBulkReviewAchievements && (
                  <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
                    <div>
                      <CardTitle className="text-base">Bulk Achievement Review</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedAchievementIds.length} monthly achievement(s) selected
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workflowRole === "team_leader" || workflowRole === "super_admin" ? (
                        <Button size="sm" disabled={!selectedAchievementIds.length} onClick={() => openBulkDecision("verify")}>
                          Verify Selected
                        </Button>
                      ) : null}
                      {workflowRole === "director" || workflowRole === "super_admin" ? (
                        <Button size="sm" disabled={!selectedAchievementIds.length} onClick={() => openBulkDecision("approve")}>
                          Approve Selected
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" disabled={!selectedAchievementIds.length} onClick={() => openBulkDecision("return")}>
                        Return Selected
                      </Button>
                      <Button size="sm" variant="destructive" disabled={!selectedAchievementIds.length} onClick={() => openBulkDecision("reject")}>
                        Reject Selected
                      </Button>
                    </div>
                  </CardHeader>
                )}
                <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[960px] table-fixed text-xs xl:min-w-0 xl:text-sm">
                  <TableHeader>
                    <TableRow>
                      {canBulkReviewAchievements && (
                        <TableHead className="w-10">
                          <Checkbox
                            aria-label="Select all eligible achievements"
                            checked={
                              eligibleAchievementRows.length > 0 &&
                              eligibleAchievementRows.every((row) => selectedAchievementIds.includes(Number(row.id)))
                            }
                            onCheckedChange={(checked) => {
                              const eligible = eligibleAchievementRows.map((row) => Number(row.id));
                              setSelectedAchievementIds(checked ? eligible : []);
                            }}
                          />
                        </TableHead>
                      )}
                      <TableHead className="w-24 whitespace-normal leading-tight">Month</TableHead>
                      <TableHead className="whitespace-normal text-right leading-tight">Planned {activeModule === "crop" ? "Land Area" : "Number"}</TableHead>
                      <TableHead className="whitespace-normal text-right leading-tight">Planned Productivity</TableHead>
                      <TableHead className="whitespace-normal text-right leading-tight">Planned Production</TableHead>
                      <TableHead className="whitespace-normal text-right leading-tight">Achieved {activeModule === "crop" ? "Land Area" : "Number"}</TableHead>
                      <TableHead className="whitespace-normal text-right leading-tight">Achieved Productivity</TableHead>
                      <TableHead className="whitespace-normal text-right leading-tight">Achieved Production</TableHead>
                      <TableHead className="w-36 whitespace-normal leading-tight">Plan Status</TableHead>
                      <TableHead className="w-36 whitespace-normal leading-tight">Achievement Status</TableHead>
                      <TableHead className="w-16 whitespace-normal text-right leading-tight">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyForSelectedAnnual.length ? (
                      monthlyForSelectedAnnual.map((row) => (
                        <TableRow key={row.id}>
                          {canBulkReviewAchievements && (
                            <TableCell>
                              <Checkbox
                                aria-label={`Select ${monthName(row.month)} achievement`}
                                disabled={!eligibleAchievementRows.some((item) => Number(item.id) === Number(row.id))}
                                checked={selectedAchievementIds.includes(Number(row.id))}
                                onCheckedChange={(checked) =>
                                  setSelectedAchievementIds((current) =>
                                    checked
                                      ? [...new Set([...current, Number(row.id)])]
                                      : current.filter((id) => id !== Number(row.id)),
                                  )
                                }
                              />
                            </TableCell>
                          )}
                          <TableCell>{monthName(row.month)}</TableCell>
                          <TableCell className="text-right">{formatNumber(planBaseValue(row))}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.plan_productivity)}</TableCell>
                          <TableCell className="text-right">{formatNumber(calculateProduction(planBaseValue(row), row.plan_productivity))}</TableCell>
                          <TableCell className="text-right">{formatNumber(achievementBaseValue(row))}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.achievement_productivity)}</TableCell>
                          <TableCell className="text-right">{formatNumber(calculateProduction(achievementBaseValue(row), row.achievement_productivity))}</TableCell>
                          <TableCell><Badge variant="outline">{statusLabel(recordWorkflowStatus(row, "plan"))}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{statusLabel(recordWorkflowStatus(row, "achievement"))}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label={`Open actions for ${monthName(row.month)}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="end" sideOffset={6} className="z-[100] w-64 space-y-1 p-1">
                                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => openEvidenceAndHistory(row)}>
                                  Approval History & Evidence
                                </Button>
                                {canWriteCurrentModule &&
                                  Number(row.created_by) === Number(currentUser?.id) &&
                                  ["draft", "returned", "rejected"].includes(recordWorkflowStatus(row, "plan")) && (
                                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => openMonthlyPlanEdit(row)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit Monthly Plan
                                    </Button>
                                  )}
                                {["approved_director", "finally_approved"].includes(recordWorkflowStatus(row, "plan")) &&
                                  canWriteCurrentModule &&
                                  Number(row.created_by) === Number(currentUser?.id) &&
                                  ["draft", "returned", "rejected"].includes(recordWorkflowStatus(row, "achievement")) && (
                                    <>
                                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => openAchievement(row)} disabled={!achievementOpen}>
                                        <Target className="mr-2 h-4 w-4" />
                                        Record Achievement
                                      </Button>
                                      {(achievementBaseValue(row) > 0 || n(row.achievement_production) > 0) && (
                                        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => submitMonthlyTarget(row, "achievement")}>
                                          <Send className="mr-2 h-4 w-4" />
                                          Submit Achievement
                                        </Button>
                                      )}
                                    </>
                                  )}
                                {canPerformWorkflowAction(row, "achievement", "verify") && (
                                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => openWorkflowDecision(row, "achievement", "verify")}>Verify Achievement</Button>
                                )}
                                {canPerformWorkflowAction(row, "achievement", "approve") && (
                                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => openWorkflowDecision(row, "achievement", "approve")}>Approve Achievement</Button>
                                )}
                                {canPerformWorkflowAction(row, "achievement", "return") && (
                                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => openWorkflowDecision(row, "achievement", "return")}>Return Achievement</Button>
                                )}
                                {canPerformWorkflowAction(row, "achievement", "reject") && (
                                  <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => openWorkflowDecision(row, "achievement", "reject")}>Reject Achievement</Button>
                                )}
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="h-24 text-center text-sm text-muted-foreground">
                          No monthly plans created yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalMode === "annual"
                ? "Create Annual Plan"
                : modalMode === "monthly-plan"
                  ? "Divide Annual Plan into Monthly Plan"
                  : "Insert Monthly Achievement"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {modalMode === "annual" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ethiopian Fiscal Year</Label>
                  <Select value={form.fiscal_year} onValueChange={(value) => updateForm("fiscal_year", value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fiscalYearOptions.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year} E.C.
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ReadonlyField label="Period" value="Annual" />
              </div>
            ) : (
              <div className="space-y-4">
                {renderReadonlyIdentity()}
                {form.module_type === "crop" && modalMode === "achievement" && <ReadonlyField label="Specification" value={form.specification || "-"} />}
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadonlyField label="Period" value="Monthly" />
                  {modalMode === "monthly-plan" ? (
                    <div className="space-y-2">
                      <Label>Ethiopian Month</Label>
                      <Select value={form.month ? String(form.month) : "none"} onValueChange={(value) => updateForm("month", toNumberOrNull(value) as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {ETHIOPIAN_MONTHS.map(([id, name]) => (
                            <SelectItem key={id} value={String(id)}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <ReadonlyField label="Ethiopian Month" value={monthName(form.month)} />
                  )}
                </div>
              </div>
            )}

            {modalMode === "annual" && renderAnnualIdentityFields()}

            {modalMode === "achievement" && renderMonthlyPlanReadonlySection()}

            {modalMode !== "achievement" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{modalMode === "annual" ? "Annual Plan" : "Monthly Plan"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderPlanInputs(
                    !canWriteCurrentModule ||
                      (modalMode === "annual" && !planOpen) ||
                      (modalMode === "monthly-plan" && !monthlyPlanOpen),
                  )}
                </CardContent>
              </Card>
            )}

            {modalMode === "achievement" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Achievement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderAchievementInputs()}
                  <div className="space-y-2">
                    <Label htmlFor="achievement-remark">Progress explanation or remark</Label>
                    <Textarea
                      id="achievement-remark"
                      value={form.achievement_remark ?? ""}
                      onChange={(event) => updateForm("achievement_remark", event.target.value)}
                      placeholder="Explain progress, gaps, corrective action, or other reporting details..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="achievement-evidence">Supporting evidence</Label>
                    <Input
                      id="achievement-evidence"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                      onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOCX, or XLSX; maximum 10 MB.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  saving ||
                  !canWriteCurrentModule ||
                  (modalMode === "annual" && !planOpen) ||
                  (modalMode === "monthly-plan" && !monthlyPlanOpen) ||
                  (modalMode === "achievement" && !achievementOpen)
                }
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!workflowRecord} onOpenChange={(open) => !open && setWorkflowRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {workflowAction === "verify"
                ? `Verify ${workflowTarget}`
                : workflowAction === "approve"
                  ? `Approve ${workflowTarget}`
                  : workflowAction === "final_approve"
                    ? `Final approve ${workflowTarget}`
                    : workflowAction === "reject"
                      ? `Reject ${workflowTarget}`
                      : `Return ${workflowTarget}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">
                {workflowRecord
                  ? workflowRecord.module_type === "crop"
                    ? getCropName(workflowRecord)
                    : getLivestockProductName(workflowRecord)
                  : "-"}
              </p>
              <p className="text-muted-foreground">
                Current status: {workflowRecord ? statusLabel(recordWorkflowStatus(workflowRecord, workflowTarget)) : "-"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-comment">
                {workflowAction === "return"
                  ? "Return reason"
                  : workflowAction === "reject"
                    ? "Rejection reason"
                    : "Comment (optional)"}
              </Label>
              <Textarea
                id="workflow-comment"
                value={workflowComment}
                onChange={(event) => setWorkflowComment(event.target.value)}
                placeholder={
                  workflowAction === "return"
                    ? "Explain what must be corrected..."
                    : workflowAction === "reject"
                      ? "Explain why this record is rejected..."
                      : "Add a review note..."
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setWorkflowRecord(null)} disabled={workflowLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={["return", "reject"].includes(workflowAction) ? "destructive" : "default"}
              onClick={submitWorkflowDecision}
              disabled={workflowLoading}
            >
              {workflowLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {workflowAction === "verify"
                ? "Verify"
                : workflowAction === "approve"
                  ? "Approve"
                  : workflowAction === "final_approve"
                    ? "Final Approve"
                    : workflowAction === "reject"
                      ? "Reject"
                      : "Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!bulkAction} onOpenChange={(open) => !open && setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction ? `${bulkAction[0].toUpperCase()}${bulkAction.slice(1)} Selected Achievements` : "Bulk Achievement Review"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedAchievementIds.length} selected monthly achievement(s). Ineligible records will be skipped and will not be changed.
            </p>
            <div className="space-y-2">
              <Label htmlFor="bulk-comment">
                {bulkAction && ["return", "reject"].includes(bulkAction) ? "Reason" : "Comment (optional)"}
              </Label>
              <Textarea
                id="bulk-comment"
                value={bulkComment}
                onChange={(event) => setBulkComment(event.target.value)}
                placeholder={bulkAction && ["return", "reject"].includes(bulkAction) ? "Enter the mandatory reason..." : "Add one comment to this bulk action..."}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkAction(null)} disabled={bulkLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={bulkAction && ["return", "reject"].includes(bulkAction) ? "destructive" : "default"}
              onClick={submitBulkDecision}
              disabled={bulkLoading || !selectedAchievementIds.length}
            >
              {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply to Eligible Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeRecord} onOpenChange={(open) => !open && setRemoveRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Draft Plan?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes the draft plan. Submitted or approved plans cannot be deleted. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveRecord(null)} disabled={removeLoading}>Keep Plan</Button>
            <Button variant="destructive" onClick={deleteDraftPlan} disabled={removeLoading}>
              {removeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete Draft Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelRecord} onOpenChange={(open) => { if (!open) { setCancelRecord(null); setCancelReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Finally Approved Plan?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The plan and its monthly distributions will be preserved for audit history but marked cancelled and removed from active approved planning.
            </p>
            <div className="space-y-2">
              <Label htmlFor="plan-cancel-reason">Cancellation reason</Label>
              <Textarea id="plan-cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Explain why this approved plan is being cancelled..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelRecord(null); setCancelReason(""); }} disabled={removeLoading}>Keep Plan</Button>
            <Button variant="destructive" onClick={cancelApprovedPlan} disabled={removeLoading || !cancelReason.trim()}>
              {removeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancel Approved Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!auditRecord} onOpenChange={(open) => !open && setAuditRecord(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approval History & Supporting Evidence</DialogTitle>
          </DialogHeader>
          {auditLoading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <div className="space-y-5">
              <Card>
                <CardHeader><CardTitle className="text-base">Supporting Evidence</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {evidenceItems.length ? evidenceItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div>
                        <p className="font-medium">{item.original_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.uploaded_by_name} · {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => downloadEvidence(item)}>
                        Download
                      </Button>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No supporting evidence uploaded.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Complete Approval History</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {workflowHistory.length ? workflowHistory.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{item.action.replace(/_/g, " ")}</p>
                        <Badge variant="outline">
                          {statusLabel(item.from_status)} → {statusLabel(item.to_status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.acted_by_name} ({item.acted_as.replace(/_/g, " ")}) · {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.comment ? <p className="mt-2 text-sm">{item.comment}</p> : null}
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No workflow history recorded.</p>}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={String(value)} disabled />
    </div>
  );
}

function ReadonlyPlain({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
