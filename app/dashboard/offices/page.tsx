"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OfficeItem } from "@/types/location/office.type";

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

type OfficeForm = {
  name: string;
  is_active: boolean;
};

const emptyForm: OfficeForm = {
  name: "",
  is_active: true,
};

function normalizeBool(value: OfficeItem["is_active"]) {
  return value === true || value === 1;
}

async function apiRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const body = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || "Request failed");
  }

  return body;
}

export default function OfficesPage() {
  const [offices, setOffices] = useState<OfficeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    last_page: 1,
    per_page: 10,
    current_page: 1,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<OfficeItem | null>(null);
  const [form, setForm] = useState<OfficeForm>(emptyForm);

  async function fetchOffices(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        per_page: "10",
        search,
        status,
      });

      const list = await apiRequest<OfficeItem[]>(
        `/api/admin/offices?${params.toString()}`,
      );

      setOffices(list.data);
      setMeta({
        total: Number(list.meta?.total ?? 0),
        last_page: Number(list.meta?.last_page ?? 1),
        per_page: Number(list.meta?.per_page ?? 10),
        current_page: Number(list.meta?.current_page ?? nextPage),
      });
      setPage(nextPage);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch offices",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchOffices(1);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  function openCreate() {
    setSelectedOffice(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(office: OfficeItem) {
    setSelectedOffice(office);
    setForm({
      name: office.name ?? "",
      is_active: normalizeBool(office.is_active),
    });
    setDialogOpen(true);
  }

  function openDelete(office: OfficeItem) {
    setSelectedOffice(office);
    setDeleteOpen(true);
  }

  async function saveOfficeStatus(office: OfficeItem, isActive: boolean) {
    setSaving(true);
    try {
      await apiRequest<OfficeItem>(`/api/admin/offices/${office.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: office.name,
          is_active: isActive,
        }),
      });
      toast.success(
        isActive
          ? "Office activated successfully"
          : "Office disabled successfully",
      );
      await fetchOffices(page);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update office status",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      is_active: form.is_active,
    };

    if (!payload.name) {
      toast.error("Office name is required");
      return;
    }

    setSaving(true);
    try {
      if (selectedOffice) {
        await apiRequest<OfficeItem>(
          `/api/admin/offices/${selectedOffice.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        );
        toast.success("Office updated successfully");
      } else {
        await apiRequest<OfficeItem>("/api/admin/offices", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Office created successfully");
      }

      setDialogOpen(false);
      await fetchOffices(selectedOffice ? page : 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save office",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedOffice) return;

    setSaving(true);
    try {
      await apiRequest<null>(`/api/admin/offices/${selectedOffice.id}`, {
        method: "DELETE",
      });
      toast.success("Office deleted successfully");
      setDeleteOpen(false);
      await fetchOffices(page);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete office",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Offices</h1>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Office
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search office name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
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
        <Button
          variant="outline"
          onClick={() => fetchOffices(page)}
          disabled={loading}
          className="w-full md:w-auto"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[70px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />{" "}
                    Loading offices...
                  </TableCell>
                </TableRow>
              ) : offices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No offices found.
                  </TableCell>
                </TableRow>
              ) : (
                offices.map((office) => {
                  const isActive = normalizeBool(office.is_active);
                  return (
                    <TableRow key={office.id}>
                      <TableCell>
                        <div className="font-medium">{office.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={saving}
                              aria-label={`Open actions for ${office.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem onClick={() => openEdit(office)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                saveOfficeStatus(office, !isActive)
                              }
                            >
                              {isActive ? "Disable" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openDelete(office)}
                            >
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
            Showing page {meta.current_page} of {meta.last_page} • {meta.total}{" "}
            total records
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => fetchOffices(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= meta.last_page || loading}
              onClick={() => fetchOffices(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>
                {selectedOffice ? "Edit Office" : "Create Office"}
              </DialogTitle>
              <DialogDescription>
                Enter the office name and choose whether it is active.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Office Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Bureau of Agriculture"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.is_active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      is_active: value === "active",
                    }))
                  }
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {selectedOffice ? "Update Office" : "Create Office"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete office?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You can only delete an office when
              it is not linked to users, directorates, child offices, or plans.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
