import { BriefcaseBusiness, Building2, Shield, UserCheck, UserCog, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppRoleKey =
  | "super-admin"
  | "head-of-office"
  | "deputy-head-of-office"
  | "manager"
  | "adviser"
  | "director"
  | "team-leader"
  | "expert";

export type DashboardDefinition = {
  key: AppRoleKey;
  roleName: string;
  title: string;
  subtitle: string;
  route: string;
  icon: LucideIcon;
};

export const roleHome: Record<AppRoleKey, string> = {
  "super-admin": "/dashboard",
  "head-of-office": "/dashboard/head-of-office",
  "deputy-head-of-office": "/dashboard/deputy-head-of-office",
  manager: "/dashboard/manager",
  adviser: "/dashboard/adviser",
  director: "/dashboard/director",
  "team-leader": "/dashboard/team-leader",
  expert: "/dashboard/expert",
};

const item = (key: AppRoleKey, roleName: string, title: string, subtitle: string, icon: LucideIcon): DashboardDefinition => ({
  key,
  roleName,
  title,
  subtitle,
  route: roleHome[key],
  icon,
});

export const dashboardConfig: Record<AppRoleKey, DashboardDefinition> = {
  "super-admin": item("super-admin", "Super Admin", "Plan & Achievement Control Center", "Full system management for users, roles, offices, plans, achievements, and reports.", Shield),
  "head-of-office": item("head-of-office", "Head of Office", "Head of Office Dashboard", "Office-level plan approval, achievement review, and performance monitoring.", Building2),
  "deputy-head-of-office": item("deputy-head-of-office", "Deputy Head of Office", "Deputy Head Dashboard", "Delegated office monitoring, review, and coordination workspace.", UserCheck),
  manager: item("manager", "Manager", "Manager Dashboard", "Management-level plan review, approval, performance monitoring, and reporting workspace.", BriefcaseBusiness),
  adviser: item("adviser", "Adviser", "Adviser Dashboard", "Advisory plan review, commenting, analysis, and reporting workspace.", UserCog),
  director: item("director", "Director", "Director Dashboard", "Directorate-level plan and achievement management workspace.", BriefcaseBusiness),
  "team-leader": item("team-leader", "Team Leader", "Team Leader Dashboard", "Team-level coordination, data validation, and reporting workspace.", Users),
  expert: item("expert", "Expert", "Expert Dashboard", "Assigned plan and achievement entry workspace.", UserCog),
};

const roleAliases: Record<string, AppRoleKey> = {
  "super-admin": "super-admin",
  "super_admin": "super-admin",
  "super admin": "super-admin",
  admin: "super-admin",
  administrator: "super-admin",
  "head-of-office": "head-of-office",
  "head of office": "head-of-office",
  "office-head": "head-of-office",
  manager: "manager",
  adviser: "adviser",
  advisor: "adviser",
  advisory: "adviser",
  "deputy-head-of-office": "deputy-head-of-office",
  "deputy head of office": "deputy-head-of-office",
  deputy: "deputy-head-of-office",
  director: "director",
  "team-leader": "team-leader",
  "team leader": "team-leader",
  expert: "expert",
};

export function getDashboardForRole(role?: string | null): DashboardDefinition {
  const raw = String(role ?? "").toLowerCase().trim();
  const normalized = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return dashboardConfig[roleAliases[raw] ?? roleAliases[normalized] ?? "super-admin"];
}
