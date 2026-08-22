import { NextResponse } from "next/server";

export type ApiMeta = Record<string, unknown> | undefined;

export function ok<T>(data: T, message = "Request completed successfully", meta?: ApiMeta, status = 200) {
  return NextResponse.json({ success: true, message, data, meta }, { status });
}

export function created<T>(data: T, message = "Created successfully", meta?: ApiMeta) {
  return ok(data, message, meta, 201);
}

export function fail(message = "Request failed", status = 400, data: unknown = null, meta?: ApiMeta) {
  return NextResponse.json({ success: false, message, data, meta }, { status });
}

export function paginated<T>(data: T[], page: number, perPage: number, total: number, message = "Data fetched successfully") {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return ok(data, message, {
    current_page: page,
    per_page: perPage,
    total,
    last_page: lastPage,
  });
}
