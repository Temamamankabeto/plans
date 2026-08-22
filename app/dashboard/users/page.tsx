"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { Edit, Eye, KeyRound, Loader2, MoreHorizontal, Plus, RefreshCw, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useCreateUserMutation, useDeleteUserMutation, useDepartmentsLiteQuery, useDirectoratesLiteQuery, useOfficesLiteQuery, useResetUserPasswordMutation, useTeamsLiteQuery, useToggleUserMutation, useUpdateUserMutation, useUserRolesLiteQuery, useUsersQuery } from "@/hooks";
import { createUserSchema, updateUserSchema } from "@/lib/schemas/user.schema";
import type { CreateUserPayload, DepartmentItem, DirectorateItem, OfficeItem, TeamItem, UpdateUserPayload, UserItem, UserStatus } from "@/types/user-management/user.type";

const DEFAULT_ROLE = "Expert";
const ROLE_ORDER = [
  "Super Admin",
  "Head of Office",
  "Deputy Head of Office",
  "Manager",
  "Adviser",
  "Director",
  "Team Leader",
  "Expert",
];

type UserForm = CreateUserPayload | UpdateUserPayload;

const emptyCreate: CreateUserPayload = {
  name: "",
  email: "",
  phone: "",
  password: "password",
  role: DEFAULT_ROLE,
  status: "active",
  office_id: null,
  directorate_id: null,
  department_id: null,
  team_id: null,
  professional_level: null,
  signature: null,
  stamp: null,
  titer: null,
};

const emptyEdit: UpdateUserPayload = {
  name: "",
  email: "",
  phone: "",
  role: DEFAULT_ROLE,
  status: "active",
  office_id: null,
  directorate_id: null,
  department_id: null,
  team_id: null,
  professional_level: null,
  signature: null,
  stamp: null,
  titer: null,
};

function numberOrNull(value?: string | null) {
  if (!value || value === "none") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function roleOf(user: UserItem) {
  const first = user.roles?.[0];
  return user.role ?? user.display_role ?? (!first ? "—" : typeof first === "string" ? first : first.name);
}

function statusValue(value?: UserStatus | string | null): UserStatus {
  return value === "disabled" ? "disabled" : "active";
}

function isTeamLeader(role?: string | null) {
  return role === "Team Leader";
}

function requireDirectorate(role?: string | null) {
  return role === "Manager" || role === "Adviser" || role === "Director" || role === "Team Leader" || role === "Expert";
}

function requireDepartment(role?: string | null) {
  return role === "Manager" || role === "Adviser";
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserStatus | "all">("all");
  const [officeId, setOfficeId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserPayload>(emptyCreate);
  const [editForm, setEditForm] = useState<UpdateUserPayload>(emptyEdit);
  const [newPassword, setNewPassword] = useState("");

  const params = useMemo(
    () => ({
      search,
      status,
      office_id: officeId === "all" ? null : officeId,
      page,
      per_page: 10,
    }),
    [search, status, officeId, page],
  );
  const usersQuery = useUsersQuery(params);
  const rolesQuery = useUserRolesLiteQuery();
  const officesQuery = useOfficesLiteQuery();
  const createDepartmentsQuery = useDepartmentsLiteQuery({ office_id: createForm.office_id });
  const editDepartmentsQuery = useDepartmentsLiteQuery({ office_id: editForm.office_id });
  const createDirectoratesQuery = useDirectoratesLiteQuery({ office_id: createForm.office_id, department_id: createForm.department_id });
  const editDirectoratesQuery = useDirectoratesLiteQuery({ office_id: editForm.office_id, department_id: editForm.department_id });
  const createTeamsQuery = useTeamsLiteQuery({ directorate_id: createForm.directorate_id });
  const editTeamsQuery = useTeamsLiteQuery({ directorate_id: editForm.directorate_id });

  const roles = useMemo(() => {
    const names = (rolesQuery.data ?? []).map((role) => role.name).filter(Boolean) as string[];
    const source = names.length ? names : ROLE_ORDER;
    return ROLE_ORDER.filter((role) => source.includes(role));
  }, [rolesQuery.data]);

  const createUser = useCreateUserMutation(() => {
    setCreateOpen(false);
    setCreateForm({ ...emptyCreate, role: roles.includes(DEFAULT_ROLE) ? DEFAULT_ROLE : roles[0] ?? DEFAULT_ROLE });
    toast.success("User created");
  });
  const updateUser = useUpdateUserMutation(() => {
    setEditOpen(false);
    setSelectedUser(null);
    toast.success("User updated");
  });
  const toggleUser = useToggleUserMutation(() => toast.success("User status updated"));
  const removeUser = useDeleteUserMutation(() => toast.success("User deleted"));
  const resetPassword = useResetUserPasswordMutation(() => {
    setResetOpen(false);
    setSelectedUser(null);
    setNewPassword("");
    toast.success("Password reset");
  });

  const rows = usersQuery.data?.data ?? [];
  const meta = usersQuery.data?.meta;
  const busy = createUser.isPending || updateUser.isPending || resetPassword.isPending;

  function openCreate() {
    setCreateForm({ ...emptyCreate, role: roles.includes(DEFAULT_ROLE) ? DEFAULT_ROLE : roles[0] ?? DEFAULT_ROLE });
    setCreateOpen(true);
  }

  function openEdit(user: UserItem) {
    setSelectedUser(user);
    setEditForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: roleOf(user) !== "—" ? String(roleOf(user)) : roles[0] ?? DEFAULT_ROLE,
      status: statusValue(user.status),
      office_id: user.office_id ?? null,
      directorate_id: user.directorate_id ?? null,
      department_id: user.department_id ?? null,
      team_id: user.team_id ?? null,
      professional_level: user.professional_level ?? null,
      signature: null,
      stamp: null,
      titer: null,
    });
    setEditOpen(true);
  }

  function preparePayload<T extends UserForm>(form: T): T {
    return {
      ...form,
      department_id: requireDepartment(String(form.role)) ? form.department_id ?? null : null,
      team_id: isTeamLeader(String(form.role)) ? form.team_id ?? null : null,
      professional_level: null,
    };
  }

  function submitCreate(event: FormEvent) {
    event.preventDefault();

    const parsed = createUserSchema.safeParse(preparePayload(createForm));

    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message ?? "Invalid user data");
    }

    createUser.mutate(parsed.data as CreateUserPayload);
  }

  function submitEdit(event: FormEvent) {
    event.preventDefault();

    if (!selectedUser) return;

    const parsed = updateUserSchema.safeParse(preparePayload(editForm));

    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message ?? "Invalid user data");
    }

    updateUser.mutate({
      id: selectedUser.id,
      payload: parsed.data as UpdateUserPayload,
    });
  }

  function submitReset(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser || newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    resetPassword.mutate({ id: selectedUser.id, payload: { new_password: newPassword } });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New User</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-2 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-80">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name, email or phone..." value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={officeId} onValueChange={(value) => { setPage(1); setOfficeId(value); }}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Filter by office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {(officesQuery.data ?? []).map((office) => (
                  <SelectItem key={office.id} value={String(office.id)}>{office.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value as UserStatus | "all"); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => usersQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        </div>

        {usersQuery.isLoading ? (
          <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No users found</TableCell></TableRow>
                ) : rows.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone ?? "—"}</TableCell>
                    <TableCell>{roleOf(user)}</TableCell>
                    <TableCell>{user.office?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/dashboard/users/${user.id}`}><Eye className="mr-2 h-4 w-4" />View Detail</Link></DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setTimeout(() => openEdit(user), 0)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setTimeout(() => toggleUser.mutate(user.id), 0)}>
                            {user.status === "disabled" ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                            {user.status === "disabled" ? "Enable" : "Disable"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setTimeout(() => { setSelectedUser(user); setNewPassword(""); setResetOpen(true); }, 0)}><KeyRound className="mr-2 h-4 w-4" />Reset password</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => setTimeout(() => setDeleteUser(user), 0)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {meta && meta.last_page > 1 ? (
          <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
            <span>Page {meta.current_page} of {meta.last_page} • {meta.total} users</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create User</DialogTitle><DialogDescription>Create a user and assign office, directorate, and team when required.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={submitCreate}>
            <UserFields form={createForm} roles={roles} offices={officesQuery.data ?? []} directorates={createDirectoratesQuery.data ?? []} departments={createDepartmentsQuery.data ?? []} teams={createTeamsQuery.data ?? []} onChange={setCreateForm} includePassword />
            <Button className="w-full" disabled={busy}>{createUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save user</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit User</DialogTitle><DialogDescription>Update user profile and organization assignment.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={submitEdit}>
            <UserFields form={editForm} roles={roles} offices={officesQuery.data ?? []} directorates={editDirectoratesQuery.data ?? []} departments={editDepartmentsQuery.data ?? []} teams={editTeamsQuery.data ?? []} onChange={setEditForm} />
            <Button className="w-full" disabled={busy}>{updateUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Update user</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle><DialogDescription>Set a new password for {selectedUser?.name ?? "this user"}.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={submitReset}>
            <div className="grid gap-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} /></div>
            <Button className="w-full" disabled={resetPassword.isPending}>{resetPassword.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Reset password</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteUser)} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete user?</AlertDialogTitle><AlertDialogDescription>This will delete {deleteUser?.name}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteUser) removeUser.mutate(deleteUser.id); setDeleteUser(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserFields({ form, roles, offices, directorates, departments, teams, onChange, includePassword = false }: { form: UserForm; roles: string[]; offices: OfficeItem[]; directorates: DirectorateItem[]; departments: DepartmentItem[]; teams: TeamItem[]; onChange: (form: any) => void; includePassword?: boolean }) {
  function setOffice(officeId: number | null) {
    onChange({ ...form, office_id: officeId, directorate_id: null, department_id: null, team_id: null });
  }
  function setDepartment(departmentId: number | null) {
    onChange({ ...form, department_id: departmentId, directorate_id: null, team_id: null });
  }
  function setDirectorate(directorateId: number | null) {
    onChange({ ...form, directorate_id: directorateId, team_id: null });
  }
  function setRole(role: string) {
    onChange({ ...form, role, directorate_id: requireDirectorate(role) ? form.directorate_id ?? null : null, department_id: requireDepartment(role) ? form.department_id ?? null : null, team_id: isTeamLeader(role) ? form.team_id ?? null : null });
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name"><Input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} required /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} required /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} required /></Field>
        <Field label="Role">
          <Select value={String(form.role || DEFAULT_ROLE)} onValueChange={setRole}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>{roles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Office">
          <Select value={form.office_id ? String(form.office_id) : "none"} onValueChange={(value) => setOffice(numberOrNull(value))}>
            <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
            <SelectContent><SelectItem value="none" disabled>Select office</SelectItem>{offices.map((office) => <SelectItem key={office.id} value={String(office.id)}>{office.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {(requireDepartment(String(form.role)) || requireDirectorate(String(form.role))) ? (
          <Field label="Department">
            <Select value={form.department_id ? String(form.department_id) : "none"} onValueChange={(value) => setDepartment(numberOrNull(value))} disabled={!form.office_id}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent><SelectItem value="none" disabled>Select department</SelectItem>{departments.map((department) => <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        ) : null}
        {requireDirectorate(String(form.role)) ? (
          <Field label="Directorate">
            <Select value={form.directorate_id ? String(form.directorate_id) : "none"} onValueChange={(value) => setDirectorate(numberOrNull(value))} disabled={!form.department_id}>
              <SelectTrigger><SelectValue placeholder="Select directorate" /></SelectTrigger>
              <SelectContent><SelectItem value="none" disabled>Select directorate</SelectItem>{directorates.map((directorate) => <SelectItem key={directorate.id} value={String(directorate.id)}>{directorate.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        ) : null}
        {isTeamLeader(String(form.role)) ? (
          <Field label="Team">
            <Select value={form.team_id ? String(form.team_id) : "none"} onValueChange={(value) => onChange({ ...form, team_id: numberOrNull(value) })} disabled={!form.directorate_id}>
              <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
              <SelectContent><SelectItem value="none" disabled>Select team</SelectItem>{teams.map((team) => <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        ) : null}
        <Field label="Status">
          <Select value={form.status ?? "active"} onValueChange={(value) => onChange({ ...form, status: value as UserStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="disabled">Disabled</SelectItem></SelectContent>
          </Select>
        </Field>
      </div>
      {includePassword && "password" in form ? <Field label="Password"><Input type="password" value={form.password} onChange={(event) => onChange({ ...form, password: event.target.value })} required minLength={8} /></Field> : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}
