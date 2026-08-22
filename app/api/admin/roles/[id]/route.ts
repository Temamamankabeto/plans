import { NextRequest } from "next/server";
import { execute } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/response";
export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}){ const {id}=await params; const body=await request.json().catch(()=>({})); if(!body.name) return fail('Role name is required',422); await execute(`UPDATE roles SET name=?,description=? WHERE id=?`,[body.name,body.description||null,id]); return ok({id,name:body.name},'Role updated successfully'); }
export async function DELETE(_:NextRequest,{params}:{params:Promise<{id:string}>}){ const {id}=await params; await execute(`DELETE FROM roles WHERE id=?`,[id]); return ok(null,'Role deleted successfully'); }
