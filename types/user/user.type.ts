import type { DepartmentItem, OfficeItem } from "@/types/location/office.type";
export type ApiEnvelope<T> = { success: boolean; message?: string; data: T; meta?: unknown };
export type PaginationMeta = { current_page: number; per_page: number; total: number; last_page: number };
export type PaginatedResponse<T> = { success?: boolean; message?: string; data: T[]; meta: PaginationMeta };
export type AdminLevel = "city" | "subcity" | "woreda" | "zone";
export type UserStatus = "active" | "disabled";
export type UserRoleName =
  | "Super Admin"
  | "Head of Office"
  | "Deputy Head of Office"
  | "Manager"
  | "Adviser"
  | "Director"
  | "Team Leader"
  | "Expert";
export type RoleItem = { id: number; name: UserRoleName | string; guard_name?: string; created_at?: string; updated_at?: string };
export type PermissionItem = { id: number; name: string; guard_name?: string; created_at?: string; updated_at?: string };
export type UserItem = { id: number; name: string; email: string; phone?: string | null; address?: string | null; status?: UserStatus; role?: UserRoleName | string | null; display_role?: UserRoleName | string | null; roles?: Array<RoleItem | string>; admin_level?: AdminLevel | null; professional_level?: "III" | "IV" | string | null; directorate_id?: number | null; department_id?: number | null; office_id?: number | null; sub_city_id?: number | null; woreda_id?: number | null; zone_id?: number | null; office?: OfficeItem | null; directorate?: { id: number; name: string } | null; department?: { id: number; name: string } | null; sub_city?: OfficeItem | null; woreda?: OfficeItem | null; zone?: OfficeItem | null; profile_image_url?: string | null; signature_url?: string | null; stamp_url?: string | null; titer_url?: string | null; created_by?: number | null; creator?: { id: number; name: string; email?: string | null } | null; last_login_at?: string | null; created_at?: string; updated_at?: string };
export type UserListParams = { search?: string; status?: UserStatus | "all"; role?: UserRoleName | string; admin_level?: AdminLevel | "all"; office_id?: number | string | null; sub_city_id?: number | string | null; woreda_id?: number | string | null; zone_id?: number | string | null; page?: number; per_page?: number };
export type CreateUserPayload = { name: string; email: string; phone: string; password: string; role: UserRoleName | string; admin_level?: AdminLevel | null; professional_level?: "III" | "IV" | string | null; directorate_id?: number | null; department_id?: number | null; address?: string; office_id?: number | null; sub_city_id?: number | null; woreda_id?: number | null; zone_id?: number | null; signature?: File | null; stamp?: File | null; titer?: File | null };
export type UpdateUserPayload = Omit<CreateUserPayload, "password">;
export type AssignUserRolePayload = { role: UserRoleName | string };
export type ResetUserPasswordPayload = { new_password: string };
export type RoleListParams = { search?: string; page?: number; per_page?: number };
export type RolePayload = { name: UserRoleName | string };
export type AssignRolePermissionsPayload = { permissions: string[] };
export type PermissionListParams = { search?: string; all?: boolean; page?: number; per_page?: number };
export type PermissionPayload = { name: string };
export type RolePermissionResult = { role_id: number | string; assigned_count: number; permissions: string[] };
export type { DepartmentItem, OfficeItem };
