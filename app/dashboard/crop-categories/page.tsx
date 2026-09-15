"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Edit, Eye, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Api<T> = { success: boolean; message: string; data: T };
type Row = { id: number | string; name: string; code?: string | null; is_active?: boolean | number; crop_type_id?: number | string; crop_type_category_id?: number | string | null; crop_id?: number | string; crop_type_name?: string; crop_type_category_name?: string; crop_name?: string };
type Kind = "all" | "Crop Type" | "Type Category" | "Crop" | "Crop Category";
type HierarchyRow = Row & { key: string; level: number; kind: Exclude<Kind, "all">; parent: string };
type CreateForm = { name: string; code: string; is_active: string; crop_type_id: string; crop_type_category_id: string; crop_id: string };

const emptyForm: CreateForm = { name: "", code: "", is_active: "active", crop_type_id: "", crop_type_category_id: "", crop_id: "" };
const active = (v: unknown) => v === true || v === 1 || v === "1";
const sameId = (a: unknown, b: unknown) => String(a ?? "") === String(b ?? "");

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { Accept: "application/json", "Content-Type": "application/json", ...(options?.headers ?? {}) }, cache: "no-store" });
  const body = (await response.json().catch(() => null)) as Api<T> | null;
  if (!response.ok || !body?.success) throw new Error(body?.message || "Request failed");
  return body.data;
}

export default function CropCategoriesPage() {
  const [types, setTypes] = useState<Row[]>([]);
  const [typeCats, setTypeCats] = useState<Row[]>([]);
  const [crops, setCrops] = useState<Row[]>([]);
  const [cats, setCats] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<Kind>("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createKind, setCreateKind] = useState<Exclude<Kind, "all">>("Crop Type");
  const [form, setForm] = useState<CreateForm>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b, c, d] = await Promise.all([
        request<Row[]>("/api/admin/crop-types?all=1"),
        request<Row[]>("/api/admin/crop-type-categories?all=1"),
        request<Row[]>("/api/admin/crops?all=1"),
        request<Row[]>("/api/admin/crop-categories?all=1"),
      ]);
      setTypes(Array.isArray(a) ? a : []); setTypeCats(Array.isArray(b) ? b : []); setCrops(Array.isArray(c) ? c : []); setCats(Array.isArray(d) ? d : []);
      setExpanded(new Set((Array.isArray(a) ? a : []).map((x) => `t-${x.id}`)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load crop hierarchy");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => {
    const out: HierarchyRow[] = [];
    for (const t of types) {
      out.push({ ...t, key: `t-${t.id}`, level: 1, kind: "Crop Type", parent: "-" });
      const tCats = typeCats.filter((x) => sameId(x.crop_type_id, t.id));
      for (const tc of tCats) {
        out.push({ ...tc, key: `tc-${tc.id}`, level: 2, kind: "Type Category", parent: t.name });
        for (const crop of crops.filter((x) => sameId(x.crop_type_category_id, tc.id))) {
          out.push({ ...crop, key: `c-${crop.id}`, level: 3, kind: "Crop", parent: tc.name });
          for (const cat of cats.filter((x) => sameId(x.crop_id, crop.id))) out.push({ ...cat, key: `cc-${cat.id}`, level: 4, kind: "Crop Category", parent: crop.name });
        }
      }
      for (const crop of crops.filter((x) => sameId(x.crop_type_id, t.id) && !x.crop_type_category_id)) {
        out.push({ ...crop, key: `c-${crop.id}`, level: 2, kind: "Crop", parent: t.name });
        for (const cat of cats.filter((x) => sameId(x.crop_id, crop.id))) out.push({ ...cat, key: `cc-${cat.id}`, level: 3, kind: "Crop Category", parent: crop.name });
      }
    }
    return out;
  }, [types, typeCats, crops, cats]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (status === "active" && !active(r.is_active)) return false;
      if (status === "inactive" && active(r.is_active)) return false;
      if (q && !`${r.name} ${r.code ?? ""} ${r.parent}`.toLowerCase().includes(q)) return false;
      if (kind === "all" && !q && r.level > 1) {
        const root = r.kind === "Type Category" ? `t-${r.crop_type_id}` : r.kind === "Crop" ? `t-${r.crop_type_id}` : r.kind === "Crop Category" ? `t-${crops.find((c) => sameId(c.id, r.crop_id))?.crop_type_id ?? ""}` : r.key;
        return expanded.has(root);
      }
      return true;
    });
  }, [rows, kind, status, search, expanded, crops]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((currentPage - 1) * perPage, currentPage * perPage);
  useEffect(() => setPage(1), [search, status, kind, perPage]);

  const openCreate = (nextKind: Exclude<Kind, "all">) => { setCreateKind(nextKind); setForm(emptyForm); setDialogOpen(true); };
  const selectedTypeCategories = typeCats.filter((x) => sameId(x.crop_type_id, form.crop_type_id));
  const selectedCrops = crops.filter((x) => sameId(x.crop_type_id, form.crop_type_id) && (!form.crop_type_category_id || sameId(x.crop_type_category_id, form.crop_type_category_id)));

  async function submitCreate(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const endpoint = createKind === "Crop Type" ? "/api/admin/crop-types" : createKind === "Type Category" ? "/api/admin/crop-type-categories" : createKind === "Crop" ? "/api/admin/crops" : "/api/admin/crop-categories";
      const payload: Record<string, unknown> = { name: form.name.trim(), code: form.code.trim() || undefined, is_active: form.is_active === "active" };
      if (createKind === "Type Category" || createKind === "Crop") payload.crop_type_id = Number(form.crop_type_id);
      if (createKind === "Crop" && form.crop_type_category_id) payload.crop_type_category_id = Number(form.crop_type_category_id);
      if (createKind === "Crop Category") payload.crop_id = Number(form.crop_id);
      await request(endpoint, { method: "POST", body: JSON.stringify(payload) });
      toast.success(`${createKind} created successfully`); setDialogOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to create record"); } finally { setSaving(false); }
  }

  const href = (rowKind: HierarchyRow["kind"]) => rowKind === "Crop Type" ? "/dashboard/crop-types" : rowKind === "Type Category" ? "/dashboard/crop-type-categories" : rowKind === "Crop" ? "/dashboard/crops" : "/dashboard/crop-categories";
  const toggle = (key: string) => setExpanded((value) => { const next = new Set(value); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const addLabel = kind === "all" ? "Add" : `Add ${kind}`;

  return <div className="p-1 md:p-2">
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">{([ ["all", "All"], ["Crop Type", "Crop Types"], ["Type Category", "Type Categories"], ["Crop", "Crops"], ["Crop Category", "Crop Categories"] ] as [Kind,string][]).map(([value,label]) => <Button key={value} type="button" size="sm" variant={kind === value ? "default" : "outline"} onClick={() => setKind(value)}>{label}</Button>)}</div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search by name or code..."/></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
          {kind === "all" ? <DropdownMenu><DropdownMenuTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Add</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openCreate("Crop Type")}>Crop Type</DropdownMenuItem><DropdownMenuItem onClick={() => openCreate("Type Category")}>Type Category</DropdownMenuItem><DropdownMenuItem onClick={() => openCreate("Crop")}>Crop</DropdownMenuItem><DropdownMenuItem onClick={() => openCreate("Crop Category")}>Crop Category</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <Button onClick={() => openCreate(kind)}><Plus className="mr-2 h-4 w-4"/>{addLabel}</Button>}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border"><Table><TableHeader><TableRow><TableHead className="w-16">#</TableHead><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Parent</TableHead><TableHead>Level</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
        {loading ? <TableRow><TableCell colSpan={8} className="h-40 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow> : paginatedRows.map((r, i) => <TableRow key={r.key}><TableCell>{(currentPage - 1) * perPage + i + 1}</TableCell><TableCell><div className="flex items-center" style={{ paddingLeft: kind === "all" ? (r.level - 1) * 24 : 0 }}>{kind === "all" && r.kind === "Crop Type" ? <button className="mr-2" onClick={() => toggle(r.key)}>{expanded.has(r.key) ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}</button> : <span className="mr-2 w-4"/>}<span className="mr-2">{r.kind.includes("Crop") ? "🌾" : "🌱"}</span><span className="font-medium">{r.name}</span></div></TableCell><TableCell>{r.code || "-"}</TableCell><TableCell><Badge variant="secondary">{r.kind}</Badge></TableCell><TableCell>{r.parent}</TableCell><TableCell>Level {r.level}</TableCell><TableCell><Badge variant={active(r.is_active) ? "default" : "secondary"}>{active(r.is_active) ? "Active" : "Inactive"}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button asChild size="icon" variant="outline"><Link href={href(r.kind)}><Edit className="h-4 w-4"/></Link></Button><Button asChild size="icon" variant="ghost"><Link href={href(r.kind)}><Eye className="h-4 w-4"/></Link></Button></div></TableCell></TableRow>)}
        {!loading && !filteredRows.length && <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">{kind === "all" ? "No crop hierarchy records found." : `No ${kind.toLowerCase()} records found. Use the Add button to create one.`}</TableCell></TableRow>}
      </TableBody></Table></div>

      <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3 text-sm text-muted-foreground"><span>Showing {filteredRows.length ? (currentPage - 1) * perPage + 1 : 0}–{Math.min(currentPage * perPage, filteredRows.length)} of {filteredRows.length}</span><Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}><SelectTrigger className="h-8 w-[110px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="10">10 / page</SelectItem><SelectItem value="20">20 / page</SelectItem><SelectItem value="50">50 / page</SelectItem></SelectContent></Select></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="mr-1 h-4 w-4"/>Previous</Button><span className="min-w-24 text-center text-sm font-medium">Page {currentPage} of {totalPages}</span><Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next<ChevronRight className="ml-1 h-4 w-4"/></Button></div></div>
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Add {createKind}</DialogTitle><DialogDescription>Create a new record in the crop hierarchy.</DialogDescription></DialogHeader><form onSubmit={submitCreate} className="space-y-4">
      {(createKind === "Type Category" || createKind === "Crop" || createKind === "Crop Category") && <div className="space-y-2"><Label>Crop Type *</Label><Select value={form.crop_type_id} onValueChange={(v) => setForm((f) => ({ ...f, crop_type_id: v, crop_type_category_id: "", crop_id: "" }))}><SelectTrigger><SelectValue placeholder="Select crop type"/></SelectTrigger><SelectContent>{types.filter((x) => active(x.is_active)).map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}</SelectContent></Select></div>}
      {(createKind === "Crop" || createKind === "Crop Category") && <div className="space-y-2"><Label>Type Category {createKind === "Crop" ? "(optional)" : "*"}</Label><Select value={form.crop_type_category_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, crop_type_category_id: v === "none" ? "" : v, crop_id: "" }))} disabled={!form.crop_type_id}><SelectTrigger><SelectValue placeholder="Select type category"/></SelectTrigger><SelectContent>{createKind === "Crop" && <SelectItem value="none">No type category</SelectItem>}{selectedTypeCategories.filter((x) => active(x.is_active)).map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}</SelectContent></Select></div>}
      {createKind === "Crop Category" && <div className="space-y-2"><Label>Crop *</Label><Select value={form.crop_id} onValueChange={(v) => setForm((f) => ({ ...f, crop_id: v }))} disabled={!form.crop_type_id}><SelectTrigger><SelectValue placeholder="Select crop"/></SelectTrigger><SelectContent>{selectedCrops.filter((x) => active(x.is_active)).map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}</SelectContent></Select></div>}
      <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={createKind === "Crop Category" ? "e.g. Durum Wheat" : `Enter ${createKind.toLowerCase()} name`} required/></div>
      <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Auto-generated when empty"/></div>
      <div className="space-y-2"><Label>Status</Label><Select value={form.is_active} onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || !form.name.trim() || ((createKind === "Type Category" || createKind === "Crop") && !form.crop_type_id) || (createKind === "Crop Category" && !form.crop_id)}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save {createKind}</Button></DialogFooter>
    </form></DialogContent></Dialog>
  </div>;
}
