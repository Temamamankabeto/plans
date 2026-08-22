import type { OfficeItem } from "@/types/location/office.type";

export type ApiEnvelope<T> = { success: boolean; message?: string; data: T; meta?: unknown };
export type PaginationMeta = { current_page: number; per_page: number; total: number; last_page: number };
export type PaginatedResponse<T> = { success?: boolean; message?: string; data: T[]; meta: PaginationMeta };
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

export type RoleItem = { id: number; name: UserRoleName | string; created_at?: string; updated_at?: string };
export type PermissionItem = { id: number; name: string; created_at?: string; updated_at?: string };

export type DirectorateItem = {
  id: number;
  office_id: number;
  department_id?: number | null;
  name: string;
  office_name?: string | null;
  department_name?: string | null;
  is_active?: boolean | number;
  created_at?: string;
  updated_at?: string;
};

export type DepartmentItem = {
  id: number;
  office_id: number;
  name: string;
  office_name?: string | null;
  is_active?: boolean | number;
};

export type TeamItem = {
  id: number;
  directorate_id: number;
  department_id?: number | null;
  office_id?: number;
  name: string;
  directorate_name?: string | null;
  department_name?: string | null;
  office_name?: string | null;
  is_active?: boolean | number;
  created_at?: string;
  updated_at?: string;
};

export type UserItem = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status?: UserStatus;
  role?: UserRoleName | string | null;
  display_role?: UserRoleName | string | null;
  roles?: Array<RoleItem | string>;
  professional_level?: string | null;
  office_id?: number | null;
  directorate_id?: number | null;
  department_id?: number | null;
  team_id?: number | null;
  office?: OfficeItem | null;
  directorate?: DirectorateItem | null;
  department?: DepartmentItem | null;
  team?: TeamItem | null;
  signature_url?: string | null;
  stamp_url?: string | null;
  titer_url?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserListParams = {
  search?: string;
  status?: UserStatus | "all";
  role?: UserRoleName | string;
  office_id?: number | string | null;
  department_id?: number | string | null;
  directorate_id?: number | string | null;
  team_id?: number | string | null;
  page?: number;
  per_page?: number;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRoleName | string;
  status?: UserStatus;
  professional_level?: string | null;
  office_id?: number | null;
  directorate_id?: number | null;
  department_id?: number | null;
  team_id?: number | null;
  signature?: File | null;
  stamp?: File | null;
  titer?: File | null;
};

export type UpdateUserPayload = Omit<CreateUserPayload, "password">;
export type AssignUserRolePayload = { role: UserRoleName | string };
export type ResetUserPasswordPayload = { new_password: string };
export type RoleListParams = { search?: string; page?: number; per_page?: number };
export type RolePayload = { name: UserRoleName | string };
export type AssignRolePermissionsPayload = { permissions: string[] };
export type PermissionListParams = { search?: string; all?: boolean; page?: number; per_page?: number };
export type PermissionPayload = { name: string };
export type RolePermissionResult = { role_id: number | string; assigned_count: number; permissions: string[] };
export type { OfficeItem };
