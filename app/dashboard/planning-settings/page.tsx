"use client";
import { useEffect, useState } from "react";
import { CalendarClock, Loader2, LockKeyhole, Plus, Save, Target, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import type { PlanningSettings } from "@/types/location/planning-record.type";

type Form={fiscal_years:string[];annual_plan_open:boolean;monthly_plan_open:boolean;monthly_achievement_open:boolean};
const initial:Form={fiscal_years:[],annual_plan_open:false,monthly_plan_open:false,monthly_achievement_open:false};
const enabled=(v:boolean|number)=>v===true||v===1;
export default function PlanningSettingsPage(){
 const [form,setForm]=useState<Form>(initial); const [year,setYear]=useState(""); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
 async function load(){setLoading(true);try{const r=await api.get("/admin/planning-settings");const s=r.data?.data as PlanningSettings;setForm({fiscal_years:s?.fiscal_years?.length?s.fiscal_years:[String(s?.fiscal_year??"")].filter(Boolean),annual_plan_open:enabled(s?.annual_plan_open),monthly_plan_open:enabled(s?.monthly_plan_open),monthly_achievement_open:enabled(s?.monthly_achievement_open)});}catch(e:any){toast.error(e?.response?.data?.message||e?.message||"Unable to load planning settings");}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 function addYear(){const y=year.trim();if(!/^\d{4}$/.test(y)||Number(y)<1900||Number(y)>2200){toast.error("Enter a valid four-digit Ethiopian fiscal year");return}if(form.fiscal_years.includes(y)){toast.error("This fiscal year is already enabled");return}setForm(c=>({...c,fiscal_years:[...c.fiscal_years,y].sort((a,b)=>Number(b)-Number(a))}));setYear("")}
 function removeYear(y:string){if(form.fiscal_years.length===1){toast.error("At least one fiscal year must remain enabled");return}setForm(c=>({...c,fiscal_years:c.fiscal_years.filter(v=>v!==y)}))}
 async function save(){if(!form.fiscal_years.length){toast.error("Add at least one fiscal year");return}setSaving(true);try{const r=await api.put("/admin/planning-settings",form);const s=r.data?.data as PlanningSettings;setForm(c=>({...c,fiscal_years:s.fiscal_years??[s.fiscal_year]}));toast.success("Planning settings updated successfully");}catch(e:any){toast.error(e?.response?.data?.message||e?.message||"Unable to update planning settings");}finally{setSaving(false)}}
 if(loading)return <div className="flex min-h-[320px] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading planning settings...</div>;
 return <div className="space-y-6">
  <div><h1 className="text-2xl font-bold">Planning Settings</h1><p className="text-sm text-muted-foreground">Allow planning and achievement entry for one or multiple Ethiopian fiscal years.</p></div>
  <Alert><LockKeyhole className="h-4 w-4"/><AlertTitle>Global planning control</AlertTitle><AlertDescription>All enabled fiscal years are available to authorized users. Role permissions and access mappings still apply.</AlertDescription></Alert>
  <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5"/>Enabled fiscal years</CardTitle><CardDescription>Add every Ethiopian fiscal year that should remain available for plan and achievement entry.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex max-w-md gap-2"><div className="flex-1"><Label htmlFor="new-year" className="sr-only">Ethiopian Fiscal Year</Label><Input id="new-year" inputMode="numeric" maxLength={4} value={year} onChange={e=>setYear(e.target.value.replace(/\D/g,"").slice(0,4))} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addYear()}}} placeholder="e.g. 2018"/></div><Button type="button" variant="outline" onClick={addYear}><Plus className="mr-2 h-4 w-4"/>Add Year</Button></div><div className="flex flex-wrap gap-2">{form.fiscal_years.map(y=><div key={y} className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-sm font-medium"><CalendarClock className="h-3.5 w-3.5"/>{y}<button type="button" onClick={()=>removeYear(y)} className="rounded-full p-0.5 hover:bg-muted" aria-label={`Remove ${y}`}><X className="h-3.5 w-3.5"/></button></div>)}</div></CardContent></Card>
  <div className="grid gap-4 lg:grid-cols-3"><Period title="Annual Plan Entry" description="Allow annual plans in every enabled fiscal year." checked={form.annual_plan_open} change={v=>setForm(c=>({...c,annual_plan_open:v}))} icon={Target}/><Period title="Monthly Plan Entry" description="Allow monthly targets for annual plans in enabled years." checked={form.monthly_plan_open} change={v=>setForm(c=>({...c,monthly_plan_open:v}))} icon={CalendarClock}/><Period title="Monthly Achievement Entry" description="Allow achievements for monthly plans in enabled years." checked={form.monthly_achievement_open} change={v=>setForm(c=>({...c,monthly_achievement_open:v}))} icon={TrendingUp}/></div>
  <div className="flex justify-end gap-2"><Button variant="outline" onClick={load} disabled={saving}>Cancel changes</Button><Button onClick={save} disabled={saving}>{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}Save Settings</Button></div>
 </div>
}
function Period({title,description,checked,change,icon:Icon}:{title:string;description:string;checked:boolean;change:(v:boolean)=>void;icon:typeof Target}){return <Card className={checked?"border-primary/40":""}><CardHeader><CardTitle className="flex items-center justify-between gap-3 text-base"><span className="flex items-center gap-2"><Icon className="h-4 w-4"/>{title}</span><Checkbox checked={checked} onCheckedChange={v=>change(v===true)} aria-label={title}/></CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><span className={checked?"text-sm font-medium text-emerald-600":"text-sm font-medium text-destructive"}>{checked?"Open":"Closed"}</span></CardContent></Card>}
