export type WorkStatusFilter = "all" | "active" | "inactive";

export type WorkItem = {
  id: number;
  work_type_id: number;
  work_type_name?: string | null;
  name: string;
  code?: string | null;
  is_active?: boolean | number;
  status?: "active" | "inactive" | string | null;
  created_at?: string;
  updated_at?: string;
};

export type WorkPayload = {
  work_type_id: number;
  name: string;
  is_active?: boolean;
};

export type WorkListParams = {
  search?: string;
  work_type_id?: number | string;
  status?: WorkStatusFilter;
  page?: number;
  per_page?: number;
  all?: boolean;
};
