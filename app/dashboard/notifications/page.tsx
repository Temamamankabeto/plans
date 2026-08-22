"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/hooks";

type ActionNotification = {
  id: string | number;
  title?: string;
  message?: string;
  created_at?: string | null;
  data?: {
    redirect_url?: string;
  } | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const q = useNotificationsQuery({ page, per_page: 10 });
  const mark = useMarkNotificationReadMutation();
  const all = useMarkAllNotificationsReadMutation();
  const del = useDeleteNotificationMutation();
  const rows: ActionNotification[] = q.data?.data ?? [];
  const meta = q.data?.meta;

  function openNotification(notification: ActionNotification) {
    mark.mutate(notification.id);
    router.push(notification.data?.redirect_url || "/dashboard/notifications");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Action-needed plan and achievement workflow alerts.
          </p>
        </div>
        <Button variant="outline" onClick={() => all.mutate()}>
          <CheckCheck className="mr-2 h-4 w-4" />
          Acknowledge all
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No action needed now.
            </p>
          ) : (
            rows.map((notification) => (
              <div
                key={notification.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() => openNotification(notification)}
                >
                  <Bell className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {notification.title ?? "Action needed"}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {notification.created_at
                        ? new Date(notification.created_at).toLocaleString()
                        : ""}
                    </span>
                  </span>
                </button>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openNotification(notification)}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => del.mutate(notification.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {meta && meta.last_page > 1 ? (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {meta.current_page} of {meta.last_page}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
