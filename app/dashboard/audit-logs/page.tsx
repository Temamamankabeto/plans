"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditLogs } from "@/hooks/audit/use-audit-logs";

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState("");
  const query = useAuditLogs({ entity_type: entityType || undefined, per_page: 50 });
  const rows = query.data?.data ?? [];
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-sm text-muted-foreground">Tracked user, plans, achievements, reports, and user actions actions.</p></div><Card><CardHeader><CardTitle>Activity</CardTitle></CardHeader><CardContent className="space-y-4"><Input className="max-w-sm" placeholder="Filter entity type: plan, achievement, user" value={entityType} onChange={(e)=>setEntityType(e.target.value)}/><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Module</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Message</TableHead></TableRow></TableHeader><TableBody>{rows.map((r)=><TableRow key={r.id}><TableCell>{new Date(r.created_at).toLocaleString()}</TableCell><TableCell>{r.user?.name ?? r.role_name ?? "System"}</TableCell><TableCell>{r.module ?? "-"}</TableCell><TableCell>{r.action}</TableCell><TableCell>{r.entity_type ?? "-"} {r.entity_id ?? ""}</TableCell><TableCell>{r.message ?? "-"}</TableCell></TableRow>)}{!rows.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No audit logs found.</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card></div>;
}
