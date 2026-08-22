import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { ok } from "@/lib/server/response";

export async function GET(request:NextRequest){
  const fiscalYear=request.nextUrl.searchParams.get('fiscal_year');
  const valueChain=request.nextUrl.searchParams.get('value_chain');
  const where:string[]=[]; const params:any[]=[];
  if(fiscalYear){ where.push('p.fiscal_year=?'); params.push(fiscalYear); }
  if(valueChain){ where.push('p.value_chain=?'); params.push(valueChain); }
  const whereSql=where.length?`WHERE ${where.join(' AND ')}`:'';
  const plans=await query<any[]>(`SELECT p.id,p.plan_no,o.name office,d.name directorate,p.value_chain,p.indicator,p.unit,p.annual_target,p.quarterly_target,p.month,p.fiscal_year,p.status FROM plans p LEFT JOIN offices o ON o.id=p.office_id LEFT JOIN directorates d ON d.id=p.directorate_id ${whereSql} ORDER BY p.id DESC LIMIT 50`,params);
  const achievements=await query<any[]>(`SELECT a.id,a.achievement_no,o.name office,d.name directorate,p.value_chain,p.indicator,p.unit,p.annual_target AS target,a.achieved,CASE WHEN p.annual_target>0 THEN ROUND((a.achieved/p.annual_target)*100,2) ELSE 0 END achievement_percent,p.fiscal_year,a.period,a.status,a.created_at submitted_at FROM achievements a INNER JOIN plans p ON p.id=a.plan_id LEFT JOIN offices o ON o.id=p.office_id LEFT JOIN directorates d ON d.id=p.directorate_id ${whereSql} ORDER BY a.id DESC LIMIT 50`,params);
  const reports=await query<any[]>(`SELECT o.id,o.name office,'Plan and Achievement' report_type,COALESCE(p.value_chain,'General') value_chain,p.fiscal_year period,SUM(p.annual_target) total_target,COALESCE(SUM(a.achieved),0) total_achieved,CASE WHEN SUM(p.annual_target)>0 THEN ROUND((COALESCE(SUM(a.achieved),0)/SUM(p.annual_target))*100,2) ELSE 0 END performance_percent,'active' status FROM plans p LEFT JOIN achievements a ON a.plan_id=p.id LEFT JOIN offices o ON o.id=p.office_id ${whereSql} GROUP BY o.id,o.name,p.value_chain,p.fiscal_year ORDER BY o.name`,params);
  const byOffice=await query<any[]>(`SELECT o.name label, COUNT(p.id) value FROM plans p LEFT JOIN offices o ON o.id=p.office_id ${whereSql} GROUP BY o.name ORDER BY value DESC`,params);
  const byStatus=await query<any[]>(`SELECT p.status label, COUNT(*) value FROM plans p ${whereSql} GROUP BY p.status`,params);
  const byAchievement=await query<any[]>(`SELECT p.value_chain label, COALESCE(SUM(a.achieved),0) value FROM plans p LEFT JOIN achievements a ON a.plan_id=p.id ${whereSql} GROUP BY p.value_chain ORDER BY value DESC`,params);
  return ok({plans,achievements,reports,charts:{byOffice,byStatus,byAchievement}},'Dashboard summary fetched successfully');
}
