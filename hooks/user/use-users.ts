"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user/user.service";
import type { AssignUserRolePayload, CreateUserPayload, ResetUserPasswordPayload, UpdateUserPayload, UserListParams } from "@/types/user-management/user.type";

export const userManagementKeys = {
  all: ["user-management"] as const,
  users: () => ["user-management", "users"] as const,
  usersList: (params: UserListParams = {}) => ["user-management", "users", "list", params] as const,
  userDetail: (id: number | string) => ["user-management", "users", "detail", id] as const,
  rolesLite: () => ["user-management", "roles-lite"] as const,
  officesLite: (params: Record<string, unknown> = {}) => ["user-management", "offices-lite", params] as const,
  directoratesLite: (params: Record<string, unknown> = {}) => ["user-management", "directorates-lite", params] as const,
  departmentsLite: (params: Record<string, unknown> = {}) => ["user-management", "departments-lite", params] as const,
  teamsLite: (params: Record<string, unknown> = {}) => ["user-management", "teams-lite", params] as const,
};

export function useUsersQuery(params: UserListParams = {}) { return useQuery({ queryKey: userManagementKeys.usersList(params), queryFn: () => userService.list(params) }); }
export function useUserQuery(id?: number | string) { return useQuery({ queryKey: userManagementKeys.userDetail(id ?? ""), queryFn: () => userService.show(id as number | string), enabled: Boolean(id) }); }
export function useRolesLiteQuery() { return useQuery({ queryKey: userManagementKeys.rolesLite(), queryFn: () => userService.rolesLite() }); }
export function useOfficesLiteQuery(params: { type?: string; parent_id?: number | string | null } = {}) { return useQuery({ queryKey: userManagementKeys.officesLite(params), queryFn: () => userService.officesLite(params) }); }
export function useDirectoratesLiteQuery(params: { office_id?: number | string | null; department_id?: number | string | null } = {}) { return useQuery({ queryKey: userManagementKeys.directoratesLite(params), queryFn: () => userService.directoratesLite(params) }); }
export function useDepartmentsLiteQuery(params: { office_id?: number | string | null } = {}) { return useQuery({ queryKey: userManagementKeys.departmentsLite(params), queryFn: () => userService.departmentsLite(params), enabled: Boolean(params.office_id) }); }
export function useTeamsLiteQuery(params: { directorate_id?: number | string | null } = {}) { return useQuery({ queryKey: userManagementKeys.teamsLite(params), queryFn: () => userService.teamsLite(params), enabled: Boolean(params.directorate_id) }); }

export function useCreateUserMutation(onSuccess?: () => void) { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: CreateUserPayload) => userService.create(payload), onSuccess: () => { qc.invalidateQueries({ queryKey: userManagementKeys.users() }); onSuccess?.(); } }); }
export function useUpdateUserMutation(onSuccess?: () => void) { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: number | string; payload: UpdateUserPayload }) => userService.update(id, payload), onSuccess: (_data, variables) => { qc.invalidateQueries({ queryKey: userManagementKeys.users() }); qc.invalidateQueries({ queryKey: userManagementKeys.userDetail(variables.id) }); onSuccess?.(); } }); }
export function useDeleteUserMutation(onSuccess?: () => void) { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number | string) => userService.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: userManagementKeys.users() }); onSuccess?.(); } }); }
export function useToggleUserMutation(onSuccess?: () => void) { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number | string) => userService.toggle(id), onSuccess: (_data, id) => { qc.invalidateQueries({ queryKey: userManagementKeys.users() }); qc.invalidateQueries({ queryKey: userManagementKeys.userDetail(id) }); onSuccess?.(); } }); }
export function useResetUserPasswordMutation(onSuccess?: () => void) { return useMutation({ mutationFn: ({ id, payload }: { id: number | string; payload: ResetUserPasswordPayload }) => userService.resetPassword(id, payload), onSuccess }); }
export function useAssignUserRoleMutation(onSuccess?: () => void) { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: number | string; payload: AssignUserRolePayload }) => userService.assignRole(id, payload), onSuccess: (_data, variables) => { qc.invalidateQueries({ queryKey: userManagementKeys.users() }); qc.invalidateQueries({ queryKey: userManagementKeys.userDetail(variables.id) }); onSuccess?.(); } }); }
