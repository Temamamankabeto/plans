"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit, KeyRound, Loader2, MoreHorizontal, RefreshCw, Search, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useAllPermissionsQuery,
  useAssignRolePermissionsMutation,
  useDeleteRoleMutation,
  useRolePermissionsQuery,
  useRolesQuery,
  useUpdateRoleMutation,
} from "@/hooks";
import { roleSchema } from "@/lib/schemas/role.schema";
import { isGeneralAdmin } from "@/lib/auth/permissions";
import type { RoleItem, RolePayload } from "@/types/user-management/user.type";
import { authService } from "@/services/auth/auth.service";

const PROTECTED_ROLE_NAMES = ["super-admin", "super admin", "admin", "manager"];

function hasPermission(permissions: string[], permission: string) {
  return permissions.includes("*") || permissions.includes("all") || permissions.includes(permission);
}

function moduleName(permission: string) {
  return permission.split(/[._:-]/)[0] || "general";
}

function isProtectedRole(role: RoleItem) {
  return PROTECTED_ROLE_NAMES.includes(String(role.name).toLowerCase().trim());
}

export default function RolesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const storedPermissions = authService.getStoredPermissions();
  const canUpdateRole = hasPermission(storedPermissions, "roles.update");
  const canDeleteRole = hasPermission(storedPermissions, "roles.delete");
  const canAssignPermissions =
    isGeneralAdmin() ||
    hasPermission(storedPermissions, "roles.assign-permissions") ||
    hasPermission(storedPermissions, "permissions.assign");

  const params = useMemo(() => ({ search, page, per_page: 10 }), [search, page]);
  const rolesQuery = useRolesQuery(params);
  const permissionsCatalogQuery = useAllPermissionsQuery();
  const rolePermissionsQuery = useRolePermissionsQuery(selectedRole?.id);

  const updateRole = useUpdateRoleMutation(() => {
    setFormOpen(false);
    setSelectedRole(null);
    setRoleName("");
  });
  const deleteRole = useDeleteRoleMutation(() => {
    setDeleteOpen(false);
    setSelectedRole(null);
  });
  const assignPermissions = useAssignRolePermissionsMutation(() => setPermissionsOpen(false));

  const rows = rolesQuery.data?.data ?? [];
  const meta = rolesQuery.data?.meta;
  const allPermissions = (permissionsCatalogQuery.data ?? []).filter(
    (permission) =>
      !permission.name.startsWith("citizen") &&
      !permission.name.startsWith("citizens.") &&
      !permission.name.startsWith("dashboard.citizens.") &&
      !permission.name.startsWith("reports.citizens.") &&
      !permission.name.startsWith("households."),
  );

  const groupedPermissions = useMemo(() => {
    return allPermissions.reduce<Record<string, string[]>>((groups, permission) => {
      const group = moduleName(permission.name);
      groups[group] = groups[group] ?? [];
      groups[group].push(permission.name);
      return groups;
    }, {});
  }, [allPermissions]);

  useEffect(() => {
    if (!permissionsOpen) return;
    setSelectedPermissions((rolePermissionsQuery.data ?? []).map((permission) => permission.name));
  }, [permissionsOpen, rolePermissionsQuery.data]);

  function runAfterMenuClose(action: () => void) {
    window.setTimeout(action, 0);
  }

  function openEdit(role: RoleItem) {
    setSelectedRole(role);
    setRoleName(role.name);
    setFormOpen(true);
  }

  function openPermissions(role: RoleItem) {
    setSelectedRole(role);
    setSelectedPermissions([]);
    setPermissionsOpen(true);
  }

  function openDelete(role: RoleItem) {
    setSelectedRole(role);
    setDeleteOpen(true);
  }

  function submitRole(event: FormEvent) {
    event.preventDefault();

    const result = roleSchema.safeParse({ name: roleName?.trim() });
    if (!result.success) return;

    if (!selectedRole) return;
    const payload: RolePayload = { name: result.data.name };
    updateRole.mutate({ id: selectedRole.id, payload });
  }

  function confirmDeleteRole() {
    if (!selectedRole || isProtectedRole(selectedRole)) return;
    deleteRole.mutate(selectedRole.id);
  }

  function togglePermission(permission: string) {
    setSelectedPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
  }

  function toggleGroup(permissions: string[]) {
    const allSelected = permissions.every((permission) => selectedPermissions.includes(permission));
    setSelectedPermissions((current) =>
      allSelected
        ? current.filter((permission) => !permissions.includes(permission))
        : Array.from(new Set([...current, ...permissions])),
    );
  }

  function submitPermissions() {
    if (!selectedRole) return;
    assignPermissions.mutate({ id: selectedRole.id, payload: { permissions: selectedPermissions } });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-muted-foreground">View roles and assign allowed system permissions.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Role List</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 md:w-72"
                  placeholder="Search roles..."
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                />
              </div>
              <Button variant="outline" onClick={() => rolesQuery.refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rolesQuery.isLoading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading roles...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                      No roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canAssignPermissions ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => openPermissions(role)}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Assign Permissions
                            </Button>
                          ) : null}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" aria-label={`Actions for ${role.name}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdateRole ? (
                                <DropdownMenuItem onSelect={() => runAfterMenuClose(() => openEdit(role))}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                              ) : null}
                              {canDeleteRole ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  disabled={isProtectedRole(role)}
                                  onSelect={() => runAfterMenuClose(() => openDelete(role))}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {meta && meta.last_page > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {meta.current_page} of {meta.last_page}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Role names must exist in the Next.js RBAC configuration.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitRole}>
            <div className="grid gap-2">
              <Label>Role Name</Label>
              <Input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Cashier" required />
            </div>
            <Button className="w-full" disabled={updateRole.isPending}>
              {updateRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save role
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Permissions</DialogTitle>
            <DialogDescription>Update permissions for {selectedRole?.name ?? "selected role"}.</DialogDescription>
          </DialogHeader>
          {rolePermissionsQuery.isLoading || permissionsCatalogQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading permissions...
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedPermissions).map(([group, permissions]) => (
                <div key={group} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold capitalize">{group}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => toggleGroup(permissions)}>
                      {permissions.every((p) => selectedPermissions.includes(p)) ? "Unselect all" : "Select all"}
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {permissions.map((permission) => (
                      <label key={permission} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                        <Checkbox checked={selectedPermissions.includes(permission)} onCheckedChange={() => togglePermission(permission)} />
                        <span>{permission}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <Button className="w-full" onClick={submitPermissions} disabled={assignPermissions.isPending || !canAssignPermissions}>
                {assignPermissions.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save permissions
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role "{selectedRole?.name}". Roles assigned to users or protected system roles cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRole.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRole.isPending || !selectedRole || isProtectedRole(selectedRole)}
              onClick={(event) => {
                event.preventDefault();
                confirmDeleteRole();
              }}
            >
              {deleteRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
