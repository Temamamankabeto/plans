import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { ok } from "@/lib/server/response";
export async function GET(request:NextRequest){ const type=request.nextUrl.searchParams.get('type'); const where=type?'WHERE type=?':''; const rows=await query<any[]>(`SELECT id,name,code,type,parent_id,is_active,created_at,updated_at FROM offices ${where} ORDER BY name`, type?[type]:[]); return ok(rows); }
