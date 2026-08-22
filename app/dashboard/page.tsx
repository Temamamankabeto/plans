"use client";

import RoleDashboard from "@/components/dashboards/RoleDashboard";
import type { RoleDashboardScope } from "@/types/dashboard/role-dashboard.type";

const roleAliases: Record<string, RoleDashboardScope> = {
  super_admin: "super_admin",
  "super admin": "super_admin",
  "head of office": "head_of_office",
  "hogganaa waajjiraa": "head_of_office",
  "deputy head of office": "deputy_head_of_office",
  "itti aanaa itti gaafatamaa waajjiraa": "deputy_head_of_office",
  manager: "head_of_office",
  adviser: "expert",
  advisor: "expert",
  advisory: "expert",
  director: "director",
  directora: "director",
  "team leader": "team_leader",
  "expert": "expert",
  "oggeessa": "expert",
  "agriculture coffee and tea director": "agriculture_coffee_tea_director",
  "directorate of coffee and tea development": "agriculture_coffee_tea_director",
  "agriculture fruit director": "agriculture_fruit_director",
  "directorate of fruit development": "agriculture_fruit_director",
  "agriculture crop director": "agriculture_crop_director",
  "directorate of crop development": "agriculture_crop_director",
  "agriculture livestock director": "agriculture_livestock_director",
  "directorate of livestock development": "agriculture_livestock_director",
  "agriculture job creation director": "agriculture_job_creation_director",
  "directorate of job creation and skills development": "agriculture_job_creation_director",
  "vegetable development expert": "agriculture_vegetable_expert",
  "horticulture expert": "agriculture_vegetable_expert",
  "cooperative market director": "cooperative_market_director",
  "market development director": "cooperative_market_director",
  "cooperative job creation director": "cooperative_job_creation_director",
  "industry value addition director": "industry_value_addition_director",
  "directorate of industry development and value addition": "industry_value_addition_director",
  "industry job creation director": "industry_job_creation_director",
  "trade coffee tea spice director": "trade_coffee_tea_spice_director",
  "directorate of coffee tea and spice development": "trade_coffee_tea_spice_director",
  "trade fruit vegetable director": "trade_fruit_vegetable_director",
  "directorate of fruit and vegetable development": "trade_fruit_vegetable_director",
  "trade crop director": "trade_crop_director",
  "directorate of crop market development": "trade_crop_director",
  "trade livestock director": "trade_livestock_director",
  "directorate of livestock and livestock products development": "trade_livestock_director",
  "agricultural value chain monitoring manager": "president_agriculture_value_chain_manager",
  "manufacturing value chain monitoring manager": "president_manufacturing_value_chain_manager",
  "investment monitoring manager": "president_investment_manager",
  "job creation monitoring manager": "president_job_creation_manager",
};

function normalizeRole(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[&]/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCurrentUserRole(): RoleDashboardScope {
  if (typeof window === "undefined") return "super_admin";

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const storedRoles = JSON.parse(localStorage.getItem("roles") || "[]");
    const role = user?.role ?? user?.display_role ?? user?.roles?.[0]?.name ?? user?.roles?.[0] ?? storedRoles?.[0]?.name ?? storedRoles?.[0];
    return roleAliases[normalizeRole(role)] ?? "expert";
  } catch {
    return "expert";
  }
}

export default function DashboardIndexPage() {
  return <RoleDashboard scope={getCurrentUserRole()} />;
}
