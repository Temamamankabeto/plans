import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { getAuthUser, getUserRolesAndPermissions } from "@/lib/server/auth";
import { getUserAccessMappings } from "@/lib/server/dynamic-access";
import { fail, ok } from "@/lib/server/response";

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return fail("Unauthenticated", 401);
  const rows = await query<any[]>(`SELECT u.id,u.name,u.email,u.phone,u.status,u.address,u.professional_level,u.office_id,u.directorate_id,u.department_id,u.team_id,u.signature_url,u.stamp_url,u.titer_url,u.last_login_at,u.created_at,u.updated_at,o.name office_name,d.name directorate_name,dp.name department_name,t.name team_name FROM users u LEFT JOIN offices o ON o.id=u.office_id LEFT JOIN directorates d ON d.id=u.directorate_id LEFT JOIN departments dp ON dp.id=u.department_id LEFT JOIN teams t ON t.id=u.team_id WHERE u.id=? LIMIT 1`, [auth.id]);
  if (!rows[0]) return fail("User not found", 404);
  const { roles, permissions } = await getUserRolesAndPermissions(auth.id);
  const access_mappings = await getUserAccessMappings(auth.id);
  const u = rows[0];
  return ok({ ...u, access_mappings, role: roles[0] ?? null, roles, permissions, office: u.office_id ? { id: u.office_id, name: u.office_name } : null, department: u.department_id ? { id: u.department_id, name: u.department_name } : null, directorate: u.directorate_id ? { id: u.directorate_id, name: u.directorate_name } : null, team_id: u.team_id ?? null, team: u.team_id ? { id: u.team_id, name: u.team_name } : null });
}
