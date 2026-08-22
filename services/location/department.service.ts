import api from "@/lib/api";
import type {
  DepartmentItem,
  DepartmentListParams,
  DepartmentPayload,
} from "@/types/location/department.type";

type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  };
};

function cleanParams(params: DepartmentListParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null),
  );
}

export const departmentService = {
  async list(params: DepartmentListParams = {}) {
    const response = await api.get<Envelope<DepartmentItem[]>>("/admin/departments", {
      params: cleanParams(params),
    });
    return response.data;
  },

  async create(payload: DepartmentPayload) {
    const response = await api.post<Envelope<DepartmentItem>>("/admin/departments", payload);
    return response.data;
  },

  async update(id: number | string, payload: DepartmentPayload) {
    const response = await api.put<Envelope<DepartmentItem>>(`/admin/departments/${id}`, payload);
    return response.data;
  },

  async delete(id: number | string) {
    const response = await api.delete<Envelope<null>>(`/admin/departments/${id}`);
    return response.data;
  },
};

export default departmentService;
