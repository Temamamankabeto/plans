'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TradeRecordItem } from '@/types/location/trade-record.type';

const MONTHS = [[1, 'Meskerem'], [2, 'Tikimt'], [3, 'Hidar'], [4, 'Tahsas'], [5, 'Tir'], [6, 'Yekatit'], [7, 'Megabit'], [8, 'Miazia'], [9, 'Ginbot'], [10, 'Sene'], [11, 'Hamle'], [12, 'Nehase'], [13, 'Pagume']] as const;

function fy() { const d = new Date(); return String(d.getFullYear() - (d.getMonth() > 8 || (d.getMonth() === 8 && d.getDate() >= 11) ? 7 : 8)); }
function tokenHeaders() { const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null; return { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } as Record<string, string>; }
async function api<T>(url: string): Promise<T> { const r = await fetch(url, { credentials: 'include', headers: tokenHeaders() }); const b = await r.json().catch(() => null); if (!r.ok || !b?.success) throw new Error(b?.message || 'Request failed'); return b.data; }
function n(v: unknown) { const p = Number(v ?? 0); return Number.isFinite(p) ? p : 0; }
function pct(a: number, b: number) { return b ? (a / b) * 100 : 0; }
function fmt(v: unknown, unit = '') { const out = n(v).toLocaleString(undefined, { maximumFractionDigits: 2 }); return unit ? `${out} ${unit}` : out; }

type ReportRow = {
  group: string; commodity: string; specification: string; directorate: string; team: string; unit: string;
  annual: any; monthPlan: any; monthAch: any; upToPlan: any; upToAch: any;
};

function sum(records: TradeRecordItem[], key: keyof TradeRecordItem) { return records.reduce((t, r) => t + n(r[key]), 0); }

export function TradeReportPage() {
  const [records, setRecords] = useState<TradeRecordItem[]>([]);
  const [fiscalYear, setFiscalYear] = useState(fy());
  const [month, setMonth] = useState(1);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<TradeRecordItem[]>(`/api/admin/trade-records?report=1&fiscal_year=${encodeURIComponent(fiscalYear)}`);
      setRecords(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch Trade report');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const annuals = records.filter((r) => r.period_type === 'annual');
    return annuals.map((annual) => {
      const months = records.filter((r) => r.annual_plan_id === annual.id && r.period_type === 'monthly');
      const monthRows = months.filter((r) => Number(r.month) === Number(month));
      const upToRows = months.filter((r) => Number(r.month ?? 0) <= Number(month));
      return {
        group: annual.commodity_group,
        commodity: annual.commodity,
        specification: annual.specification ?? '',
        directorate: annual.directorate_name ?? '-',
        team: annual.team_name ?? '-',
        unit: annual.unit,
        annual,
        monthPlan: {
          procurement: sum(monthRows, 'procurement_plan'), domestic: sum(monthRows, 'domestic_market_plan'), international: sum(monthRows, 'international_market_plan'), export: sum(monthRows, 'export_quantity_plan'), currency: sum(monthRows, 'foreign_currency_plan'), male: sum(monthRows, 'employment_male_plan'), female: sum(monthRows, 'employment_female_plan'), total: sum(monthRows, 'employment_total_plan'),
        },
        monthAch: {
          procurement: sum(monthRows, 'procurement_achievement'), domestic: sum(monthRows, 'domestic_market_achievement'), international: sum(monthRows, 'international_market_achievement'), export: sum(monthRows, 'export_quantity_achievement'), currency: sum(monthRows, 'foreign_currency_achievement'), male: sum(monthRows, 'employment_male_achievement'), female: sum(monthRows, 'employment_female_achievement'), total: sum(monthRows, 'employment_total_achievement'),
        },
        upToPlan: {
          procurement: sum(upToRows, 'procurement_plan'), domestic: sum(upToRows, 'domestic_market_plan'), international: sum(upToRows, 'international_market_plan'), export: sum(upToRows, 'export_quantity_plan'), currency: sum(upToRows, 'foreign_currency_plan'), male: sum(upToRows, 'employment_male_plan'), female: sum(upToRows, 'employment_female_plan'), total: sum(upToRows, 'employment_total_plan'),
        },
        upToAch: {
          procurement: sum(upToRows, 'procurement_achievement'), domestic: sum(upToRows, 'domestic_market_achievement'), international: sum(upToRows, 'international_market_achievement'), export: sum(upToRows, 'export_quantity_achievement'), currency: sum(upToRows, 'foreign_currency_achievement'), male: sum(upToRows, 'employment_male_achievement'), female: sum(upToRows, 'employment_female_achievement'), total: sum(upToRows, 'employment_total_achievement'),
        },
      } as ReportRow;
    });
  }, [records, month]);

  const groups = useMemo(() => rows.reduce<Record<string, ReportRow[]>>((acc, row) => { (acc[row.group] ??= []).push(row); return acc; }, {}), [rows]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Oromia Bureau of Trade Report</h1><p className="text-sm text-muted-foreground">Procurement → Domestic Market Linkage → International Market Linkage → Employment Creation</p></div>
        <div className="flex gap-2"><Button asChild variant="outline"><Link href="/dashboard/trade-records"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button></div>
      </div>

      <Card><CardContent className="grid gap-4 p-4 md:grid-cols-4">
        <div className="space-y-2"><Label>Fiscal Year</Label><Input value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} /></div>
        <div className="space-y-2"><Label>Ethiopian Month</Label><Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex items-end"><Button onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh Report</Button></div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2}>T/L</TableHead><TableHead rowSpan={2}>Commodity Group</TableHead><TableHead rowSpan={2}>Commodity</TableHead><TableHead rowSpan={2}>Specification</TableHead><TableHead rowSpan={2}>Directorate</TableHead><TableHead rowSpan={2}>Team</TableHead>
              <TableHead colSpan={4} className="text-center">Annual Plan</TableHead><TableHead colSpan={4} className="text-center">This Month Plan</TableHead><TableHead colSpan={4} className="text-center">This Month Achievement</TableHead><TableHead colSpan={4} className="text-center">Up To This Month Achievement %</TableHead>
            </TableRow>
            <TableRow>
              {Array.from({ length: 4 }).flatMap(() => ['Procurement', 'Domestic', 'International', 'Employment']).map((h, i) => <TableHead key={`${h}-${i}`}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groups).map(([group, groupRows], groupIndex) => (
              <Fragment key={group}>
                <TableRow className="bg-muted/50 font-semibold"><TableCell>{groupIndex + 1}</TableCell><TableCell colSpan={21}>{group}</TableCell></TableRow>
                {groupRows.map((row) => (
                  <TableRow key={`${row.group}-${row.commodity}-${row.specification}`}>
                    <TableCell></TableCell><TableCell></TableCell><TableCell>{row.commodity}</TableCell><TableCell>{row.specification || '-'}</TableCell><TableCell>{row.directorate}</TableCell><TableCell>{row.team}</TableCell>
                    <TableCell>{fmt(row.annual.procurement_plan, row.unit)}</TableCell><TableCell>{fmt(row.annual.domestic_market_plan, row.unit)}</TableCell><TableCell>{fmt(row.annual.international_market_plan, row.unit)}</TableCell><TableCell>{fmt(row.annual.employment_total_plan)}</TableCell>
                    <TableCell>{fmt(row.monthPlan.procurement, row.unit)}</TableCell><TableCell>{fmt(row.monthPlan.domestic, row.unit)}</TableCell><TableCell>{fmt(row.monthPlan.international, row.unit)}</TableCell><TableCell>{fmt(row.monthPlan.total)}</TableCell>
                    <TableCell>{fmt(row.monthAch.procurement, row.unit)}</TableCell><TableCell>{fmt(row.monthAch.domestic, row.unit)}</TableCell><TableCell>{fmt(row.monthAch.international, row.unit)}</TableCell><TableCell>{fmt(row.monthAch.total)}</TableCell>
                    <TableCell>{fmt(pct(row.upToAch.procurement, row.upToPlan.procurement))}%</TableCell><TableCell>{fmt(pct(row.upToAch.domestic, row.upToPlan.domestic))}%</TableCell><TableCell>{fmt(pct(row.upToAch.international, row.upToPlan.international))}%</TableCell><TableCell>{fmt(pct(row.upToAch.total, row.upToPlan.total))}%</TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
