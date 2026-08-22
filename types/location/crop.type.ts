export type CropStatusFilter = "all" | "active" | "inactive";

export type CropItem = {
  id: number;
  crop_type_id: number;
  crop_type_name?: string | null;
  name: string;
  code?: string | null;
  land_area_unit?: string | null;
  productivity_unit?: string | null;
  production_unit?: string | null;
  is_active?: boolean | number;
  status?: "active" | "inactive" | string | null;
  created_at?: string;
  updated_at?: string;
};

export type CropPayload = {
  crop_type_id: number;
  name: string;
  land_area_unit?: string;
  productivity_unit?: string;
  production_unit?: string;
  is_active?: boolean;
};

export type CropListParams = {
  search?: string;
  crop_type_id?: number | string;
  status?: CropStatusFilter;
  page?: number;
  per_page?: number;
  all?: boolean;
};
