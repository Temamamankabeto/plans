import { query } from "@/lib/server/db";

export type TradeAccess = {
  canCreate: boolean;
  canUpdate: boolean;
  canApprove: boolean;
  canReport: boolean;
  groups: string[];
  reportAllTrade: boolean;
};

export interface TradeAccessScope {
  canWrite: boolean;
  canReview: boolean;
  reportOnly: boolean;
  groups: string[];
  allTrade: boolean;
}

function digits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalize(value?: string | null) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeText(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

const allTradeGroups = [
  "Coffee",
  "Tea",
  "Spices",
  "Vegetables",
  "Fruits",
  "Cereals",
  "Pulses",
  "Oil Seeds",
  "Live Animals",
  "Dairy",
  "Meat",
  "Honey and Beeswax",
  "Poultry",
  "Poultry Meat",
  "Eggs",
  "Fish",
  "Livestock Employment",
];

const directorPhones = new Set([
  "251900000401",
  "251900000402",
  "251900000403",
  "251900000407",
]);

const creatorPhoneGroups: Record<string, string[]> = {
  "251900000404": ["Cereals"],
  "251900000405": ["Pulses"],
  "251900000406": ["Oil Seeds"],
  "251900000408": ["Live Animals"],
  "251900000409": ["Dairy", "Meat", "Honey and Beeswax", "Poultry", "Poultry Meat", "Eggs", "Fish", "Livestock Employment"],
};

const directorPhoneGroups: Record<string, string[]> = {
  "251900000401": ["Coffee", "Tea", "Spices"],
  "251900000402": ["Vegetables", "Fruits"],
  "251900000403": ["Cereals", "Pulses", "Oil Seeds"],
  "251900000407": ["Live Animals", "Dairy", "Meat", "Honey and Beeswax", "Poultry", "Poultry Meat", "Eggs", "Fish", "Livestock Employment"],
};

function groupsFromText(text: string) {
  if (text.includes("cereal")) return ["Cereals"];
  if (text.includes("pulse")) return ["Pulses"];
  if (text.includes("oil_seed") || text.includes("oilseed")) return ["Oil Seeds"];
  if (text.includes("coffee") || text.includes("tea") || text.includes("spice")) return ["Coffee", "Tea", "Spices"];
  if (text.includes("fruit") || text.includes("vegetable")) return ["Vegetables", "Fruits"];
  if (text.includes("live_animals")) return ["Live Animals"];
  if (text.includes("animal_products") || text.includes("livestock_products")) {
    return ["Dairy", "Meat", "Honey and Beeswax", "Poultry", "Poultry Meat", "Eggs", "Fish", "Livestock Employment"];
  }
  if (text.includes("livestock")) {
    return ["Live Animals", "Dairy", "Meat", "Honey and Beeswax", "Poultry", "Poultry Meat", "Eggs", "Fish", "Livestock Employment"];
  }
  return [];
}

export function isSuperAdmin(roles: string[] = []) {
  return roles.some((role) => {
    const normalized = normalize(role);
    return normalized === "super_admin" || normalized === "system_administrator" || normalized === "admin";
  });
}

export function isManufacturingValueChainManager(user: any, roles: string[] = []) {
  const phone = digits(user?.phone);
  const searchable = [user?.name, user?.email, user?.office_name, user?.directorate_name, user?.team_name, ...(roles ?? [])]
    .map(normalizeText)
    .join(" ");

  return phone === "251900000503" || searchable.includes("manufacturing value chain");
}

export function getTradeAccess(user: any, roles: string[] = []): TradeAccess {
  const roleText = normalize(roles.join(" "));
  const phone = digits(user?.phone);
  const office = normalize(user?.office_name ?? user?.office?.name);
  const directorate = normalize(user?.directorate_name ?? user?.directorate?.name);
  const team = normalize(user?.team_name ?? user?.team?.name);
  const allContext = `${roleText} ${office} ${directorate} ${team}`;

  if (isSuperAdmin(roles)) {
    return { canCreate: true, canUpdate: true, canApprove: true, canReport: true, groups: allTradeGroups, reportAllTrade: true };
  }

  if (isManufacturingValueChainManager(user, roles) || allContext.includes("manufacturing_value_chain")) {
    return { canCreate: false, canUpdate: false, canApprove: true, canReport: true, groups: allTradeGroups, reportAllTrade: true };
  }

  const inTradeOffice = office === "bureau_of_trade_and_regional_integration";
  const explicitCreatorGroups = creatorPhoneGroups[phone];
  const explicitDirectorGroups = directorPhoneGroups[phone];
  const contextGroups = groupsFromText(allContext);
  const groups = explicitCreatorGroups ?? explicitDirectorGroups ?? contextGroups;

  if (!inTradeOffice && !groups.length) {
    return { canCreate: false, canUpdate: false, canApprove: false, canReport: false, groups: [], reportAllTrade: false };
  }

  const isDirector = directorPhones.has(phone) || roleText.includes("director");
  const isOperational = Boolean(explicitCreatorGroups) || roleText.includes("team_leader") || roleText.includes("expert") || team.includes("team");

  return {
    canCreate: isOperational && !isDirector,
    canUpdate: isOperational && !isDirector,
    canApprove: isDirector,
    canReport: true,
    groups: groups.length ? groups : allTradeGroups,
    reportAllTrade: false,
  };
}

export function getTradeAccessScope(user: any, roles: string[] = []): TradeAccessScope {
  const access = getTradeAccess(user, roles);
  return {
    canWrite: access.canCreate || access.canUpdate,
    canReview: access.canApprove,
    reportOnly: !(access.canCreate || access.canUpdate),
    groups: access.groups,
    allTrade: access.reportAllTrade,
  };
}

export function canReviewTradeRecords(user: any, roles: string[] = []) {
  return isSuperAdmin(roles) || getTradeAccess(user, roles).canApprove;
}

export function assertAllowedGroup(access: TradeAccess, group?: string | null) {
  if (!access.canCreate && !access.canUpdate) return "You do not have permission to create or update Trade records";
  if (!group) return "Work Type is required";
  return null;
}

export function applyTradeReadScope(
  where: string[],
  params: unknown[],
  user: any,
  accessOrRoles: TradeAccess | string[] = [],
  alias = "tr",
) {
  const access = Array.isArray(accessOrRoles) ? getTradeAccess(user, accessOrRoles) : accessOrRoles;

  if (access.reportAllTrade) return;

  if (user?.office_id) {
    where.push(`${alias}.office_id = ?`);
    params.push(user.office_id);
  }
}

export async function validateTradeWriteScope(data: { commodity_group?: string | null }, user: any, roles: string[] = []) {
  if (isSuperAdmin(roles)) return null;

  const access = getTradeAccess(user, roles);
  if (!access.canCreate && !access.canUpdate) return "You have report-only access for this Trade planning module.";
  if (!data.commodity_group) return "Work Type is required.";

  return null;
}

export async function getTradeUserContext(authId: number) {
  const rows = await query<any[]>(
    `SELECT u.*, o.name AS office_name, d.name AS directorate_name, t.name AS team_name
     FROM users u
     LEFT JOIN offices o ON o.id = u.office_id
     LEFT JOIN directorates d ON d.id = u.directorate_id
     LEFT JOIN teams t ON t.id = u.team_id
     WHERE u.id = ? LIMIT 1`,
    [authId],
  );

  return rows[0] ?? null;
}
