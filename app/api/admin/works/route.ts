import { NextRequest } from "next/server";
import { execute, query } from "@/lib/server/db";
import { pagination } from "@/lib/server/crud";
import { created, fail, ok, paginated } from "@/lib/server/response";
import { validateWorkInput } from "@/lib/schemas/work.schema";

const makeCode=(name:string,parent:number)=>`${parent}_${name}`.toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,80);
const joins=` FROM works w LEFT JOIN work_types wt ON wt.id=w.work_type_id LEFT JOIN crops c ON c.id=w.crop_id LEFT JOIN crop_categories cc ON cc.id=w.crop_category_id LEFT JOIN livestock_products lp ON lp.id=w.livestock_product_id `;
const select=`SELECT w.id,w.work_type_id,w.source_type,w.crop_id,w.crop_category_id,w.livestock_product_id,w.name,w.code,w.unit,w.description,w.is_active,w.created_at,w.updated_at,wt.name work_type_name,c.name crop_name,cc.name crop_category_name,lp.name livestock_product_name ${joins}`;

export async function GET(r:NextRequest){
 const all=r.nextUrl.searchParams.get("all"),search=r.nextUrl.searchParams.get("search")?.trim()??"",status=r.nextUrl.searchParams.get("status")??"all",area=r.nextUrl.searchParams.get("work_type_id"),source=r.nextUrl.searchParams.get("source_type"); const where:string[]=[],p:unknown[]=[];
 if(search){where.push("(w.name LIKE ? OR w.code LIKE ? OR wt.name LIKE ? OR c.name LIKE ? OR cc.name LIKE ? OR lp.name LIKE ?)"); for(let i=0;i<6;i++)p.push(`%${search}%`)}
 if(area&&area!=="all"){where.push("w.work_type_id=?");p.push(area)} if(source&&source!=="all"){where.push("w.source_type=?");p.push(source)} if(status==="active")where.push("w.is_active=1");if(status==="inactive")where.push("w.is_active=0"); const ws=where.length?`WHERE ${where.join(" AND ")}`:"";
 if(all)return ok(await query<any[]>(`${select} ${ws} ORDER BY w.name`,p),"Products fetched successfully");
 const {page,perPage,offset}=pagination(r),n=await query<any[]>(`SELECT COUNT(*) total ${joins} ${ws}`,p),rows=await query<any[]>(`${select} ${ws} ORDER BY w.name LIMIT ? OFFSET ?`,[...p,perPage,offset]); return paginated(rows,page,perPage,Number(n[0]?.total??0));
}

export async function POST(r:NextRequest){
 const body=await r.json().catch(()=>({})),v=validateWorkInput(body); if(!v.valid)return fail(Object.values(v.errors)[0]??"Invalid product data",422); const d=v.data;
 if(d.source_type==="crop"&&d.crop_id){
   const crop=await query<any[]>("SELECT id FROM crops WHERE id=? AND is_active=1",[d.crop_id]); if(!crop.length)return fail("Selected crop does not exist or is inactive",422);
   if(d.crop_category_id&&!(await query<any[]>("SELECT id FROM crop_categories WHERE id=? AND crop_id=? AND is_active=1",[d.crop_category_id,d.crop_id])).length)return fail("Selected crop category does not belong to the selected crop",422);
 } else if(d.source_type==="livestock"&&d.livestock_product_id&&!(await query<any[]>("SELECT id FROM livestock_products WHERE id=? AND is_active=1",[d.livestock_product_id])).length)return fail("Selected livestock does not exist or is inactive",422);
 const duplicate=await query<any[]>("SELECT id FROM works WHERE source_type=? AND COALESCE(crop_id,0)=COALESCE(?,0) AND COALESCE(crop_category_id,0)=COALESCE(?,0) AND COALESCE(livestock_product_id,0)=COALESCE(?,0) AND LOWER(name)=LOWER(?) LIMIT 1",[d.source_type,d.crop_id,d.crop_category_id,d.livestock_product_id,d.name]); if(duplicate.length)return fail("This product already exists for the selected source",409);
 const code=d.code||makeCode(d.name,d.crop_category_id??d.crop_id??d.livestock_product_id??0); const x=await execute("INSERT INTO works(work_type_id,source_type,crop_id,crop_category_id,livestock_product_id,name,code,unit,description,is_active) VALUES(?,?,?,?,?,?,?,?,?,?)",[d.work_type_id,d.source_type,d.crop_id,d.crop_category_id,d.livestock_product_id,d.name,code,d.unit||null,null,d.is_active?1:0]);
 return created({...d,id:x.insertId,code},"Product created successfully");
}
