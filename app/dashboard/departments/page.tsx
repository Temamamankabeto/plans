"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit, Loader2, MoreHorizontal, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { departmentSchema } from "@/lib/schemas/department.schema";
import type { DepartmentItem } from "@/types/location/department.type";
import type { OfficeItem } from "@/types/location/office.type";

type ApiResponse<T> = { success: boolean; message: string; data: T; meta?: { current_page?: number; per_page?: number; total?: number; last_page?: number } };
type Form = { office_id: string; name: string; code: string; description: string; is_active: boolean };
const emptyForm: Form = { office_id: "", name: "", code: "", description: "", is_active: true };
const normalizeBool = (value: DepartmentItem["is_active"]) => value === true || value === 1;

async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, { ...options, headers: { Accept: "application/json", "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success) throw new Error(body?.message || "Request failed");
  return body;
}

export default function DepartmentsPage() {
  const [rows, setRows] = useState<DepartmentItem[]>([]);
  const [offices, setOffices] = useState<OfficeItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, last_page: 1, current_page: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<DepartmentItem | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const activeOffices = useMemo(() => offices.filter((o) => o.is_active === true || o.is_active === 1), [offices]);

  async function fetchOffices() {
    try { setOffices((await apiRequest<OfficeItem[]>("/api/admin/offices?all=1")).data); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to fetch offices"); }
  }
  async function fetchRows(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), per_page: "10", search, status, office_id: officeFilter });
      const res = await apiRequest<DepartmentItem[]>(`/api/admin/departments?${params}`);
      setRows(res.data); setMeta({ total: Number(res.meta?.total ?? 0), last_page: Number(res.meta?.last_page ?? 1), current_page: Number(res.meta?.current_page ?? nextPage) }); setPage(nextPage);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to fetch departments"); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchOffices(); }, []);
  useEffect(() => { const t = window.setTimeout(() => fetchRows(1), 250); return () => window.clearTimeout(t); }, [search, status, officeFilter]);

  function openCreate() { setSelected(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(row: DepartmentItem) { setSelected(row); setForm({ office_id: String(row.office_id), name: row.name, code: row.code ?? "", description: row.description ?? "", is_active: normalizeBool(row.is_active) }); setDialogOpen(true); }
  async function saveStatus(row: DepartmentItem, is_active: boolean) {
    setSaving(true); try { await apiRequest(`/api/admin/departments/${row.id}`, { method: "PUT", body: JSON.stringify({ office_id: row.office_id, name: row.name, code: row.code, description: row.description ?? null, is_active }) }); await fetchRows(page); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Unable to update department"); } finally { setSaving(false); }
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); const parsed = departmentSchema.safeParse(form); if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid department data");
    setSaving(true); try { await apiRequest(selected ? `/api/admin/departments/${selected.id}` : "/api/admin/departments", { method: selected ? "PUT" : "POST", body: JSON.stringify(parsed.data) }); toast.success(selected ? "Department updated successfully" : "Department created successfully"); setDialogOpen(false); await fetchRows(selected ? page : 1); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Unable to save department"); } finally { setSaving(false); }
  }
  async function remove() { if (!selected) return; setSaving(true); try { await apiRequest(`/api/admin/departments/${selected.id}`, { method: "DELETE" }); toast.success("Department deleted successfully"); setDeleteOpen(false); await fetchRows(page); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to delete department"); } finally { setSaving(false); } }

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-bold tracking-tight">Departments</h1><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4"/>Add Department</Button></div>
    <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Search department or office..." value={search} onChange={(e)=>setSearch(e.target.value)}/></div>
      <Select value={officeFilter} onValueChange={setOfficeFilter}><SelectTrigger><SelectValue placeholder="Office"/></SelectTrigger><SelectContent><SelectItem value="all">All Offices</SelectItem>{offices.map(o=><SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent></Select>
      <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      <Button variant="outline" onClick={()=>fetchRows(page)} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}/>Refresh</Button>
    </div>
    <div className="overflow-hidden rounded-lg border bg-background"><Table><TableHeader><TableRow><TableHead>Department Name</TableHead><TableHead>Office</TableHead><TableHead>Directorates</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>
      {loading ? <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin"/></TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No departments found.</TableCell></TableRow> : rows.map(row => { const active=normalizeBool(row.is_active); return <TableRow key={row.id}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.office_name}</TableCell><TableCell>{Number(row.directorates_count ?? 0)}</TableCell><TableCell><Badge variant={active?"default":"secondary"}>{active?"Active":"Inactive"}</Badge></TableCell><TableCell className="text-right"><DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={()=>openEdit(row)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem><DropdownMenuItem onClick={()=>saveStatus(row,!active)}>{active?"Disable":"Activate"}</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem variant="destructive" onClick={()=>{setSelected(row);setDeleteOpen(true)}}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow> })}
    </TableBody></Table></div>
    <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {meta.current_page} of {meta.last_page} • {meta.total} records</p><div className="flex gap-2"><Button variant="outline" disabled={page<=1||loading} onClick={()=>fetchRows(page-1)}>Previous</Button><Button variant="outline" disabled={page>=meta.last_page||loading} onClick={()=>fetchRows(page+1)}>Next</Button></div></div>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><form onSubmit={submit} className="space-y-5"><DialogHeader><DialogTitle>{selected?"Edit Department":"Create Department"}</DialogTitle><DialogDescription>Department is directly under an Office.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Office</Label><Select value={form.office_id} onValueChange={v=>setForm(f=>({...f,office_id:v}))}><SelectTrigger><SelectValue placeholder="Select office"/></SelectTrigger><SelectContent>{activeOffices.map(o=><SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Department Name</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/></div><div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="Auto-generated when blank"/></div><div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div><div className="space-y-2"><Label>Status</Label><Select value={form.is_active?"active":"inactive"} onValueChange={v=>setForm(f=>({...f,is_active:v==="active"}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{selected?"Update":"Create"}</Button></DialogFooter></form></DialogContent></Dialog>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete department?</AlertDialogTitle><AlertDialogDescription>A department with linked directorates cannot be deleted. Disable it instead.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
