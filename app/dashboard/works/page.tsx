"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit, Loader2, MoreHorizontal, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { validateWorkInput } from "@/lib/schemas/work.schema";
import type { WorkTypeItem } from "@/types/location/work-type.type";
import type { WorkItem } from "@/types/location/work.type";

type ApiResponse<T> = {
  success: boolean; message: string; data: T;
  meta?: { current_page?: number; per_page?: number; total?: number; last_page?: number };
};
type ProductForm = { work_type_id: string; name: string; is_active: boolean };
const emptyForm: ProductForm = { work_type_id: "", name: "", is_active: true };

function active(value: WorkItem["is_active"]) { return value === true || value === 1; }

async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success) throw new Error(body?.message || "Request failed");
  return body;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<WorkItem[]>([]);
  const [businessAreas, setBusinessAreas] = useState<WorkTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [areasLoading, setAreasLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, last_page: 1, per_page: 10, current_page: 1 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<WorkItem | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const activeAreas = useMemo(() => businessAreas.filter((x) => x.is_active === true || x.is_active === 1), [businessAreas]);

  async function fetchAreas() {
    setAreasLoading(true);
    try {
      const response = await apiRequest<WorkTypeItem[]>("/api/admin/work-types?all=1");
      setBusinessAreas(response.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch business areas");
    } finally { setAreasLoading(false); }
  }

  async function fetchProducts(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage), per_page: "10", search, status, work_type_id: areaFilter,
      });
      const response = await apiRequest<WorkItem[]>(`/api/admin/works?${params.toString()}`);
      setProducts(response.data);
      setMeta({
        total: Number(response.meta?.total ?? 0),
        last_page: Number(response.meta?.last_page ?? 1),
        per_page: Number(response.meta?.per_page ?? 10),
        current_page: Number(response.meta?.current_page ?? nextPage),
      });
      setPage(nextPage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch products");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchAreas(); }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => fetchProducts(1), 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, areaFilter]);

  function openCreate() { setSelected(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(item: WorkItem) {
    setSelected(item);
    setForm({ work_type_id: String(item.work_type_id ?? ""), name: item.name ?? "", is_active: active(item.is_active) });
    setDialogOpen(true);
  }

  async function saveStatus(item: WorkItem, isActive: boolean) {
    setSaving(true);
    try {
      await apiRequest(`/api/admin/works/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ work_type_id: item.work_type_id, name: item.name, is_active: isActive }),
      });
      toast.success(isActive ? "Product activated successfully" : "Product disabled successfully");
      await fetchProducts(page);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to update product status"); }
    finally { setSaving(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateWorkInput(form);
    if (!validation.valid) {
      toast.error(Object.values(validation.errors)[0] ?? "Invalid product data");
      return;
    }
    setSaving(true);
    try {
      if (selected) {
        await apiRequest(`/api/admin/works/${selected.id}`, { method: "PUT", body: JSON.stringify(validation.data) });
        toast.success("Product updated successfully");
      } else {
        await apiRequest("/api/admin/works", { method: "POST", body: JSON.stringify(validation.data) });
        toast.success("Product created successfully");
      }
      setDialogOpen(false);
      await fetchProducts(selected ? page : 1);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to save product"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/works/${selected.id}`, { method: "DELETE" });
      toast.success("Product deleted successfully");
      setDeleteOpen(false);
      await fetchProducts(page);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to delete product"); }
    finally { setSaving(false); }
  }

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold tracking-tight">Products</h1>
      <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
    </div>

    <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search product or business area..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Select value={areaFilter} onValueChange={setAreaFilter}>
        <SelectTrigger><SelectValue placeholder="Business Area" /></SelectTrigger>
        <SelectContent className="z-[100] bg-white">
          <SelectItem value="all">All Business Areas</SelectItem>
          {businessAreas.map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent className="z-[100] bg-white">
          <SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => fetchProducts(page)} disabled={loading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
      </Button>
    </div>

    <div className="overflow-hidden rounded-lg border bg-background">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Product Name</TableHead><TableHead>Business Area</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading products...</TableCell></TableRow>
          : products.length === 0 ? <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No products found.</TableCell></TableRow>
          : products.map((item) => {
            const isActive = active(item.is_active);
            return <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-muted-foreground">{item.work_type_name ?? "-"}</TableCell>
              <TableCell><Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge></TableCell>
              <TableCell className="text-right">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[100] bg-white">
                    <DropdownMenuItem onClick={() => openEdit(item)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => saveStatus(item, !isActive)}>{isActive ? "Disable" : "Activate"}</DropdownMenuItem>
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

    <div className="flex justify-between">
      <p className="text-sm text-muted-foreground">Showing page {meta.current_page} of {meta.last_page} • {meta.total} total records</p>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1 || loading} onClick={() => fetchProducts(page - 1)}>Previous</Button>
        <Button variant="outline" disabled={page >= meta.last_page || loading} onClick={() => fetchProducts(page + 1)}>Next</Button>
      </div>
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-lg bg-white">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{selected ? "Edit Product" : "Create Product"}</DialogTitle>
            <DialogDescription>Select a business area and enter product name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Area</Label>
              <Select value={form.work_type_id} onValueChange={(v) => setForm((c) => ({ ...c, work_type_id: v }))} disabled={areasLoading}>
                <SelectTrigger><SelectValue placeholder={areasLoading ? "Loading business areas..." : "Select business area"} /></SelectTrigger>
                <SelectContent className="z-[100] max-h-64 bg-white">
                  {activeAreas.map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="Example: Camel" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.is_active ? "active" : "inactive"} onValueChange={(v) => setForm((c) => ({ ...c, is_active: v === "active" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100] bg-white"><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{selected ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Delete product?</AlertDialogTitle>
          <AlertDialogDescription>This action permanently deletes the selected product. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={saving}>{saving ? "Deleting..." : "Delete"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
