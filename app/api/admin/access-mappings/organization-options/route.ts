import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth || !auth.roles?.includes("Super Admin")) return fail("Forbidden", 403);

  const [offices, departments, directorates, teams] = await Promise.all([
    query<any[]>(`
      SELECT o.id, o.name, o.id AS office_id, NULL AS department_id, NULL AS directorate_id, NULL AS team_id,
             o.name AS label
      FROM offices o
      WHERE o.is_active=1
      ORDER BY o.name
    `),
    query<any[]>(`
      SELECT dp.id, dp.name, dp.office_id, dp.id AS department_id, NULL AS directorate_id, NULL AS team_id,
             CONCAT(o.name, ' / ', dp.name) AS label
      FROM departments dp
      INNER JOIN offices o ON o.id=dp.office_id
      WHERE dp.is_active=1
      ORDER BY o.name, dp.name
    `),
    query<any[]>(`
      SELECT d.id, d.name, d.office_id, d.department_id, d.id AS directorate_id, NULL AS team_id,
             CONCAT(o.name, ' / ', COALESCE(CONCAT(dp.name, ' / '), ''), d.name) AS label
      FROM directorates d
      INNER JOIN offices o ON o.id=d.office_id
      LEFT JOIN departments dp ON dp.id=d.department_id
      WHERE COALESCE(d.is_active,1)=1
      ORDER BY o.name, dp.name, d.name
    `),
    query<any[]>(`
      SELECT t.id, t.name, d.office_id, d.department_id, t.directorate_id, t.id AS team_id,
             CONCAT(o.name, ' / ', COALESCE(CONCAT(dp.name, ' / '), ''), d.name, ' / ', t.name) AS label
      FROM teams t
      INNER JOIN directorates d ON d.id=t.directorate_id
      INNER JOIN offices o ON o.id=d.office_id
      LEFT JOIN departments dp ON dp.id=d.department_id
      WHERE COALESCE(t.is_active,1)=1
      ORDER BY o.name, dp.name, d.name, t.name
    `),
  ]);

  return ok({ offices, departments, directorates, teams }, "Organization options fetched successfully");
}
