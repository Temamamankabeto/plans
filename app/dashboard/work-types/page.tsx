"use client";

import { FormEvent, useEffect, useState } from "react";
import { Edit, Loader2, MoreHorizontal, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { validateWorkTypeInput } from "@/lib/schemas/work-type.schema";
import type { WorkTypeItem } from "@/types/location/work-type.type";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: { current_page?: number; per_page?: number; total?: number; last_page?: number };
};

type BusinessAreaForm = { name: string; is_active: boolean };
const emptyForm: BusinessAreaForm = { name: "", is_active: true };

function normalizeBool(value: WorkTypeItem["is_active"]) {
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
  if (!response.ok || !body?.success) throw new Error(body?.message || "Request failed");
  return body;
}

export default function BusinessAreasPage() {
  const [items, setItems] = useState<WorkTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, last_page: 1, per_page: 10, current_page: 1 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<WorkTypeItem | null>(null);
  const [form, setForm] = useState<BusinessAreaForm>(emptyForm);

  async function fetchItems(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage), per_page: "10", search, status,
      });
      const list = await apiRequest<WorkTypeItem[]>(`/api/admin/work-types?${params.toString()}`);
      setItems(list.data);
      setMeta({
        total: Number(list.meta?.total ?? 0),
        last_page: Number(list.meta?.last_page ?? 1),
        per_page: Number(list.meta?.per_page ?? 10),
        current_page: Number(list.meta?.current_page ?? nextPage),
      });
      setPage(nextPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch business areas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => fetchItems(1), 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  function openCreate() {
    setSelected(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: WorkTypeItem) {
    setSelected(item);
    setForm({ name: item.name ?? "", is_active: normalizeBool(item.is_active) });
    setDialogOpen(true);
  }

  async function saveStatus(item: WorkTypeItem, isActive: boolean) {
    setSaving(true);
    try {
      await apiRequest(`/api/admin/work-types/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: item.name, is_active: isActive }),
      });
      toast.success(isActive ? "Business area activated successfully" : "Business area disabled successfully");
      await fetchItems(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update business area status");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateWorkTypeInput(form);
    if (!validation.valid) {
      toast.error(Object.values(validation.errors)[0] ?? "Invalid business area data");
      return;
    }

    setSaving(true);
    try {
      if (selected) {
        await apiRequest(`/api/admin/work-types/${selected.id}`, {
          method: "PUT", body: JSON.stringify(validation.data),
        });
        toast.success("Business area updated successfully");
      } else {
        await apiRequest("/api/admin/work-types", {
          method: "POST", body: JSON.stringify(validation.data),
        });
        toast.success("Business area created successfully");
      }
      setDialogOpen(false);
      await fetchItems(selected ? page : 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save business area");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/work-types/${selected.id}`, { method: "DELETE" });
      toast.success("Business area deleted successfully");
      setDeleteOpen(false);
      await fetchItems(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete business area");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Business Areas</h1>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Business Area
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search business area..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="z-[100] bg-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => fetchItems(page)} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[70px] text-right">Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="h-32 text-center">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading business areas...
              </TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                No business areas found.
              </TableCell></TableRow>
            ) : items.map((item) => {
              const active = normalizeBool(item.is_active);
              return <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell><Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={saving}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[100] bg-white">
                      <DropdownMenuItem onClick={() => openEdit(item)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => saveStatus(item, !active)}>{active ? "Disable" : "Activate"}</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => { setSelected(item); setDeleteOpen(true); }}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>;
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing page {meta.current_page} of {meta.last_page} • {meta.total} total records
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page <= 1 || loading} onClick={() => fetchItems(page - 1)}>Previous</Button>
          <Button variant="outline" disabled={page >= meta.last_page || loading} onClick={() => fetchItems(page + 1)}>Next</Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{selected ? "Edit Business Area" : "Create Business Area"}</DialogTitle>
              <DialogDescription>Enter the business area name and status.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Area Name</Label>
                <Input id="name" value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Example: Export Market" autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.is_active ? "active" : "inactive"}
                  onValueChange={(v) => setForm((c) => ({ ...c, is_active: v === "active" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[100] bg-white">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selected ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete business area?</AlertDialogTitle>
            <AlertDialogDescription>
              This action deletes the business area and its related products. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving}>{saving ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
