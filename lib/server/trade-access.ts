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

function normalize(value?: string | null) {
  return String(value ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const ALL_TRADE_GROUPS = ["Coffee","Tea","Spices","Cereals","Oil Seeds","Pulses","Fruits","Vegetables","Live Animals"];

function groupsFromTeam(team?: string | null) {
  const value=normalize(team);
  if(value.includes("coffee")||value.includes("tea")||value.includes("spice")) return ["Coffee","Tea","Spices"];
  if(value.includes("cereal")) return ["Cereals"];
  if(value.includes("oil_seed")||value.includes("oilseed")) return ["Oil Seeds"];
  if(value.includes("pulse")) return ["Pulses"];
  if(value.includes("fresh")&&(value.includes("fruit")||value.includes("vegetable"))) return ["Fruits","Vegetables"];
  if(value.includes("live_animal")) return ["Live Animals"];
  return [];
}
function groupsFromDirectorate(name?: string | null) {
  const value=normalize(name);
  if(value.includes("coffee")||value.includes("tea")||value.includes("spice")) return ["Coffee","Tea","Spices"];
  if(value.includes("crop_market")) return ["Cereals","Oil Seeds","Pulses"];
  if(value.includes("fruit")||value.includes("vegetable")) return ["Fruits","Vegetables"];
  if(value.includes("livestock")) return ["Live Animals"];
  return [];
}
export function isSuperAdmin(roles:string[]=[]){
  return roles.some(r=>["super_admin","system_administrator","admin"].includes(normalize(r)));
}
export function getTradeAccess(user:any,roles:string[]=[]):TradeAccess{
  if(isSuperAdmin(roles)) return {canCreate:true,canUpdate:true,canApprove:true,canReport:true,groups:ALL_TRADE_GROUPS,reportAllTrade:true};
  const role=normalize(roles.join(" "));
  const teamGroups=groupsFromTeam(user?.team_name);
  const directorateGroups=groupsFromDirectorate(user?.directorate_name);
  const isTeamLeader=role.includes("team_leader");
  const isExpert=role.includes("expert");
  const isDirector=role.includes("director")&&!isTeamLeader;
  const isDepartmentLevel=role.includes("manager")||role.includes("head_of_office")||role.includes("deputy");
  if((isTeamLeader||isExpert)&&teamGroups.length)
    return {canCreate:true,canUpdate:true,canApprove:false,canReport:true,groups:teamGroups,reportAllTrade:false};
  if(isDirector&&directorateGroups.length)
    return {canCreate:false,canUpdate:false,canApprove:true,canReport:true,groups:directorateGroups,reportAllTrade:false};
  if(isDepartmentLevel)
    return {canCreate:false,canUpdate:false,canApprove:true,canReport:true,groups:ALL_TRADE_GROUPS,reportAllTrade:false};
  return {canCreate:false,canUpdate:false,canApprove:false,canReport:false,groups:[],reportAllTrade:false};
}
export function getTradeAccessScope(user:any,roles:string[]=[]):TradeAccessScope{
  const a=getTradeAccess(user,roles);
  return {canWrite:a.canCreate||a.canUpdate,canReview:a.canApprove,reportOnly:!(a.canCreate||a.canUpdate),groups:a.groups,allTrade:a.reportAllTrade};
}
export function canReviewTradeRecords(user:any,roles:string[]=[]){return getTradeAccess(user,roles).canApprove;}
export function assertAllowedGroup(access:TradeAccess,group?:string|null){
  if(!access.canCreate&&!access.canUpdate) return "You do not have permission to create or update Trade records";
  if(!group) return "Trade group is required";
  const wanted=normalize(group);
  if(!access.groups.some(g=>normalize(g)===wanted)) return "This Trade group is not assigned to your team";
  return null;
}
export function applyTradeReadScope(where:string[],params:unknown[],user:any,accessOrRoles:TradeAccess|string[]=[],alias="tr"){
  const access=Array.isArray(accessOrRoles)?getTradeAccess(user,accessOrRoles):accessOrRoles;
  if(access.reportAllTrade)return;
  if(user?.office_id){where.push(`${alias}.office_id=?`);params.push(user.office_id);}
  const roles=Array.isArray(accessOrRoles)?accessOrRoles:[];
  const role=normalize(roles.join(" "));
  if((role.includes("team_leader")||role.includes("expert"))&&user?.team_id){
    where.push(`${alias}.team_id=?`);params.push(user.team_id);
  } else if(role.includes("director")&&user?.directorate_id){
    where.push(`${alias}.directorate_id=?`);params.push(user.directorate_id);
  } else if(user?.department_id){
    where.push(`EXISTS (SELECT 1 FROM directorates scope_d WHERE scope_d.id=${alias}.directorate_id AND scope_d.department_id=?)`);
    params.push(user.department_id);
  }
  // Do not filter commodity_group by the legacy hard-coded Trade groups here.
  // commodity_group now stores the selected Market Type/Business Area (for example
  // "Export Market"), while authorization is resolved separately from the user's
  // dynamic module/type access mapping. Organizational scope above is the read
  // boundary for the records created by that team/directorate/office.
}
export async function validateTradeWriteScope(data:{commodity_group?:string|null},user:any,roles:string[]=[]){
  if(isSuperAdmin(roles))return null;
  return assertAllowedGroup(getTradeAccess(user,roles),data.commodity_group);
}
export async function getTradeUserContext(authId:number){
  const rows=await query<any[]>(
    `SELECT u.*,o.name AS office_name,dp.name AS department_name,d.name AS directorate_name,t.name AS team_name
     FROM users u LEFT JOIN offices o ON o.id=u.office_id
     LEFT JOIN departments dp ON dp.id=u.department_id
     LEFT JOIN directorates d ON d.id=u.directorate_id
     LEFT JOIN teams t ON t.id=u.team_id WHERE u.id=? LIMIT 1`,[authId]);
  return rows[0]??null;
}
