import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, execute } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";
import { getUserRolesAndPermissions, signToken } from "@/lib/server/auth";
import { getUserAccessMappings } from "@/lib/server/dynamic-access";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const login = String(body.login ?? body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!login || !password) return fail("Login and password are required", 422);

  const users = await query<any[]>(`SELECT u.*, o.name AS office_name, d.name AS directorate_name, dp.name AS department_name, t.name AS team_name FROM users u LEFT JOIN offices o ON o.id=u.office_id LEFT JOIN directorates d ON d.id=u.directorate_id LEFT JOIN departments dp ON dp.id=u.department_id LEFT JOIN teams t ON t.id=u.team_id WHERE u.email=? OR u.phone=? LIMIT 1`, [login, login]);
  const user = users[0];
  if (!user || user.status !== "active") return fail("Invalid credentials", 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return fail("Invalid credentials", 401);

  const { roles, permissions } = await getUserRolesAndPermissions(Number(user.id));
  const access_mappings = await getUserAccessMappings(Number(user.id));
  const token = signToken({ id: Number(user.id), email: user.email, roles, permissions });
  await execute(`UPDATE users SET last_login_at=NOW() WHERE id=?`, [user.id]);

  const response = ok({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      office_id: user.office_id,
      department_id: user.department_id,
      directorate_id: user.directorate_id,
      team_id: user.team_id ?? null,
      office: user.office_id ? { id: user.office_id, name: user.office_name } : null,
      department: user.department_id ? { id: user.department_id, name: user.department_name } : null,
      directorate: user.directorate_id ? { id: user.directorate_id, name: user.directorate_name } : null,
      team: user.team_id ? { id: user.team_id, name: user.team_name } : null,
      role: roles[0] ?? null,
      roles,
      permissions,
      access_mappings,
    },
    roles,
    permissions,
  }, "Logged in successfully");
  response.cookies.set("token", token, { httpOnly: false, sameSite: "lax", path: "/" });
  return response;
}
