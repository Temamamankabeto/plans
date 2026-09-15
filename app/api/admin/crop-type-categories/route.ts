import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { pagination } from "@/lib/server/crud";
import { created, fail, ok, paginated } from "@/lib/server/response";
const active=(v:unknown)=>v === "inactive" || v === false || v === 0 || v === "0" ? 0 : 1;
const code=(name:string,parent:number)=>`${parent}_${name}`.toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,80);
export async function GET(r:NextRequest){
 const all=r.nextUrl.searchParams.get("all"), search=r.nextUrl.searchParams.get("search")?.trim()??"", status=r.nextUrl.searchParams.get("status")??"all", parent=r.nextUrl.searchParams.get("crop_type_id");
 const w:string[]=[], p:unknown[]=[]; if(search){w.push("(c.name LIKE ? OR t.name LIKE ?)");p.push(`%${search}%`,`%${search}%`)} if(parent&&parent!=="all"){w.push("c.crop_type_id = ?");p.push(parent)} if(status==="active")w.push("c.is_active=1"); if(status==="inactive")w.push("c.is_active=0"); const ws=w.length?`WHERE ${w.join(" AND ")}`:"";
 const base=`SELECT c.*, t.name crop_type_name FROM crop_type_categories c JOIN crop_types t ON t.id=c.crop_type_id ${ws}`;
 if(all)return ok(await query<any[]>(`${base} ORDER BY t.name,c.name`,p),"Crop type categories fetched successfully");
 const {page,perPage,offset}=pagination(r); const n=await query<any[]>(`SELECT COUNT(*) total FROM crop_type_categories c JOIN crop_types t ON t.id=c.crop_type_id ${ws}`,p); return paginated(await query<any[]>(`${base} ORDER BY t.name,c.name LIMIT ? OFFSET ?`,[...p,perPage,offset]),page,perPage,Number(n[0]?.total??0));
}
export async function POST(r:NextRequest){const b=await r.json().catch(()=>({})), parent=Number(b.crop_type_id), name=String(b.name??"").trim(); if(!parent)return fail("Crop type is required",422); if(!name)return fail("Category name is required",422); if(!(await query<any[]>("SELECT id FROM crop_types WHERE id=?",[parent])).length)return fail("Selected crop type does not exist",422); if((await query<any[]>("SELECT id FROM crop_type_categories WHERE crop_type_id=? AND LOWER(name)=LOWER(?)",[parent,name])).length)return fail("Category already exists for this crop type",409); const c=String(b.code??"").trim()||code(name,parent), a=active(b.is_active??true); const x=await execute("INSERT INTO crop_type_categories(crop_type_id,name,code,is_active) VALUES(?,?,?,?)",[parent,name,c,a]); return created({id:x.insertId,crop_type_id:parent,name,code:c,is_active:Boolean(a)},"Crop type category created successfully")}
