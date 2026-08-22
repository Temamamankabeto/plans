import { NextRequest } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { execute, query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);

  const { id } = await params;
  const rows = await query<any[]>("SELECT id FROM notifications WHERE id=? AND user_id=? LIMIT 1", [id, auth.id]);
  if (!rows.length) return fail("Notification not found", 404);

  await execute("DELETE FROM notifications WHERE id=? AND user_id=?", [id, auth.id]);
  return ok(null, "Notification deleted");
}
