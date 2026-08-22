import { query } from "@/lib/server/db";
import { ok } from "@/lib/server/response";
export async function GET(){ const rows=await query<any[]>(`SELECT id,name,description,created_at,updated_at FROM permissions ORDER BY name`); return ok(rows); }
