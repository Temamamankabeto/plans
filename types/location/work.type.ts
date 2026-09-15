export type WorkStatusFilter = "all" | "active" | "inactive";
export type ProductSourceType = "crop" | "livestock";

export type WorkItem = {
  id: number; work_type_id: number | null; work_type_name?: string | null;
  source_type?: ProductSourceType | null; crop_id?: number | null; crop_name?: string | null;
  crop_category_id?: number | null; crop_category_name?: string | null;
  livestock_product_id?: number | null; livestock_product_name?: string | null;
  name: string; code?: string | null; unit?: string | null; description?: string | null;
  is_active?: boolean | number; status?: "active" | "inactive" | string | null;
  created_at?: string; updated_at?: string;
};

export type WorkPayload = {
  work_type_id?: number | null; source_type?: ProductSourceType; crop_id?: number | null;
  crop_category_id?: number | null; livestock_product_id?: number | null;
  name: string; code?: string; unit?: string; description?: string; is_active?: boolean;
};

export type WorkListParams = { search?: string; work_type_id?: number|string; source_type?: ProductSourceType|string; status?: WorkStatusFilter; page?: number; per_page?: number; all?: boolean };
