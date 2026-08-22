export type OfficeType = "office" | "directorate" | "agency" | "bureau" | "president_office";
export type OfficeStatusFilter = "all" | "active" | "inactive";

export type OfficeItem = {
  id: number;
  name: string;
  code: string;
  type: OfficeType | string;
  parent_id: number | null;
  parent_name?: string | null;
  description?: string | null;
  directorates_count?: number;
  users_count?: number;
  plans_count?: number;
  is_active: boolean | number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OfficePayload = {
  name: string;
  code?: string | null;
  type?: OfficeType | string | null;
  parent_id?: number | null;
  description?: string | null;
  is_active?: boolean | number;
};

export type OfficeListParams = {
  search?: string;
  type?: OfficeType | string;
  status?: OfficeStatusFilter;
  parent_id?: number | string | null;
  page?: number;
  per_page?: number;
  all?: boolean;
};

export type DepartmentItem = {
  id: number;
  name: string;
  office_id?: number | null;
  users_count?: number;
  status?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};
