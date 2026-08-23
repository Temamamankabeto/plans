import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";

export type JwtUser = { id: number; email: string; roles: string[]; permissions: string[] };

export function signToken(user: JwtUser) {
  return jwt.sign(user, process.env.JWT_SECRET || "change-this-secret-before-production", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  } as jwt.SignOptions);
}

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return request.cookies.get("token")?.value ?? null;
}

export async function getAuthUser(request: NextRequest): Promise<JwtUser | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "change-this-secret-before-production",
    ) as JwtUser;

    if (!decoded?.id) return null;

    // Always resolve the user's current RBAC state from the database instead
    // of trusting roles/permissions embedded in an older JWT. This keeps
    // authorization synchronized immediately after a Super Admin changes a
    // user's role or role permissions and guarantees that Expert, Team Leader,
    // and Director planning-owner roles are recognized by server-side access
    // checks without requiring the token to be recreated first.
    const currentAccess = await getUserRolesAndPermissions(Number(decoded.id));

    return {
      ...decoded,
      roles: currentAccess.roles,
      permissions: currentAccess.permissions,
    };
  } catch {
    return null;
  }
}

export async function getUserRolesAndPermissions(userId: number) {
  const roles = await query<any[]>(
    `SELECT r.name
     FROM roles r
     INNER JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = ?
     ORDER BY r.name`,
    [userId],
  );

  const permissions = await query<any[]>(
    `SELECT DISTINCT p.name
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     INNER JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = ?
     ORDER BY p.name`,
    [userId],
  );

  return {
    roles: roles.map((role) => role.name),
    permissions: permissions.map((permission) => permission.name),
  };
}
