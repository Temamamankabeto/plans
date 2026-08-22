export type DirectorateStatusFilter = "all" | "active" | "inactive";

export type DirectorateItem = {
  id: number;
  office_id: number;
  department_id: number | null;
  office_name?: string | null;
  department_name?: string | null;
  name: string;
  code?: string | null;
  is_active?: boolean | number;
  status?: "active" | "inactive" | string | null;
  created_at?: string;
  updated_at?: string;
};

export type DirectoratePayload = {
  office_id: number;
  department_id: number;
  name: string;
  is_active?: boolean;
};

export type DirectorateListParams = {
  search?: string;
  office_id?: number | string;
  department_id?: number | string;
  status?: DirectorateStatusFilter;
  page?: number;
  per_page?: number;
  all?: boolean;
};
