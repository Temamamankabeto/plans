export type CropTypeStatusFilter = "all" | "active" | "inactive";

export type CropTypeItem = {
  id: number;
  name: string;
  code?: string | null;
  is_active?: boolean | number;
  status?: "active" | "inactive" | string | null;
  crops_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type CropTypePayload = {
  name: string;
  is_active?: boolean;
};

export type CropTypeListParams = {
  search?: string;
  status?: CropTypeStatusFilter;
  page?: number;
  per_page?: number;
  all?: boolean;
};
