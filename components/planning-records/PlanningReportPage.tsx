"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, MessageSquare, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authService } from "@/services/auth/auth.service";
import type { PlanningModuleType, PlanningRecordItem } from "@/types/location/planning-record.type";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type MetricSet = {
  base: number;
  productivity: number;
  production: number;
};

type ReportRow = {
  id: number;
  planningRecordId: number;
  groupKey: string;
  groupTitle: string;
  itemTitle: string;
  directorateName: string;
  teamName: string;
  lastYear: MetricSet;
  thisYearPlan: MetricSet;
  thisMonthPlan: MetricSet;
  thisMonthAchievement: MetricSet;
  thisMonthPercent: MetricSet;
  upToPlan: MetricSet;
  upToAchievement: MetricSet;
  upToPercent: MetricSet;
  yearlyPercent: MetricSet;
  status?: string | null;
  submittedRole?: string | null;
  approvalComment?: string | null;
};

type ReportGroup = {
  index: number;
  groupTitle: string;
  rows: ReportRow[];
};

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

function normalizeText(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function reportWorkflowRole(user: any) {
  const searchable = [
    user?.name,
    user?.email,
    user?.role,
    ...(user?.roles ?? []),
    user?.office?.name,
    user?.directorate?.name,
    user?.team?.name,
  ].map(normalizeText).join(" ");
  if (searchable.includes("super admin")) return "super_admin";
  if (
    searchable.includes("director") &&
    (searchable.includes("president") || searchable.includes("pirezidaant")) &&
    (searchable.includes("ocdu") || (searchable.includes("coordination") && searchable.includes("delivery")))
  ) return "ocdu_director";
  if (searchable.includes("team leader")) return "team_leader";
  if (searchable.includes("director")) return "director";
  return "none";
}

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

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

async function apiRequest<T>(url: string): Promise<ApiResponse<T>> {
  const token = getToken();
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !body?.success) {
    throw new Error(body?.message || "Request failed");
  }

  return body;
}

async function apiDecision<T>(url: string, payload: Record<string, unknown>): Promise<ApiResponse<T>> {
  const token = getToken();
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !body?.success) {
    throw new Error(body?.message || "Request failed");
  }

  return body;
}

function n(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function percent(actual: number, target: number) {
  if (!target) return 0;
  return round((actual / target) * 100);
}

function formatNumber(value: unknown, unit = "") {
  const formatted = n(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatPercent(value: unknown) {
  return `${formatNumber(value)}%`;
}

function getBase(record: PlanningRecordItem, mode: "plan" | "achievement") {
  if (record.module_type === "crop") {
    return mode === "plan" ? n(record.plan_land_area) : n(record.achievement_land_area);
  }

  return mode === "plan" ? n(record.plan_population) : n(record.achievement_population);
}

function getProduction(record: PlanningRecordItem, mode: "plan" | "achievement") {
  const stored = mode === "plan" ? n(record.plan_production) : n(record.achievement_production);
  if (stored) return stored;

  const productivity = mode === "plan" ? n(record.plan_productivity) : n(record.achievement_productivity);
  return round(getBase(record, mode) * productivity);
}

function metricFromRecord(record?: PlanningRecordItem, mode: "plan" | "achievement" = "plan"): MetricSet {
  if (!record) return { base: 0, productivity: 0, production: 0 };

  const base = getBase(record, mode);
  const production = getProduction(record, mode);

  return {
    base,
    production,
    productivity: base > 0 ? round(production / base) : 0,
  };
}

function sumMetric(records: PlanningRecordItem[], mode: "plan" | "achievement"): MetricSet {
  const base = records.reduce((total, row) => total + getBase(row, mode), 0);
  const production = records.reduce((total, row) => total + getProduction(row, mode), 0);

  return {
    base,
    production,
    productivity: base > 0 ? round(production / base) : 0,
  };
}

function percentSet(actual: MetricSet, target: MetricSet): MetricSet {
  return {
    base: percent(actual.base, target.base),
    productivity: percent(actual.productivity, target.productivity),
    production: percent(actual.production, target.production),
  };
}

function getGroupTitle(record: PlanningRecordItem) {
  return record.module_type === "crop"
    ? record.crop_type_name || "Uncategorized Crop Type"
    : record.livestock_product_name || "Uncategorized Livestock Product";
}

function getItemTitle(record: PlanningRecordItem) {
  if (record.module_type === "crop") {
    return [record.crop_name, record.specification].filter(Boolean).join(" - ") || "Crop";
  }

  return record.livestock_product_type_name || "Livestock Product Type";
}

function recordsMatchAnnual(monthly: PlanningRecordItem, annual: PlanningRecordItem) {
  if (monthly.annual_plan_id && Number(monthly.annual_plan_id) === Number(annual.id)) return true;

  if (monthly.module_type !== annual.module_type) return false;
  if (Number(monthly.office_id) !== Number(annual.office_id)) return false;
  if (Number(monthly.directorate_id ?? 0) !== Number(annual.directorate_id ?? 0)) return false;
  if (Number(monthly.team_id ?? 0) !== Number(annual.team_id ?? 0)) return false;

  if (annual.module_type === "crop") {
    return (
      Number(monthly.crop_type_id ?? 0) === Number(annual.crop_type_id ?? 0) &&
      Number(monthly.crop_id ?? 0) === Number(annual.crop_id ?? 0) &&
      String(monthly.specification ?? "").trim().toLowerCase() === String(annual.specification ?? "").trim().toLowerCase()
    );
  }

  return (
    Number(monthly.livestock_product_id ?? 0) === Number(annual.livestock_product_id ?? 0) &&
    Number(monthly.livestock_product_type_id ?? 0) === Number(annual.livestock_product_type_id ?? 0)
  );
}

function buildRows(records: PlanningRecordItem[], moduleType: PlanningModuleType, fiscalYear: string, month: number): ReportRow[] {
  const previousYear = String(Number(fiscalYear) - 1);
  const annualPlans = records.filter(
    (row) => row.module_type === moduleType && row.period_type === "annual" && String(row.fiscal_year) === fiscalYear,
  );
  const monthlyRows = records.filter(
    (row) => row.module_type === moduleType && row.period_type === "monthly" && String(row.fiscal_year) === fiscalYear,
  );
  const previousMonthlyRows = records.filter(
    (row) => row.module_type === moduleType && row.period_type === "monthly" && String(row.fiscal_year) === previousYear,
  );

  return annualPlans
    .map((annual) => {
      const monthlyForAnnual = monthlyRows.filter((row) => recordsMatchAnnual(row, annual));
      const previousForAnnual = previousMonthlyRows.filter((row) => recordsMatchAnnual(row, annual));
      const monthRow = monthlyForAnnual.find((row) => Number(row.month) === Number(month));
      const upToRows = monthlyForAnnual.filter((row) => Number(row.month ?? 0) <= Number(month));

      const lastYear = sumMetric(previousForAnnual, "achievement");
      const thisYearPlan = metricFromRecord(annual, "plan");
      const thisMonthPlan = metricFromRecord(monthRow, "plan");
      const thisMonthAchievement = metricFromRecord(monthRow, "achievement");
      const upToPlan = sumMetric(upToRows, "plan");
      const upToAchievement = sumMetric(upToRows, "achievement");
      const groupTitle = getGroupTitle(annual);

      return {
        id: Number(annual.id),
        planningRecordId: Number(annual.id),
        groupKey: groupTitle.toLowerCase(),
        groupTitle,
        itemTitle: getItemTitle(annual),
        directorateName: annual.directorate_name || "-",
        teamName: annual.team_name || "-",
        lastYear,
        thisYearPlan,
        thisMonthPlan,
        thisMonthAchievement,
        thisMonthPercent: percentSet(thisMonthAchievement, thisMonthPlan),
        upToPlan,
        upToAchievement,
        upToPercent: percentSet(upToAchievement, upToPlan),
        yearlyPercent: percentSet(upToAchievement, thisYearPlan),
        status: annual.plan_status ?? annual.status,
        submittedRole: annual.plan_submitted_by_role ?? null,
        approvalComment: annual.plan_comment ?? annual.approval_comment ?? null,
      };
    })
    .sort((a, b) => a.groupTitle.localeCompare(b.groupTitle) || a.itemTitle.localeCompare(b.itemTitle));
}

function groupRows(rows: ReportRow[]): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();

  for (const row of rows) {
    if (!groups.has(row.groupKey)) {
      groups.set(row.groupKey, {
        index: groups.size + 1,
        groupTitle: row.groupTitle,
        rows: [],
      });
    }

    groups.get(row.groupKey)?.rows.push(row);
  }

  return Array.from(groups.values());
}

function ReportMetricCells({ metric, percent: asPercent = false, units }: { metric: MetricSet; percent?: boolean; units: { base: string; productivity: string; production: string } }) {
  if (asPercent) {
    return (
      <>
        <td className="border border-slate-300 px-2 py-2 text-right">{formatPercent(metric.base)}</td>
        <td className="border border-slate-300 px-2 py-2 text-right">{formatPercent(metric.productivity)}</td>
        <td className="border border-slate-300 px-2 py-2 text-right">{formatPercent(metric.production)}</td>
      </>
    );
  }

  return (
    <>
      <td className="border border-slate-300 px-2 py-2 text-right">{formatNumber(metric.base, units.base)}</td>
      <td className="border border-slate-300 px-2 py-2 text-right">{formatNumber(metric.productivity, units.productivity)}</td>
      <td className="border border-slate-300 px-2 py-2 text-right">{formatNumber(metric.production, units.production)}</td>
    </>
  );
}

export function PlanningReportPage() {
  const searchParams = useSearchParams();
  const moduleType: PlanningModuleType = searchParams.get("work") === "livestock" ? "livestock" : "crop";
  const [records, setRecords] = useState<PlanningRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(getCurrentEthiopianFiscalYear());
  const [month, setMonth] = useState(1);
  const [reviewRecord, setReviewRecord] = useState<ReportRow | null>(null);
  const [reviewAction, setReviewAction] = useState<"comment" | "approve">("comment");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const storedUser = authService.getStoredUser();
  const fiscalYearOptions = getFiscalYears(fiscalYear);
  const rows = useMemo(() => buildRows(records, moduleType, fiscalYear, month), [records, moduleType, fiscalYear, month]);
  const groupedRows = useMemo(() => groupRows(rows), [rows]);
  const isCrop = moduleType === "crop";
  const baseLabel = isCrop ? "Land Area" : "Number";
  const units = isCrop
    ? { base: "Ha", productivity: "Qt/Ha", production: "Qt" }
    : { base: "Unit", productivity: "Unit", production: "Unit" };
  const title = isCrop ? "CROP REPORT" : "LIVESTOCK REPORT";
  const subtitle = isCrop
    ? "OROMIA AGRICULTURAL BUREAU CROP PLAN AND ACHIEVEMENT REPORT"
    : "OROMIA AGRICULTURAL BUREAU - LIVESTOCK PLAN AND ACHIEVEMENT REPORT";
  const reviewerRole = reportWorkflowRole(storedUser);
  const canReview = reviewerRole !== "none";
  const approvalLabel =
    reviewerRole === "team_leader"
      ? "Verify"
      : reviewerRole === "director"
        ? "Approve"
        : "Final Approve";
  const dataColSpan = canReview ? 34 : 33;

  async function loadRecords() {
    setLoading(true);

    try {
      const response = await apiRequest<PlanningRecordItem[]>(`/api/admin/planning-records?all=1&module_type=${moduleType}`);
      setRecords(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [moduleType]);

  function openReview(row: ReportRow, action: "comment" | "approve") {
    setReviewRecord(row);
    setReviewAction(action);
    setReviewComment(row.approvalComment ?? "");
  }

  function canAdvance(row: ReportRow) {
    if (reviewerRole === "super_admin") return true;
    if (reviewerRole === "team_leader") return row.status === "submitted_team_leader" && row.submittedRole === "expert";
    if (reviewerRole === "director") {
      return row.status === "verified_team_leader" || (row.status === "submitted_director" && row.submittedRole === "team_leader");
    }
    return reviewerRole === "ocdu_director" && row.status === "approved_director";
  }

  async function submitReview() {
    if (!reviewRecord) return;
    setReviewLoading(true);

    try {
      const workflowAction =
        reviewAction === "comment"
          ? "comment"
          : reviewerRole === "team_leader"
            ? "verify"
            : reviewerRole === "director"
              ? "approve"
              : "final_approve";
      await apiDecision(`/api/admin/planning-records/${reviewRecord.planningRecordId}/decision`, {
        target: "plan",
        action: workflowAction,
        comment: reviewComment,
      });
      toast.success(reviewAction === "approve" ? "Record accepted successfully." : "Comment saved successfully.");
      setReviewRecord(null);
      setReviewComment("");
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save review");
    } finally {
      setReviewLoading(false);
    }
  }

  function exportCsv() {
    const header = [
      "T/L",
      isCrop ? "Crop Type" : "Livestock Product",
      isCrop ? "Crop" : "Product Type",
      "Directorate",
      "Team",
      `Last Year Achievement ${baseLabel}`,
      "Last Year Achievement Productivity",
      "Last Year Achievement Production",
      `This Year Plan ${baseLabel}`,
      "This Year Plan Productivity",
      "This Year Plan Production",
      `This Month Plan ${baseLabel}`,
      "This Month Plan Productivity",
      "This Month Plan Production",
      `This Month Achievement ${baseLabel}`,
      "This Month Achievement Productivity",
      "This Month Achievement Production",
      `% This Month ${baseLabel}`,
      "% This Month Productivity",
      "% This Month Production",
      `Up To This Plan ${baseLabel}`,
      "Up To This Plan Productivity",
      "Up To This Plan Production",
      `Up To This Achievement ${baseLabel}`,
      "Up To This Achievement Productivity",
      "Up To This Achievement Production",
      `% Up To This ${baseLabel}`,
      "% Up To This Productivity",
      "% Up To This Production",
      `% Yearly ${baseLabel}`,
      "% Yearly Productivity",
      "% Yearly Production",
      "Status",
      "Comment",
    ];

    const body = groupedRows.flatMap((group) =>
      group.rows.map((row, rowIndex) => [
        rowIndex === 0 ? group.index : "",
        rowIndex === 0 ? group.groupTitle : "",
        row.itemTitle,
        row.directorateName,
        row.teamName,
        row.lastYear.base,
        row.lastYear.productivity,
        row.lastYear.production,
        row.thisYearPlan.base,
        row.thisYearPlan.productivity,
        row.thisYearPlan.production,
        row.thisMonthPlan.base,
        row.thisMonthPlan.productivity,
        row.thisMonthPlan.production,
        row.thisMonthAchievement.base,
        row.thisMonthAchievement.productivity,
        row.thisMonthAchievement.production,
        row.thisMonthPercent.base,
        row.thisMonthPercent.productivity,
        row.thisMonthPercent.production,
        row.upToPlan.base,
        row.upToPlan.productivity,
        row.upToPlan.production,
        row.upToAchievement.base,
        row.upToAchievement.productivity,
        row.upToAchievement.production,
        row.upToPercent.base,
        row.upToPercent.productivity,
        row.upToPercent.production,
        row.yearlyPercent.base,
        row.yearlyPercent.productivity,
        row.yearlyPercent.production,
        row.status ?? "",
        row.approvalComment ?? "",
      ]),
    );

    const csv = [header, ...body]
      .map((line) => line.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${moduleType}-plan-achievement-report-${fiscalYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={`/dashboard/planning-records?work=${moduleType}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Annual Plans
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="text-sm text-slate-500">Excel-style plan and achievement report by Ethiopian fiscal year and month.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label>Fiscal Year</Label>
            <Select value={fiscalYear} onValueChange={setFiscalYear}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fiscalYearOptions.map((year) => (
                  <SelectItem key={year} value={year}>{year} E.C.</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ethiopian Month</Label>
            <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ETHIOPIAN_MONTHS.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={loadRecords} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div>
            <h2 className="text-center text-lg font-bold uppercase tracking-wide text-slate-950">{title}</h2>
            <p className="mt-1 text-center text-sm font-semibold uppercase text-slate-700">{subtitle}</p>
            {storedUser?.office?.name && (
              <p className="mt-1 text-center text-xs text-slate-500">Office: {storedUser.office.name}</p>
            )}
          </div>

          <div className="hidden md:block">
            <Label className="text-xs">Select Year</Label>
            <Input readOnly value={`${fiscalYear} E.C.`} className="mt-1 h-9 w-32 bg-white" />
          </div>

          <div className="hidden md:block">
            <Label className="text-xs">Select Month</Label>
            <Input readOnly value={ETHIOPIAN_MONTHS.find(([id]) => id === month)?.[1] ?? "-"} className="mt-1 h-9 w-36 bg-white" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[2500px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-950">
                <th rowSpan={3} className="border border-slate-300 px-2 py-2 text-center">T/L</th>
                <th rowSpan={3} className="min-w-44 border border-slate-300 px-2 py-2 text-left">{isCrop ? "Crop Type" : "Livestock Product"}</th>
                <th rowSpan={3} className="min-w-44 border border-slate-300 px-2 py-2 text-left">{isCrop ? "Crop" : "Product Type"}</th>
                <th rowSpan={3} className="min-w-56 border border-slate-300 px-2 py-2 text-left">Directorate</th>
                <th rowSpan={3} className="min-w-44 border border-slate-300 px-2 py-2 text-left">Team</th>
                <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">Last Year Achievement</th>
                <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">This Year Plan</th>
                <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">This Month Plan</th>
                <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">This Month Achievement</th>
                <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">% This Month</th>
                <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">Up To This Plan</th>
                <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">Up To This Achievement</th>
                <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">% Up To This</th>
                <th colSpan={3} className="border border-slate-300 px-2 py-2 text-center">% Yearly</th>
                <th rowSpan={3} className="border border-slate-300 px-2 py-2 text-center">Status</th>
                {canReview && <th rowSpan={3} className="border border-slate-300 px-2 py-2 text-center print:hidden">Actions</th>}
              </tr>
              <tr className="bg-slate-50 text-slate-700">
                {Array.from({ length: 9 }).map((_, index) => (
                  <th key={index} colSpan={3} className="border border-slate-300 px-2 py-2 text-center">
                    {index === 0 ? `${baseLabel} / Productivity / Production` : "Indicators"}
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-50 text-slate-700">
                {Array.from({ length: 9 }).flatMap((_, group) => [
                  <th key={`${group}-base`} className="border border-slate-300 px-2 py-2 text-center">{baseLabel} ({units.base})</th>,
                  <th key={`${group}-productivity`} className="border border-slate-300 px-2 py-2 text-center">Productivity ({units.productivity})</th>,
                  <th key={`${group}-production`} className="border border-slate-300 px-2 py-2 text-center">Production ({units.production})</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={dataColSpan} className="border border-slate-300 px-2 py-8 text-center text-slate-500">Loading report...</td>
                </tr>
              ) : groupedRows.length ? (
                groupedRows.flatMap((group) =>
                  group.rows.map((row, rowIndex) => (
                    <tr key={row.id} className="align-top hover:bg-slate-50">
                      {rowIndex === 0 && (
                        <>
                          <td rowSpan={group.rows.length} className="border border-slate-300 bg-slate-50 px-2 py-2 text-center font-semibold">{group.index}</td>
                          <td rowSpan={group.rows.length} className="border border-slate-300 bg-slate-50 px-2 py-2 font-semibold text-slate-950">{group.groupTitle}</td>
                        </>
                      )}
                      <td className="border border-slate-300 px-2 py-2 font-medium text-slate-900">{row.itemTitle}</td>
                      <td className="border border-slate-300 px-2 py-2 text-slate-700">{row.directorateName}</td>
                      <td className="border border-slate-300 px-2 py-2 text-slate-700">{row.teamName}</td>
                      <ReportMetricCells metric={row.lastYear} units={units} />
                      <ReportMetricCells metric={row.thisYearPlan} units={units} />
                      <ReportMetricCells metric={row.thisMonthPlan} units={units} />
                      <ReportMetricCells metric={row.thisMonthAchievement} units={units} />
                      <ReportMetricCells metric={row.thisMonthPercent} percent units={units} />
                      <ReportMetricCells metric={row.upToPlan} units={units} />
                      <ReportMetricCells metric={row.upToAchievement} units={units} />
                      <ReportMetricCells metric={row.upToPercent} percent units={units} />
                      <ReportMetricCells metric={row.yearlyPercent} percent units={units} />
                      <td className="border border-slate-300 px-2 py-2 text-center capitalize">{row.status ?? "draft"}</td>
                      {canReview && (
                        <td className="border border-slate-300 px-2 py-2 print:hidden">
                          <div className="flex min-w-36 gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => openReview(row, "comment")}>
                              <MessageSquare className="mr-1 h-3 w-3" />
                              Comment
                            </Button>
                            <Button type="button" size="sm" disabled={!canAdvance(row)} onClick={() => openReview(row, "approve")}>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {approvalLabel}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )),
                )
              ) : (
                <tr>
                  <td colSpan={dataColSpan} className="border border-slate-300 px-2 py-8 text-center text-slate-500">
                    No report data found for the selected fiscal year.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!reviewRecord} onOpenChange={(open) => !open && setReviewRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === "approve" ? `${approvalLabel} Planning Record` : "Add Comment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <div className="font-semibold text-slate-950">{reviewRecord?.groupTitle}</div>
              <div className="text-slate-600">{reviewRecord?.itemTitle}</div>
              <div className="mt-1 text-xs text-slate-500">{reviewRecord?.directorateName} / {reviewRecord?.teamName}</div>
            </div>
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="Write approval/comment note..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewRecord(null)} disabled={reviewLoading}>Cancel</Button>
            <Button onClick={submitReview} disabled={reviewLoading}>
              {reviewLoading ? "Saving..." : reviewAction === "approve" ? approvalLabel : "Save Comment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
