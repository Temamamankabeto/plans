import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";
export async function PATCH(_:NextRequest,{params}:{params:Promise<{id:string}>}){ const {id}=await params; const rows=await query<any[]>(`SELECT status FROM users WHERE id=?`,[id]); if(!rows[0]) return fail('User not found',404); const status=rows[0].status==='active'?'disabled':'active'; await execute(`UPDATE users SET status=? WHERE id=?`,[status,id]); return ok({id,status},'User status updated successfully'); }
