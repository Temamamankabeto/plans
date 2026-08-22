"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ETHIOPIAN_MONTHS = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"];
const FISCAL_YEARS = ["2018", "2019", "2020", "2021"];

type ReportRow = {
  id: number;
  fiscal_year: string;
  commodity_group: string;
  commodity: string;
  stage: string;
  unit: string;
  directorate_name?: string;
  team_name?: string;
  plan_product: number;
  plan_price: number;
  plan_income: number;
  monthly_plan_product: number;
  monthly_plan_price: number;
  monthly_plan_income: number;
  monthly_achievement_product: number;
  monthly_achievement_price: number;
  monthly_achievement_income: number;
  plan_to_date_product: number;
  plan_to_date_income: number;
  achievement_to_date_product: number;
  achievement_to_date_income: number;
  achievement_percent: number;
  status: string;
};

function n(value: unknown) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function pct(value: unknown) {
  return `${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export default function TradeReportPage() {
  const [fiscalYear, setFiscalYear] = useState("2018");
  const [month, setMonth] = useState("Meskerem");
  const [rows, setRows] = useState<ReportRow[]>([]);

  async function load() {
    try {
      const response = await api.get(`/admin/trade-records?report=1&fiscal_year=${encodeURIComponent(fiscalYear)}&month=${encodeURIComponent(month)}`);
      setRows(response.data.data ?? []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load Trade report");
    }
  }

  useEffect(() => { load(); }, [fiscalYear, month]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, ReportRow[]>();
    for (const row of rows) {
      if (!map.has(row.commodity_group)) map.set(row.commodity_group, []);
      map.get(row.commodity_group)!.push(row);
    }
    return Array.from(map.entries());
  }, [rows]);

  function exportCsv() {
    const headers = ["No", "Work Type", "Work", "Directorate", "Team", "Unit", "Annual Product", "Annual Price", "Annual Income", "Month Plan Product", "Month Plan Price", "Month Plan Income", "Month Achievement Product", "Month Achievement Price", "Month Achievement Income", "Plan To Date Product", "Plan To Date Income", "Performance To Date Product", "Performance To Date Income", "Achievement %", "Status"];
    const data = rows.map((row, index) => [index + 1, row.commodity_group, row.commodity, row.directorate_name ?? "", row.team_name ?? "", row.unit, row.plan_product, row.plan_price, row.plan_income, row.monthly_plan_product, row.monthly_plan_price, row.monthly_plan_income, row.monthly_achievement_product, row.monthly_achievement_price, row.monthly_achievement_income, row.plan_to_date_product, row.plan_to_date_income, row.achievement_to_date_product, row.achievement_to_date_income, row.achievement_percent, row.status]);
    const csv = [headers, ...data].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade-report-${fiscalYear}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <button className="mb-4 text-sm font-medium" onClick={() => history.back()}>← Back to Trade Plans</button>
          <h1 className="text-2xl font-bold tracking-tight">TRADE VALUE CHAIN REPORT</h1>
          <p className="text-muted-foreground">Excel-style Procurement → Domestic Market → International Market → Employment report.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={fiscalYear} onValueChange={setFiscalYear}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{FISCAL_YEARS.map((y) => <SelectItem key={y} value={y}>{y} E.C.</SelectItem>)}</SelectContent></Select>
          <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{ETHIOPIAN_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
          <Button onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold">OROMIA BUREAU OF TRADE VALUE CHAIN REPORT</h2>
          <p className="text-sm text-muted-foreground">Fiscal Year: {fiscalYear} E.C. · Month: {month}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/70 text-center font-semibold">
                <th rowSpan={3} className="border p-2">No.</th>
                <th rowSpan={3} className="border p-2 text-left">Work</th>
                <th rowSpan={3} className="border p-2">Directorate</th>
                <th rowSpan={3} className="border p-2">Team</th>
                <th rowSpan={3} className="border p-2">Unit</th>
                <th colSpan={3} className="border p-2">Previous Year Performance</th>
                <th colSpan={3} className="border p-2">Annual Plan</th>
                <th colSpan={3} className="border p-2">Monthly Plan</th>
                <th colSpan={3} className="border p-2">Monthly Performance</th>
                <th colSpan={2} className="border p-2">Plan To Date</th>
                <th colSpan={2} className="border p-2">Performance To Date</th>
                <th rowSpan={3} className="border p-2">Achievement %</th>
                <th rowSpan={3} className="border p-2">Status</th>
              </tr>
              <tr className="bg-muted/40 text-center font-semibold">
                <th colSpan={3} className="border p-2">Product / Price / Income</th>
                <th colSpan={3} className="border p-2">Product / Price / Income</th>
                <th colSpan={3} className="border p-2">Product / Price / Income</th>
                <th colSpan={3} className="border p-2">Product / Price / Income</th>
                <th colSpan={2} className="border p-2">Product / Income</th>
                <th colSpan={2} className="border p-2">Product / Income</th>
              </tr>
              <tr className="bg-muted/30 text-center font-semibold">
                <th className="border p-2">Product</th><th className="border p-2">Price</th><th className="border p-2">Income/Expense</th>
                <th className="border p-2">Product</th><th className="border p-2">Price</th><th className="border p-2">Income/Expense</th>
                <th className="border p-2">Product</th><th className="border p-2">Price</th><th className="border p-2">Income/Expense</th>
                <th className="border p-2">Product</th><th className="border p-2">Price</th><th className="border p-2">Income/Expense</th>
                <th className="border p-2">Product</th><th className="border p-2">Income/Expense</th>
                <th className="border p-2">Product</th><th className="border p-2">Income/Expense</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map(([group, groupRows], groupIndex) => (
                <>
                  <tr key={`group-${group}`} className="bg-muted/20 font-bold"><td className="border p-2 text-center">{groupIndex + 1}</td><td className="border p-2" colSpan={22}>{group}</td></tr>
                  {groupRows.map((row) => (
                    <tr key={row.id}>
                      <td className="border p-2 text-center"></td>
                      <td className="border p-2 pl-8">{row.commodity}</td>
                      <td className="border p-2">{row.directorate_name}</td>
                      <td className="border p-2">{row.team_name || "-"}</td>
                      <td className="border p-2 text-center">{row.unit}</td>
                      <td className="border p-2 text-right">0</td><td className="border p-2 text-right">0</td><td className="border p-2 text-right">0</td>
                      <td className="border p-2 text-right">{n(row.plan_product)}</td><td className="border p-2 text-right">{n(row.plan_price)}</td><td className="border p-2 text-right">{n(row.plan_income)}</td>
                      <td className="border p-2 text-right">{n(row.monthly_plan_product)}</td><td className="border p-2 text-right">{n(row.monthly_plan_price)}</td><td className="border p-2 text-right">{n(row.monthly_plan_income)}</td>
                      <td className="border p-2 text-right">{n(row.monthly_achievement_product)}</td><td className="border p-2 text-right">{n(row.monthly_achievement_price)}</td><td className="border p-2 text-right">{n(row.monthly_achievement_income)}</td>
                      <td className="border p-2 text-right">{n(row.plan_to_date_product)}</td><td className="border p-2 text-right">{n(row.plan_to_date_income)}</td>
                      <td className="border p-2 text-right">{n(row.achievement_to_date_product)}</td><td className="border p-2 text-right">{n(row.achievement_to_date_income)}</td>
                      <td className="border p-2 text-right">{pct(row.achievement_percent)}</td>
                      <td className="border p-2 text-center">{row.status}</td>
                    </tr>
                  ))}
                </>
              ))}
              {!rows.length && <tr><td className="border p-8 text-center text-muted-foreground" colSpan={23}>No report data found for the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
