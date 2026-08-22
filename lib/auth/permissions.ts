"use client";

import { useMemo } from "react";
import { authService } from "@/services/auth/auth.service";

function normalize(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\s-]+/g, "_");
}

function hasPermissionMatch(permission: string, permissions: string[]) {
  if (permissions.includes("*") || permissions.includes("all")) return true;
  return (
    permissions.includes(permission) ||
    permissions.includes(permission.replace(".read", ".view")) ||
    permissions.includes(permission.replace(".view", ".read"))
  );
}

export function getStoredPermissions(): string[] {
  return authService.getStoredPermissions();
}

export function getStoredRoles(): string[] {
  const user = authService.getStoredUser();
  const roles = authService.getStoredRoles();
  return roles.length ? roles : user?.role ? [user.role] : [];
}

export function isGeneralAdmin(roles: string[] = getStoredRoles()) {
  return roles.some((role) => {
    const normalized = normalize(role);
    return normalized === "super_admin" || normalized === "admin" || normalized === "administrator";
  });
}

export function can(permission: string, permissions: string[] = getStoredPermissions(), roles: string[] = getStoredRoles()) {
  if (!permission) return true;
  if (isGeneralAdmin(roles)) return true;
  return hasPermissionMatch(permission, permissions);
}

export function canAny(required: string[] = [], permissions: string[] = getStoredPermissions(), roles: string[] = getStoredRoles()) {
  if (!required.length) return true;
  if (isGeneralAdmin(roles)) return true;
  return required.some((permission) => hasPermissionMatch(permission, permissions));
}

export function canAll(required: string[] = [], permissions: string[] = getStoredPermissions(), roles: string[] = getStoredRoles()) {
  if (!required.length) return true;
  if (isGeneralAdmin(roles)) return true;
  return required.every((permission) => hasPermissionMatch(permission, permissions));
}

export function usePermissions() {
  const permissions = getStoredPermissions();
  const roles = getStoredRoles();

  return useMemo(
    () => ({
      permissions,
      roles,
      isAdmin: isGeneralAdmin(roles),
      can: (permission: string) => can(permission, permissions, roles),
      canAny: (required: string[]) => canAny(required, permissions, roles),
      canAll: (required: string[]) => canAll(required, permissions, roles),
    }),
    [JSON.stringify(permissions), JSON.stringify(roles)],
  );
}

export const planPermissions = {
  read: "plans.view",
  create: "plans.create",
  update: "plans.update",
  approve: "plans.approve",
} as const;

export const achievementPermissions = {
  read: "achievements.view",
  create: "achievements.create",
  update: "achievements.update",
  approve: "achievements.approve",
} as const;

export const userManagementPermissions = {
  usersRead: "users.view",
  usersCreate: "users.create",
  usersUpdate: "users.update",
  usersDelete: "users.delete",
  usersToggle: "users.toggle",
  usersResetPassword: "users.reset-password",
  rolesRead: "roles.view",
  rolesCreate: "roles.create",
  rolesUpdate: "roles.update",
  rolesDelete: "roles.delete",
  rolesAssignPermissions: "roles.assign-permissions",
  permissionsRead: "permissions.view",
  permissionsCreate: "permissions.create",
  permissionsUpdate: "permissions.update",
  permissionsDelete: "permissions.delete",
} as const;
