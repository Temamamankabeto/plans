import { NextRequest } from "next/server";
import { transaction } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/response";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){ const {id}=await params; const body=await request.json().catch(()=>({})); if(!body.role) return fail('Role is required',422); await transaction(async(conn)=>{ const [roles]:any=await conn.execute(`SELECT id FROM roles WHERE name=? LIMIT 1`,[body.role]); if(!roles[0]) throw new Error('Role not found'); await conn.execute(`DELETE FROM user_roles WHERE user_id=?`,[id]); await conn.execute(`INSERT INTO user_roles (user_id,role_id) VALUES (?,?)`,[id,roles[0].id]); }); return ok({id,role:body.role},'Role assigned successfully'); }
