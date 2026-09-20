import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";
import { getTradeAccess } from "@/lib/server/trade-access";
import { entryAllowed, fiscalYearAllowed, getPlanningSettings, isSuperAdmin } from "@/lib/server/planning-record-rules";
import { createUserNotification } from "@/lib/server/notifications";
import { getUserAccessMappings } from "@/lib/server/dynamic-access";

async function getUserContext(request:NextRequest) {
  const auth=await getAuthUser(request);
  if(!auth?.id) return {auth:null,user:null};
  const rows=await query<any[]>(
    `SELECT u.*,o.name AS office_name,dp.name AS department_name,d.name AS directorate_name,t.name AS team_name
     FROM users u LEFT JOIN offices o ON o.id=u.office_id
     LEFT JOIN departments dp ON dp.id=u.department_id
     LEFT JOIN directorates d ON d.id=u.directorate_id LEFT JOIN teams t ON t.id=u.team_id
     WHERE u.id=? LIMIT 1`,[auth.id],
  );
  return {auth,user:rows[0] ?? null};
}
function n(value:unknown){const x=Number(value ?? 0);return Number.isFinite(x)?x:0;}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const {auth,user}=await getUserContext(request);
  if(!auth||!user) return fail("Unauthenticated",401);
  const rows=await query<any[]>("SELECT * FROM trade_records WHERE id=? LIMIT 1",[id]);
  const record=rows[0];
  if(!record) return fail("Trade record not found",404);

  const access=getTradeAccess(user,auth.roles);
  const body=await request.json().catch(()=>({}));
  const action=String(body.action ?? "");

  if(action==="update_plan"){
    if(record.period_type!=="annual") return fail("Only annual plans can be edited with this action",422);
    if(record.status==="approved") return fail("Approved annual plans are locked and cannot be edited",422);
    if(!access.canUpdate && !access.canCreate) return fail("You do not have permission to edit Trade annual plans",403);
    const settings=await getPlanningSettings();
    const fiscalYear=String(body.fiscal_year ?? record.fiscal_year).trim();
    if(!fiscalYearAllowed(settings,fiscalYear)) return fail("The selected Ethiopian fiscal year is not enabled",422);
    if(!isSuperAdmin(auth.roles)&&!entryAllowed(settings,"annual",false)) return fail("Annual plan entry is currently closed by Super Admin",403);

    const businessArea=String(body.commodity_group ?? record.commodity_group).trim();
    const expectedModule=String(body.access_module ?? record.access_module ?? "").trim().toLowerCase();
    const scopeType=String(body.scope_type ?? record.scope_type ?? "").trim();
    const scopeValue=String(body.scope_value ?? record.scope_value ?? "").trim();
    const product=String(body.commodity ?? record.commodity).trim();
    if(!businessArea||!scopeValue||!product) return fail("Market Type, Allowed Type, and Commodity are required",422);
    if(!["crop","livestock","livestock_product"].includes(expectedModule)) return fail("Invalid assigned module",422);
    if(expectedModule==="crop"&&scopeType!=="crop_type") return fail("Crop module requires a Crop Type",422);
    if((expectedModule==="livestock"||expectedModule==="livestock_product")&&scopeType!=="livestock_type") return fail("Livestock modules require a Livestock Type",422);

    const mappings=await getUserAccessMappings(Number(auth.id));
    const allowedScope=mappings.some((m:any)=>String(m.module??"").trim().toLowerCase()===expectedModule && m.scope_type===scopeType && String(m.scope_value??"").toLowerCase()===scopeValue.toLowerCase());
    if(!isSuperAdmin(auth.roles)&&!allowedScope) return fail("The selected type is not assigned to this module for your role and organization",403);

    if(scopeType==="crop_type"){
      const valid=await query<any[]>(`SELECT c.id FROM crops c INNER JOIN crop_types ct ON ct.id=c.crop_type_id WHERE c.is_active=1 AND ct.is_active=1 AND LOWER(ct.name)=LOWER(?) AND LOWER(c.name)=LOWER(?) LIMIT 1`,[scopeValue,product]);
      if(!valid[0]) return fail("The selected Crop does not belong to the assigned Crop Type",422);
    } else if(expectedModule==="livestock"){
      const valid=await query<any[]>(`SELECT lp.id FROM livestock_products lp INNER JOIN livestock_types lt ON lt.id=lp.livestock_type_id WHERE lp.is_active=1 AND lt.is_active=1 AND LOWER(lt.name)=LOWER(?) AND LOWER(lp.name)=LOWER(?) LIMIT 1`,[scopeValue,product]);
      if(!valid[0]) return fail("The selected Livestock does not belong to the assigned Livestock Type",422);
    } else {
      const valid=await query<any[]>(`SELECT w.id FROM works w INNER JOIN livestock_products lp ON lp.id=w.livestock_product_id INNER JOIN livestock_types lt ON lt.id=lp.livestock_type_id WHERE w.is_active=1 AND w.source_type='livestock' AND lp.is_active=1 AND lt.is_active=1 AND LOWER(lt.name)=LOWER(?) AND LOWER(w.name)=LOWER(?) LIMIT 1`,[scopeValue,product]);
      if(!valid[0]) return fail("The selected Livestock Product does not belong to the assigned Livestock Type",422);
    }

    const duplicate=await query<any[]>(`SELECT id FROM trade_records WHERE id<>? AND period_type='annual' AND office_id=? AND directorate_id <=> ? AND team_id <=> ? AND fiscal_year=? AND commodity_group=? AND commodity=? LIMIT 1`,[id,record.office_id,record.directorate_id??null,record.team_id??null,fiscalYear,businessArea,product]);
    if(duplicate[0]) return fail("Annual plan already exists for this fiscal year, Market Type, and Commodity",422);

    const quantity=n(body.plan_product);
    const value=n(body.plan_price);
    const total=quantity*value;
    const valueType=String(body.value_type??record.value_type).toLowerCase()==="cost"?"cost":"price";
    await transaction(async(connection)=>{
      await connection.execute(`UPDATE trade_records SET fiscal_year=?,commodity_group=?,access_module=?,scope_type=?,scope_value=?,commodity=?,unit=?,value_type=?,plan_product=?,plan_price=?,plan_income=?,employment_male_plan=?,employment_female_plan=? WHERE id=?`,[
        fiscalYear,businessArea,expectedModule,scopeType,scopeValue,product,String(body.unit??record.unit??"Unit"),valueType,quantity,value,total,Number(body.employment_male_plan??0),Number(body.employment_female_plan??0),id,
      ]);
      await connection.execute(`INSERT INTO trade_review_history (trade_record_id,action,comment,acted_by) VALUES (?,'update','Annual plan updated before approval',?)`,[id,auth.id]);
    });
    return ok({id,status:record.status},"Annual plan updated successfully");
  }

  if(["approve","comment","return"].includes(action)){
    if(!access.canApprove) return fail("You do not have permission to review Trade records",403);
    if(!access.reportAllTrade && user.directorate_id && Number(record.directorate_id)!==Number(user.directorate_id))
      return fail("This Trade record is outside your Directorate",403);
    const status=action==="approve"?"approved":action==="return"?"returned":"commented";
    await transaction(async(connection)=>{
      await connection.execute(
        `UPDATE trade_records SET status=?,review_comment=?,approved_by=?,approved_at=IF(?='approved',NOW(),approved_at) WHERE id=?`,
        [status,body.comment ?? null,auth.id,status,id],
      );
      await connection.execute(
        `INSERT INTO trade_review_history (trade_record_id,action,comment,acted_by) VALUES (?,?,?,?)`,
        [id,action,body.comment ?? null,auth.id],
      );
    });
    const ownerId=Number(record.created_by);
    if(ownerId&&ownerId!==Number(auth.id)){
      await createUserNotification({
        userId:ownerId,title:`Trade record ${status}`,
        message:String(body.comment ?? "").trim() || `Your Trade record was ${status}.`,
        redirectUrl:"/dashboard/trade-records",entityType:"trade_record",entityId:record.id,
      });
    }
    return ok({id,status},`Trade record ${status} successfully`);
  }

  if(action==="achievement"){
    if(!access.canUpdate) return fail("You do not have permission to update Trade achievements",403);
    if(!access.reportAllTrade && user.team_id && Number(record.team_id)!==Number(user.team_id))
      return fail("This Trade record is outside your Team",403);
    if(record.period_type!=="monthly") return fail("Achievement is entered only against monthly plans",422);
    if(record.status==="approved") return fail("Approved records are locked and cannot be edited",422);

    const settings=await getPlanningSettings();
    if(!fiscalYearAllowed(settings,record.fiscal_year))
      return fail(`Trade achievement entry is allowed only for configured Ethiopian fiscal years`,422);
    if(!isSuperAdmin(auth.roles)&&!entryAllowed(settings,"monthly",true))
      return fail("Monthly achievement entry is currently closed by Super Admin",403);

    const quantity=n(body.achievement_product);
    const value=n(body.achievement_price);
    const total=quantity*value;
    await query<any[]>(
      `UPDATE trade_records SET achievement_product=?,achievement_price=?,achievement_income=?,
       employment_male_achievement=?,employment_female_achievement=?,status='submitted' WHERE id=?`,
      [quantity,value,total,Number(body.employment_male_achievement ?? 0),Number(body.employment_female_achievement ?? 0),id],
    );
    return ok({id,value_type:record.value_type,total},"Monthly achievement submitted successfully");
  }
  return fail("Unsupported action",422);
}
