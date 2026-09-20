import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { created, fail, ok } from "@/lib/server/response";
import { applyTradeReadScope, assertAllowedGroup, getTradeAccess } from "@/lib/server/trade-access";
import { entryAllowed, fiscalYearAllowed, getPlanningSettings, isSuperAdmin } from "@/lib/server/planning-record-rules";

import { getUserAccessMappings } from "@/lib/server/dynamic-access";
const selectSql = `
  SELECT tr.*, o.name AS office_name, d.name AS directorate_name, t.name AS team_name,
         creator.name AS created_by_name, approver.name AS approved_by_name
  FROM trade_records tr
  INNER JOIN offices o ON o.id = tr.office_id
  LEFT JOIN directorates d ON d.id = tr.directorate_id
  LEFT JOIN teams t ON t.id = tr.team_id
  LEFT JOIN users creator ON creator.id = tr.created_by
  LEFT JOIN users approver ON approver.id = tr.approved_by
`;

async function getUserContext(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.id) return { auth:null, user:null };
  const rows = await query<any[]>(
    `SELECT u.*, o.name AS office_name, dp.name AS department_name, d.name AS directorate_name, t.name AS team_name
     FROM users u
     LEFT JOIN offices o ON o.id=u.office_id
     LEFT JOIN departments dp ON dp.id=u.department_id
     LEFT JOIN directorates d ON d.id=u.directorate_id
     LEFT JOIN teams t ON t.id=u.team_id
     WHERE u.id=? LIMIT 1`, [auth.id],
  );
  return { auth, user:rows[0] ?? null };
}
function numberValue(value:unknown) {
  const n=Number(value ?? 0); return Number.isFinite(n) ? n : 0;
}
function normalizeValueType(value:unknown):"price"|"cost" {
  return String(value ?? "").toLowerCase()==="cost" ? "cost" : "price";
}
function calculatedAmount(quantity:unknown, value:unknown) {
  return numberValue(quantity) * numberValue(value);
}

export async function GET(request:NextRequest) {
  const {auth,user}=await getUserContext(request);
  if(!auth||!user) return fail("Unauthenticated",401);
  const access=getTradeAccess(user,auth.roles);
  if(!access.canReport) return fail("You do not have permission to view Trade records",403);

  const report=request.nextUrl.searchParams.get("report")==="1";
  const periodType=request.nextUrl.searchParams.get("period_type") ?? "all";
  const fiscalYear=request.nextUrl.searchParams.get("fiscal_year") ?? "";
  const month=request.nextUrl.searchParams.get("month") ?? "";
  const status=request.nextUrl.searchParams.get("status") ?? "all";
  const where:string[]=[]; const params:unknown[]=[];
  // Pass roles so the read scope can correctly apply Team Leader/Expert -> team,
  // Director -> directorate, and office-level organizational boundaries.
  // The previous call passed the resolved access object, which discarded role
  // information inside applyTradeReadScope and could return an incorrect list.
  applyTradeReadScope(where,params,user,auth.roles,"tr");
  if(periodType!=="all"){where.push("tr.period_type=?");params.push(periodType);}
  if(fiscalYear){where.push("tr.fiscal_year=?");params.push(fiscalYear);}
  if(month){where.push("tr.month=?");params.push(month);}
  if(status!=="all"){where.push("tr.status=?");params.push(status);}
  const whereSql=where.length?`WHERE ${where.join(" AND ")}`:"";
  const rows=await query<any[]>(`${selectSql} ${whereSql} ORDER BY tr.period_type,tr.commodity_group,tr.commodity,tr.month,tr.id`,params);
  if(!report) return ok(rows,"Trade records fetched successfully",{access});

  const annualRows=rows.filter((r)=>r.period_type==="annual");
  const monthlyRows=rows.filter((r)=>r.period_type==="monthly");
  const reportRows=annualRows.map((annual)=>{
    const matching=monthlyRows.filter((r)=>Number(r.annual_plan_id)===Number(annual.id));
    const thisMonth=month?matching.find((r)=>r.month===month):matching[0];
    const toDate=matching.reduce((sum,r)=>({
      plan_product:sum.plan_product+numberValue(r.plan_product),
      plan_income:sum.plan_income+numberValue(r.plan_income),
      achievement_product:sum.achievement_product+numberValue(r.achievement_product),
      achievement_income:sum.achievement_income+numberValue(r.achievement_income),
    }),{plan_product:0,plan_income:0,achievement_product:0,achievement_income:0});
    const achievementPct=numberValue(annual.plan_product)>0 ? (toDate.achievement_product/numberValue(annual.plan_product))*100 : 0;
    return {
      ...annual,
      monthly_plan_product:numberValue(thisMonth?.plan_product),
      monthly_plan_price:numberValue(thisMonth?.plan_price),
      monthly_plan_income:numberValue(thisMonth?.plan_income),
      monthly_achievement_product:numberValue(thisMonth?.achievement_product),
      monthly_achievement_price:numberValue(thisMonth?.achievement_price),
      monthly_achievement_income:numberValue(thisMonth?.achievement_income),
      plan_to_date_product:toDate.plan_product, plan_to_date_income:toDate.plan_income,
      achievement_to_date_product:toDate.achievement_product, achievement_to_date_income:toDate.achievement_income,
      achievement_percent:achievementPct, monthly_plan_id:thisMonth?.id ?? null,
    };
  });
  return ok(reportRows,"Trade report fetched successfully",{access});
}

export async function POST(request:NextRequest) {
  const {auth,user}=await getUserContext(request);
  if(!auth||!user) return fail("Unauthenticated",401);
  const access=getTradeAccess(user,auth.roles);
  if(!access.canCreate) return fail("You do not have permission to create Trade records",403);

  const body=await request.json().catch(()=>({}));
  const periodType=String(body.period_type ?? "annual");
  let businessArea=String(body.commodity_group ?? "").trim();
  let accessModule=String(body.access_module ?? "").trim().toLowerCase();
  let product=String(body.commodity ?? "").trim();
  let scopeType=String(body.scope_type ?? "").trim();
  let scopeValue=String(body.scope_value ?? "").trim();
  const fiscalYear=String(body.fiscal_year ?? "").trim();
  const month=body.month?String(body.month).trim():null;
  const stage=String(body.stage ?? "Value Chain").trim();
  const unit=String(body.unit ?? "Unit").trim();
  let valueType=normalizeValueType(body.value_type);
  const quantity=numberValue(body.plan_product);
  const value=numberValue(body.plan_price);
  const total=calculatedAmount(quantity,value);
  const annualPlanId=body.annual_plan_id?Number(body.annual_plan_id):null;

  if(!fiscalYear||!businessArea||!scopeType||!scopeValue||!product) return fail("Fiscal year, Market Type, assigned Crop/Livestock Type, and Crop/Livestock are required",422);
  if(!["annual","monthly"].includes(periodType)) return fail("Invalid period type",422);
  if(periodType==="monthly"&&(!annualPlanId||!month)) return fail("Annual plan and month are required for monthly plan",422);

  const settings=await getPlanningSettings();
  if(!fiscalYearAllowed(settings,fiscalYear)) return fail(`Trade planning entry is allowed only for configured Ethiopian fiscal years`,422);
  if(!isSuperAdmin(auth.roles)&&!entryAllowed(settings,periodType,false))
    return fail(`${periodType==="annual"?"Annual":"Monthly"} plan entry is currently closed by Super Admin`,403);

  if(periodType==="monthly"){
    const annualRows=await query<any[]>("SELECT * FROM trade_records WHERE id=? AND period_type='annual' LIMIT 1",[annualPlanId]);
    const annual=annualRows[0];
    if(!annual) return fail("Annual plan not found",404);
    if(annual.status!=="approved") return fail("Monthly plan can be created only after annual plan is approved",422);
    businessArea=String(annual.commodity_group);
    accessModule=String(annual.access_module ?? (annual.scope_type==="livestock_type"?"livestock":"crop")).trim().toLowerCase();
    product=String(annual.commodity);
    scopeType=String(annual.scope_type ?? scopeType);
    scopeValue=String(annual.scope_value ?? scopeValue);
    valueType=normalizeValueType(annual.value_type);

    const duplicate=await query<any[]>("SELECT id FROM trade_records WHERE annual_plan_id=? AND period_type='monthly' AND month=? LIMIT 1",[annualPlanId,month]);
    if(duplicate[0]) return fail("Monthly plan already exists for this month",422);
    const allocatedRows=await query<any[]>("SELECT COALESCE(SUM(plan_product),0) AS plan_product FROM trade_records WHERE annual_plan_id=? AND period_type='monthly'",[annualPlanId]);
    if(numberValue(allocatedRows[0]?.plan_product)+quantity>numberValue(annual.plan_product))
      return fail("Monthly quantity total cannot exceed Annual Plan quantity",422);
  }

  const mappings=await getUserAccessMappings(Number(auth.id));
  const expectedModule=accessModule || (scopeType==="livestock_type" ? "livestock" : "crop");
  if(!["crop","livestock","livestock_product"].includes(expectedModule)) return fail("Invalid assigned module",422);
  if(expectedModule==="crop" && scopeType!=="crop_type") return fail("Crop module requires a Crop Type",422);
  if((expectedModule==="livestock"||expectedModule==="livestock_product") && scopeType!=="livestock_type") return fail("Livestock modules require a Livestock Type",422);
  const allowedScope=mappings.some((m:any)=>
    String(m.module ?? "").trim().toLowerCase()===expectedModule &&
    m.scope_type===scopeType &&
    String(m.scope_value ?? "").toLowerCase()===scopeValue.toLowerCase()
  );
  if(!isSuperAdmin(auth.roles)&&!allowedScope)
    return fail("The selected type is not assigned to this module for your role and organization",403);

  if(scopeType==="crop_type"){
    const rows=await query<any[]>(
      `SELECT c.id FROM crops c INNER JOIN crop_types ct ON ct.id=c.crop_type_id
       WHERE c.is_active=1 AND ct.is_active=1 AND LOWER(ct.name)=LOWER(?) AND LOWER(c.name)=LOWER(?) LIMIT 1`,
      [scopeValue,product]
    );
    if(!rows[0]) return fail("The selected Crop does not belong to the assigned Crop Type",422);
  } else if(scopeType==="livestock_type" && expectedModule==="livestock"){
    const rows=await query<any[]>(
      `SELECT lp.id FROM livestock_products lp INNER JOIN livestock_types lt ON lt.id=lp.livestock_type_id
       WHERE lp.is_active=1 AND lt.is_active=1 AND LOWER(lt.name)=LOWER(?) AND LOWER(lp.name)=LOWER(?) LIMIT 1`,
      [scopeValue,product]
    );
    if(!rows[0]) return fail("The selected Livestock does not belong to the assigned Livestock Type",422);
  } else if(scopeType==="livestock_type" && expectedModule==="livestock_product"){
    const rows=await query<any[]>(
      `SELECT w.id FROM works w
       INNER JOIN livestock_products lp ON lp.id=w.livestock_product_id
       INNER JOIN livestock_types lt ON lt.id=lp.livestock_type_id
       WHERE w.is_active=1 AND w.source_type='livestock' AND lp.is_active=1 AND lt.is_active=1
         AND LOWER(lt.name)=LOWER(?) AND LOWER(w.name)=LOWER(?) LIMIT 1`,
      [scopeValue,product]
    );
    if(!rows[0]) return fail("The selected Livestock Product does not belong to the assigned Livestock Type",422);
  } else return fail("Invalid assigned scope type",422);

  if(periodType==="annual"){
    const duplicate=await query<any[]>(
      `SELECT id FROM trade_records WHERE period_type='annual' AND office_id=? AND directorate_id <=> ? AND team_id <=> ?
       AND fiscal_year=? AND commodity_group=? AND commodity=? LIMIT 1`,
      [user.office_id,user.directorate_id ?? null,user.team_id ?? null,fiscalYear,businessArea,product],
    );
    if(duplicate[0]) return fail("Annual plan already exists for this fiscal year, Business Area, and Product",422);
  }

  const result=await transaction(async(connection)=>{
    const [saved]:any=await connection.execute(
      `INSERT INTO trade_records (
        annual_plan_id,office_id,directorate_id,team_id,fiscal_year,month,period_type,
        commodity_group,access_module,scope_type,scope_value,commodity,stage,unit,value_type,plan_product,plan_price,plan_income,
        employment_male_plan,employment_female_plan,status,created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'submitted',?)`,
      [
        annualPlanId,user.office_id,user.directorate_id,user.team_id ?? null,fiscalYear,month,periodType,
        businessArea,expectedModule,scopeType,scopeValue,product,stage,unit,valueType,quantity,value,total,
        Number(body.employment_male_plan ?? 0),Number(body.employment_female_plan ?? 0),auth.id,
      ],
    );
    await connection.execute(
      `INSERT INTO trade_review_history (trade_record_id,action,comment,acted_by) VALUES (?,'submit','Submitted for review',?)`,
      [saved.insertId,auth.id],
    );
    return {id:saved.insertId};
  });
  return created(result,periodType==="annual"?"Annual plan submitted successfully":"Monthly plan submitted successfully");
}