import RoleDashboard from "@/components/dashboards/RoleDashboard";
import type { RoleDashboardScope } from "@/types/dashboard/role-dashboard.type";

const routeScopes: Record<string, RoleDashboardScope> = {
  "super-admin": "super_admin",
  "head-of-office": "head_of_office",
  "deputy-head-of-office": "deputy_head_of_office",
  manager: "head_of_office",
  adviser: "expert",
  director: "director",
  "team-leader": "team_leader",
  expert: "expert",
  "agriculture-coffee-tea-director": "agriculture_coffee_tea_director",
  "agriculture-fruit-director": "agriculture_fruit_director",
  "agriculture-crop-director": "agriculture_crop_director",
  "agriculture-livestock-director": "agriculture_livestock_director",
  "agriculture-job-creation-director": "agriculture_job_creation_director",
  "agriculture-vegetable-expert": "agriculture_vegetable_expert",
  "cooperative-market-director": "cooperative_market_director",
  "cooperative-job-creation-director": "cooperative_job_creation_director",
  "industry-value-addition-director": "industry_value_addition_director",
  "industry-job-creation-director": "industry_job_creation_director",
  "trade-coffee-tea-spice-director": "trade_coffee_tea_spice_director",
  "trade-fruit-vegetable-director": "trade_fruit_vegetable_director",
  "trade-crop-director": "trade_crop_director",
  "trade-livestock-director": "trade_livestock_director",
  "president-agriculture-value-chain-manager": "president_agriculture_value_chain_manager",
  "president-manufacturing-value-chain-manager": "president_manufacturing_value_chain_manager",
  "president-investment-manager": "president_investment_manager",
  "president-job-creation-manager": "president_job_creation_manager",
};

export default async function DashboardRolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const scope = routeScopes[role] ?? "super_admin";
  return <RoleDashboard scope={scope} />;
}
