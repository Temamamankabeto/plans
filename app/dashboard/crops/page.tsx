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
import { validateCropInput } from "@/lib/schemas/crop.schema";
import type { CropTypeItem } from "@/types/location/crop-type.type";
import type { CropItem } from "@/types/location/crop.type";

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

type CropForm = {
  crop_type_id: string;
  name: string;
  land_area_unit: string;
  productivity_unit: string;
  production_unit: string;
  is_active: boolean;
};

const emptyForm: CropForm = {
  crop_type_id: "",
  name: "",
  land_area_unit: "Ha",
  productivity_unit: "Qt/Ha",
  production_unit: "Qt",
  is_active: true,
};

function normalizeBool(value: CropItem["is_active"]) {
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

export default function CropsPage() {
  const [crops, setCrops] = useState<CropItem[]>([]);
  const [cropTypes, setCropTypes] = useState<CropTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cropTypesLoading, setCropTypesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [cropTypeFilter, setCropTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    last_page: 1,
    per_page: 10,
    current_page: 1,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropItem | null>(null);
  const [form, setForm] = useState<CropForm>(emptyForm);

  const activeCropTypes = useMemo(
    () => cropTypes.filter((cropType) => cropType.is_active === true || cropType.is_active === 1),
    [cropTypes],
  );

  async function fetchCropTypes() {
    setCropTypesLoading(true);
    try {
      const list = await apiRequest<CropTypeItem[]>("/api/admin/crop-types?all=1");
      setCropTypes(list.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch crop types");
    } finally {
      setCropTypesLoading(false);
    }
  }

  async function fetchCrops(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        per_page: "10",
        search,
        status,
        crop_type_id: cropTypeFilter,
      });

      const list = await apiRequest<CropItem[]>(`/api/admin/crops?${params.toString()}`);
      setCrops(list.data);
      setMeta({
        total: Number(list.meta?.total ?? 0),
        last_page: Number(list.meta?.last_page ?? 1),
        per_page: Number(list.meta?.per_page ?? 10),
        current_page: Number(list.meta?.current_page ?? nextPage),
      });
      setPage(nextPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch crops");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCropTypes();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchCrops(1);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, cropTypeFilter]);

  function openCreate() {
    setSelectedCrop(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(crop: CropItem) {
    setSelectedCrop(crop);
    setForm({
      crop_type_id: String(crop.crop_type_id ?? ""),
      name: crop.name ?? "",
      land_area_unit: crop.land_area_unit ?? "Ha",
      productivity_unit: crop.productivity_unit ?? "Qt/Ha",
      production_unit: crop.production_unit ?? "Qt",
      is_active: normalizeBool(crop.is_active),
    });
    setDialogOpen(true);
  }

  function openDelete(crop: CropItem) {
    setSelectedCrop(crop);
    setDeleteOpen(true);
  }

  async function saveCropStatus(crop: CropItem, isActive: boolean) {
    setSaving(true);
    try {
      await apiRequest<CropItem>(`/api/admin/crops/${crop.id}`, {
        method: "PUT",
        body: JSON.stringify({
          crop_type_id: crop.crop_type_id,
          name: crop.name,
          land_area_unit: crop.land_area_unit ?? "Ha",
          productivity_unit: crop.productivity_unit ?? "Qt/Ha",
          production_unit: crop.production_unit ?? "Qt",
          is_active: isActive,
        }),
      });
      toast.success(isActive ? "Crop activated successfully" : "Crop disabled successfully");
      await fetchCrops(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update crop status");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateCropInput(form);
    if (!validation.valid) {
      toast.error(Object.values(validation.errors)[0] ?? "Invalid crop data");
      return;
    }

    setSaving(true);
    try {
      if (selectedCrop) {
        await apiRequest<CropItem>(`/api/admin/crops/${selectedCrop.id}`, {
          method: "PUT",
          body: JSON.stringify(validation.data),
        });
        toast.success("Crop updated successfully");
      } else {
        await apiRequest<CropItem>("/api/admin/crops", {
          method: "POST",
          body: JSON.stringify(validation.data),
        });
        toast.success("Crop created successfully");
      }

      setDialogOpen(false);
      await fetchCrops(selectedCrop ? page : 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save crop");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedCrop) return;

    setSaving(true);
    try {
      await apiRequest<null>(`/api/admin/crops/${selectedCrop.id}`, {
        method: "DELETE",
      });
      toast.success("Crop deleted successfully");
      setDeleteOpen(false);
      await fetchCrops(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete crop");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Crops</h1>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Crop
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search crop or crop type..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={cropTypeFilter} onValueChange={setCropTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Crop Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Crop Types</SelectItem>
              {cropTypes.map((cropType) => (
                <SelectItem key={cropType.id} value={String(cropType.id)}>
                  {cropType.name}
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
        <Button variant="outline" onClick={() => fetchCrops(page)} disabled={loading} className="w-full md:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop Name</TableHead>
                <TableHead>Crop Type</TableHead>
                <TableHead>Land Area Unit</TableHead>
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
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading crops...
                  </TableCell>
                </TableRow>
              ) : crops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No crops found.
                  </TableCell>
                </TableRow>
              ) : (
                crops.map((crop) => {
                  const isActive = normalizeBool(crop.is_active);
                  return (
                    <TableRow key={crop.id}>
                      <TableCell>
                        <div className="font-medium">{crop.name}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{crop.crop_type_name ?? "-"}</TableCell>
                      <TableCell>{crop.land_area_unit ?? "Ha"}</TableCell>
                      <TableCell>{crop.productivity_unit ?? "Qt/Ha"}</TableCell>
                      <TableCell>{crop.production_unit ?? "Qt"}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={saving} aria-label={`Open actions for ${crop.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem onClick={() => openEdit(crop)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => saveCropStatus(crop, !isActive)}>
                              {isActive ? "Disable" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => openDelete(crop)}>
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
            <Button variant="outline" disabled={page <= 1 || loading} onClick={() => fetchCrops(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" disabled={page >= meta.last_page || loading} onClick={() => fetchCrops(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{selectedCrop ? "Edit Crop" : "Create Crop"}</DialogTitle>
              <DialogDescription>Select crop type, enter crop name, and configure units used in plans and reports.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Crop Type</Label>
                <Select
                  value={form.crop_type_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, crop_type_id: value }))}
                  disabled={cropTypesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={cropTypesLoading ? "Loading crop types..." : "Select crop type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCropTypes.map((cropType) => (
                      <SelectItem key={cropType.id} value={String(cropType.id)}>
                        {cropType.name}
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


              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="land_area_unit">Land Area Unit</Label>
                  <Input
                    id="land_area_unit"
                    value={form.land_area_unit}
                    onChange={(event) => setForm((current) => ({ ...current, land_area_unit: event.target.value }))}
                    placeholder="Ha"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productivity_unit">Productivity Unit</Label>
                  <Input
                    id="productivity_unit"
                    value={form.productivity_unit}
                    onChange={(event) => setForm((current) => ({ ...current, productivity_unit: event.target.value }))}
                    placeholder="Qt/Ha"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="production_unit">Production Unit</Label>
                  <Input
                    id="production_unit"
                    value={form.production_unit}
                    onChange={(event) => setForm((current) => ({ ...current, production_unit: event.target.value }))}
                    placeholder="Qt"
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
                {selectedCrop ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete crop?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the selected crop. This cannot be undone.
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
