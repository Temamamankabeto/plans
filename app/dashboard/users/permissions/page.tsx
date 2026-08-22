"use client";

import { FormEvent, useMemo, useState } from "react";
import { Edit, Loader2, MoreHorizontal, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useCreatePermissionMutation,
  useDeletePermissionMutation,
  usePermissionsQuery,
  useUpdatePermissionMutation,
} from "@/hooks";
import { permissionSchema } from "@/lib/schemas/permission.schema";
import type { PermissionItem, PermissionPayload } from "@/types/user-management/user.type";

function moduleName(permission: string) {
  return permission.split(/[._:-]/)[0] || "general";
}

export default function PermissionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<PermissionItem | null>(null);
  const [deletePermission, setDeletePermission] = useState<PermissionItem | null>(null);
  const [name, setName] = useState("");

  const params = useMemo(() => ({ search, page, per_page: 10 }), [search, page]);
  const permissionsQuery = usePermissionsQuery(params);
  const createPermission = useCreatePermissionMutation(() => { setFormOpen(false); setName(""); });
  const updatePermission = useUpdatePermissionMutation(() => { setFormOpen(false); setSelectedPermission(null); setName(""); });
  const deleteMutation = useDeletePermissionMutation();

  const rows = permissionsQuery.data?.data ?? [];
  const meta = permissionsQuery.data?.meta;

  function runAfterMenuClose(action: () => void) {
    window.setTimeout(action, 0);
  }

  function openCreate() {
    setSelectedPermission(null);
    setName("");
    setFormOpen(true);
  }

  function openEdit(permission: PermissionItem) {
    setSelectedPermission(permission);
    setName(permission.name);
    setFormOpen(true);
  }

  function submitPermission(event: FormEvent) {
    event.preventDefault();
    const parsed = permissionSchema.parse({ name });
    const payload: PermissionPayload = { name: parsed.name };
    if (selectedPermission) updatePermission.mutate({ id: selectedPermission.id, payload });
    else createPermission.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="text-2xl font-bold">Permissions</h1><p className="text-muted-foreground">Manage system permissions for Next.js RBAC.</p></div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Permission</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Permission List</CardTitle>
            <div className="flex gap-2">
              <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8 md:w-72" placeholder="Search permissions..." value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></div>
              <Button variant="outline" onClick={() => permissionsQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {permissionsQuery.isLoading ? <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading permissions...</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Module</TableHead><TableHead>Guard</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No permissions found</TableCell></TableRow> : rows.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-medium">{permission.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{moduleName(permission.name)}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{"next-rbac"}</Badge></TableCell>
                    <TableCell>{permission.created_at ? new Date(permission.created_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => runAfterMenuClose(() => openEdit(permission))}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => runAfterMenuClose(() => setDeletePermission(permission))}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {meta && meta.last_page > 1 && <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Page {meta.current_page} of {meta.last_page} • {meta.total} permissions</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button><Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedPermission ? "Edit Permission" : "Create Permission"}</DialogTitle><DialogDescription>Use permission names like users.read, roles.assign, or inventory.create.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={submitPermission}>
            <div className="grid gap-2"><Label>Permission Name</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="users.read" required /></div>
            <Button className="w-full" disabled={createPermission.isPending || updatePermission.isPending}>{(createPermission.isPending || updatePermission.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save permission</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletePermission)} onOpenChange={(open) => !open && setDeletePermission(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete permission?</AlertDialogTitle><AlertDialogDescription>This will delete {deletePermission?.name}. Make sure no critical role depends on it.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletePermission) deleteMutation.mutate(deletePermission.id); setDeletePermission(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
