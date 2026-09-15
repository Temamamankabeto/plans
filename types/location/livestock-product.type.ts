export type LivestockProductStatusFilter = "all" | "active" | "inactive";
export type LivestockProductItem = { id:number; livestock_type_id?:number|null; livestock_type_name?:string|null; livestock_category_id?:number|null; livestock_category_name?:string|null; name:string; sex?:"male"|"female"|null; code?:string|null; is_active?:boolean|number; status?:"active"|"inactive"|string|null; livestock_product_types_count?:number; created_at?:string; updated_at?:string; };
export type LivestockProductPayload = { livestock_type_id?:number|null; livestock_category_id?:number|null; name:string; sex?:"male"|"female"; is_active?:boolean; };
export type LivestockProductListParams = { search?:string; status?:LivestockProductStatusFilter; page?:number; per_page?:number; all?:boolean; };
