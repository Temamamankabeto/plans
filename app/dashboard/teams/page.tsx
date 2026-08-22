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
import { validateTeamInput } from "@/lib/schemas/team.schema";
import type { DepartmentItem } from "@/types/location/department.type";
import type { DirectorateItem } from "@/types/location/directorate.type";
import type { OfficeItem } from "@/types/location/office.type";
import type { TeamItem } from "@/types/location/team.type";

type ApiResponse<T> = { success: boolean; message: string; data: T; meta?: { current_page?: number; per_page?: number; total?: number; last_page?: number } };
type Form = { office_id: string; department_id: string; directorate_id: string; name: string; is_active: boolean };
const emptyForm: Form = { office_id: "", department_id: "", directorate_id: "", name: "", is_active: true };
const active = (value: boolean | number | undefined) => value === true || value === 1;

async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, { ...options, headers: { Accept: "application/json", "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success) throw new Error(body?.message || "Request failed");
  return body;
}

export default function TeamsPage() {
  const [rows, setRows] = useState<TeamItem[]>([]);
  const [offices, setOffices] = useState<OfficeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [directorates, setDirectorates] = useState<DirectorateItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [directorateFilter, setDirectorateFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, last_page: 1, current_page: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<TeamItem | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const activeOffices = useMemo(() => offices.filter(o => active(o.is_active)), [offices]);
  const formDepartments = useMemo(() => departments.filter(d => active(d.is_active) && String(d.office_id) === form.office_id), [departments, form.office_id]);
  const formDirectorates = useMemo(() => directorates.filter(d => active(d.is_active) && String(d.department_id ?? "") === form.department_id), [directorates, form.department_id]);
  const filterDepartments = useMemo(() => officeFilter === "all" ? departments : departments.filter(d => String(d.office_id) === officeFilter), [departments, officeFilter]);
  const filterDirectorates = useMemo(() => {
    let list = directorates;
    if (officeFilter !== "all") list = list.filter(d => String(d.office_id) === officeFilter);
    if (departmentFilter !== "all") list = list.filter(d => String(d.department_id ?? "") === departmentFilter);
    return list;
  }, [directorates, officeFilter, departmentFilter]);

  async function fetchParents() {
    try {
      const [o,d,r] = await Promise.all([
        apiRequest<OfficeItem[]>("/api/admin/offices?all=1"),
        apiRequest<DepartmentItem[]>("/api/admin/departments?all=1"),
        apiRequest<DirectorateItem[]>("/api/admin/directorates?all=1"),
      ]);
      setOffices(o.data); setDepartments(d.data); setDirectorates(r.data);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to fetch organization hierarchy"); }
  }
  async function fetchRows(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), per_page: "10", search, status, office_id: officeFilter, department_id: departmentFilter, directorate_id: directorateFilter });
      const res = await apiRequest<TeamItem[]>(`/api/admin/teams?${params}`);
      setRows(res.data); setMeta({ total: Number(res.meta?.total ?? 0), last_page: Number(res.meta?.last_page ?? 1), current_page: Number(res.meta?.current_page ?? nextPage) }); setPage(nextPage);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to fetch teams"); } finally { setLoading(false); }
  }
  useEffect(() => { fetchParents(); }, []);
  useEffect(() => { if (departmentFilter !== "all" && !filterDepartments.some(d => String(d.id) === departmentFilter)) setDepartmentFilter("all"); }, [officeFilter, departments]);
  useEffect(() => { if (directorateFilter !== "all" && !filterDirectorates.some(d => String(d.id) === directorateFilter)) setDirectorateFilter("all"); }, [officeFilter, departmentFilter, directorates]);
  useEffect(() => { const t = window.setTimeout(() => fetchRows(1), 250); return () => window.clearTimeout(t); }, [search, status, officeFilter, departmentFilter, directorateFilter]);

  function openCreate() { setSelected(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(row: TeamItem) { setSelected(row); setForm({ office_id: String(row.office_id ?? ""), department_id: String(row.department_id ?? ""), directorate_id: String(row.directorate_id), name: row.name, is_active: active(row.is_active) }); setDialogOpen(true); }
  function setOffice(value: string) { setForm(f => ({ ...f, office_id: value, department_id: "", directorate_id: "" })); }
  function setDepartment(value: string) { setForm(f => ({ ...f, department_id: value, directorate_id: "" })); }
  async function saveStatus(row: TeamItem, is_active: boolean) { setSaving(true); try { await apiRequest(`/api/admin/teams/${row.id}`, { method: "PUT", body: JSON.stringify({ directorate_id: row.directorate_id, name: row.name, is_active }) }); await fetchRows(page); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to update team"); } finally { setSaving(false); } }
  async function submit(e: FormEvent) {
    e.preventDefault(); const validation = validateTeamInput(form); if (!validation.valid) return toast.error(Object.values(validation.errors)[0] ?? "Invalid team data");
    setSaving(true); try { await apiRequest(selected ? `/api/admin/teams/${selected.id}` : "/api/admin/teams", { method: selected ? "PUT" : "POST", body: JSON.stringify(validation.data) }); toast.success(selected ? "Team updated successfully" : "Team created successfully"); setDialogOpen(false); await fetchRows(selected ? page : 1); } catch (err) { toast.error(err instanceof Error ? err.message : "Unable to save team"); } finally { setSaving(false); }
  }
  async function remove() { if (!selected) return; setSaving(true); try { await apiRequest(`/api/admin/teams/${selected.id}`, { method: "DELETE" }); toast.success("Team deleted successfully"); setDeleteOpen(false); await fetchRows(page); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to delete team"); } finally { setSaving(false); } }

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-bold tracking-tight">Teams</h1><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4"/>Add Team</Button></div>
    <div className="grid gap-3 xl:grid-cols-[1fr_190px_210px_210px_160px_auto]">
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Search team or organization..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <Select value={officeFilter} onValueChange={setOfficeFilter}><SelectTrigger><SelectValue placeholder="Office"/></SelectTrigger><SelectContent><SelectItem value="all">All Offices</SelectItem>{offices.map(o=><SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent></Select>
      <Select value={departmentFilter} onValueChange={setDepartmentFilter}><SelectTrigger><SelectValue placeholder="Department"/></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{filterDepartments.map(d=><SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent></Select>
      <Select value={directorateFilter} onValueChange={setDirectorateFilter}><SelectTrigger><SelectValue placeholder="Directorate"/></SelectTrigger><SelectContent><SelectItem value="all">All Directorates</SelectItem>{filterDirectorates.map(d=><SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent></Select>
      <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      <Button variant="outline" onClick={()=>fetchRows(page)} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading?"animate-spin":""}`}/>Refresh</Button>
    </div>
    <div className="overflow-hidden rounded-lg border"><Table><TableHeader><TableRow><TableHead>Team</TableHead><TableHead>Directorate</TableHead><TableHead>Department</TableHead><TableHead>Office</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{loading?<TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin"/></TableCell></TableRow>:rows.length===0?<TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No teams found.</TableCell></TableRow>:rows.map(row=>{const isActive=active(row.is_active);return <TableRow key={row.id}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.directorate_name ?? "-"}</TableCell><TableCell>{row.department_name ?? "-"}</TableCell><TableCell>{row.office_name ?? "-"}</TableCell><TableCell><Badge variant={isActive?"default":"secondary"}>{isActive?"Active":"Inactive"}</Badge></TableCell><TableCell className="text-right"><DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={()=>openEdit(row)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem><DropdownMenuItem onClick={()=>saveStatus(row,!isActive)}>{isActive?"Disable":"Activate"}</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem variant="destructive" onClick={()=>{setSelected(row);setDeleteOpen(true)}}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>})}</TableBody></Table></div>
    <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {meta.current_page} of {meta.last_page} • {meta.total} records</p><div className="flex gap-2"><Button variant="outline" disabled={page<=1||loading} onClick={()=>fetchRows(page-1)}>Previous</Button><Button variant="outline" disabled={page>=meta.last_page||loading} onClick={()=>fetchRows(page+1)}>Next</Button></div></div>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><form onSubmit={submit} className="space-y-5"><DialogHeader><DialogTitle>{selected?"Edit Team":"Create Team"}</DialogTitle><DialogDescription>Team must be under Directorate → Department → Office.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Office</Label><Select value={form.office_id} onValueChange={setOffice}><SelectTrigger><SelectValue placeholder="Select office"/></SelectTrigger><SelectContent>{activeOffices.map(o=><SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Department</Label><Select value={form.department_id} onValueChange={setDepartment} disabled={!form.office_id}><SelectTrigger><SelectValue placeholder={form.office_id?"Select department":"Select office first"}/></SelectTrigger><SelectContent>{formDepartments.map(d=><SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Directorate</Label><Select value={form.directorate_id} onValueChange={v=>setForm(f=>({...f,directorate_id:v}))} disabled={!form.department_id}><SelectTrigger><SelectValue placeholder={form.department_id?"Select directorate":"Select department first"}/></SelectTrigger><SelectContent>{formDirectorates.map(d=><SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Team Name</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/></div><div className="space-y-2"><Label>Status</Label><Select value={form.is_active?"active":"inactive"} onValueChange={v=>setForm(f=>({...f,is_active:v==="active"}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{selected?"Update":"Create"}</Button></DialogFooter></form></DialogContent></Dialog>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete team?</AlertDialogTitle><AlertDialogDescription>This action permanently removes the team.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
