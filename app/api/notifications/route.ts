import { NextRequest } from "next/server";

import { pagination } from "@/lib/server/crud";
import { getAuthUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { fail, paginated } from "@/lib/server/response";

function notificationData(value: unknown) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);

  const { page, perPage, offset } = pagination(request);
  const unreadOnly = request.nextUrl.searchParams.get("unread") === "1";
  const unreadSql = unreadOnly ? "AND read_at IS NULL" : "";

  const countRows = await query<any[]>(
    `SELECT COUNT(*) AS total FROM notifications WHERE user_id=? ${unreadSql}`,
    [auth.id],
  );
  const rows = await query<any[]>(
    `SELECT id,title,message,data,read_at,created_at
     FROM notifications
     WHERE user_id=? ${unreadSql}
     ORDER BY created_at DESC,id DESC
     LIMIT ? OFFSET ?`,
    [auth.id, perPage, offset],
  );

  return paginated(
    rows.map((row) => ({ ...row, data: notificationData(row.data) })),
    page,
    perPage,
    Number(countRows[0]?.total ?? 0),
  );
}
