import api, { unwrap } from "@/lib/api";
import type { AccessMappingPayload, OrganizationAccessMapping } from "@/types/access-mapping/access-mapping.type";
export const accessMappingService={
 async list(){const r=await api.get("/admin/access-mappings"); const v=unwrap<any>(r); return (v?.data??v??[]) as OrganizationAccessMapping[];},
 async scopeOptions(scopeType:"crop_type"|"livestock_product"){
  const endpoint=scopeType==="crop_type"?"/admin/crop-types?all=1":"/admin/livestock-products?all=1";
  const r=await api.get(endpoint); const v=unwrap<any>(r);
  return (v?.data??v??[]) as Array<{id:number;name:string}>;
 },
 async create(payload:AccessMappingPayload){const r=await api.post("/admin/access-mappings",payload); return unwrap(r);},
 async update(id:number,payload:AccessMappingPayload){const r=await api.put(`/admin/access-mappings/${id}`,payload); return unwrap(r);},
 async remove(id:number){const r=await api.delete(`/admin/access-mappings/${id}`); return unwrap(r);},
};
