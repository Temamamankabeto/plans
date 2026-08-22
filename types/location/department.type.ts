export type DepartmentStatusFilter = "all" | "active" | "inactive";

export type DepartmentItem = {
  id: number;
  office_id: number;
  office_name: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean | number;
  directorates_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type DepartmentPayload = {
  office_id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
};

export type DepartmentListParams = {
  search?: string;
  office_id?: number | string;
  status?: DepartmentStatusFilter;
  page?: number;
  per_page?: number;
  all?: boolean;
};
