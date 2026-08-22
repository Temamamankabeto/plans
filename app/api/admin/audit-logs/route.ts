import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { paginated } from "@/lib/server/response";
import { pagination } from "@/lib/server/crud";
export async function GET(request:NextRequest){ const {page,perPage,offset}=pagination(request); const search=request.nextUrl.searchParams.get('action'); const where=search?'WHERE a.action LIKE ?':''; const params=search?[`%${search}%`]:[]; const count=await query<any[]>(`SELECT COUNT(*) total FROM audit_logs a ${where}`,params); const rows=await query<any[]>(`SELECT a.*,u.name AS actor_name,u.email AS actor_email FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?`,[...params,perPage,offset]); return paginated(rows.map((r)=>({...r, actor:r.user_id?{id:r.user_id,name:r.actor_name,email:r.actor_email}:null, before:r.before_data, after:r.after_data})),page,perPage,Number(count[0]?.total??0)); }
