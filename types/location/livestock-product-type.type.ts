export type LivestockProductTypeStatusFilter = "all" | "active" | "inactive";

export type LivestockProductTypeItem = {
  id: number;
  livestock_product_id: number;
  livestock_product_name?: string | null;
  name: string;
  code?: string | null;
  number_unit?: string | null;
  productivity_unit?: string | null;
  production_unit?: string | null;
  is_active?: boolean | number;
  status?: "active" | "inactive" | string | null;
  created_at?: string;
  updated_at?: string;
};

export type LivestockProductTypePayload = {
  livestock_product_id: number;
  name: string;
  number_unit?: string;
  productivity_unit?: string;
  production_unit?: string;
  is_active?: boolean;
};

export type LivestockProductTypeListParams = {
  search?: string;
  livestock_product_id?: number | string;
  status?: LivestockProductTypeStatusFilter;
  page?: number;
  per_page?: number;
  all?: boolean;
};
