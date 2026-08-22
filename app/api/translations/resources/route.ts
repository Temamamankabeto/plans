import { ok } from "@/lib/server/response";
export async function GET(){ return ok({ en: {}, om: {}, am: {} }, 'Translation resources fetched successfully'); }
