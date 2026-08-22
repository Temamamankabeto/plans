"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
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
      <div className="flex min-h-[360px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading profile...
      </div>
    );
  }

  if (profileQuery.isError || !user) {
    return (
      <Card>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Unable to fetch your profile information.</p>
          <Button variant="outline" onClick={() => profileQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const roles = user.roles ?? (user.role ? [user.role] : []);
  const mappings = user.access_mappings ?? [];
  const permissions = user.permissions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Your live account, organization, access and security information.</p>
        </div>
        <Button variant="outline" onClick={() => profileQuery.refetch()} disabled={profileQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${profileQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoField icon={<UserCircle />} label="Full Name" value={display(user.name)} />
          <InfoField icon={<Mail />} label="Email" value={display(user.email)} />
          <InfoField icon={<Phone />} label="Phone" value={display(user.phone)} />
          <InfoField icon={<MapPin />} label="Address" value={display(user.address)} />
          <InfoField
            icon={<BadgeCheck />}
            label="Account Status"
            value={user.status === "disabled" ? "Disabled" : "Active"}
          />
          <InfoField icon={<Shield />} label="Professional Level" value={display(user.professional_level)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoField icon={<Building2 />} label="Office" value={display(user.office?.name)} />
          <InfoField icon={<Building2 />} label="Directorate" value={display(user.directorate?.name)} />
          <InfoField icon={<Users />} label="Department" value={display(user.department?.name)} />
          <InfoField icon={<Users />} label="Team" value={display(user.team?.name)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles and Access
            </CardTitle>
            <CardDescription>Access is calculated from roles, permissions and organization mappings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Assigned Roles</p>
              <div className="flex flex-wrap gap-2">
                {roles.length ? roles.map((role) => <Badge key={role}>{role}</Badge>) : <Badge variant="outline">No role</Badge>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Summary label="Effective Permissions" value={permissions.length} />
              <Summary label="Access Mappings" value={mappings.length} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Account Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoField icon={<CalendarClock />} label="Last Login" value={dateTime(user.last_login_at)} />
            <InfoField icon={<CalendarClock />} label="Account Created" value={dateTime(user.created_at)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Approval Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <DocumentLink label="Signature" href={user.signature_url} />
          <DocumentLink label="Stamp" href={user.stamp_url} />
          <DocumentLink label="Title Document" href={user.titer_url} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            For security, the system never displays your current password. Enter it to verify your identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPassword} className="grid gap-4 md:grid-cols-3">
            <PasswordField
              id="current_password"
              label="Current Password"
              autoComplete="current-password"
              value={passwordForm.current_password}
              onChange={(value) => setPasswordForm((current) => ({ ...current, current_password: value }))}
            />
            <PasswordField
              id="new_password"
              label="New Password"
              autoComplete="new-password"
              value={passwordForm.new_password}
              onChange={(value) => setPasswordForm((current) => ({ ...current, new_password: value }))}
            />
            <PasswordField
              id="new_password_confirmation"
              label="Confirm New Password"
              autoComplete="new-password"
              value={passwordForm.new_password_confirmation}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, new_password_confirmation: value }))
              }
            />
            <div className="md:col-span-3">
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        {label}
      </p>
      <p className="break-words font-medium">{value}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function DocumentLink({ label, href }: { label: string; href?: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <span className="font-medium">{label}</span>
      {href ? (
        <Button asChild variant="outline" size="sm">
          <a href={href} target="_blank" rel="noreferrer">View</a>
        </Button>
      ) : (
        <span className="text-sm text-muted-foreground">Not uploaded</span>
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
      />
    </div>
  );
}
