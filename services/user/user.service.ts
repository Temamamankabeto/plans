import api, { unwrap } from "@/lib/api";
import type {
  ApiEnvelope,
  AssignUserRolePayload,
  CreateUserPayload,
  DepartmentItem,
  DirectorateItem,
  OfficeItem,
  PaginatedResponse,
  PermissionItem,
  PermissionListParams,
  ResetUserPasswordPayload,
  RoleItem,
  RoleListParams,
  TeamItem,
  UpdateUserPayload,
  UserItem,
  UserListParams,
} from "@/types/user-management/user.type";

function cleanParams<T extends Record<string, unknown>>(params: T = {} as T) {
  const out: Record<string, unknown> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") out[key] = value;
  });
  return out;
}

function paginated<T>(body: any): PaginatedResponse<T> {
  const data = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const meta = body?.meta ?? {};
  return {
    success: body?.success,
    message: body?.message,
    data,
    meta: {
      current_page: Number(meta.current_page ?? 1),
      per_page: Number(meta.per_page ?? data.length ?? 10),
      total: Number(meta.total ?? data.length ?? 0),
      last_page: Number(meta.last_page ?? 1),
    },
  };
}

export const userService = {
  async list(params: UserListParams = {}) {
    const response = await api.get("/admin/users", { params: cleanParams(params) });
    return paginated<UserItem>(response.data);
  },

  async show(id: number | string) {
    const response = await api.get(`/admin/users/${id}`);
    return unwrap<ApiEnvelope<UserItem>>(response).data;
  },

  async create(payload: CreateUserPayload) {
    const response = await api.post("/admin/users", payload);
    return unwrap<ApiEnvelope<UserItem>>(response);
  },

  async update(id: number | string, payload: UpdateUserPayload) {
    const response = await api.put(`/admin/users/${id}`, payload);
    return unwrap<ApiEnvelope<UserItem>>(response);
  },

  async remove(id: number | string) {
    const response = await api.delete(`/admin/users/${id}`);
    return unwrap<ApiEnvelope<null>>(response);
  },

  async toggle(id: number | string) {
    const response = await api.patch(`/admin/users/${id}/toggle`);
    return unwrap<ApiEnvelope<UserItem>>(response);
  },

  async resetPassword(id: number | string, payload: ResetUserPasswordPayload) {
    const response = await api.post(`/admin/users/${id}/reset-password`, payload);
    return unwrap<ApiEnvelope<{ id: number | string }>>(response);
  },

  async assignRole(id: number | string, payload: AssignUserRolePayload) {
    const response = await api.post(`/admin/users/${id}/roles`, payload);
    return unwrap<ApiEnvelope<UserItem>>(response);
  },

  async rolesLite() {
    const response = await api.get("/admin/users/roles-lite");
    return Array.isArray(response.data?.data) ? (response.data.data as RoleItem[]) : [];
  },

  async officesLite(params: { type?: string; parent_id?: number | string | null } = {}) {
    const response = await api.get("/admin/users/offices-lite", { params: cleanParams(params) });
    return Array.isArray(response.data?.data) ? (response.data.data as OfficeItem[]) : [];
  },

  async directoratesLite(params: { office_id?: number | string | null; department_id?: number | string | null } = {}) {
    const response = await api.get("/admin/users/directorates-lite", { params: cleanParams(params) });
    return Array.isArray(response.data?.data) ? (response.data.data as DirectorateItem[]) : [];
  },

  async departmentsLite(params: { office_id?: number | string | null } = {}) {
    const response = await api.get("/admin/departments", { params: cleanParams({ ...params, all: 1, status: "active" }) });
    return Array.isArray(response.data?.data) ? (response.data.data as DepartmentItem[]) : [];
  },

  async teamsLite(params: { directorate_id?: number | string | null } = {}) {
    const response = await api.get("/admin/users/teams-lite", { params: cleanParams(params) });
    return Array.isArray(response.data?.data) ? (response.data.data as TeamItem[]) : [];
  },

  async roles(params: RoleListParams = {}) {
    const response = await api.get("/admin/roles", { params: cleanParams(params) });
    return paginated<RoleItem>(response.data);
  },

  async permissions(params: PermissionListParams = { all: true }) {
    const response = await api.get("/admin/permissions", { params: cleanParams(params) });
    return Array.isArray(response.data?.data) ? (response.data.data as PermissionItem[]) : [];
  },
};

export default userService;
