export type WorkTypeStatusFilter = "all" | "active" | "inactive";

export type WorkTypeItem = {
  id: number;
  name: string;
  code?: string | null;
  is_active?: boolean | number;
  status?: "active" | "inactive" | string | null;
  works_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type WorkTypePayload = {
  name: string;
  is_active?: boolean;
};

export type WorkTypeListParams = {
  search?: string;
  status?: WorkTypeStatusFilter;
  page?: number;
  per_page?: number;
  all?: boolean;
};
