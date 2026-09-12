"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ETHIOPIAN_MONTHS=["Meskerem","Tikimt","Hidar","Tahsas","Tir","Yekatit","Megabit","Miazia","Ginbot","Sene","Hamle","Nehase","Pagume"];
const FISCAL_YEARS=["2018","2019","2020","2021"];
type ReportRow={
  id:number;fiscal_year:string;commodity_group:string;commodity:string;stage:string;unit:string;value_type?:"price"|"cost";
  directorate_name?:string;team_name?:string;plan_product:number;plan_price:number;plan_income:number;
  monthly_plan_product:number;monthly_plan_price:number;monthly_plan_income:number;
  monthly_achievement_product:number;monthly_achievement_price:number;monthly_achievement_income:number;
  plan_to_date_product:number;plan_to_date_income:number;achievement_to_date_product:number;achievement_to_date_income:number;
  achievement_percent:number;status:string;
};
const n=(v:unknown)=>Number(v??0).toLocaleString(undefined,{maximumFractionDigits:2});
const pct=(v:unknown)=>`${Number(v??0).toLocaleString(undefined,{maximumFractionDigits:1})}%`;
const typeLabel=(v?:string)=>v==="cost"?"Cost":"Price";
const amountLabel=(v?:string)=>v==="cost"?"Expense":"Revenue";

export default function TradeReportPage(){
  const [fiscalYear,setFiscalYear]=useState("2018");
  const [month,setMonth]=useState("Meskerem");
  const [rows,setRows]=useState<ReportRow[]>([]);
  async function load(){
    try{
      const r=await api.get(`/admin/trade-records?report=1&fiscal_year=${encodeURIComponent(fiscalYear)}&month=${encodeURIComponent(month)}`);
      setRows(r.data.data??[]);
    }catch(e:any){toast.error(e.message||"Failed to load Trade report");}
  }
  useEffect(()=>{load();},[fiscalYear,month]);
  const grouped=useMemo(()=>{
    const m=new Map<string,ReportRow[]>();
    for(const r of rows){if(!m.has(r.commodity_group))m.set(r.commodity_group,[]);m.get(r.commodity_group)!.push(r);}
    return Array.from(m.entries());
  },[rows]);

  function exportCsv(){
    const headers=["No","Business Area","Product","Directorate","Team","Unit","Value Type","Annual Quantity","Annual Value","Annual Revenue/Expense","Month Plan Quantity","Month Plan Value","Month Plan Revenue/Expense","Month Achievement Quantity","Month Achievement Value","Month Achievement Revenue/Expense","Plan To Date Quantity","Plan To Date Revenue/Expense","Achievement To Date Quantity","Achievement To Date Revenue/Expense","Achievement %","Status"];
    const data=rows.map((r,i)=>[i+1,r.commodity_group,r.commodity,r.directorate_name??"",r.team_name??"",r.unit,typeLabel(r.value_type),r.plan_product,r.plan_price,r.plan_income,r.monthly_plan_product,r.monthly_plan_price,r.monthly_plan_income,r.monthly_achievement_product,r.monthly_achievement_price,r.monthly_achievement_income,r.plan_to_date_product,r.plan_to_date_income,r.achievement_to_date_product,r.achievement_to_date_income,r.achievement_percent,r.status]);
    const csv=[headers,...data].map(row=>row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download=`trade-report-${fiscalYear}-${month}.csv`;a.click();URL.revokeObjectURL(url);
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div><button className="mb-4 text-sm font-medium" onClick={()=>history.back()}>← Back to Trade Plans</button>
        <h1 className="text-2xl font-bold tracking-tight">TRADE VALUE CHAIN REPORT</h1>
        <p className="text-muted-foreground">Business Area → Product → Quantity → Price/Cost → Revenue/Expense.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={fiscalYear} onValueChange={setFiscalYear}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent className="z-[100] bg-white">{FISCAL_YEARS.map(y=><SelectItem key={y} value={y}>{y} E.C.</SelectItem>)}</SelectContent></Select>
        <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent className="z-[100] max-h-64 bg-white">{ETHIOPIAN_MONTHS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>
        <Button variant="outline" onClick={()=>window.print()}><Printer className="mr-2 h-4 w-4"/>Print</Button>
        <Button onClick={exportCsv}><Download className="mr-2 h-4 w-4"/>Export CSV</Button>
      </div>
    </div>

    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-5 text-center"><h2 className="text-xl font-bold">OROMIA BUREAU OF TRADE VALUE CHAIN REPORT</h2>
        <p className="text-sm text-muted-foreground">Fiscal Year: {fiscalYear} E.C. · Month: {month}</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1900px] border-collapse text-sm">
        <thead>
          <tr className="bg-muted/70 text-center font-semibold">
            <th className="border p-2">No.</th><th className="border p-2 text-left">Product</th><th className="border p-2">Directorate</th><th className="border p-2">Team</th><th className="border p-2">Unit</th>
            <th className="border p-2">Value Type</th><th className="border p-2">Annual Quantity</th><th className="border p-2">Annual Value</th><th className="border p-2">Annual Revenue/Expense</th>
            <th className="border p-2">Month Plan Qty</th><th className="border p-2">Month Plan Value</th><th className="border p-2">Month Plan Revenue/Expense</th>
            <th className="border p-2">Achievement Qty</th><th className="border p-2">Achievement Value</th><th className="border p-2">Achievement Revenue/Expense</th>
            <th className="border p-2">Plan To Date Qty</th><th className="border p-2">Plan To Date Revenue/Expense</th>
            <th className="border p-2">Achievement To Date Qty</th><th className="border p-2">Achievement To Date Revenue/Expense</th>
            <th className="border p-2">Achievement %</th><th className="border p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(([group,items],gi)=><>
            <tr key={`group-${group}`} className="bg-muted/20 font-bold"><td className="border p-2 text-center">{gi+1}</td><td className="border p-2" colSpan={20}>Business Area: {group}</td></tr>
            {items.map(r=><tr key={r.id}>
              <td className="border p-2"></td><td className="border p-2 pl-8">{r.commodity}</td><td className="border p-2">{r.directorate_name}</td><td className="border p-2">{r.team_name||"-"}</td><td className="border p-2">{r.unit}</td>
              <td className="border p-2">{typeLabel(r.value_type)}</td><td className="border p-2 text-right">{n(r.plan_product)}</td><td className="border p-2 text-right">{n(r.plan_price)}</td><td className="border p-2 text-right">{amountLabel(r.value_type)}: {n(r.plan_income)}</td>
              <td className="border p-2 text-right">{n(r.monthly_plan_product)}</td><td className="border p-2 text-right">{n(r.monthly_plan_price)}</td><td className="border p-2 text-right">{n(r.monthly_plan_income)}</td>
              <td className="border p-2 text-right">{n(r.monthly_achievement_product)}</td><td className="border p-2 text-right">{n(r.monthly_achievement_price)}</td><td className="border p-2 text-right">{n(r.monthly_achievement_income)}</td>
              <td className="border p-2 text-right">{n(r.plan_to_date_product)}</td><td className="border p-2 text-right">{n(r.plan_to_date_income)}</td>
              <td className="border p-2 text-right">{n(r.achievement_to_date_product)}</td><td className="border p-2 text-right">{n(r.achievement_to_date_income)}</td>
              <td className="border p-2 text-right">{pct(r.achievement_percent)}</td><td className="border p-2">{r.status}</td>
            </tr>)}
          </>)}
          {!rows.length&&<tr><td className="border p-8 text-center text-muted-foreground" colSpan={21}>No report data found for the selected filters.</td></tr>}
        </tbody>
      </table></div>
    </section>
  </div>;
}
