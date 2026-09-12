"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  FileSignature,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePasswordMutation, useProfileQuery } from "@/hooks/profile/use-profile";

const emptyPasswordForm = {
  current_password: "",
  new_password: "",
  new_password_confirmation: "",
};

function display(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "Not assigned";
}

function dateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

function getInitials(name?: string | null) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "U";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase();
}

export default function ProfilePage() {
  const profileQuery = useProfileQuery();
  const user = profileQuery.data;
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("roles", JSON.stringify(user.roles ?? (user.role ? [user.role] : [])));
    localStorage.setItem("permissions", JSON.stringify(user.permissions ?? []));
  }, [user]);

  const changePassword = useChangePasswordMutation(() => {
    toast.success("Password updated successfully");
    setPasswordForm(emptyPasswordForm);
  });

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordForm.new_password.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      toast.error("New password confirmation does not match");
      return;
    }
    if (passwordForm.current_password === passwordForm.new_password) {
      toast.error("New password must be different from current password");
      return;
    }

    changePassword.mutate(passwordForm, {
      onError: (error) => toast.error(error.message || "Failed to update password"),
    });
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-white text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading profile...
      </div>
    );
  }

  if (profileQuery.isError || !user) {
    return (
      <div className="bg-white">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">Unable to fetch your profile information.</p>
            <Button variant="outline" onClick={() => profileQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roles = user.roles ?? (user.role ? [user.role] : []);
  const mappings = user.access_mappings ?? [];
  const permissions = user.permissions ?? [];
  const initials = getInitials(user.name);

  const primaryRole = roles[0] ?? user.role ?? "User";
  const organizationPath = [
    user.office?.name,
    user.department?.name,
    user.directorate?.name,
    user.team?.name,
  ].filter(Boolean);

  return (
    <div className="min-h-full bg-white pb-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {/* Profile hero */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 sm:h-36" />

          <div className="px-5 pb-6 sm:px-7 lg:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-slate-100 text-2xl font-bold text-slate-900 shadow-md sm:h-28 sm:w-28 sm:text-3xl">
                  {initials}
                </div>

                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                      {display(user.name)}
                    </h1>
                    <Badge
                      variant="outline"
                      className={
                        user.status === "disabled"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }
                    >
                      <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                      {user.status === "disabled" ? "Disabled" : "Active"}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm font-medium text-slate-600">{primaryRole}</p>

                  {organizationPath.length > 0 && (
                    <p className="mt-2 max-w-3xl text-sm text-slate-500">
                      {organizationPath.join("  •  ")}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => profileQuery.refetch()}
                disabled={profileQuery.isFetching}
                className="self-start bg-white sm:self-auto"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${profileQuery.isFetching ? "animate-spin" : ""}`}
                />
                Refresh Profile
              </Button>
            </div>
          </div>
        </section>

        {/* Profile summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Assigned Roles" value={roles.length} helper={primaryRole} />
          <StatCard label="Permissions" value={permissions.length} helper="Effective permissions" />
          <StatCard label="Access Mappings" value={mappings.length} helper="Organization mappings" />
          <StatCard
            label="Account Status"
            value={user.status === "disabled" ? "Disabled" : "Active"}
            helper="Current account state"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserCircle className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Identity and contact information associated with your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-x-8 gap-y-5 pt-6 md:grid-cols-2">
                <ProfileRow icon={<UserCircle />} label="Full Name" value={display(user.name)} />
                <ProfileRow icon={<Mail />} label="Email Address" value={display(user.email)} />
                <ProfileRow icon={<Phone />} label="Phone Number" value={display(user.phone)} />
                <ProfileRow icon={<MapPin />} label="Address" value={display(user.address)} />
                <ProfileRow
                  icon={<Shield />}
                  label="Professional Level"
                  value={display(user.professional_level)}
                />
                <ProfileRow
                  icon={<BadgeCheck />}
                  label="Account Status"
                  value={user.status === "disabled" ? "Disabled" : "Active"}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Organization Assignment
                </CardTitle>
                <CardDescription>
                  Your current position within the organizational hierarchy.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                <OrganizationItem label="Office" value={display(user.office?.name)} />
                <OrganizationItem label="Department" value={display(user.department?.name)} />
                <OrganizationItem label="Directorate" value={display(user.directorate?.name)} />
                <OrganizationItem label="Team" value={display(user.team?.name)} />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  Roles & Access
                </CardTitle>
                <CardDescription>
                  Access is calculated from your role, permissions and organization mappings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Assigned Roles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roles.length ? (
                      roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className="border-slate-200 bg-slate-50 px-3 py-1 text-slate-700"
                        >
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">No role</Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <MiniSummary label="Effective Permissions" value={permissions.length} />
                  <MiniSummary label="Access Mappings" value={mappings.length} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarClock className="h-5 w-5" />
                  Account Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <ProfileRow
                  icon={<CalendarClock />}
                  label="Last Login"
                  value={dateTime(user.last_login_at)}
                />
                <ProfileRow
                  icon={<CalendarClock />}
                  label="Account Created"
                  value={dateTime(user.created_at)}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSignature className="h-5 w-5" />
                  Approval Documents
                </CardTitle>
                <CardDescription>
                  Official documents used for authorized approval workflows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <DocumentLink label="Signature" href={user.signature_url} />
                <DocumentLink label="Stamp" href={user.stamp_url} />
                <DocumentLink label="Title Document" href={user.titer_url} />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Change your password without exposing your existing credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={submitPassword} className="space-y-4">
                  <PasswordField
                    id="current_password"
                    label="Current Password"
                    autoComplete="current-password"
                    value={passwordForm.current_password}
                    onChange={(value) =>
                      setPasswordForm((current) => ({ ...current, current_password: value }))
                    }
                  />

                  <PasswordField
                    id="new_password"
                    label="New Password"
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(value) =>
                      setPasswordForm((current) => ({ ...current, new_password: value }))
                    }
                  />

                  <PasswordField
                    id="new_password_confirmation"
                    label="Confirm New Password"
                    autoComplete="new-password"
                    value={passwordForm.new_password_confirmation}
                    onChange={(value) =>
                      setPasswordForm((current) => ({
                        ...current,
                        new_password_confirmation: value,
                      }))
                    }
                  />

                  <Button type="submit" className="w-full" disabled={changePassword.isPending}>
                    {changePassword.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        <p className="mt-1 truncate text-sm text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function OrganizationItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MiniSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function DocumentLink({ label, href }: { label: string; href?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {href ? "Document available" : "Not uploaded"}
        </p>
      </div>

      {href ? (
        <Button asChild variant="outline" size="sm">
          <a href={href} target="_blank" rel="noreferrer">
            View
          </a>
        </Button>
      ) : (
        <span className="text-xs font-medium text-slate-400">Unavailable</span>
      )}
    </div>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        minLength={8}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="bg-white"
      />
    </div>
  );
}
