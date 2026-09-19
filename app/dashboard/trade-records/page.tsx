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

const ETHIOPIAN_MONTHS = ["Meskerem","Tikimt","Hidar","Tahsas","Tir","Yekatit","Megabit","Miazia","Ginbot","Sene","Hamle","Nehase","Pagume"];
const FISCAL_YEARS = ["2018","2019","2020","2021"];
type ValueType = "price" | "cost";
type BusinessAreaOption = { id: number; name: string };
type ProductOption = { id: number; name: string; work_type_id: number };

type TradeRecord = {
  id: number; annual_plan_id?: number | null; fiscal_year: string; month?: string | null;
  period_type: "annual" | "monthly"; commodity_group: string; commodity: string; scope_type?: "crop_type" | "livestock_type"; scope_value?: string; unit: string;
  value_type?: ValueType | null;
  plan_product: number; plan_price: number; plan_income: number;
  achievement_product: number; achievement_price: number; achievement_income: number;
  employment_male_plan: number; employment_female_plan: number;
  employment_male_achievement: number; employment_female_achievement: number;
  directorate_name?: string; team_name?: string; status: string; review_comment?: string | null;
};
type Access = { canCreate: boolean; canUpdate: boolean; canApprove: boolean; canReport: boolean; groups: string[]; modules?: string[]; cropTypes?: string[]; livestockTypes?: string[] };
type CropType = { id:number; name:string };
type Crop = { id:number; name:string; crop_type_id?:number|null; crop_type_name?:string|null };
type LivestockType = { id:number; name:string };
type Livestock = { id:number; name:string; livestock_type_id?:number|null; livestock_type_name?:string|null };
type PlanningSettings = { fiscal_year: string; fiscal_years?: string[]; annual_plan_open: boolean | number; monthly_plan_open: boolean | number; monthly_achievement_open: boolean | number };

const emptyForm = {
  fiscal_year: "2018", month: "Meskerem", commodity_group: "", commodity: "", scope_type: "crop_type", scope_value: "", unit: "Unit",
  value_type: "price" as ValueType,
  plan_product: "0", plan_price: "0", plan_income: "0",
  achievement_product: "0", achievement_price: "0", achievement_income: "0",
  employment_male_plan: "0", employment_female_plan: "0",
  employment_male_achievement: "0", employment_female_achievement: "0",
};

function numberFormat(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function calculated(quantity: string | number, value: string | number) {
  return Number(quantity || 0) * Number(value || 0);
}
function resultLabel(type?: string | null) {
  return type === "cost" ? "Expense" : "Revenue";
}
function valueTypeLabel(type?: string | null) {
  return type === "cost" ? "Cost" : "Price";
}

export default function TradeRecordsPage() {
  const [records, setRecords] = useState<TradeRecord[]>([]);
  const [access, setAccess] = useState<Access>({ canCreate:false, canUpdate:false, canApprove:false, canReport:false, groups:[] });
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [livestockTypes, setLivestockTypes] = useState<LivestockType[]>([]);
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [settings, setSettings] = useState<PlanningSettings | null>(null);
  const [businessAreas, setBusinessAreas] = useState<BusinessAreaOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [annualOpen, setAnnualOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [achievementOpen, setAchievementOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<TradeRecord | null>(null);
  const [comment, setComment] = useState("");
  const [form, setForm] = useState(emptyForm);

  const annualPlans = records.filter((r) => r.period_type === "annual");
  const monthlyPlans = records.filter((r) => r.period_type === "monthly");
  const fiscalYears = settings?.fiscal_years?.length ? settings.fiscal_years : settings?.fiscal_year ? [settings.fiscal_year] : FISCAL_YEARS;
  useEffect(()=>{
    let active=true;
    Promise.all([
      api.get("/admin/crop-types?all=1"),
      api.get("/admin/crops?all=1"),
      api.get("/admin/livestock-types?all=1"),
      api.get("/admin/livestock-products?all=1"),
    ]).then(([ct,c,lt,l])=>{
      if(!active)return;
      const pick=(r:any)=>r?.data?.data??r?.data??[];
      setCropTypes(pick(ct)); setCrops(pick(c)); setLivestockTypes(pick(lt)); setLivestock(pick(l));
    }).catch(()=>{});
    return()=>{active=false};
  },[]);

  const assignedModules=(access.modules ?? []).filter((m)=>m==="crop"||m==="livestock");
  const assignedCropTypes=access.cropTypes ?? [];
  const assignedLivestockTypes=access.livestockTypes ?? [];
  const hasAssignedCrops=assignedModules.includes("crop") && assignedCropTypes.length>0;
  const hasAssignedLivestock=assignedModules.includes("livestock") && assignedLivestockTypes.length>0;
  const isLivestockMarket=form.scope_type==="livestock_type";
  const selectedCropType=cropTypes.find(x=>x.name===form.scope_value);
  const selectedLivestockType=livestockTypes.find(x=>x.name===form.scope_value);
  const cropOptions=crops.filter(x=>selectedCropType && (Number(x.crop_type_id)===Number(selectedCropType.id) || x.crop_type_name===selectedCropType.name));
  const livestockOptions=livestock.filter(x=>selectedLivestockType && (Number(x.livestock_type_id)===Number(selectedLivestockType.id) || x.livestock_type_name===selectedLivestockType.name));

  const canCreateAnnualPlan = access.canCreate && businessAreas.length > 0 && assignedModules.length > 0 && (hasAssignedCrops || hasAssignedLivestock) && Number(settings?.annual_plan_open ?? 1) === 1;
  const planCalculated = calculated(form.plan_product, form.plan_price);
  const achievementCalculated = calculated(form.achievement_product, form.achievement_price);

  async function load() {
    setLoading(true);
    try {
      const [response, settingsResponse, areasResponse, productsResponse, accessResponse] = await Promise.all([
        api.get("/admin/trade-records"),
        api.get("/admin/planning-settings"),
        api.get(`/admin/work-types?all=1&status=active&_=${Date.now()}`),
        api.get("/admin/works?all=1&status=active"),
        api.get("/admin/trade-records/access"),
      ]);
      setRecords(response.data.data ?? []);
      setAccess(accessResponse.data?.data ?? response.data.meta?.access ?? { canCreate:false, canUpdate:false, canApprove:false, canReport:false, groups:[] });
      const nextSettings = settingsResponse.data?.data as PlanningSettings;
      setSettings(nextSettings);
      setBusinessAreas(areasResponse.data?.data ?? []);
      setProducts(productsResponse.data?.data ?? []);
      setForm((c) => ({ ...c, fiscal_year: String(nextSettings?.fiscal_years?.[0] ?? nextSettings?.fiscal_year ?? c.fiscal_year) }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load Trade records");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openAnnual() {
    const firstMarketType=businessAreas[0]?.name ?? "";
    const firstModule=assignedModules.includes("crop") ? "crop" : assignedModules[0] ?? (hasAssignedCrops ? "crop" : "livestock");
    const firstScopeType: "crop_type" | "livestock_type" = firstModule==="livestock" ? "livestock_type" : "crop_type";
    const firstScopeValue=firstScopeType==="crop_type" ? assignedCropTypes[0] ?? "" : assignedLivestockTypes[0] ?? "";
    setForm((c) => ({
      ...c, commodity_group:firstMarketType, scope_type:firstScopeType, scope_value:firstScopeValue, commodity:"",
      value_type:"price", plan_product:"0", plan_price:"0", plan_income:"0",
    }));
    setAnnualOpen(true);
  }

  function updateBusinessArea(value: string) {
    setForm((c) => ({ ...c, commodity_group:value }));
  }
  function updateAssignedType(value:string) {
    setForm((c)=>({...c,scope_value:value,commodity:""}));
  }

  async function saveAnnual(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/admin/trade-records", {
        ...form, period_type:"annual", plan_income:planCalculated,
      });
      toast.success("Annual plan submitted successfully");
      setAnnualOpen(false); await load();
    } catch (error:any) { toast.error(error.message || "Failed to save annual plan"); }
  }

  function openMonthly(row: TradeRecord) {
    setSelected(row);
    setForm((c) => ({
      ...c, fiscal_year:row.fiscal_year, commodity_group:row.commodity_group, commodity:row.commodity,
      unit:row.unit, value_type:(row.value_type === "cost" ? "cost" : "price"),
      plan_product:"0", plan_price:String(row.plan_price ?? 0), plan_income:"0", month:"Meskerem",
    }));
    setMonthlyOpen(true);
  }
  async function saveMonthly(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await api.post("/admin/trade-records", {
        ...form, period_type:"monthly", annual_plan_id:selected.id, plan_income:planCalculated,
      });
      toast.success("Monthly plan submitted successfully");
      setMonthlyOpen(false); await load();
    } catch (error:any) { toast.error(error.message || "Failed to save monthly plan"); }
  }

  function openAchievement(row: TradeRecord) {
    setSelected(row);
    setForm((c) => ({
      ...c, value_type:(row.value_type === "cost" ? "cost" : "price"),
      achievement_product:String(row.achievement_product ?? 0),
      achievement_price:String(row.achievement_price ?? row.plan_price ?? 0),
      achievement_income:String(row.achievement_income ?? 0),
      employment_male_achievement:String(row.employment_male_achievement ?? 0),
      employment_female_achievement:String(row.employment_female_achievement ?? 0),
    }));
    setAchievementOpen(true);
  }
  async function saveAchievement(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await api.patch(`/admin/trade-records/${selected.id}`, {
        action:"achievement", ...form, achievement_income:achievementCalculated,
      });
      toast.success("Monthly achievement submitted successfully");
      setAchievementOpen(false); await load();
    } catch (error:any) { toast.error(error.message || "Failed to save achievement"); }
  }

  async function review(action:"approve"|"comment"|"return") {
    if (!selected) return;
    try {
      await api.patch(`/admin/trade-records/${selected.id}`, { action, comment });
      toast.success(action === "approve" ? "Record approved" : action === "return" ? "Record returned" : "Comment saved");
      setReviewOpen(false); setComment(""); await load();
    } catch (error:any) { toast.error(error.message || "Review failed"); }
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trade Office Plan & Achievement</h1>
        <p className="text-muted-foreground">Your form and data are automatically limited to your assigned Trade Team or Directorate.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        <Button variant="outline" onClick={() => window.location.href="/dashboard/trade-records/reports"}><BarChart3 className="mr-2 h-4 w-4" /> See Report</Button>
        {canCreateAnnualPlan && <Button onClick={openAnnual}><Plus className="mr-2 h-4 w-4" /> Create Annual Plan</Button>}
      </div>
    </div>

    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Annual Plans</h2>
      <div className="overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>Fiscal Year</TableHead><TableHead>Market Type</TableHead><TableHead>Commodity</TableHead>
          <TableHead>Directorate</TableHead><TableHead>Team</TableHead><TableHead>Quantity</TableHead>
          <TableHead>Value Type</TableHead><TableHead>Value</TableHead><TableHead>Revenue / Expense</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {annualPlans.map((row) => <TableRow key={row.id}>
            <TableCell>{row.fiscal_year}</TableCell><TableCell>{row.commodity_group}</TableCell><TableCell>{row.commodity}</TableCell>
            <TableCell>{row.directorate_name}</TableCell><TableCell>{row.team_name || "-"}</TableCell>
            <TableCell>{numberFormat(row.plan_product)} {row.unit}</TableCell>
            <TableCell>{valueTypeLabel(row.value_type)}</TableCell><TableCell>{numberFormat(row.plan_price)}</TableCell>
            <TableCell><span className="font-medium">{resultLabel(row.value_type)}:</span> {numberFormat(row.plan_income)}</TableCell>
            <TableCell><Badge variant="secondary">{row.status}</Badge></TableCell>
            <TableCell className="text-right"><div className="flex justify-end gap-2">
              {access.canCreate && row.status === "approved" && <Button size="sm" variant="outline"
                disabled={Number(settings?.monthly_plan_open ?? 1)!==1} onClick={() => openMonthly(row)}>Divide Monthly</Button>}
              {access.canApprove && row.status !== "approved" && <Button size="sm"
                onClick={() => { setSelected(row); setReviewOpen(true); }}><CheckCircle2 className="mr-1 h-4 w-4" /> Review</Button>}
            </div></TableCell>
          </TableRow>)}
          {!annualPlans.length && <TableRow><TableCell colSpan={11} className="py-8 text-center text-muted-foreground">No annual plans found.</TableCell></TableRow>}
        </TableBody>
      </Table></div>
    </section>

    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Monthly Plans and Achievements</h2>
      <div className="overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>Month</TableHead><TableHead>Market Type</TableHead><TableHead>Commodity</TableHead>
          <TableHead>Plan Quantity</TableHead><TableHead>Plan Revenue/Expense</TableHead>
          <TableHead>Achievement Quantity</TableHead><TableHead>Achievement Revenue/Expense</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {monthlyPlans.map((row) => <TableRow key={row.id}>
            <TableCell>{row.month}</TableCell><TableCell>{row.commodity_group}</TableCell><TableCell>{row.commodity}</TableCell>
            <TableCell>{numberFormat(row.plan_product)} {row.unit}</TableCell><TableCell>{numberFormat(row.plan_income)}</TableCell>
            <TableCell>{numberFormat(row.achievement_product)} {row.unit}</TableCell><TableCell>{numberFormat(row.achievement_income)}</TableCell>
            <TableCell><Badge variant="secondary">{row.status}</Badge></TableCell>
            <TableCell className="text-right"><div className="flex justify-end gap-2">
              {access.canUpdate && row.status !== "approved" && <Button size="sm" variant="outline"
                disabled={Number(settings?.monthly_achievement_open ?? 1)!==1} onClick={() => openAchievement(row)}>
                <TrendingUp className="mr-1 h-4 w-4" /> Achievement</Button>}
              {access.canApprove && row.status !== "approved" && <Button size="sm"
                onClick={() => { setSelected(row); setReviewOpen(true); }}><MessageSquare className="mr-1 h-4 w-4" /> Review</Button>}
            </div></TableCell>
          </TableRow>)}
          {!monthlyPlans.length && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No monthly plans found.</TableCell></TableRow>}
        </TableBody>
      </Table></div>
    </section>

    <Dialog open={annualOpen} onOpenChange={setAnnualOpen}>
      <DialogContent className="max-w-4xl bg-white">
        <DialogHeader><DialogTitle>Create Annual Plan</DialogTitle></DialogHeader>
        <form onSubmit={saveAnnual} className="grid gap-4 md:grid-cols-3">
          <Field label="Fiscal Year"><Select value={form.fiscal_year} onValueChange={(v) => setForm({...form,fiscal_year:v})}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent className="z-[100] max-h-64 bg-white">
              {fiscalYears.map((y)=><SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent></Select></Field>

          <Field label="Market Type"><Select value={form.commodity_group} onValueChange={updateBusinessArea}>
            <SelectTrigger><SelectValue placeholder="Select market type" /></SelectTrigger>
            <SelectContent className="z-[100] max-h-64 overflow-y-auto bg-white">
              {businessAreas.map((x)=><SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}
            </SelectContent></Select></Field>

          <Field label="Module">
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium text-foreground">
              {form.scope_type==="livestock_type" ? "Livestock" : "Crop"}
            </div>
          </Field>

          <Field label="Allowed Types">
            <Select value={form.scope_value} onValueChange={updateAssignedType}>
              <SelectTrigger><SelectValue placeholder={isLivestockMarket ? "Select allowed livestock type" : "Select allowed crop type"} /></SelectTrigger>
              <SelectContent className="z-[100] max-h-64 overflow-y-auto bg-white">
                {(form.scope_type==="livestock_type" ? assignedLivestockTypes : assignedCropTypes).length===0
                  ? <SelectItem value="__none" disabled>No allowed types assigned</SelectItem>
                  : (form.scope_type==="livestock_type" ? assignedLivestockTypes : assignedCropTypes)
                      .map((name)=><SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label={isLivestockMarket ? "Livestock" : "Crop"}><Select value={form.commodity} onValueChange={(v)=>setForm({...form,commodity:v})}>
            <SelectTrigger><SelectValue placeholder={isLivestockMarket ? "Select livestock" : "Select crop"} /></SelectTrigger>
            <SelectContent className="z-[100] max-h-64 overflow-y-auto bg-white">
              {(isLivestockMarket ? livestockOptions : cropOptions).map((x)=><SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}
            </SelectContent></Select></Field>

          <NumberField label="Quantity" value={form.plan_product} onChange={(v)=>setForm({...form,plan_product:v})} />

          <Field label="Price / Cost"><Select value={form.value_type} onValueChange={(v:ValueType)=>setForm({...form,value_type:v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="z-[100] bg-white"><SelectItem value="price">Price</SelectItem><SelectItem value="cost">Cost</SelectItem></SelectContent>
          </Select></Field>

          <NumberField label="Value" value={form.plan_price} onChange={(v)=>setForm({...form,plan_price:v})} />
          <Field label={resultLabel(form.value_type)}><Input value={numberFormat(planCalculated)} readOnly className="bg-muted/30 font-semibold" /></Field>
          <NumberField label="Employment Male" value={form.employment_male_plan} onChange={(v)=>setForm({...form,employment_male_plan:v})} />
          <NumberField label="Employment Female" value={form.employment_female_plan} onChange={(v)=>setForm({...form,employment_female_plan:v})} />
          <div className="md:col-span-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setAnnualOpen(false)}>Cancel</Button>
            <Button type="submit"><Send className="mr-2 h-4 w-4" /> Submit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={monthlyOpen} onOpenChange={setMonthlyOpen}>
      <DialogContent className="max-w-4xl bg-white">
        <DialogHeader><DialogTitle>Divide Annual Plan into Monthly Plan</DialogTitle></DialogHeader>
        <form onSubmit={saveMonthly} className="grid gap-4 md:grid-cols-3">
          <Field label="Fiscal Year"><Input value={form.fiscal_year} readOnly /></Field>
          <Field label="Month"><Select value={form.month} onValueChange={(v)=>setForm({...form,month:v})}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent className="z-[100] max-h-64 bg-white">
              {ETHIOPIAN_MONTHS.map((m)=><SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent></Select></Field>
          <Field label="Market Type / Product"><Input value={`${form.commodity_group} - ${form.commodity}`} readOnly /></Field>
          <NumberField label="Monthly Quantity" value={form.plan_product} onChange={(v)=>setForm({...form,plan_product:v})} />
          <Field label="Price / Cost"><Input value={valueTypeLabel(form.value_type)} readOnly /></Field>
          <NumberField label="Value" value={form.plan_price} onChange={(v)=>setForm({...form,plan_price:v})} />
          <Field label={resultLabel(form.value_type)}><Input value={numberFormat(planCalculated)} readOnly className="bg-muted/30 font-semibold" /></Field>
          <div className="md:col-span-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setMonthlyOpen(false)}>Cancel</Button>
            <Button type="submit">Save Monthly Plan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={achievementOpen} onOpenChange={setAchievementOpen}>
      <DialogContent className="max-w-4xl bg-white">
        <DialogHeader><DialogTitle>Insert Monthly Achievement</DialogTitle></DialogHeader>
        <form onSubmit={saveAchievement} className="grid gap-4 md:grid-cols-3">
          <Field label="Monthly Plan"><Input value={selected ? `${selected.month} / ${selected.commodity_group} / ${selected.commodity}` : ""} readOnly /></Field>
          <NumberField label="Achievement Quantity" value={form.achievement_product} onChange={(v)=>setForm({...form,achievement_product:v})} />
          <Field label="Price / Cost"><Input value={valueTypeLabel(form.value_type)} readOnly /></Field>
          <NumberField label="Achievement Value" value={form.achievement_price} onChange={(v)=>setForm({...form,achievement_price:v})} />
          <Field label={`Achievement ${resultLabel(form.value_type)}`}><Input value={numberFormat(achievementCalculated)} readOnly className="bg-muted/30 font-semibold" /></Field>
          <NumberField label="Employment Male" value={form.employment_male_achievement} onChange={(v)=>setForm({...form,employment_male_achievement:v})} />
          <NumberField label="Employment Female" value={form.employment_female_achievement} onChange={(v)=>setForm({...form,employment_female_achievement:v})} />
          <div className="md:col-span-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setAchievementOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Achievement</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
      <DialogContent className="bg-white"><DialogHeader><DialogTitle>Review Trade Record</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-3 text-sm"><b>Market Type:</b> {selected?.commodity_group}<br/><b>Product:</b> {selected?.commodity}<br/>{selected?.directorate_name} / {selected?.team_name || "Directorate"}</div>
          <Textarea value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="Write comment..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>setReviewOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={()=>review("return")}>Return</Button>
            <Button variant="outline" onClick={()=>review("comment")}>Comment</Button>
            <Button onClick={()=>review("approve")}>Accept</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
function NumberField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) {
  return <Field label={label}><Input type="number" min="0" step="any" value={value} onChange={(e)=>onChange(e.target.value)} /></Field>;
}
