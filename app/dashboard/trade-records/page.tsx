"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, MessageSquare, Plus, RefreshCw, Send, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const ETHIOPIAN_MONTHS = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"];
const FISCAL_YEARS = ["2018", "2019", "2020", "2021"];

type WorkTypeOption = { id: number; name: string };
type WorkOption = { id: number; name: string; work_type_id: number };

type TradeRecord = {
  id: number;
  annual_plan_id?: number | null;
  fiscal_year: string;
  month?: string | null;
  period_type: "annual" | "monthly";
  commodity_group: string;
  commodity: string;
  unit: string;
  plan_product: number;
  plan_price: number;
  plan_income: number;
  achievement_product: number;
  achievement_price: number;
  achievement_income: number;
  employment_male_plan: number;
  employment_female_plan: number;
  employment_male_achievement: number;
  employment_female_achievement: number;
  directorate_name?: string;
  team_name?: string;
  status: string;
  review_comment?: string | null;
};

type Access = { canCreate: boolean; canUpdate: boolean; canApprove: boolean; canReport: boolean; groups: string[] };
type PlanningSettings = {
  fiscal_year: string;
  annual_plan_open: boolean | number;
  monthly_plan_open: boolean | number;
  monthly_achievement_open: boolean | number;
};

function numberFormat(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function TradeRecordsPage() {
  const [records, setRecords] = useState<TradeRecord[]>([]);
  const [access, setAccess] = useState<Access>({ canCreate: false, canUpdate: false, canApprove: false, canReport: false, groups: [] });
  const [settings, setSettings] = useState<PlanningSettings | null>(null);
  const [workTypes, setWorkTypes] = useState<WorkTypeOption[]>([]);
  const [works, setWorks] = useState<WorkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [annualOpen, setAnnualOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [achievementOpen, setAchievementOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<TradeRecord | null>(null);
  const [comment, setComment] = useState("");
  const [form, setForm] = useState({ fiscal_year: "2018", month: "Meskerem", commodity_group: "", commodity: "", unit: "Qt", plan_product: "0", plan_price: "0", plan_income: "0", achievement_product: "0", achievement_price: "0", achievement_income: "0", employment_male_plan: "0", employment_female_plan: "0", employment_male_achievement: "0", employment_female_achievement: "0" });

  const annualPlans = records.filter((row) => row.period_type === "annual");
  const monthlyPlans = records.filter((row) => row.period_type === "monthly");
  const fiscalYears = settings?.fiscal_year ? [settings.fiscal_year] : FISCAL_YEARS;
  const canCreateAnnualPlan = access.canCreate && workTypes.length > 0 && Number(settings?.annual_plan_open ?? 1) === 1;
  const selectedWorkType = workTypes.find((item) => item.name === form.commodity_group);
  const workOptions = useMemo(
    () => works.filter((item) => Number(item.work_type_id) === Number(selectedWorkType?.id)),
    [works, selectedWorkType?.id],
  );

  async function load() {
    setLoading(true);
    try {
      const [response, settingsResponse, workTypesResponse, worksResponse] = await Promise.all([
        api.get("/admin/trade-records"),
        api.get("/admin/planning-settings"),
        api.get("/admin/work-types?all=1&status=active"),
        api.get("/admin/works?all=1&status=active"),
      ]);
      setRecords(response.data.data ?? []);
      setAccess(response.data.meta?.access ?? { canCreate: false, canUpdate: false, canApprove: false, canReport: false, groups: [] });
      const nextSettings = settingsResponse.data?.data as PlanningSettings;
      setSettings(nextSettings);
      setWorkTypes(workTypesResponse.data?.data ?? []);
      setWorks(worksResponse.data?.data ?? []);
      setForm((current) => ({ ...current, fiscal_year: String(nextSettings?.fiscal_year ?? current.fiscal_year) }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load Trade records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openAnnual() {
    const firstWorkType = workTypes[0];
    const firstWork = works.find((item) => Number(item.work_type_id) === Number(firstWorkType?.id));
    setForm((value) => ({ ...value, commodity_group: firstWorkType?.name ?? "", commodity: firstWork?.name ?? "", plan_product: "0", plan_price: "0", plan_income: "0" }));
    setAnnualOpen(true);
  }

  function updateGroup(value: string) {
    const workType = workTypes.find((item) => item.name === value);
    const firstWork = works.find((item) => Number(item.work_type_id) === Number(workType?.id));
    setForm((old) => ({ ...old, commodity_group: value, commodity: firstWork?.name ?? "" }));
  }

  async function saveAnnual(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/admin/trade-records", { ...form, period_type: "annual" });
      toast.success("Annual plan submitted successfully");
      setAnnualOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to save annual plan");
    }
  }

  function openMonthly(row: TradeRecord) {
    setSelected(row);
    setForm((old) => ({ ...old, fiscal_year: row.fiscal_year, commodity_group: row.commodity_group, commodity: row.commodity, unit: row.unit, plan_product: "0", plan_price: String(row.plan_price ?? 0), plan_income: "0", month: "Meskerem" }));
    setMonthlyOpen(true);
  }

  async function saveMonthly(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await api.post("/admin/trade-records", { ...form, period_type: "monthly", annual_plan_id: selected.id });
      toast.success("Monthly plan submitted successfully");
      setMonthlyOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to save monthly plan");
    }
  }

  function openAchievement(row: TradeRecord) {
    setSelected(row);
    setForm((old) => ({ ...old, achievement_product: String(row.achievement_product ?? 0), achievement_price: String(row.achievement_price ?? row.plan_price ?? 0), achievement_income: String(row.achievement_income ?? 0), employment_male_achievement: String(row.employment_male_achievement ?? 0), employment_female_achievement: String(row.employment_female_achievement ?? 0) }));
    setAchievementOpen(true);
  }

  async function saveAchievement(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await api.patch(`/admin/trade-records/${selected.id}`, { action: "achievement", ...form });
      toast.success("Monthly achievement submitted successfully");
      setAchievementOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to save achievement");
    }
  }

  async function review(action: "approve" | "comment" | "return") {
    if (!selected) return;
    try {
      await api.patch(`/admin/trade-records/${selected.id}`, { action, comment });
      toast.success(action === "approve" ? "Record approved" : "Comment saved");
      setReviewOpen(false);
      setComment("");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Review failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Value Chain Plans</h1>
          <p className="text-muted-foreground">Procurement, domestic market linkage, international market linkage, foreign currency, and employment reporting.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard/trade-records/reports")}><BarChart3 className="mr-2 h-4 w-4" /> See Report</Button>
          {canCreateAnnualPlan && <Button onClick={openAnnual}><Plus className="mr-2 h-4 w-4" /> Create Annual Plan</Button>}
        </div>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Annual Plans</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Fiscal Year</TableHead><TableHead>Work Type</TableHead><TableHead>Work</TableHead><TableHead>Directorate</TableHead><TableHead>Team</TableHead><TableHead>Product</TableHead><TableHead>Price</TableHead><TableHead>Income/Expense</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {annualPlans.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.fiscal_year}</TableCell><TableCell>{row.commodity_group}</TableCell><TableCell>{row.commodity}</TableCell><TableCell>{row.directorate_name}</TableCell><TableCell>{row.team_name || "-"}</TableCell><TableCell>{numberFormat(row.plan_product)} {row.unit}</TableCell><TableCell>{numberFormat(row.plan_price)}</TableCell><TableCell>{numberFormat(row.plan_income)}</TableCell><TableCell><Badge variant="secondary">{row.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {access.canCreate && row.status === "approved" && <Button size="sm" variant="outline" disabled={Number(settings?.monthly_plan_open ?? 1) !== 1} onClick={() => openMonthly(row)}>Divide Monthly</Button>}
                      {access.canApprove && row.status !== "approved" && <Button size="sm" onClick={() => { setSelected(row); setReviewOpen(true); }}><CheckCircle2 className="mr-1 h-4 w-4" /> Review</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!annualPlans.length && <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No annual plans found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Monthly Plans and Achievements</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Work Type</TableHead><TableHead>Work</TableHead><TableHead>Plan Product</TableHead><TableHead>Plan Income</TableHead><TableHead>Achievement Product</TableHead><TableHead>Achievement Income</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {monthlyPlans.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.month}</TableCell><TableCell>{row.commodity_group}</TableCell><TableCell>{row.commodity}</TableCell><TableCell>{numberFormat(row.plan_product)} {row.unit}</TableCell><TableCell>{numberFormat(row.plan_income)}</TableCell><TableCell>{numberFormat(row.achievement_product)} {row.unit}</TableCell><TableCell>{numberFormat(row.achievement_income)}</TableCell><TableCell><Badge variant="secondary">{row.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {access.canUpdate && row.status !== "approved" && <Button size="sm" variant="outline" disabled={Number(settings?.monthly_achievement_open ?? 1) !== 1} onClick={() => openAchievement(row)}><TrendingUp className="mr-1 h-4 w-4" /> Achievement</Button>}
                      {access.canApprove && row.status !== "approved" && <Button size="sm" onClick={() => { setSelected(row); setReviewOpen(true); }}><MessageSquare className="mr-1 h-4 w-4" /> Review</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!monthlyPlans.length && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No monthly plans found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={annualOpen} onOpenChange={setAnnualOpen}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Create Annual Plan</DialogTitle></DialogHeader>
          <form onSubmit={saveAnnual} className="grid gap-4 md:grid-cols-3">
            <Field label="Fiscal Year"><Select value={form.fiscal_year} onValueChange={(v) => setForm({ ...form, fiscal_year: v })}><SelectTrigger><SelectValue placeholder="Select fiscal year" /></SelectTrigger><SelectContent>{fiscalYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Work Type"><Select value={form.commodity_group} onValueChange={updateGroup}><SelectTrigger><SelectValue placeholder="Select work type" /></SelectTrigger><SelectContent>{workTypes.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Work"><Select value={form.commodity} onValueChange={(v) => setForm({ ...form, commodity: v })}><SelectTrigger><SelectValue placeholder="Select work" /></SelectTrigger><SelectContent>{workOptions.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <NumberField label="Product" value={form.plan_product} onChange={(v) => setForm({ ...form, plan_product: v })} />
            <NumberField label="Price" value={form.plan_price} onChange={(v) => setForm({ ...form, plan_price: v })} />
            <NumberField label="Income/Expense" value={form.plan_income} onChange={(v) => setForm({ ...form, plan_income: v })} />
            <NumberField label="Employment Male" value={form.employment_male_plan} onChange={(v) => setForm({ ...form, employment_male_plan: v })} />
            <NumberField label="Employment Female" value={form.employment_female_plan} onChange={(v) => setForm({ ...form, employment_female_plan: v })} />
            <div className="md:col-span-3 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAnnualOpen(false)}>Cancel</Button><Button type="submit"><Send className="mr-2 h-4 w-4" /> Submit</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={monthlyOpen} onOpenChange={setMonthlyOpen}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Divide Annual Plan into Monthly Plan</DialogTitle></DialogHeader>
          <form onSubmit={saveMonthly} className="grid gap-4 md:grid-cols-3">
            <Field label="Fiscal Year"><Input value={form.fiscal_year} readOnly /></Field>
            <Field label="Month"><Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}><SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger><SelectContent>{ETHIOPIAN_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Work"><Input value={`${form.commodity_group} - ${form.commodity}`} readOnly /></Field>
            <NumberField label="Monthly Product" value={form.plan_product} onChange={(v) => setForm({ ...form, plan_product: v })} />
            <NumberField label="Price" value={form.plan_price} onChange={(v) => setForm({ ...form, plan_price: v })} />
            <NumberField label="Income/Expense" value={form.plan_income} onChange={(v) => setForm({ ...form, plan_income: v })} />
            <div className="md:col-span-3 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setMonthlyOpen(false)}>Cancel</Button><Button type="submit">Save Monthly Plan</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={achievementOpen} onOpenChange={setAchievementOpen}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Insert Monthly Achievement</DialogTitle></DialogHeader>
          <form onSubmit={saveAchievement} className="grid gap-4 md:grid-cols-3">
            <Field label="Monthly Plan"><Input value={selected ? `${selected.month} / ${selected.commodity_group} / ${selected.commodity}` : ""} readOnly /></Field>
            <NumberField label="Achievement Product" value={form.achievement_product} onChange={(v) => setForm({ ...form, achievement_product: v })} />
            <NumberField label="Achievement Price" value={form.achievement_price} onChange={(v) => setForm({ ...form, achievement_price: v })} />
            <NumberField label="Achievement Income/Expense" value={form.achievement_income} onChange={(v) => setForm({ ...form, achievement_income: v })} />
            <NumberField label="Employment Male" value={form.employment_male_achievement} onChange={(v) => setForm({ ...form, employment_male_achievement: v })} />
            <NumberField label="Employment Female" value={form.employment_female_achievement} onChange={(v) => setForm({ ...form, employment_female_achievement: v })} />
            <div className="md:col-span-3 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAchievementOpen(false)}>Cancel</Button><Button type="submit">Submit Achievement</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent><DialogHeader><DialogTitle>Review Trade Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm">{selected?.commodity_group} / {selected?.commodity}<br />{selected?.directorate_name} / {selected?.team_name || "Directorate"}</div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write comment..." />
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button><Button variant="outline" onClick={() => review("comment")}>Comment</Button><Button onClick={() => review("approve")}>Accept</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><Input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} /></Field>;
}
