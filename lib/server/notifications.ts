import type { PoolConnection } from "mysql2/promise";
import { execute } from "@/lib/server/db";

export type NotificationInput = {
  userId: number;
  title: string;
  message: string;
  redirectUrl?: string | null;
  entityType?: string | null;
  entityId?: number | string | null;
};

export async function createNotification(connection: PoolConnection, input: NotificationInput) {
  if (!Number.isFinite(input.userId) || input.userId <= 0) return;

  await connection.execute(
    `INSERT INTO notifications (user_id, title, message, data)
     VALUES (?, ?, ?, ?)`,
    [
      input.userId,
      input.title.trim(),
      input.message.trim(),
      JSON.stringify({
        redirect_url: input.redirectUrl ?? "/dashboard/notifications",
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
      }),
    ],
  );
}

export async function createUserNotification(input: NotificationInput) {
  if (!Number.isFinite(input.userId) || input.userId <= 0) return;

  await execute(
    `INSERT INTO notifications (user_id, title, message, data)
     VALUES (?, ?, ?, ?)`,
    [
      input.userId,
      input.title.trim(),
      input.message.trim(),
      JSON.stringify({
        redirect_url: input.redirectUrl ?? "/dashboard/notifications",
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
      }),
    ],
  );
}
