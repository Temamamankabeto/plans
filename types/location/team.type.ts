export type TeamStatusFilter = "all" | "active" | "inactive";

export type TeamItem = {
  id: number;
  directorate_id: number;
  department_id?: number | null;
  office_id?: number | null;
  directorate_name?: string | null;
  department_name?: string | null;
  office_name?: string | null;
  name: string;
  code?: string | null;
  is_active?: boolean | number;
  status?: "active" | "inactive" | string | null;
  created_at?: string;
  updated_at?: string;
};

export type TeamPayload = {
  directorate_id: number;
  name: string;
  is_active?: boolean;
};

export type TeamListParams = {
  search?: string;
  office_id?: number | string;
  department_id?: number | string;
  directorate_id?: number | string;
  status?: TeamStatusFilter;
  page?: number;
  per_page?: number;
  all?: boolean;
};
