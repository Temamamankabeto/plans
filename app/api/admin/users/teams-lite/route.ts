import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { ok } from "@/lib/server/response";

export async function GET(request: NextRequest) {
  const directorateId = request.nextUrl.searchParams.get("directorate_id");
  const params: unknown[] = [];
  const where: string[] = ["t.is_active = 1"];
  if (directorateId && directorateId !== "all") { where.push("t.directorate_id = ?"); params.push(directorateId); }

  const rows = await query<any[]>(
    `SELECT t.id,t.directorate_id,d.department_id,d.office_id,t.name,t.is_active,
            d.name AS directorate_name,dp.name AS department_name,o.name AS office_name
     FROM teams t
     INNER JOIN directorates d ON d.id=t.directorate_id
     LEFT JOIN departments dp ON dp.id=d.department_id
     INNER JOIN offices o ON o.id=d.office_id
     WHERE ${where.join(" AND ")}
     ORDER BY o.name ASC,dp.name ASC,d.name ASC,t.name ASC`, params);
  return ok(rows, "Teams fetched successfully");
}
