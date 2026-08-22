'use client';

import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, BarChart3, Pencil, MessageSquare, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { authService } from '@/services/auth/auth.service';
import type { TradeRecordItem, TradeRecordFormInput } from '@/types/location/trade-record.type';

const ETHIOPIAN_MONTHS = [
  [1, 'Meskerem'], [2, 'Tikimt'], [3, 'Hidar'], [4, 'Tahsas'], [5, 'Tir'], [6, 'Yekatit'], [7, 'Megabit'],
  [8, 'Miazia'], [9, 'Ginbot'], [10, 'Sene'], [11, 'Hamle'], [12, 'Nehase'], [13, 'Pagume'],
] as const;

const TRADE_CATALOG: Record<string, string[]> = {
  Coffee: ['Red Coffee', 'Unwashed Coffee', 'Washed Coffee', 'Coffee Husk', 'Exported Coffee', 'Foreign Currency Earned'],
  Tea: ['Green Tea', 'Dried Tea', 'Processed Tea', 'Exported Tea', 'Foreign Currency Earned'],
  Spices: ['Chili Pepper', 'Black Cumin', 'Rosemary', 'Ginger'],
  Vegetables: ['Banana', 'Tomato', 'Red Onion', 'White Onion'],
  Fruits: ['Avocado', 'Orange', 'Papaya', 'Mango', 'Citrus'],
  Cereals: ['Hybrid Maize', 'Bread Wheat', 'Pasta Wheat', 'Malt Barley', 'Rice'],
  Pulses: ['White Haricot Bean', 'Red Haricot Bean', 'Speckled Bean', 'Faba Bean', 'Mung Bean'],
  'Oil Seeds': ['Sesame', 'Niger Seed', 'Sunflower'],
  'Live Animals': ['Cattle', 'Sheep', 'Goat', 'Camel'],
  Dairy: ['Cow Milk', 'Goat Milk', 'Camel Milk'],
  Meat: ['Beef', 'Mutton', 'Goat Meat', 'Camel Meat'],
  'Honey and Beeswax': ['Honey', 'Beeswax'],
  Poultry: ['Live Poultry'],
  'Poultry Meat': ['Poultry Meat'],
  Eggs: ['Eggs'],
  Fish: ['Fish'],
  'Livestock Employment': ['Male', 'Female', 'Total'],
};

function currentFiscalYear() {
  const date = new Date();
  return String(date.getFullYear() - (date.getMonth() > 8 || (date.getMonth() === 8 && date.getDate() >= 11) ? 7 : 8));
}

function tokenHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } as Record<string, string>;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...init, headers: { ...tokenHeaders(), ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) throw new Error(body?.message || 'Request failed');
  return body.data;
}

function n(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function fmt(value: unknown, unit = '') { const out = n(value).toLocaleString(undefined, { maximumFractionDigits: 2 }); return unit ? `${out} ${unit}` : out; }
function monthName(value: unknown) { return ETHIOPIAN_MONTHS.find(([id]) => id === Number(value))?.[1] ?? '-'; }
function normalize(value: unknown) { return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function normalizePhone(value: unknown) { return String(value ?? '').replace(/\s+/g, '').trim(); }
function canReview(user: any) { const s = [user?.name, user?.email, user?.role, ...(user?.roles ?? [])].map(normalize).join(' '); return normalizePhone(user?.phone) === '+251900000503' || s.includes('manufacturing value chain') || s.includes('super admin'); }
function canWrite(user: any) { return !!user && !canReview(user); }

const emptyForm: TradeRecordFormInput = {
  period_type: 'annual', fiscal_year: currentFiscalYear(), commodity_group: 'Coffee', commodity: 'Red Coffee', specification: '', unit: 'Qt', currency_unit: 'USD',
  procurement_plan: 0, domestic_market_plan: 0, international_market_plan: 0, export_quantity_plan: 0, foreign_currency_plan: 0,
  employment_male_plan: 0, employment_female_plan: 0,
  procurement_achievement: 0, domestic_market_achievement: 0, international_market_achievement: 0, export_quantity_achievement: 0, foreign_currency_achievement: 0,
  employment_male_achievement: 0, employment_female_achievement: 0,
};

export function TradeRecordsPage() {
  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<TradeRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [achievementRecord, setAchievementRecord] = useState<TradeRecordItem | null>(null);
  const [decisionRecord, setDecisionRecord] = useState<TradeRecordItem | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<'plan' | 'achievement'>('plan');
  const [form, setForm] = useState<TradeRecordFormInput>(emptyForm);

  const userCanWrite = canWrite(user);
  const userCanReview = canReview(user);
  const annualPlans = useMemo(() => rows.filter((row) => row.period_type === 'annual'), [rows]);
  const monthlyRows = useMemo(() => rows.filter((row) => row.period_type === 'monthly'), [rows]);
  const availableCommodities = TRADE_CATALOG[form.commodity_group] ?? [];

  async function load() {
    setLoading(true);
    try {
      setUser(authService.getStoredUser());
      const data = await request<TradeRecordItem[]>('/api/admin/trade-records?all=1');
      setRows(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load Trade records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = { ...form, employment_total_plan: n(form.employment_male_plan) + n(form.employment_female_plan) };
      await request('/api/admin/trade-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      toast.success('Trade record saved successfully');
      setDialogOpen(false);
      setForm(emptyForm);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Save failed');
    }
  }

  async function saveAchievement(event: FormEvent) {
    event.preventDefault();
    if (!achievementRecord) return;
    try {
      await request(`/api/admin/trade-records/${achievementRecord.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...achievementRecord, ...form, period_type: 'monthly', annual_plan_id: achievementRecord.annual_plan_id }),
      });
      toast.success('Achievement saved successfully');
      setAchievementRecord(null);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Achievement save failed');
    }
  }

  async function decision(action: 'accept' | 'comment' | 'return') {
    if (!decisionRecord) return;
    try {
      await request(`/api/admin/trade-records/${decisionRecord.id}/decision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: decisionTarget, action, comment: decisionComment }),
      });
      toast.success('Decision saved successfully');
      setDecisionRecord(null); setDecisionComment('');
      await load();
    } catch (error: any) { toast.error(error.message || 'Decision failed'); }
  }

  function openMonthly(annual: TradeRecordItem) {
    setForm({ ...emptyForm, period_type: 'monthly', annual_plan_id: annual.id, fiscal_year: annual.fiscal_year, commodity_group: annual.commodity_group, commodity: annual.commodity, specification: annual.specification ?? '', unit: annual.unit, currency_unit: annual.currency_unit, month: 1 });
    setDialogOpen(true);
  }

  function openAchievement(row: TradeRecordItem) {
    setAchievementRecord(row);
    setForm({
      ...emptyForm, period_type: 'monthly', annual_plan_id: row.annual_plan_id, fiscal_year: row.fiscal_year, month: row.month, commodity_group: row.commodity_group, commodity: row.commodity, specification: row.specification ?? '', unit: row.unit, currency_unit: row.currency_unit,
      procurement_plan: row.procurement_plan, domestic_market_plan: row.domestic_market_plan, international_market_plan: row.international_market_plan, export_quantity_plan: row.export_quantity_plan, foreign_currency_plan: row.foreign_currency_plan,
      employment_male_plan: row.employment_male_plan, employment_female_plan: row.employment_female_plan,
      procurement_achievement: row.procurement_achievement, domestic_market_achievement: row.domestic_market_achievement, international_market_achievement: row.international_market_achievement, export_quantity_achievement: row.export_quantity_achievement,
      foreign_currency_achievement: row.foreign_currency_achievement, employment_male_achievement: row.employment_male_achievement, employment_female_achievement: row.employment_female_achievement,
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trade Value Chain Plans</h1>
          <p className="text-sm text-muted-foreground">Procurement, domestic linkage, international linkage, foreign currency, and employment reporting.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button asChild variant="outline"><Link href="/dashboard/trade-records/reports"><BarChart3 className="mr-2 h-4 w-4" />See Report</Link></Button>
          {userCanWrite && <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Create Annual Plan</Button>}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Annual Plans</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Fiscal Year</TableHead><TableHead>Group</TableHead><TableHead>Commodity</TableHead><TableHead>Directorate</TableHead><TableHead>Team</TableHead><TableHead>Procurement</TableHead><TableHead>Domestic</TableHead><TableHead>International</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {annualPlans.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.fiscal_year}</TableCell><TableCell>{row.commodity_group}</TableCell><TableCell>{row.commodity}</TableCell><TableCell>{row.directorate_name ?? '-'}</TableCell><TableCell>{row.team_name ?? '-'}</TableCell>
                  <TableCell>{fmt(row.procurement_plan, row.unit)}</TableCell><TableCell>{fmt(row.domestic_market_plan, row.unit)}</TableCell><TableCell>{fmt(row.international_market_plan, row.unit)}</TableCell>
                  <TableCell><Badge variant="secondary">{row.plan_status}</Badge></TableCell>
                  <TableCell className="space-x-2">
                    {userCanWrite && row.plan_status === 'accepted' && <Button size="sm" variant="outline" onClick={() => openMonthly(row)}>Divide Monthly</Button>}
                    {userCanReview && <Button size="sm" variant="outline" onClick={() => { setDecisionRecord(row); setDecisionTarget('plan'); }}><MessageSquare className="mr-1 h-3 w-3" />Review</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Monthly Plans and Achievements</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Group</TableHead><TableHead>Commodity</TableHead><TableHead>Plan Procurement</TableHead><TableHead>Achievement Procurement</TableHead><TableHead>Plan Employment</TableHead><TableHead>Achievement Employment</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {monthlyRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{monthName(row.month)}</TableCell><TableCell>{row.commodity_group}</TableCell><TableCell>{row.commodity}</TableCell>
                  <TableCell>{fmt(row.procurement_plan, row.unit)}</TableCell><TableCell>{fmt(row.procurement_achievement, row.unit)}</TableCell>
                  <TableCell>{fmt(row.employment_total_plan)}</TableCell><TableCell>{fmt(row.employment_total_achievement)}</TableCell>
                  <TableCell><Badge variant="secondary">{row.achievement_status}</Badge></TableCell>
                  <TableCell className="space-x-2">
                    {userCanWrite && row.achievement_status !== 'accepted' && <Button size="sm" variant="outline" onClick={() => openAchievement(row)}><Pencil className="mr-1 h-3 w-3" />Achievement</Button>}
                    {userCanReview && <Button size="sm" variant="outline" onClick={() => { setDecisionRecord(row); setDecisionTarget('achievement'); }}><CheckCircle2 className="mr-1 h-3 w-3" />Review</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TradeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} form={form} setForm={setForm} onSubmit={submit} commodities={availableCommodities} />
      <AchievementDialog record={achievementRecord} form={form} setForm={setForm} onOpenChange={(open) => !open && setAchievementRecord(null)} onSubmit={saveAchievement} />
      <Dialog open={!!decisionRecord} onOpenChange={(open) => !open && setDecisionRecord(null)}>
        <DialogContent><DialogHeader><DialogTitle>Review Trade {decisionTarget}</DialogTitle></DialogHeader>
          <Textarea value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} placeholder="Write comment" />
          <DialogFooter><Button variant="outline" onClick={() => decision('comment')}>Comment</Button><Button variant="outline" onClick={() => decision('return')}>Return</Button><Button onClick={() => decision('accept')}>Accept</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function NumberInput({ value, onChange }: { value: unknown; onChange: (value: number) => void }) { return <Input type="number" min="0" value={String(value ?? 0)} onChange={(e) => onChange(n(e.target.value))} />; }

function Metrics({ form, setForm, prefix }: { form: TradeRecordFormInput; setForm: (value: TradeRecordFormInput) => void; prefix: 'plan' | 'achievement' }) {
  const suffix = prefix === 'plan' ? '_plan' : '_achievement';
  const set = (key: string, value: number) => setForm({ ...form, [`${key}${suffix}`]: value } as TradeRecordFormInput);
  return <div className="grid gap-4 md:grid-cols-3">
    <Field label="Procurement"><NumberInput value={(form as any)[`procurement${suffix}`]} onChange={(v) => set('procurement', v)} /></Field>
    <Field label="Domestic Market"><NumberInput value={(form as any)[`domestic_market${suffix}`]} onChange={(v) => set('domestic_market', v)} /></Field>
    <Field label="International Market"><NumberInput value={(form as any)[`international_market${suffix}`]} onChange={(v) => set('international_market', v)} /></Field>
    <Field label="Export Quantity"><NumberInput value={(form as any)[`export_quantity${suffix}`]} onChange={(v) => set('export_quantity', v)} /></Field>
    <Field label="Foreign Currency"><NumberInput value={(form as any)[`foreign_currency${suffix}`]} onChange={(v) => set('foreign_currency', v)} /></Field>
    <Field label="Male Employment"><NumberInput value={(form as any)[`employment_male${suffix}`]} onChange={(v) => set('employment_male', v)} /></Field>
    <Field label="Female Employment"><NumberInput value={(form as any)[`employment_female${suffix}`]} onChange={(v) => set('employment_female', v)} /></Field>
  </div>;
}

function TradeFormDialog({ open, onOpenChange, form, setForm, onSubmit, commodities }: any) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>{form.period_type === 'annual' ? 'Create Annual Trade Plan' : 'Divide Annual Plan into Monthly Plan'}</DialogTitle></DialogHeader>
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Fiscal Year"><Input value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} /></Field>
        {form.period_type === 'monthly' && <Field label="Ethiopian Month"><Select value={String(form.month ?? 1)} onValueChange={(v) => setForm({ ...form, month: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ETHIOPIAN_MONTHS.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}</SelectContent></Select></Field>}
        <Field label="Commodity Group"><Select value={form.commodity_group} onValueChange={(v) => setForm({ ...form, commodity_group: v, commodity: TRADE_CATALOG[v]?.[0] ?? '' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.keys(TRADE_CATALOG).map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Commodity"><Select value={form.commodity} onValueChange={(v) => setForm({ ...form, commodity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{commodities.map((item: string) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Specification"><Input value={form.specification ?? ''} onChange={(e) => setForm({ ...form, specification: e.target.value })} /></Field>
        <Field label="Unit"><Input value={form.unit ?? 'Qt'} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
      </div>
      <Metrics form={form} setForm={setForm} prefix="plan" />
      <DialogFooter><Button type="submit">Save</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

function AchievementDialog({ record, form, setForm, onOpenChange, onSubmit }: any) {
  return <Dialog open={!!record} onOpenChange={onOpenChange}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Insert Monthly Achievement</DialogTitle></DialogHeader>
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4 text-sm"><div><b>Fiscal Year</b><br />{record?.fiscal_year}</div><div><b>Month</b><br />{monthName(record?.month)}</div><div><b>Group</b><br />{record?.commodity_group}</div><div><b>Commodity</b><br />{record?.commodity}</div></div>
      <Metrics form={form} setForm={setForm} prefix="achievement" />
      <DialogFooter><Button type="submit">Save Achievement</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
