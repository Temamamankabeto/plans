import { ok, created } from "@/lib/server/response";
export async function GET(){ return ok([],'Translations fetched successfully',{current_page:1,per_page:0,total:0,last_page:1}); }
export async function POST(){ return created(null,'Translation module is not configured yet'); }
