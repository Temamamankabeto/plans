import { query } from "@/lib/server/db";
import { isSuperAdmin } from "@/lib/server/planning-record-rules";

function text(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanPhone(value: unknown) {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

export function isAgriculturalValueChainDeliveryManager(user: any) {
  const name = text(user?.name);
  const email = text(user?.email);
  const phone = cleanPhone(user?.phone);

  return (
    phone === "+251900000502" ||
    email.includes("agricultural.value.chain") ||
    email.includes("agri.value.chain") ||
    (name.includes("agricultural value chain") && name.includes("manager")) ||
    (name.includes("agricultural value chain") && name.includes("manger"))
  );
}

export function canAcceptPlanningRecords(user: any, roles: string[] = []) {
  return isSuperAdmin(roles) || isAgriculturalValueChainDeliveryManager(user);
}

export async function getAgricultureOfficeId() {
  const rows = await query<any[]>("SELECT id FROM offices WHERE code='AGRICULTURE' OR name='Bureau of Agriculture' LIMIT 1");
  return rows[0]?.id ?? null;
}

export function normalizedPlanStatus(record: any) {
  return String(record?.plan_status ?? (record?.status === "approved" ? "accepted" : record?.status ?? "draft"));
}

export function normalizedAchievementStatus(record: any) {
  return String(record?.achievement_status ?? "draft");
}

export function isPlanAccepted(record: any) {
  return normalizedPlanStatus(record) === "accepted";
}

export function isAchievementAccepted(record: any) {
  return normalizedAchievementStatus(record) === "accepted";
}

export function isAchievementPayload(data: any) {
  return data?.period_type === "monthly" && (
    Number(data?.achievement_land_area ?? 0) > 0 ||
    Number(data?.achievement_population ?? 0) > 0 ||
    Number(data?.achievement_productivity ?? 0) > 0 ||
    Number(data?.achievement_production ?? 0) > 0
  );
}
