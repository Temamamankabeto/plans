"use client";

import { useMemo, useState } from "react";
import { Edit, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useAccessMappingsQuery,
  useAccessScopeOptionsQuery,
  useCreateAccessMappingMutation,
  useDeleteAccessMappingMutation,
  useDepartmentsLiteQuery,
  useDirectoratesLiteQuery,
  useOfficesLiteQuery,
  useTeamsLiteQuery,
  useUpdateAccessMappingMutation,
  useUserRolesLiteQuery,
} from "@/hooks";
import type {
  AccessMappingPayload,
  AccessModule,
  AccessScopeType,
  OrganizationAccessMapping,
} from "@/types/access-mapping/access-mapping.type";

const emptyMapping: AccessMappingPayload = {
  office_id: 0,
  directorate_id: null,
  department_id: null,
  team_id: null,
  role_id: 0,
  module: "crop",
  scope_type: "all",
  scope_value: null,
  can_create_annual_plan: false,
  can_divide_monthly_plan: false,
  can_update_achievement: false,
  can_view_report: true,
  can_comment: false,
  can_approve: false,
  is_active: true,
};

const MODULES: AccessModule[] = [
  "crop",
  "livestock",
  "trade",
  "job",
  "agribusiness",
  "mechanization",
  "all",
];

const SCOPE_TYPES: AccessScopeType[] = ["all", "crop_type", "livestock_product", "trade_group"];

function toBoolean(value: boolean | number): boolean {
  return value === true || value === 1;
}

function mappingToForm(mapping: OrganizationAccessMapping): AccessMappingPayload {
  return {
    office_id: mapping.office_id,
    directorate_id: mapping.directorate_id,
    department_id: mapping.department_id,
    team_id: mapping.team_id,
    role_id: mapping.role_id,
    module: mapping.module,
    scope_type: mapping.scope_type,
    scope_value: mapping.scope_value,
    can_create_annual_plan: toBoolean(mapping.can_create_annual_plan),
    can_divide_monthly_plan: toBoolean(mapping.can_divide_monthly_plan),
    can_update_achievement: toBoolean(mapping.can_update_achievement),
    can_view_report: toBoolean(mapping.can_view_report),
    can_comment: toBoolean(mapping.can_comment),
    can_approve: toBoolean(mapping.can_approve),
    is_active: toBoolean(mapping.is_active),
  };
}

export default function AccessMappingsPage() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AccessMappingPayload>(emptyMapping);

  const mappingsQuery = useAccessMappingsQuery();
  const officesQuery = useOfficesLiteQuery();
  const departmentsQuery = useDepartmentsLiteQuery({
    office_id: form.office_id || null,
  });
  const directoratesQuery = useDirectoratesLiteQuery({
    office_id: form.office_id || null,
    department_id: form.department_id,
  });
  const teamsQuery = useTeamsLiteQuery({ directorate_id: form.directorate_id });
  const rolesQuery = useUserRolesLiteQuery();
  const cropTypeOptionsQuery = useAccessScopeOptionsQuery("crop_type");
  const livestockProductOptionsQuery = useAccessScopeOptionsQuery("livestock_product");

  const createMutation = useCreateAccessMappingMutation(() => {
    closeDialog();
    toast.success("Access mapping created");
  });

  const updateMutation = useUpdateAccessMappingMutation(() => {
    closeDialog();
    toast.success("Access mapping updated");
  });

  const deleteMutation = useDeleteAccessMappingMutation();

  const busy = createMutation.isPending || updateMutation.isPending;
  const rows = mappingsQuery.data ?? [];

  const dialogTitle = useMemo(
    () => (editingId ? "Edit Access Mapping" : "Create Access Mapping"),
    [editingId],
  );

  function closeDialog() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyMapping);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyMapping);
    setOpen(true);
  }

  function openEdit(mapping: OrganizationAccessMapping) {
    setEditingId(mapping.id);
    setForm(mappingToForm(mapping));
    setOpen(true);
  }

  function updateField<K extends keyof AccessMappingPayload>(key: K, value: AccessMappingPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function togglePermission(key: keyof AccessMappingPayload) {
    return (
      <label className="flex items-center gap-2 text-sm capitalize">
        <input
          type="checkbox"
          checked={Boolean(form[key])}
          onChange={(event) => updateField(key, event.target.checked as AccessMappingPayload[typeof key])}
        />
        {String(key).replaceAll("_", " ")}
      </label>
    );
  }

  function submit() {
    if (!form.office_id || !form.role_id || !form.module) {
      toast.error("Office, role and module are required");
      return;
    }

    const selectedRoleName = (rolesQuery.data ?? []).find((role) => role.id === form.role_id)?.name;
    if (["Manager", "Adviser"].includes(String(selectedRoleName)) && !form.department_id) {
      toast.error("Department is required for Manager and Adviser access mappings");
      return;
    }

    const payload: AccessMappingPayload = {
      ...form,
      scope_value: form.scope_type === "all" ? null : form.scope_value?.trim() || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
      return;
    }

    createMutation.mutate(payload);
  }

  function removeMapping(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Access mapping deleted"),
      onError: () => toast.error("Failed to delete access mapping"),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dynamic Access Mappings</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Mapping
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Office</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Directorate</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Module / Scope</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappingsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading mappings...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No access mappings found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>{mapping.office_name}</TableCell>
                  <TableCell>{mapping.department_name ?? "All"}</TableCell>
                  <TableCell>{mapping.directorate_name ?? "All"}</TableCell>
                  <TableCell>{mapping.team_name ?? "All"}</TableCell>
                  <TableCell>{mapping.role_name}</TableCell>
                  <TableCell>
                    {mapping.module} / {mapping.scope_value ?? "All"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" aria-label="Mapping actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setTimeout(() => openEdit(mapping), 0)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setTimeout(() => removeMapping(mapping.id), 0)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeDialog();
          else setOpen(true);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Office">
              <Select
                value={form.office_id ? String(form.office_id) : ""}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    office_id: Number(value),
                    directorate_id: null,
                    department_id: null,
                    team_id: null,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {(officesQuery.data ?? []).map((office) => (
                    <SelectItem key={office.id} value={String(office.id)}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Department">
              <Select
                value={form.department_id ? String(form.department_id) : "all"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    department_id: value === "all" ? null : Number(value),
                    directorate_id: null,
                    team_id: null,
                  }))
                }
                disabled={!form.office_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {(departmentsQuery.data ?? []).map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Directorate">
              <Select
                value={form.directorate_id ? String(form.directorate_id) : "all"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    directorate_id: value === "all" ? null : Number(value),
                    team_id: null,
                  }))
                }
                disabled={!form.office_id || !form.department_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All directorates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All directorates</SelectItem>
                  {(directoratesQuery.data ?? []).map((directorate) => (
                    <SelectItem key={directorate.id} value={String(directorate.id)}>
                      {directorate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Team">
              <Select
                value={form.team_id ? String(form.team_id) : "all"}
                onValueChange={(value) => updateField("team_id", value === "all" ? null : Number(value))}
                disabled={!form.directorate_id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {(teamsQuery.data ?? []).map((team) => (
                    <SelectItem key={team.id} value={String(team.id)}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Role">
              <Select
                value={form.role_id ? String(form.role_id) : ""}
                onValueChange={(value) => updateField("role_id", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(rolesQuery.data ?? []).map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Module">
              <Select value={form.module} onValueChange={(value) => updateField("module", value as AccessModule)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Scope Type">
              <Select
                value={form.scope_type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    scope_type: value as AccessScopeType,
                    scope_value: null,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_TYPES.map((scopeType) => (
                    <SelectItem key={scopeType} value={scopeType}>
                      {scopeType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {["crop_type", "livestock_product"].includes(form.scope_type) ? (
              <Field label="Scope Value">
                <Select
                  value={form.scope_value ?? ""}
                  onValueChange={(value) => updateField("scope_value", value)}
                >
                  <SelectTrigger><SelectValue placeholder={`Select ${form.scope_type.replaceAll("_", " ")}`} /></SelectTrigger>
                  <SelectContent>
                    {(form.scope_type === "crop_type" ? (cropTypeOptionsQuery.data ?? []) : (livestockProductOptionsQuery.data ?? [])).map((option) => (
                      <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : form.scope_type !== "all" ? (
              <Field label="Scope Value">
                <Input value={form.scope_value ?? ""} onChange={(event) => updateField("scope_value", event.target.value)} placeholder="Exact group name" />
              </Field>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {togglePermission("can_create_annual_plan")}
            {togglePermission("can_divide_monthly_plan")}
            {togglePermission("can_update_achievement")}
            {togglePermission("can_view_report")}
            {togglePermission("can_comment")}
            {togglePermission("can_approve")}
          </div>

          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editingId ? "Update Mapping" : "Save Mapping"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
