import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { ok } from "@/lib/server/response";

export async function GET(request: NextRequest) {
  const officeId = request.nextUrl.searchParams.get("office_id");
  const departmentId = request.nextUrl.searchParams.get("department_id");
  const params: unknown[] = [];
  const where: string[] = ["d.is_active = 1"];
  if (officeId && officeId !== "all") { where.push("d.office_id = ?"); params.push(officeId); }
  if (departmentId && departmentId !== "all") { where.push("d.department_id = ?"); params.push(departmentId); }

  const rows = await query<any[]>(
    `SELECT d.id,d.office_id,d.department_id,d.name,d.is_active,o.name AS office_name,dp.name AS department_name
     FROM directorates d
     INNER JOIN offices o ON o.id=d.office_id
     LEFT JOIN departments dp ON dp.id=d.department_id
     WHERE ${where.join(" AND ")}
     ORDER BY o.name ASC,dp.name ASC,d.name ASC`, params);
  return ok(rows, "Directorates fetched successfully");
}
