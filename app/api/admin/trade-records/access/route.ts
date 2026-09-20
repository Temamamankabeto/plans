import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/response";
import { getTradeUserContext } from "@/lib/server/trade-access";
import { getUserAccessMappings } from "@/lib/server/dynamic-access";

export async function GET(request: NextRequest) {
  const auth=await getAuthUser(request);
  if(!auth) return fail("Unauthenticated",401);
  const user=await getTradeUserContext(Number(auth.id));
  if(!user) return fail("User not found",404);

  const mappings=await getUserAccessMappings(Number(auth.id));
  // The Trade form is driven by the logged-in user's actual Access Mapping:
  // Module -> allowed Crop Types / allowed Livestock Types.
  const normalizeModule=(value:unknown)=>String(value??"").trim().toLowerCase();
  const scoped=mappings.filter((m:any)=>["crop","crop_product","livestock","livestock_product","trade","all"].includes(normalizeModule(m.module)));
  const modules=[...new Set(scoped.map((m:any)=>normalizeModule(m.module)).filter((m:string)=>m==="crop"||m==="crop_product"||m==="livestock"||m==="livestock_product"))];
  const cropTypes=[...new Set(scoped
    .filter((m:any)=>normalizeModule(m.module)==="crop" && m.scope_type==="crop_type" && m.scope_value)
    .map((m:any)=>String(m.scope_value)))];
  const livestockTypes=[...new Set(scoped
    .filter((m:any)=>normalizeModule(m.module)==="livestock" && m.scope_type==="livestock_type" && m.scope_value)
    .map((m:any)=>String(m.scope_value)))];
  const cropProducts=[...new Set(scoped
    .filter((m:any)=>normalizeModule(m.module)==="crop_product" && m.scope_type==="crop_product" && m.scope_value)
    .map((m:any)=>String(m.scope_value)))];
  const livestockProducts=[...new Set(scoped
    .filter((m:any)=>normalizeModule(m.module)==="livestock_product" && m.scope_type==="livestock_product" && m.scope_value)
    .map((m:any)=>String(m.scope_value)))];

  const can=(field:string)=>scoped.some((m:any)=>Number(m[field]??0)===1);
  return ok({
    canCreate:can("can_create_annual_plan"),
    canUpdate:can("can_update_achievement"),
    canApprove:can("can_approve"),
    canReport:can("can_view_report"),
    groups:[...cropTypes,...livestockTypes],
    modules,
    defaultModule:modules[0] ?? null,
    cropTypes,
    livestockTypes,
    cropProducts,
    livestockProducts,
    livestockProductTypes:livestockProducts,
    organization:{office_id:user.office_id,department_id:user.department_id,directorate_id:user.directorate_id,team_id:user.team_id},
  },"Trade access fetched successfully");
}
