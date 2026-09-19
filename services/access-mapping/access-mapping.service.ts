import api, { unwrap } from "@/lib/api";
import type {
  AccessMappingPayload,
  AccessOrganizationOptions,
  AccessScopeType,
  OrganizationAccessMapping,
} from "@/types/access-mapping/access-mapping.type";

export const accessMappingService = {
  async list() {
    const r = await api.get("/admin/access-mappings");
    const v = unwrap<any>(r);
    return (v?.data ?? v ?? []) as OrganizationAccessMapping[];
  },
  async organizationOptions() {
    const r = await api.get("/admin/access-mappings/organization-options");
    const v = unwrap<any>(r);
    return (v?.data ?? v ?? { offices: [], departments: [], directorates: [], teams: [] }) as AccessOrganizationOptions;
  },
  async scopeOptions(scopeType: AccessScopeType) {
    const endpoint =
      scopeType === "crop_type" ? "/admin/crop-types?all=1" :
      scopeType === "livestock_type" ? "/admin/livestock-types?all=1" : null;
    if (!endpoint) return [] as Array<{ id: number; name: string }>;
    const r = await api.get(endpoint);
    const v = unwrap<any>(r);
    return (v?.data ?? v ?? []) as Array<{ id: number; name: string }>;
  },
  async create(payload: AccessMappingPayload) {
    const r = await api.post("/admin/access-mappings", payload);
    return unwrap(r);
  },
  async update(id: number, payload: AccessMappingPayload) {
    const r = await api.put(`/admin/access-mappings/${id}`, payload);
    return unwrap(r);
  },
  async remove(id: number) {
    const r = await api.delete(`/admin/access-mappings/${id}`);
    return unwrap(r);
  },
};
