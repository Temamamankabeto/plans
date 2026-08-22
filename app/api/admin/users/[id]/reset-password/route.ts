import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { execute } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/response";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){ const {id}=await params; const body=await request.json().catch(()=>({})); const password=body.new_password||body.password; if(!password) return fail('New password is required',422); await execute(`UPDATE users SET password=? WHERE id=?`,[await bcrypt.hash(String(password),10),id]); return ok({id},'Password reset successfully'); }
