"use client";

import { useMemo, useState } from "react";
import { Edit, Loader2, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useAccessMappingsQuery, useAccessOrganizationOptionsQuery, useAccessScopeOptionsQuery,
  useCreateAccessMappingMutation, useDeleteAccessMappingMutation, useUpdateAccessMappingMutation,
  useUserRolesLiteQuery,
} from "@/hooks";
import type {
  AccessMappingPayload, AccessModule, AccessOrganizationLevel, AccessScopeType,
  OrganizationAccessMapping, OrganizationOption,
} from "@/types/access-mapping/access-mapping.type";

const MODULES: AccessModule[] = ["crop","livestock","livestock_product","trade","job","agribusiness","mechanization","all"];
const empty: AccessMappingPayload = {
  role_id:0,office_id:null,department_id:null,directorate_id:null,team_id:null,
  module:"crop",scope_type:"crop_type",scope_values:[],
  can_create_annual_plan:false,can_divide_monthly_plan:false,can_update_achievement:false,
  can_view_report:true,can_comment:false,can_approve:false,is_active:true,
};
const bool=(v:boolean|number)=>v===true||v===1;
const scopeForModule=(m:AccessModule):AccessScopeType =>
  m==="crop"?"crop_type":(m==="livestock"||m==="livestock_product")?"livestock_type":m==="trade"?"trade_group":"all";
function levelForRole(roleName:string):AccessOrganizationLevel {
  if(["Team Leader","Expert"].includes(roleName)) return "team";
  if(roleName==="Director") return "directorate";
  if(["Manager","Adviser"].includes(roleName)) return "department";
  return "office";
}
function organizationName(m:OrganizationAccessMapping){
  return m.team_name || m.directorate_name || m.department_name || m.office_name || "—";
}

export default function AccessMappingsPage(){
  const [open,setOpen]=useState(false);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [form,setForm]=useState<AccessMappingPayload>(empty);
  const [officeFilter,setOfficeFilter]=useState("all");
  const [departmentFilter,setDepartmentFilter]=useState("all");
  const [directorateFilter,setDirectorateFilter]=useState("all");
  const [teamFilter,setTeamFilter]=useState("all");
  const mappings=useAccessMappingsQuery();
  const roles=useUserRolesLiteQuery();
  const organizations=useAccessOrganizationOptionsQuery();
  const scopeOptions=useAccessScopeOptionsQuery(form.scope_type);
  const create=useCreateAccessMappingMutation(()=>{close();toast.success("Access mapping created");});
  const update=useUpdateAccessMappingMutation(()=>{close();toast.success("Access mapping updated");});
  const remove=useDeleteAccessMappingMutation();
  const busy=create.isPending||update.isPending;

  const roleName=(roles.data??[]).find(r=>r.id===form.role_id)?.name??"";
  const organizationLevel=levelForRole(roleName);
  const organizationLabel=organizationLevel==="team"?"Team":organizationLevel==="directorate"?"Directorate":organizationLevel==="department"?"Department":"Office";
  const organizationOptions:OrganizationOption[] =
    organizationLevel==="team"?(organizations.data?.teams??[]):
    organizationLevel==="directorate"?(organizations.data?.directorates??[]):
    organizationLevel==="department"?(organizations.data?.departments??[]):
    (organizations.data?.offices??[]);

  const selectedOrganizationId =
    organizationLevel==="team"?form.team_id:
    organizationLevel==="directorate"?form.directorate_id:
    organizationLevel==="department"?form.department_id:form.office_id;

  const filteredDepartments=(organizations.data?.departments??[]).filter(o=>officeFilter==="all"||String(o.office_id)===officeFilter);
  const filteredDirectorates=(organizations.data?.directorates??[]).filter(o=>
    (officeFilter==="all"||String(o.office_id)===officeFilter) &&
    (departmentFilter==="all"||String(o.department_id)===departmentFilter)
  );
  const filteredTeams=(organizations.data?.teams??[]).filter(o=>
    (officeFilter==="all"||String(o.office_id)===officeFilter) &&
    (departmentFilter==="all"||String(o.department_id)===departmentFilter) &&
    (directorateFilter==="all"||String(o.directorate_id)===directorateFilter)
  );
  const filteredMappings=(mappings.data??[]).filter(m=>
    (officeFilter==="all"||String(m.office_id)===officeFilter) &&
    (departmentFilter==="all"||String(m.department_id)===departmentFilter) &&
    (directorateFilter==="all"||String(m.directorate_id)===directorateFilter) &&
    (teamFilter==="all"||String(m.team_id)===teamFilter)
  );
  function changeOffice(v:string){setOfficeFilter(v);setDepartmentFilter("all");setDirectorateFilter("all");setTeamFilter("all");}
  function changeDepartment(v:string){setDepartmentFilter(v);setDirectorateFilter("all");setTeamFilter("all");}
  function changeDirectorate(v:string){setDirectorateFilter(v);setTeamFilter("all");}
  function clearFilters(){setOfficeFilter("all");setDepartmentFilter("all");setDirectorateFilter("all");setTeamFilter("all");}
  const title=useMemo(()=>editingId?"Edit Role Access":"Create Role Access",[editingId]);

  function close(){setOpen(false);setEditingId(null);setForm(empty);}
  function openCreate(){setEditingId(null);setForm(empty);setOpen(true);}
  function openEdit(m:OrganizationAccessMapping){
    setEditingId(m.id);
    setForm({
      role_id:m.role_id,office_id:m.office_id,department_id:m.department_id,directorate_id:m.directorate_id,team_id:m.team_id,
      module:m.module,scope_type:m.scope_type,scope_values:m.scope_values??[],
      can_create_annual_plan:bool(m.can_create_annual_plan),can_divide_monthly_plan:bool(m.can_divide_monthly_plan),
      can_update_achievement:bool(m.can_update_achievement),can_view_report:bool(m.can_view_report),
      can_comment:bool(m.can_comment),can_approve:bool(m.can_approve),is_active:bool(m.is_active),
    });
    setOpen(true);
  }
  function setRole(roleId:number){
    setForm(c=>({...c,role_id:roleId,office_id:null,department_id:null,directorate_id:null,team_id:null}));
  }
  function setOrganization(id:number){
    const option=organizationOptions.find(o=>o.id===id);
    if(!option)return;
    setForm(c=>({...c,office_id:option.office_id,department_id:option.department_id,directorate_id:option.directorate_id,team_id:option.team_id}));
  }
  function setModule(module:AccessModule){setForm(c=>({...c,module,scope_type:scopeForModule(module),scope_values:[]}));}
  function toggleScope(name:string){setForm(c=>({...c,scope_values:c.scope_values.includes(name)?c.scope_values.filter(x=>x!==name):[...c.scope_values,name]}));}
  function submit(){
    if(!form.role_id){toast.error("Role is required");return;}
    if(!selectedOrganizationId){toast.error(`${organizationLabel} is required`);return;}
    if(form.scope_type!=="all"&&!form.scope_values.length){toast.error("Select at least one allowed scope");return;}
    editingId?update.mutate({id:editingId,payload:form}):create.mutate(form);
  }
  const permission=(key:keyof AccessMappingPayload,label:string)=>(
    <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
      <input type="checkbox" checked={Boolean(form[key])} onChange={e=>setForm(c=>({...c,[key]:e.target.checked}))}/>{label}
    </label>
  );

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Access Mapping</h1><p className="text-sm text-muted-foreground">Assign a role to its organization, module and allowed Crop/Livestock scopes.</p></div>
      <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4"/>New Mapping</Button>
    </div>
    <div className="rounded-lg border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Office"><Select value={officeFilter} onValueChange={changeOffice}><SelectTrigger><SelectValue placeholder="All offices"/></SelectTrigger><SelectContent><SelectItem value="all">All Offices</SelectItem>{(organizations.data?.offices??[]).map(o=><SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Department"><Select value={departmentFilter} onValueChange={changeDepartment} disabled={officeFilter==="all"}><SelectTrigger><SelectValue placeholder="All departments"/></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{filteredDepartments.map(o=><SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Directorate"><Select value={directorateFilter} onValueChange={changeDirectorate} disabled={officeFilter==="all"}><SelectTrigger><SelectValue placeholder="All directorates"/></SelectTrigger><SelectContent><SelectItem value="all">All Directorates</SelectItem>{filteredDirectorates.map(o=><SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Team"><Select value={teamFilter} onValueChange={setTeamFilter} disabled={directorateFilter==="all"}><SelectTrigger><SelectValue placeholder="All teams"/></SelectTrigger><SelectContent><SelectItem value="all">All Teams</SelectItem>{filteredTeams.map(o=><SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent></Select></Field>
        <div className="flex items-end"><Button type="button" variant="outline" className="w-full" onClick={clearFilters}>Clear Filters</Button></div>
      </div>
    </div>

    <div className="overflow-hidden rounded-lg border bg-card">
      <Table><TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Organization</TableHead><TableHead>Module</TableHead><TableHead>Allowed Scope</TableHead><TableHead>Permissions</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>{mappings.isLoading?<TableRow><TableCell colSpan={6} className="py-8 text-center"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Loading...</TableCell></TableRow>:
      mappings.isError?<TableRow><TableCell colSpan={6} className="py-8 text-center text-destructive">{mappings.error instanceof Error ? mappings.error.message : "Failed to load access mappings"}</TableCell></TableRow>:
      !filteredMappings.length?<TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{(mappings.data??[]).length ? "No access mappings match the selected filters." : "No access mappings found."}</TableCell></TableRow>:
      filteredMappings.map(m=><TableRow key={m.id}>
        <TableCell className="font-medium">{m.role_name}</TableCell><TableCell>{organizationName(m)}</TableCell><TableCell className="capitalize">{m.module}</TableCell>
        <TableCell><div className="flex max-w-xl flex-wrap gap-1">{m.scope_type==="all"?<span>All</span>:(m.scope_values??[]).map(v=><span key={v} className="rounded-full bg-muted px-2 py-1 text-xs">{v}</span>)}</div></TableCell>
        <TableCell className="text-xs text-muted-foreground">{[
          bool(m.can_create_annual_plan)&&"Annual",bool(m.can_divide_monthly_plan)&&"Monthly",
          bool(m.can_update_achievement)&&"Achievement",bool(m.can_view_report)&&"Report",
          bool(m.can_comment)&&"Comment",bool(m.can_approve)&&"Approve"].filter(Boolean).join(", ")||"None"}</TableCell>
        <TableCell className="text-right"><DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>setTimeout(()=>openEdit(m),0)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem><DropdownMenuSeparator/>
          <DropdownMenuItem className="text-destructive" onSelect={()=>setTimeout(()=>remove.mutate(m.id,{onSuccess:()=>toast.success("Access mapping deleted")}),0)}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu></TableCell></TableRow>)}</TableBody></Table>
    </div>

    <Dialog open={open} onOpenChange={v=>v?setOpen(true):close()}><DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Role *"><Select value={form.role_id?String(form.role_id):""} onValueChange={v=>setRole(Number(v))}><SelectTrigger><SelectValue placeholder="Select role"/></SelectTrigger><SelectContent>{(roles.data??[]).map(r=><SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={`${organizationLabel} *`}><Select disabled={!form.role_id||organizations.isLoading} value={selectedOrganizationId?String(selectedOrganizationId):""} onValueChange={v=>setOrganization(Number(v))}><SelectTrigger><SelectValue placeholder={form.role_id?`Select ${organizationLabel.toLowerCase()}`:"Select role first"}/></SelectTrigger><SelectContent>{organizationOptions.map(o=><SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Module *"><Select value={form.module} onValueChange={v=>setModule(v as AccessModule)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{MODULES.map(m=><SelectItem key={m} value={m} className="capitalize">{m==="livestock_product"?"Livestock Product":m}</SelectItem>)}</SelectContent></Select></Field>
      </div>

      {form.scope_type==="crop_type"||form.scope_type==="livestock_type"?<Field label={form.scope_type==="crop_type"?"Allowed Crop Types *":"Allowed Livestock Types *"}>
        <div className="rounded-lg border p-3">
          <div className="mb-3 flex min-h-8 flex-wrap gap-2">{form.scope_values.length?form.scope_values.map(v=><button type="button" key={v} onClick={()=>toggleScope(v)} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">{v}<X className="h-3 w-3"/></button>):<span className="text-sm text-muted-foreground">Select one or more values below</span>}</div>
          <div className="grid max-h-56 gap-2 overflow-y-auto md:grid-cols-2">{(scopeOptions.data??[]).map(o=><label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={form.scope_values.includes(o.name)} onChange={()=>toggleScope(o.name)}/>{o.name}</label>)}</div>
        </div>
      </Field>:form.scope_type==="all"?<div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">This module does not require a Crop/Livestock scope.</div>:null}

      <div><Label className="mb-2 block">Permissions</Label><div className="grid gap-2 md:grid-cols-2">
        {permission("can_create_annual_plan","Create Annual Plan")}{permission("can_divide_monthly_plan","Divide Monthly Plan")}
        {permission("can_update_achievement","Update Achievement")}{permission("can_view_report","View Report")}
        {permission("can_comment","Comment")}{permission("can_approve","Approve")}
      </div></div>
      <Button onClick={submit} disabled={busy}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}{editingId?"Update Mapping":"Save Mapping"}</Button>
    </DialogContent></Dialog>
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="grid gap-2"><Label>{label}</Label>{children}</div>}
