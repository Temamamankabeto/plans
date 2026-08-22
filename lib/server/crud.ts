import { NextRequest } from "next/server";

export async function readJson<T extends Record<string, any>>(request: NextRequest): Promise<T> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return Object.fromEntries(form.entries()) as T;
  }
  return (await request.json().catch(() => ({}))) as T;
}

export function pagination(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") || 1));
  const perPage = Math.min(100, Math.max(1, Number(params.get("per_page") || 10)));
  return { page, perPage, offset: (page - 1) * perPage };
}
