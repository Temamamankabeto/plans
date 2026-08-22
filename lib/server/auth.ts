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
    return jwt.verify(token, process.env.JWT_SECRET || "change-this-secret-before-production") as JwtUser;
  } catch {
    return null;
  }
}

export async function getUserRolesAndPermissions(userId: number) {
  const roles = await query<any[]>(`SELECT r.name FROM roles r INNER JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ? ORDER BY r.name`, [userId]);
  const permissions = await query<any[]>(`SELECT DISTINCT p.name FROM permissions p INNER JOIN role_permissions rp ON rp.permission_id = p.id INNER JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = ? ORDER BY p.name`, [userId]);
  return {
    roles: roles.map((r) => r.name),
    permissions: permissions.map((p) => p.name),
  };
}
