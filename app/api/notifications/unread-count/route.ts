import { NextRequest } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);

  const rows = await query<any[]>(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND read_at IS NULL",
    [auth.id],
  );
  return ok({ count: Number(rows[0]?.count ?? 0) });
}
