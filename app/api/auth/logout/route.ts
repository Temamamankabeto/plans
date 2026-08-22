import { ok } from "@/lib/server/response";
export async function POST() {
  const response = ok(null, "Logged out successfully");
  response.cookies.set("token", "", { path: "/", maxAge: 0 });
  return response;
}
