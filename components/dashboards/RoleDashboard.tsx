"use client";

import Link from "next/link";
import { useMemo, useState, type ElementType } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eye,
  FileCheck2,
  Filter,
  Gauge,
  Layers3,
  Loader2,
  RefreshCcw,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoleDashboard } from "@/hooks/dashboard/use-role-dashboard";
import type {
  DashboardAchievementRow,
  DashboardPlanRow,
  DashboardReportRow,
  DashboardTab,
  RoleDashboardChartRow,
  RoleDashboardFilters,
  RoleDashboardScope,
} from "@/types/dashboard/role-dashboard.type";

type Props = { scope: RoleDashboardScope; showBudget?: boolean };
type KpiItem = { title: string; value: string | number; subtitle: string; icon: ElementType };

type RoleConfig = {
  title: string;
  role: string;
  office: string;
  access: string;
  canApprove: boolean;
  canSubmit: boolean;
};

const genericRoleConfig: Record<string, RoleConfig> = {
  super_admin: {
    title: "Executive Control Dashboard",
    role: "Super Admin",
    office: "All Offices",
    access: "Full system administration, monitoring and reporting access",
    canApprove: true,
    canSubmit: false,
  },
  head_of_office: {
    title: "Head of Office Dashboard",
    role: "Head of Office",
    office: "Assigned Office",
    access: "Office-level approval, performance review and reporting access",
    canApprove: true,
    canSubmit: false,
  },
  deputy_head_of_office: {
    title: "Deputy Head of Office Dashboard",
    role: "Deputy Head of Office",
    office: "Assigned Office",
    access: "Operational follow-up and approval support access",
    canApprove: true,
    canSubmit: false,
  },
  director: {
    title: "Director Dashboard",
    role: "Director",
    office: "Assigned Office",
    access: "Directorate-level plan and achievement management access",
    canApprove: true,
    canSubmit: true,
  },
  team_leader: {
    title: "Team Leader Dashboard",
    role: "Team Leader",
    office: "Assigned Office",
    access: "Team-level plan follow-up and achievement reporting access",
    canApprove: false,
    canSubmit: true,
  },
  expert: {
    title: "Expert Dashboard",
    role: "Expert",
    office: "Assigned Office",
    access: "Assigned activity and achievement entry access",
    canApprove: false,
    canSubmit: true,
  },
};

const roleConfig: Partial<Record<RoleDashboardScope, RoleConfig>> = {
  ...genericRoleConfig,
  agriculture_coffee_tea_director: { ...genericRoleConfig.director, title: "Coffee & Tea Performance Dashboard", office: "Bureau of Agriculture" },
  agriculture_fruit_director: { ...genericRoleConfig.director, title: "Fruit Performance Dashboard", office: "Bureau of Agriculture" },
  agriculture_crop_director: { ...genericRoleConfig.director, title: "Crop Performance Dashboard", office: "Bureau of Agriculture" },
  agriculture_livestock_director: { ...genericRoleConfig.director, title: "Livestock Performance Dashboard", office: "Bureau of Agriculture" },
  agriculture_job_creation_director: { ...genericRoleConfig.director, title: "Agriculture Job Creation Dashboard", office: "Bureau of Agriculture" },
  agriculture_vegetable_expert: { ...genericRoleConfig.expert, title: "Vegetable Achievement Dashboard", office: "Bureau of Agriculture" },
  cooperative_market_director: { ...genericRoleConfig.director, title: "Cooperative Market Dashboard", office: "Cooperative Agency" },
  cooperative_job_creation_director: { ...genericRoleConfig.director, title: "Cooperative Job Creation Dashboard", office: "Cooperative Agency" },
  industry_value_addition_director: { ...genericRoleConfig.director, title: "Industry & Value Addition Dashboard", office: "Bureau of Industry and Investment" },
  industry_job_creation_director: { ...genericRoleConfig.director, title: "Industry Job Creation Dashboard", office: "Bureau of Industry and Investment" },
  trade_coffee_tea_spice_director: { ...genericRoleConfig.director, title: "Coffee, Tea & Spice Trade Dashboard", office: "Bureau of Trade and Regional Integration" },
  trade_fruit_vegetable_director: { ...genericRoleConfig.director, title: "Fruit & Vegetable Trade Dashboard", office: "Bureau of Trade and Regional Integration" },
  trade_crop_director: { ...genericRoleConfig.director, title: "Crop Market Dashboard", office: "Bureau of Trade and Regional Integration" },
  trade_livestock_director: { ...genericRoleConfig.director, title: "Livestock Products Trade Dashboard", office: "Bureau of Trade and Regional Integration" },
  president_agriculture_value_chain_manager: { ...genericRoleConfig.head_of_office, title: "Agricultural Value Chain Dashboard", role: "Value Chain Manager", office: "President Office" },
  president_manufacturing_value_chain_manager: { ...genericRoleConfig.head_of_office, title: "Manufacturing Value Chain Dashboard", role: "Value Chain Manager", office: "President Office" },
  president_investment_manager: { ...genericRoleConfig.head_of_office, title: "Investment Monitoring Dashboard", role: "Investment Manager", office: "President Office" },
  president_job_creation_manager: { ...genericRoleConfig.head_of_office, title: "Job Creation Monitoring Dashboard", role: "Job Creation Manager", office: "President Office" },
};

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const compactFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1, notation: "compact" });
const TABLE_PAGE_SIZE = 8;

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value: unknown) {
  return numberFormatter.format(toNumber(value));
}

function formatCompact(value: unknown) {
  return compactFormatter.format(toNumber(value));
}

function normalize(value?: string | null) {
  return String(value ?? "").toLowerCase();
}

function statusTone(status?: string | null) {
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusLabel(value?: string | null) {
  return String(value ?? "-").replaceAll("_", " ");
}

function getChartLabel(row: RoleDashboardChartRow) {
  return row.label ?? row.name ?? "-";
}

function filterUpdate(setFilters: (value: RoleDashboardFilters) => void, filters: RoleDashboardFilters, key: keyof RoleDashboardFilters, value: string) {
  setFilters({ ...filters, [key]: value === "all" ? "" : value });
}

function getPageRows<T>(rows: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * TABLE_PAGE_SIZE;
  const end = start + TABLE_PAGE_SIZE;
  return { rows: rows.slice(start, end), page: safePage, totalPages, start: rows.length ? start + 1 : 0, end: Math.min(end, rows.length) };
}

function KpiCard({ title, value, subtitle, icon: Icon }: KpiItem) {
  return (
    <Card className="overflow-hidden rounded-xl border-0 bg-white shadow-sm ring-1 ring-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="rounded-xl bg-slate-900 p-2.5 text-slate-900">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PowerBiBarChart({ title, rows = [], percentage = false }: { title: string; rows?: RoleDashboardChartRow[]; percentage?: boolean }) {
  const sorted = [...rows].sort((a, b) => toNumber(b.value) - toNumber(a.value)).slice(0, 8);
  const max = Math.max(...sorted.map((row) => toNumber(row.value)), 1);

  return (
    <Card className="rounded-xl border-0 bg-white shadow-sm ring-1 ring-slate-200">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <BarChart3 className="h-4 w-4 text-slate-700" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {sorted.length ? sorted.map((row, index) => {
          const value = toNumber(row.value);
          const width = Math.max(4, Math.round((value / max) * 100));
          return (
            <div key={`${title}-${index}`} className="grid grid-cols-[minmax(110px,1fr)_2fr_72px] items-center gap-3 text-xs">
              <span className="truncate font-medium text-slate-700">{getChartLabel(row)}</span>
              <div className="h-5 overflow-hidden rounded-sm bg-slate-100">
                <div className="h-full rounded-sm bg-slate-700" style={{ width: `${width}%` }} />
              </div>
              <span className="text-right font-bold text-slate-900">{percentage ? `${formatNumber(value)}%` : formatNumber(value)}</span>
            </div>
          );
        }) : (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">No chart data available</div>
        )}
      </CardContent>
    </Card>
  );
}

function DonutVisual({ value }: { value: number }) {
  return (
    <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-slate-100">
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(#334155_var(--value),#e5e7eb_0)]" style={{ "--value": `${Math.min(Math.max(value, 0), 100)}%` } as React.CSSProperties} />
      <div className="absolute h-28 w-28 rounded-full bg-white" />
      <div className="relative text-center">
        <p className="text-3xl font-bold text-slate-900">{value}%</p>
        <p className="text-xs text-slate-500">Performance</p>
      </div>
    </div>
  );
}

function FilterPanel({ tab, filters, setFilters }: { tab: DashboardTab; filters: RoleDashboardFilters; setFilters: (value: RoleDashboardFilters) => void }) {
  return (
    <Card className="rounded-xl border-0 bg-white shadow-sm ring-1 ring-slate-200">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Filter className="h-4 w-4 text-slate-700" />
          Report Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input className="pl-9" placeholder="Fiscal year" value={filters.fiscal_year ?? ""} onChange={(event) => filterUpdate(setFilters, filters, "fiscal_year", event.target.value)} />
        </div>
        <Input placeholder="Office" value={filters.office ?? ""} onChange={(event) => filterUpdate(setFilters, filters, "office", event.target.value)} />
        <Input placeholder="Value chain" value={filters.value_chain ?? ""} onChange={(event) => filterUpdate(setFilters, filters, "value_chain", event.target.value)} />
        <Input placeholder="Indicator" value={filters.indicator ?? ""} onChange={(event) => filterUpdate(setFilters, filters, "indicator", event.target.value)} />
        <Select value={filters.status || "all"} onValueChange={(value) => filterUpdate(setFilters, filters, "status", value)}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
        {tab === "achievement" ? <Input type="date" value={filters.date_from ?? ""} onChange={(event) => filterUpdate(setFilters, filters, "date_from", event.target.value)} /> : null}
      </CardContent>
    </Card>
  );
}

function TablePagination({ page, totalPages, totalRows, start, end, onPageChange }: { page: number; totalPages: number; totalRows: number; start: number; end: number; onPageChange: (page: number) => void }) {
  return (
    <div className="flex flex-col gap-3 border-t bg-white px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>{start}-{end} of {totalRows}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <span className="text-xs font-medium">Page {page} / {totalPages}</span>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

function DataTable({ tab, plans, achievements, reports }: { tab: DashboardTab; plans: DashboardPlanRow[]; achievements: DashboardAchievementRow[]; reports: DashboardReportRow[] }) {
  const [page, setPage] = useState(1);

  if (tab === "plan") {
    const pagination = getPageRows(plans, page);
    return (
      <Card className="overflow-hidden rounded-xl border-0 bg-white shadow-sm ring-1 ring-slate-200">
        <CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm font-bold">Plan Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader><TableRow className="bg-slate-50"><TableHead>Plan No</TableHead><TableHead>Office</TableHead><TableHead>Directorate</TableHead><TableHead>Value Chain</TableHead><TableHead>Indicator</TableHead><TableHead className="text-right">Annual Target</TableHead><TableHead>Fiscal Year</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>{pagination.rows.length ? pagination.rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.plan_no ?? `PLN-${row.id}`}</TableCell><TableCell>{row.office ?? "-"}</TableCell><TableCell>{row.directorate ?? "-"}</TableCell><TableCell>{row.value_chain ?? "-"}</TableCell><TableCell>{row.indicator ?? "-"}</TableCell><TableCell className="text-right font-semibold">{formatNumber(row.annual_target)}</TableCell><TableCell>{row.fiscal_year ?? "-"}</TableCell><TableCell><Badge variant="outline" className={`capitalize ${statusTone(row.status)}`}>{statusLabel(row.status)}</Badge></TableCell><TableCell className="text-right"><Button asChild size="sm" variant="ghost"><Link href={`/dashboard/plans/${row.id}`}><Eye className="mr-2 h-4 w-4" />Detail</Link></Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={9} className="h-32 text-center text-slate-500">No plan records found.</TableCell></TableRow>}</TableBody>
            </Table>
          </div>
          <TablePagination page={pagination.page} totalPages={pagination.totalPages} totalRows={plans.length} start={pagination.start} end={pagination.end} onPageChange={setPage} />
        </CardContent>
      </Card>
    );
  }

  if (tab === "achievement") {
    const pagination = getPageRows(achievements, page);
    return (
      <Card className="overflow-hidden rounded-xl border-0 bg-white shadow-sm ring-1 ring-slate-200">
        <CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm font-bold">Achievement Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader><TableRow className="bg-slate-50"><TableHead>Achievement No</TableHead><TableHead>Office</TableHead><TableHead>Value Chain</TableHead><TableHead>Indicator</TableHead><TableHead className="text-right">Target</TableHead><TableHead className="text-right">Achieved</TableHead><TableHead className="text-right">%</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>{pagination.rows.length ? pagination.rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.achievement_no ?? `ACH-${row.id}`}</TableCell><TableCell>{row.office ?? "-"}</TableCell><TableCell>{row.value_chain ?? "-"}</TableCell><TableCell>{row.indicator ?? "-"}</TableCell><TableCell className="text-right font-semibold">{formatNumber(row.target)}</TableCell><TableCell className="text-right font-semibold">{formatNumber(row.achieved)}</TableCell><TableCell className="text-right font-bold text-slate-900">{formatNumber(row.achievement_percent)}%</TableCell><TableCell><Badge variant="outline" className={`capitalize ${statusTone(row.status)}`}>{statusLabel(row.status)}</Badge></TableCell><TableCell className="text-right"><Button asChild size="sm" variant="ghost"><Link href={`/dashboard/achievements/${row.id}`}><Eye className="mr-2 h-4 w-4" />Detail</Link></Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={9} className="h-32 text-center text-slate-500">No achievement records found.</TableCell></TableRow>}</TableBody>
            </Table>
          </div>
          <TablePagination page={pagination.page} totalPages={pagination.totalPages} totalRows={achievements.length} start={pagination.start} end={pagination.end} onPageChange={setPage} />
        </CardContent>
      </Card>
    );
  }

  const pagination = getPageRows(reports, page);
  return (
    <Card className="overflow-hidden rounded-xl border-0 bg-white shadow-sm ring-1 ring-slate-200">
      <CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm font-bold">Performance Reports</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader><TableRow className="bg-slate-50"><TableHead>Office</TableHead><TableHead>Report Type</TableHead><TableHead>Value Chain</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Target</TableHead><TableHead className="text-right">Achieved</TableHead><TableHead className="text-right">Performance</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>{pagination.rows.length ? pagination.rows.map((row) => <TableRow key={row.id}><TableCell>{row.office ?? "-"}</TableCell><TableCell className="font-medium">{row.report_type ?? "-"}</TableCell><TableCell>{row.value_chain ?? "-"}</TableCell><TableCell>{row.period ?? "-"}</TableCell><TableCell className="text-right font-semibold">{formatNumber(row.total_target)}</TableCell><TableCell className="text-right font-semibold">{formatNumber(row.total_achieved)}</TableCell><TableCell className="text-right font-bold text-slate-900">{formatNumber(row.performance_percent)}%</TableCell><TableCell><Badge variant="outline" className={`capitalize ${statusTone(row.status)}`}>{statusLabel(row.status)}</Badge></TableCell><TableCell className="text-right"><Button asChild size="sm" variant="ghost"><Link href={`/dashboard/reports/${row.id}`}><Eye className="mr-2 h-4 w-4" />Detail</Link></Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={9} className="h-32 text-center text-slate-500">No report records found.</TableCell></TableRow>}</TableBody>
          </Table>
        </div>
        <TablePagination page={pagination.page} totalPages={pagination.totalPages} totalRows={reports.length} start={pagination.start} end={pagination.end} onPageChange={setPage} />
      </CardContent>
    </Card>
  );
}

export default function RoleDashboard({ scope }: Props) {
  const [tab, setTab] = useState<DashboardTab>("plan");
  const [filters, setFilters] = useState<RoleDashboardFilters>({});
  const { data, isLoading, isFetching, refetch } = useRoleDashboard(scope, tab, filters);
  const dashboard = data?.data ?? { plans: [], achievements: [], reports: [], charts: {} };
  const config = roleConfig[scope] ?? genericRoleConfig.super_admin;

  const totals = useMemo(() => {
    const totalTarget = dashboard.plans.reduce((sum, row) => sum + toNumber(row.annual_target), 0);
    const totalAchieved = dashboard.achievements.reduce((sum, row) => sum + toNumber(row.achieved), 0);
    const approvedPlans = dashboard.plans.filter((row) => normalize(row.status).includes("approved")).length;
    const pending = [...dashboard.plans, ...dashboard.achievements].filter((row) => normalize(row.status).includes("submitted") || normalize(row.status).includes("review")).length;
    const performance = totalTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalTarget) * 100)) : 0;
    return { totalTarget, totalAchieved, performance, approvedPlans, pending, planCount: dashboard.plans.length, achievementCount: dashboard.achievements.length, reportCount: dashboard.reports.length };
  }, [dashboard]);

  const kpis: KpiItem[] = [
    { title: "Total Plans", value: totals.planCount, subtitle: `${formatCompact(totals.totalTarget)} planned target`, icon: ClipboardList },
    { title: "Achievements", value: totals.achievementCount, subtitle: `${formatCompact(totals.totalAchieved)} achieved result`, icon: FileCheck2 },
    { title: "Performance", value: `${totals.performance}%`, subtitle: "achievement against plan", icon: TrendingUp },
    { title: config.canApprove ? "Pending Review" : "Approved Plans", value: config.canApprove ? totals.pending : totals.approvedPlans, subtitle: config.canApprove ? "waiting for action" : "completed approvals", icon: config.canApprove ? Activity : CheckCircle2 },
  ];

  if (isLoading) {
    return <div className="flex min-h-[420px] items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading dashboard...</div>;
  }

  return (
    <div className="min-w-0 space-y-4 bg-slate-100 p-3 sm:p-4 lg:p-5">
      <section className="overflow-hidden rounded-xl border bg-white text-slate-900 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-100 text-slate-900 hover:bg-slate-100">Plan & Achievement</Badge>
              <Badge variant="outline" className="border-slate-200 text-slate-900"><Building2 className="mr-1 h-3.5 w-3.5" />{config.office}</Badge>
              <Badge variant="outline" className="border-slate-200 text-slate-900"><Users className="mr-1 h-3.5 w-3.5" />{config.role}</Badge>
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{config.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{config.access}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-50 px-3 py-1">Plans</span>
              <span className="rounded-full bg-slate-50 px-3 py-1">Achievements</span>
              <span className="rounded-full bg-slate-50 px-3 py-1">Performance Reports</span>
              <span className="rounded-full bg-slate-50 px-3 py-1">Audit-ready Monitoring</span>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Overall Score</p>
                <p className="mt-2 text-5xl font-bold text-slate-900">{totals.performance}%</p>
              </div>
              <Gauge className="h-12 w-12 text-slate-900" />
            </div>
            <Progress value={totals.performance} className="mt-5 h-2 bg-slate-100" />
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Target</p><p className="text-lg font-bold">{formatCompact(totals.totalTarget)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Achieved</p><p className="text-lg font-bold">{formatCompact(totals.totalAchieved)}</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}</div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.75fr]">
        <PowerBiBarChart title="Achievement by Value Chain" rows={dashboard.charts.achievement_by_value_chain ?? dashboard.charts.byAchievement} />
        <PowerBiBarChart title="Performance by Office" rows={dashboard.charts.performance_by_office ?? dashboard.charts.byOffice} percentage />
        <Card className="rounded-xl border-0 bg-white shadow-sm ring-1 ring-slate-200">
          <CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm font-bold">Performance Gauge</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4 p-5">
            <DonutVisual value={totals.performance} />
            <div className="grid w-full grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3"><p className="text-slate-500">Submit</p><p className="font-bold">{config.canSubmit ? "Allowed" : "View only"}</p></div>
              <div className="rounded-lg border p-3"><p className="text-slate-500">Approve</p><p className="font-bold">{config.canApprove ? "Allowed" : "No"}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as DashboardTab)} className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="h-auto w-full justify-start rounded-lg bg-slate-100 p-1 lg:w-auto">
            <TabsTrigger value="plan" className="gap-2"><ClipboardList className="h-4 w-4" />Plans</TabsTrigger>
            <TabsTrigger value="achievement" className="gap-2"><FileCheck2 className="h-4 w-4" />Achievements</TabsTrigger>
            <TabsTrigger value="report" className="gap-2"><BarChart3 className="h-4 w-4" />Reports</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1"><CalendarDays className="h-3.5 w-3.5" />Current View</Badge>
            <Button type="button" size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>{isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}Refresh</Button>
          </div>
        </div>

        <FilterPanel tab={tab} filters={filters} setFilters={setFilters} />

        <TabsContent value="plan" className="mt-0 space-y-4">
          <DataTable tab="plan" plans={dashboard.plans} achievements={dashboard.achievements} reports={dashboard.reports} />
        </TabsContent>
        <TabsContent value="achievement" className="mt-0 space-y-4">
          <DataTable tab="achievement" plans={dashboard.plans} achievements={dashboard.achievements} reports={dashboard.reports} />
        </TabsContent>
        <TabsContent value="report" className="mt-0 space-y-4">
          <DataTable tab="report" plans={dashboard.plans} achievements={dashboard.achievements} reports={dashboard.reports} />
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 xl:grid-cols-2">
        <PowerBiBarChart title="Plan Status Summary" rows={dashboard.charts.plan_status_summary ?? dashboard.charts.byStatus} />
        <PowerBiBarChart title="Achievement Status Summary" rows={dashboard.charts.achievement_status_summary} />
      </div>
    </div>
  );
}
