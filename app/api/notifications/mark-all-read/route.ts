import { NextRequest } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { execute } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);

  const result = await execute(
    "UPDATE notifications SET read_at=NOW() WHERE user_id=? AND read_at IS NULL",
    [auth.id],
  );
  return ok({ updated_count: Number((result as any)?.affectedRows ?? 0) }, "All notifications marked as read");
}
