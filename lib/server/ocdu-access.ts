export type OcduDepartmentScope =
  | "agriculture"
  | "manufacturing"
  | "investment"
  | "job_creation"
  | "monitoring_evaluation"
  | "all";

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getOcduIdentity(user: any, roles: string[] = []) {
  const roleText = [...roles, user?.role, user?.display_role].map(normalize).join(" ");
  const office = normalize(user?.office_name ?? user?.office?.name);
  const directorate = normalize(user?.directorate_name ?? user?.directorate?.name);
  const department = normalize(user?.department_name ?? user?.department?.name);
  const isPresidentOffice = ["president", "presedant", "presedent", "pirezidaant"]
    .some((name) => office.includes(name));
  const isOcduDirectorate = directorate.includes("ocdu") || (
    directorate.includes("coordination") && directorate.includes("delivery")
  );
  const isDirector = roleText.includes("director");
  const isManager = roleText.includes("manager");
  const isAdviser = roleText.includes("adviser") || roleText.includes("advisor") || roleText.includes("advisory");

  let scope: OcduDepartmentScope = "all";
  if (department.includes("agricultural_value_chain")) scope = "agriculture";
  else if (department.includes("manufacturing_value_chain")) scope = "manufacturing";
  else if (department.includes("investment_monitoring")) scope = "investment";
  else if (department.includes("job_creation_monitoring")) scope = "job_creation";
  else if (department.includes("monitoring_and_evaluation")) scope = "monitoring_evaluation";

  return {
    isOcdu: isPresidentOffice && isOcduDirectorate,
    isDirector,
    isManager,
    isAdviser,
    scope,
  };
}

export function canAccessOcduReports(user: any, roles: string[] = []) {
  const identity = getOcduIdentity(user, roles);
  return identity.isOcdu && (identity.isDirector || identity.isManager || identity.isAdviser);
}

export function applyOcduPlanningScope(
  where: string[],
  params: unknown[],
  user: any,
  roles: string[] = [],
  recordAlias = "pr",
  workTypeAlias = "wt",
) {
  const identity = getOcduIdentity(user, roles);
  if (!identity.isOcdu) {
    where.push("1 = 0");
    return;
  }

  if (identity.isDirector || identity.scope === "monitoring_evaluation" || identity.scope === "all") return;

  if (identity.scope === "agriculture") {
    where.push(`${recordAlias}.module_type IN ('crop','livestock')`);
    return;
  }
  if (identity.scope === "manufacturing") {
    where.push(`(LOWER(COALESCE(${workTypeAlias}.name,'')) LIKE '%manufactur%' OR LOWER(COALESCE(${recordAlias}.specification,'')) LIKE '%manufactur%' OR LOWER(COALESCE(${recordAlias}.specification,'')) LIKE '%industry%')`);
    return;
  }
  if (identity.scope === "investment") {
    where.push(`(LOWER(COALESCE(${workTypeAlias}.name,'')) LIKE '%investment%' OR LOWER(COALESCE(${recordAlias}.specification,'')) LIKE '%investment%')`);
    return;
  }
  if (identity.scope === "job_creation") {
    where.push(`(LOWER(COALESCE(${workTypeAlias}.name,'')) LIKE '%job%' OR LOWER(COALESCE(${workTypeAlias}.name,'')) LIKE '%employment%' OR LOWER(COALESCE(${recordAlias}.specification,'')) LIKE '%job%' OR LOWER(COALESCE(${recordAlias}.specification,'')) LIKE '%employment%')`);
    return;
  }

  where.push("1 = 0");
}
