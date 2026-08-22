"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarDays, FileBadge, Loader2, Mail, MapPin, Phone, ShieldCheck, Stamp, UserCircle2, UsersRound, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserQuery } from "@/hooks";
import type { UserItem } from "@/types/user-management/user.type";

function roleOf(user?: UserItem | null) {
  if (!user) return "—";
  if (user.role) return user.role;
  const first = user.roles?.[0];
  return !first ? "—" : typeof first === "string" ? first : first.name;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function AssetPreview({ title, description, src, icon: Icon }: { title: string; description: string; src?: string | null; icon: LucideIcon }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4 text-muted-foreground" />{title}</CardTitle></CardHeader>
      <CardContent>
        {src ? <div className="flex min-h-32 items-center justify-center rounded-xl border bg-muted/30 p-4"><img src={src} alt={title} className="max-h-32 max-w-full object-contain" /></div> : <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">No {title.toLowerCase()} uploaded</div>}
        <p className="mt-3 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{label}</div>
      <p className="break-words text-sm font-semibold">{value || "—"}</p>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const userQuery = useUserQuery(id);
  const user = userQuery.data;

  if (userQuery.isLoading) {
    return <div className="flex min-h-[420px] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading user details...</div>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm"><Link href="/dashboard/users"><ArrowLeft className="mr-2 h-4 w-4" />Back to users</Link></Button>
        <Card><CardContent className="p-10 text-center text-muted-foreground">User not found.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/users"><ArrowLeft className="mr-2 h-4 w-4" />Back to users</Link></Button>
          <h1 className="text-2xl font-bold">{user.name}</h1>
        </div>
        <Badge variant={user.status === "disabled" ? "secondary" : "default"}>{user.status ?? "active"}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>User Detail</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Full Name" value={user.name} icon={UserCircle2} />
          <InfoItem label="Email" value={user.email} icon={Mail} />
          <InfoItem label="Phone" value={user.phone} icon={Phone} />
          <InfoItem label="Role" value={roleOf(user)} icon={ShieldCheck} />
          <InfoItem label="Office" value={user.office?.name} icon={MapPin} />
          <InfoItem label="Directorate" value={user.directorate?.name ?? user.department?.name} icon={BadgeCheck} />
          <InfoItem label="Team" value={user.team?.name} icon={UsersRound} />
          <InfoItem label="Last Login" value={formatDate(user.last_login_at)} icon={CalendarDays} />
          <InfoItem label="Created At" value={formatDate(user.created_at)} icon={CalendarDays} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <AssetPreview title="Signature" description="Used on approval documents." src={user.signature_url} icon={FileBadge} />
        <AssetPreview title="Stamp" description="Used for official stamps where required." src={user.stamp_url} icon={Stamp} />
        <AssetPreview title="Titer" description="Personal title image displayed with signatures." src={user.titer_url} icon={BadgeCheck} />
      </div>
    </div>
  );
}
