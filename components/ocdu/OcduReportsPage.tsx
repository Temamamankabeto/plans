"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, RefreshCw, Search, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ReportRow = {
  id: number;
  source: "planning" | "trade";
  category: string;
  indicator: string;
  office_id: number;
  office_name: string;
  directorate_name?: string;
  team_name?: string;
  fiscal_year: string;
  month?: string | null;
  period_type: string;
  plan_value: number;
  achievement_value: number;
  plan_status: string;
  achievement_status: string;
  approved_at?: string | null;
  approved_by_name?: string | null;
};

type ReportMeta = {
  scope: string;
  department?: string;
  offices: Array<{ id: number; name: string }>;
  total_records: number;
  participating_offices: number;
  total_plan: number;
  total_achievement: number;
  performance_percent: number;
};

type ApiResponse = { success: boolean; message: string; data: ReportRow[]; meta: ReportMeta };

const scopeNames: Record<string, string> = {
  all: "Consolidated OCDU",
  agriculture: "Agricultural Value Chain Monitoring",
  manufacturing: "Manufacturing Value Chain Monitoring",
  investment: "Investment Monitoring",
  job_creation: "Job Creation Monitoring",
  monitoring_evaluation: "Monitoring and Evaluation",
};

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function displayStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function OcduReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [officeId, setOfficeId] = useState("all");
  const [fiscalYear, setFiscalYear] = useState("");
  const [source, setSource] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const parameters = new URLSearchParams();
      if (officeId !== "all") parameters.set("office_id", officeId);
      if (fiscalYear.trim()) parameters.set("fiscal_year", fiscalYear.trim());
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/ocdu/reports?${parameters}`, {
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.success) throw new Error(body.message || "Unable to load report");
      setRows(body.data);
      setMeta(body.meta);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load report");
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, officeId]);

  useEffect(() => { void load(); }, [load]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (source !== "all" && row.source !== source) return false;
      if (!term) return true;
      return [row.office_name, row.category, row.indicator, row.directorate_name, row.team_name]
        .some((value) => String(value ?? "").toLowerCase().includes(term));
    });
  }, [rows, search, source]);

  const title = meta?.department || scopeNames[meta?.scope || "all"] || "OCDU Monitoring";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title} Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Approved plans and achievements from participating offices within your assigned monitoring scope.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Records" value={meta?.total_records ?? 0} icon={BarChart3} />
        <SummaryCard title="Participating Offices" value={meta?.participating_offices ?? 0} icon={Building2} />
        <SummaryCard title="Total Plan" value={numberFormat.format(meta?.total_plan ?? 0)} icon={Target} />
        <SummaryCard title="Achievement" value={numberFormat.format(meta?.total_achievement ?? 0)} icon={TrendingUp} />
        <SummaryCard title="Performance" value={`${numberFormat.format(meta?.performance_percent ?? 0)}%`} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approved Office Performance</CardTitle>
          <CardDescription>Only Director-approved or finally approved records are included.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_200px_180px_160px_auto]">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search office or indicator..." />
            </div>
            <Select value={officeId} onValueChange={setOfficeId}>
              <SelectTrigger><SelectValue placeholder="All offices" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {(meta?.offices ?? []).map((office) => <SelectItem key={office.id} value={String(office.id)}>{office.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} placeholder="Fiscal year" />
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="planning">Plan & Achievement</SelectItem>
                <SelectItem value="trade">Trade & Value Chain</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead><TableHead>Category</TableHead><TableHead>Indicator</TableHead>
                  <TableHead>Period</TableHead><TableHead className="text-right">Plan</TableHead>
                  <TableHead className="text-right">Achievement</TableHead><TableHead className="text-right">Performance</TableHead>
                  <TableHead>Status</TableHead><TableHead>Approved By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filteredRows.map((row) => {
                  const performance = row.plan_value > 0 ? (row.achievement_value / row.plan_value) * 100 : 0;
                  return (
                    <TableRow key={`${row.source}-${row.id}`}>
                      <TableCell className="font-medium">{row.office_name}</TableCell>
                      <TableCell><Badge variant="secondary">{row.category}</Badge></TableCell>
                      <TableCell className="min-w-52">{row.indicator}</TableCell>
                      <TableCell>{row.fiscal_year} · {row.month || row.period_type}</TableCell>
                      <TableCell className="text-right tabular-nums">{numberFormat.format(row.plan_value)}</TableCell>
                      <TableCell className="text-right tabular-nums">{numberFormat.format(row.achievement_value)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{numberFormat.format(performance)}%</TableCell>
                      <TableCell><Badge variant="outline">{displayStatus(row.achievement_value > 0 ? row.achievement_status : row.plan_status)}</Badge></TableCell>
                      <TableCell>{row.approved_by_name || "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {!loading && filteredRows.length === 0 && <TableRow><TableCell colSpan={9} className="h-28 text-center text-muted-foreground">No approved records match these filters.</TableCell></TableRow>}
                {loading && <TableRow><TableCell colSpan={9} className="h-28 text-center text-muted-foreground">Loading department report...</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground text-sm">Showing {filteredRows.length} approved record(s).</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: typeof BarChart3 }) {
  return (
    <Card className="gap-3 py-4">
      <CardContent className="flex items-center justify-between px-4">
        <div><p className="text-muted-foreground text-xs font-medium">{title}</p><p className="mt-1 text-xl font-bold">{value}</p></div>
        <div className="bg-primary/10 text-primary rounded-lg p-2"><Icon className="size-5" /></div>
      </CardContent>
    </Card>
  );
}
