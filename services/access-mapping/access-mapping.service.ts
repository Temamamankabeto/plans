import api, { unwrap } from "@/lib/api";
import type { AccessMappingPayload, AccessOrganizationOptions, AccessScopeType, OrganizationAccessMapping } from "@/types/access-mapping/access-mapping.type";
export const accessMappingService={
 async organizationOptions(){const r=await api.get("/admin/access-mappings/organization-options"); const v=unwrap<any>(r); return (v?.data??v) as AccessOrganizationOptions;},
 async list(){const r=await api.get("/admin/access-mappings"); const v=unwrap<any>(r); return (v?.data??v??[]) as OrganizationAccessMapping[];},
 async productParents(scopeType:AccessScopeType){
  let endpoint="";
  if(scopeType==="crop_product") endpoint="/admin/crops?all=1&status=active";
  else if(scopeType==="livestock_product") endpoint="/admin/livestock-products?all=1&status=active";
  else return [];
  const r=await api.get(endpoint); const v=unwrap<any>(r);
  return (v?.data??v??[]) as Array<{id:number;name:string;sex?:string}>;
 },
 async scopeOptions(scopeType:AccessScopeType,parentIds?:number[]){
  let endpoint="";
  if(scopeType==="crop_type") endpoint="/admin/crop-types?all=1";
  else if(scopeType==="livestock_type") endpoint="/admin/livestock-types?all=1";
  else if(scopeType==="crop_product") endpoint="/admin/works?all=1&status=active&source_type=crop";
  else if(scopeType==="livestock_product") endpoint="/admin/works?all=1&status=active&source_type=livestock";
  else return [];
  const r=await api.get(endpoint); const v=unwrap<any>(r);
  const rows=(v?.data??v??[]) as Array<{id:number;name:string;crop_id?:number|null;livestock_product_id?:number|null;crop_ids?:string|null;livestock_ids?:string|null}>;
  if(!parentIds?.length || (scopeType!=="crop_product" && scopeType!=="livestock_product")) return rows;
  const selected=new Set(parentIds);
  return rows.filter((item)=>{
   if(scopeType==="crop_product"){
    const ids=String(item.crop_ids??item.crop_id??"").split(",").map(Number).filter(Boolean);
    return ids.some(id=>selected.has(id));
   }
   const ids=String(item.livestock_ids??item.livestock_product_id??"").split(",").map(Number).filter(Boolean);
   return ids.some(id=>selected.has(id));
  });
 },
 async create(payload:AccessMappingPayload){const r=await api.post("/admin/access-mappings",payload); return unwrap(r);},
 async update(id:number,payload:AccessMappingPayload){const r=await api.put(`/admin/access-mappings/${id}`,payload); return unwrap(r);},
 async remove(id:number){const r=await api.delete(`/admin/access-mappings/${id}`); return unwrap(r);},
};
