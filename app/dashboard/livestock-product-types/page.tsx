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
import { validateLivestockProductTypeInput } from "@/lib/schemas/livestock-product-type.schema";
import type { LivestockProductItem } from "@/types/location/livestock-product.type";
import type { LivestockProductTypeItem } from "@/types/location/livestock-product-type.type";

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

type LivestockProductTypeForm = {
  livestock_product_id: string;
  name: string;
  number_unit: string;
  productivity_unit: string;
  production_unit: string;
  is_active: boolean;
};

const emptyForm: LivestockProductTypeForm = {
  livestock_product_id: "",
  name: "",
  number_unit: "Head",
  productivity_unit: "Unit/Head",
  production_unit: "Unit",
  is_active: true,
};

function normalizeBool(value: LivestockProductTypeItem["is_active"]) {
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

export default function LivestockProductTypesPage() {
  const [livestockProductTypes, setLivestockProductTypes] = useState<LivestockProductTypeItem[]>([]);
  const [livestockProducts, setLivestockProducts] = useState<LivestockProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [livestockProductsLoading, setLivestockProductsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [livestockProductFilter, setLivestockProductFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    last_page: 1,
    per_page: 10,
    current_page: 1,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedLivestockProductType, setSelectedLivestockProductType] = useState<LivestockProductTypeItem | null>(null);
  const [form, setForm] = useState<LivestockProductTypeForm>(emptyForm);

  const activeLivestockProducts = useMemo(
    () => livestockProducts.filter((livestockProduct) => livestockProduct.is_active === true || livestockProduct.is_active === 1),
    [livestockProducts],
  );

  async function fetchLivestockProducts() {
    setLivestockProductsLoading(true);
    try {
      const list = await apiRequest<LivestockProductItem[]>("/api/admin/livestock-products?all=1");
      setLivestockProducts(list.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch livestock products");
    } finally {
      setLivestockProductsLoading(false);
    }
  }

  async function fetchLivestockProductTypes(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        per_page: "10",
        search,
        status,
        livestock_product_id: livestockProductFilter,
      });

      const list = await apiRequest<LivestockProductTypeItem[]>(`/api/admin/livestock-product-types?${params.toString()}`);
      setLivestockProductTypes(list.data);
      setMeta({
        total: Number(list.meta?.total ?? 0),
        last_page: Number(list.meta?.last_page ?? 1),
        per_page: Number(list.meta?.per_page ?? 10),
        current_page: Number(list.meta?.current_page ?? nextPage),
      });
      setPage(nextPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch livestock product types");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLivestockProducts();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchLivestockProductTypes(1);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, livestockProductFilter]);

  function openCreate() {
    setSelectedLivestockProductType(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(livestockProductType: LivestockProductTypeItem) {
    setSelectedLivestockProductType(livestockProductType);
    setForm({
      livestock_product_id: String(livestockProductType.livestock_product_id ?? ""),
      name: livestockProductType.name ?? "",
      number_unit: livestockProductType.number_unit ?? "Head",
      productivity_unit: livestockProductType.productivity_unit ?? "Unit/Head",
      production_unit: livestockProductType.production_unit ?? "Unit",
      is_active: normalizeBool(livestockProductType.is_active),
    });
    setDialogOpen(true);
  }

  function openDelete(livestockProductType: LivestockProductTypeItem) {
    setSelectedLivestockProductType(livestockProductType);
    setDeleteOpen(true);
  }

  async function saveLivestockProductTypeStatus(livestockProductType: LivestockProductTypeItem, isActive: boolean) {
    setSaving(true);
    try {
      await apiRequest<LivestockProductTypeItem>(`/api/admin/livestock-product-types/${livestockProductType.id}`, {
        method: "PUT",
        body: JSON.stringify({
          livestock_product_id: livestockProductType.livestock_product_id,
          name: livestockProductType.name,
          number_unit: livestockProductType.number_unit ?? "Head",
          productivity_unit: livestockProductType.productivity_unit ?? "Unit/Head",
          production_unit: livestockProductType.production_unit ?? "Unit",
          is_active: isActive,
        }),
      });
      toast.success(isActive ? "Livestock Product Type activated successfully" : "Livestock Product Type disabled successfully");
      await fetchLivestockProductTypes(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update livestock product type status");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateLivestockProductTypeInput(form);
    if (!validation.valid) {
      toast.error(Object.values(validation.errors)[0] ?? "Invalid livestock product type data");
      return;
    }

    setSaving(true);
    try {
      if (selectedLivestockProductType) {
        await apiRequest<LivestockProductTypeItem>(`/api/admin/livestock-product-types/${selectedLivestockProductType.id}`, {
          method: "PUT",
          body: JSON.stringify(validation.data),
        });
        toast.success("Livestock Product Type updated successfully");
      } else {
        await apiRequest<LivestockProductTypeItem>("/api/admin/livestock-product-types", {
          method: "POST",
          body: JSON.stringify(validation.data),
        });
        toast.success("Livestock Product Type created successfully");
      }

      setDialogOpen(false);
      await fetchLivestockProductTypes(selectedLivestockProductType ? page : 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save livestock product type");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedLivestockProductType) return;

    setSaving(true);
    try {
      await apiRequest<null>(`/api/admin/livestock-product-types/${selectedLivestockProductType.id}`, {
        method: "DELETE",
      });
      toast.success("Livestock Product Type deleted successfully");
      setDeleteOpen(false);
      await fetchLivestockProductTypes(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete livestock product type");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Livestock Product Types</h1>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Livestock Product Type
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search livestock product type or livestock product..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={livestockProductFilter} onValueChange={setLivestockProductFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Livestock Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Livestock Products</SelectItem>
              {livestockProducts.map((livestockProduct) => (
                <SelectItem key={livestockProduct.id} value={String(livestockProduct.id)}>
                  {livestockProduct.name}
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
        <Button variant="outline" onClick={() => fetchLivestockProductTypes(page)} disabled={loading} className="w-full md:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Livestock Product Type Name</TableHead>
                <TableHead>Livestock Product</TableHead>
                <TableHead>Number Unit</TableHead>
                <TableHead>Productivity Unit</TableHead>
                <TableHead>Production Unit</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[70px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading livestock product types...
                  </TableCell>
                </TableRow>
              ) : livestockProductTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No livestock product types found.
                  </TableCell>
                </TableRow>
              ) : (
                livestockProductTypes.map((livestockProductType) => {
                  const isActive = normalizeBool(livestockProductType.is_active);
                  return (
                    <TableRow key={livestockProductType.id}>
                      <TableCell>
                        <div className="font-medium">{livestockProductType.name}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{livestockProductType.livestock_product_name ?? "-"}</TableCell>
                      <TableCell>{livestockProductType.number_unit ?? "Head"}</TableCell>
                      <TableCell>{livestockProductType.productivity_unit ?? "Unit/Head"}</TableCell>
                      <TableCell>{livestockProductType.production_unit ?? "Unit"}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={saving} aria-label={`Open actions for ${livestockProductType.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem onClick={() => openEdit(livestockProductType)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => saveLivestockProductTypeStatus(livestockProductType, !isActive)}>
                              {isActive ? "Disable" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => openDelete(livestockProductType)}>
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
            <Button variant="outline" disabled={page <= 1 || loading} onClick={() => fetchLivestockProductTypes(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" disabled={page >= meta.last_page || loading} onClick={() => fetchLivestockProductTypes(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{selectedLivestockProductType ? "Edit Livestock Product Type" : "Create Livestock Product Type"}</DialogTitle>
              <DialogDescription>Select livestock product, enter product type name, and configure units used in plans and reports.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Livestock Product</Label>
                <Select
                  value={form.livestock_product_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, livestock_product_id: value }))}
                  disabled={livestockProductsLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={livestockProductsLoading ? "Loading livestock products..." : "Select livestock product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLivestockProducts.map((livestockProduct) => (
                      <SelectItem key={livestockProduct.id} value={String(livestockProduct.id)}>
                        {livestockProduct.name}
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
                  placeholder="Example: Cow Milk"
                  autoFocus
                />
              </div>


              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="number_unit">Number Unit</Label>
                  <Input
                    id="number_unit"
                    value={form.number_unit}
                    onChange={(event) => setForm((current) => ({ ...current, number_unit: event.target.value }))}
                    placeholder="Head"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productivity_unit">Productivity Unit</Label>
                  <Input
                    id="productivity_unit"
                    value={form.productivity_unit}
                    onChange={(event) => setForm((current) => ({ ...current, productivity_unit: event.target.value }))}
                    placeholder="Unit/Head"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="production_unit">Production Unit</Label>
                  <Input
                    id="production_unit"
                    value={form.production_unit}
                    onChange={(event) => setForm((current) => ({ ...current, production_unit: event.target.value }))}
                    placeholder="Unit"
                  />
                </div>
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
                {selectedLivestockProductType ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete livestock product type?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the selected livestock product type. This cannot be undone.
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
