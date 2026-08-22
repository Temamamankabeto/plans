export type LivestockProductStatusFilter = "all" | "active" | "inactive";

export type LivestockProductItem = {
  id: number;
  name: string;
  code?: string | null;
  is_active?: boolean | number;
  status?: "active" | "inactive" | string | null;
  livestock_product_types_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type LivestockProductPayload = {
  name: string;
  is_active?: boolean;
};

export type LivestockProductListParams = {
  search?: string;
  status?: LivestockProductStatusFilter;
  page?: number;
  per_page?: number;
  all?: boolean;
};
