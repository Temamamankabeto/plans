import api, { clearSession, unwrap } from "@/lib/api";

export type AuthUser = {
  id?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  status?: "active" | "disabled" | string;
  address?: string | null;
  professional_level?: string | null;
  role?: string;
  roles?: string[];
  permissions?: string[];
  admin_level?: "city" | "subcity" | "woreda" | "zone" | string | null;
  office_id?: number | null;
  department_id?: number | null;
  directorate_id?: number | null;
  team_id?: number | null;
  sub_city_id?: number | null;
  subcity_id?: number | null;
  woreda_id?: number | null;
  zone_id?: number | null;
  office?: { id: number; name: string; type: string; parent_id?: number | null } | null;
  department?: { id: number; name: string; office_id?: number | null } | null;
  directorate?: { id: number; name: string; office_id?: number | null } | null;
  team?: { id: number; name: string; directorate_id?: number | null } | null;
  access_mappings?: Array<Record<string, unknown>>;
  signature_url?: string | null;
  stamp_url?: string | null;
  titer_url?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type LoginResponse = { token?: string; access_token?: string; refresh_token?: string; user?: AuthUser; roles?: string[]; permissions?: string[]; data?: LoginResponse };

function normalizeLoginResponse(response: unknown): LoginResponse {
  const value = response as { data?: LoginResponse } | LoginResponse;
  return "data" in value && value.data ? value.data : (value as LoginResponse);
}
function setCookie(name: string, value: unknown, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value))}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}
function deleteCookie(name: string) { if (typeof document !== "undefined") document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`; }
function clearAuthCookies() { ["token", "roles", "permissions", "user", "refresh_token"].forEach(deleteCookie); }

export const authService = {
  async login(credentials: { login: string; password: string }) { const response = await api.post("/auth/login", credentials); return normalizeLoginResponse(unwrap<LoginResponse>(response)); },
  async me() { const response = await api.get("/auth/me"); return unwrap<AuthUser>(response); },
  async logout() { try { await api.post("/auth/logout"); } finally { clearSession(); clearAuthCookies(); } },
  saveSession(response: LoginResponse) {
    if (typeof window === "undefined") return;
    const token = response.token ?? response.access_token ?? response.data?.token ?? response.data?.access_token;
    const refreshToken = response.refresh_token ?? response.data?.refresh_token;
    const user = response.user ?? response.data?.user ?? null;
    const roles = response.roles ?? response.data?.roles ?? user?.roles ?? (user?.role ? [user.role] : []);
    const permissions = response.permissions ?? response.data?.permissions ?? user?.permissions ?? [];
    if (token) { localStorage.setItem("token", token); setCookie("token", token); }
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
    if (user) { localStorage.setItem("user", JSON.stringify(user)); setCookie("user", user); }
    localStorage.setItem("roles", JSON.stringify(roles));
    localStorage.setItem("permissions", JSON.stringify(permissions));
    setCookie("roles", roles); setCookie("permissions", permissions);
  },
  getStoredUser(): AuthUser | null { if (typeof window === "undefined") return null; try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } },
  getStoredRoles(): string[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem("roles") || "[]"); } catch { return []; } },
  getStoredPermissions(): string[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem("permissions") || "[]"); } catch { return []; } },
};
