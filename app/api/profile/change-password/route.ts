import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { getAuthUser } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

function auditContext(request: NextRequest) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);

  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.current_password ?? "");
  const newPassword = String(body.new_password ?? "");
  const confirmation = String(body.new_password_confirmation ?? "");

  if (!currentPassword || !newPassword || !confirmation) {
    return fail("Current password, new password and confirmation are required", 422);
  }
  if (newPassword.length < 8) return fail("New password must be at least 8 characters", 422);
  if (newPassword !== confirmation) return fail("New password confirmation does not match", 422);
  if (currentPassword === newPassword) return fail("New password must be different from current password", 422);

  const rows = await query<any[]>("SELECT password FROM users WHERE id=? LIMIT 1", [auth.id]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password))) {
    return fail("Current password is incorrect", 422);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const audit = auditContext(request);
  await transaction(async (connection) => {
    await connection.execute("UPDATE users SET password=? WHERE id=?", [passwordHash, auth.id]);
    await connection.execute(
      `INSERT INTO audit_logs
       (user_id, action, module, entity_type, entity_id, message, ip_address, user_agent)
       VALUES (?, 'password_changed', 'security', 'user', ?, 'Changed own account password', ?, ?)`,
      [auth.id, String(auth.id), audit.ip, audit.userAgent],
    );
  });

  return ok(null, "Password changed successfully");
}
