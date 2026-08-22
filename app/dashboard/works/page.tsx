"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit, Loader2, MoreHorizontal, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { validateWorkInput } from "@/lib/schemas/work.schema";
import type { WorkTypeItem } from "@/types/location/work-type.type";
import type { WorkItem } from "@/types/location/work.type";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  };
};

type WorkForm = {
  work_type_id: string;
  name: string;
  is_active: boolean;
};

const emptyForm: WorkForm = {
  work_type_id: "",
  name: "",
  is_active: true,
};

function normalizeBool(value: WorkItem["is_active"]) {
  return value === true || value === 1;
}

async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || "Request failed");
  }

  return body;
}

export default function WorksPage() {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workTypesLoading, setWorkTypesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    last_page: 1,
    per_page: 10,
    current_page: 1,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);
  const [form, setForm] = useState<WorkForm>(emptyForm);

  const activeWorkTypes = useMemo(
    () => workTypes.filter((workType) => workType.is_active === true || workType.is_active === 1),
    [workTypes],
  );

  async function fetchWorkTypes() {
    setWorkTypesLoading(true);
    try {
      const list = await apiRequest<WorkTypeItem[]>("/api/admin/work-types?all=1");
      setWorkTypes(list.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch work types");
    } finally {
      setWorkTypesLoading(false);
    }
  }

  async function fetchWorks(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        per_page: "10",
        search,
        status,
        work_type_id: workTypeFilter,
      });

      const list = await apiRequest<WorkItem[]>(`/api/admin/works?${params.toString()}`);
      setWorks(list.data);
      setMeta({
        total: Number(list.meta?.total ?? 0),
        last_page: Number(list.meta?.last_page ?? 1),
        per_page: Number(list.meta?.per_page ?? 10),
        current_page: Number(list.meta?.current_page ?? nextPage),
      });
      setPage(nextPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch works");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWorkTypes();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchWorks(1);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, workTypeFilter]);

  function openCreate() {
    setSelectedWork(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(work: WorkItem) {
    setSelectedWork(work);
    setForm({
      work_type_id: String(work.work_type_id ?? ""),
      name: work.name ?? "",
      is_active: normalizeBool(work.is_active),
    });
    setDialogOpen(true);
  }

  function openDelete(work: WorkItem) {
    setSelectedWork(work);
    setDeleteOpen(true);
  }

  async function saveWorkStatus(work: WorkItem, isActive: boolean) {
    setSaving(true);
    try {
      await apiRequest<WorkItem>(`/api/admin/works/${work.id}`, {
        method: "PUT",
        body: JSON.stringify({
          work_type_id: work.work_type_id,
          name: work.name,
          is_active: isActive,
        }),
      });
      toast.success(isActive ? "Work activated successfully" : "Work disabled successfully");
      await fetchWorks(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update work status");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateWorkInput(form);
    if (!validation.valid) {
      toast.error(Object.values(validation.errors)[0] ?? "Invalid work data");
      return;
    }

    setSaving(true);
    try {
      if (selectedWork) {
        await apiRequest<WorkItem>(`/api/admin/works/${selectedWork.id}`, {
          method: "PUT",
          body: JSON.stringify(validation.data),
        });
        toast.success("Work updated successfully");
      } else {
        await apiRequest<WorkItem>("/api/admin/works", {
          method: "POST",
          body: JSON.stringify(validation.data),
        });
        toast.success("Work created successfully");
      }

      setDialogOpen(false);
      await fetchWorks(selectedWork ? page : 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save work");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedWork) return;

    setSaving(true);
    try {
      await apiRequest<null>(`/api/admin/works/${selectedWork.id}`, {
        method: "DELETE",
      });
      toast.success("Work deleted successfully");
      setDeleteOpen(false);
      await fetchWorks(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete work");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Works</h1>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Work
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search work or work type..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Work Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Work Types</SelectItem>
              {workTypes.map((workType) => (
                <SelectItem key={workType.id} value={String(workType.id)}>
                  {workType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => fetchWorks(page)} disabled={loading} className="w-full md:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Name</TableHead>
                <TableHead>Work Type</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[70px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading works...
                  </TableCell>
                </TableRow>
              ) : works.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No works found.
                  </TableCell>
                </TableRow>
              ) : (
                works.map((work) => {
                  const isActive = normalizeBool(work.is_active);
                  return (
                    <TableRow key={work.id}>
                      <TableCell>
                        <div className="font-medium">{work.name}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{work.work_type_name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={saving} aria-label={`Open actions for ${work.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem onClick={() => openEdit(work)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => saveWorkStatus(work, !isActive)}>
                              {isActive ? "Disable" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => openDelete(work)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing page {meta.current_page} of {meta.last_page} • {meta.total} total records
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1 || loading} onClick={() => fetchWorks(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" disabled={page >= meta.last_page || loading} onClick={() => fetchWorks(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{selectedWork ? "Edit Work" : "Create Work"}</DialogTitle>
              <DialogDescription>Select work type and enter work name.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Work Type</Label>
                <Select
                  value={form.work_type_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, work_type_id: value }))}
                  disabled={workTypesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={workTypesLoading ? "Loading work types..." : "Select work type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWorkTypes.map((workType) => (
                      <SelectItem key={workType.id} value={String(workType.id)}>
                        {workType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Example: Coffee"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.is_active ? "active" : "inactive"}
                  onValueChange={(value) => setForm((current) => ({ ...current, is_active: value === "active" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedWork ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the selected work. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
