import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  FolderTree,
  History,
  LayoutDashboard,
  PackageCheck,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  User,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SidebarChildItem = {
  label: string;
  translationKey?: string;
  href: string;
  permission?: string;
  superOnly?: boolean;
};

export type SidebarItem = {
  label: string;
  translationKey?: string;
  href?: string;
  icon: LucideIcon;
  permission?: string;
  superOnly?: boolean;
  children?: SidebarChildItem[];
};

export type SidebarSection = {
  title: string;
  translationKey?: string;
  items: SidebarItem[];
};

export type RoleSidebar = {
  title: string;
  icon: LucideIcon;
  sections: SidebarSection[];
};

type AccessMapping = {
  module?: string | null;
  is_active?: number | boolean | null;
  can_create_annual_plan?: number | boolean | null;
  can_divide_monthly_plan?: number | boolean | null;
  can_update_achievement?: number | boolean | null;
  can_comment?: number | boolean | null;
  can_approve?: number | boolean | null;
  can_view_report?: number | boolean | null;
};

export type SidebarUserContext = {
  phone?: string | null;
  role?: string | null;
  display_role?: string | null;
  office_name?: string | null;
  office?: { name?: string | null } | null;
  directorate_name?: string | null;
  directorate?: { name?: string | null } | null;
  department_name?: string | null;
  department?: { name?: string | null } | null;
  team_name?: string | null;
  team?: { name?: string | null } | null;
  access_mappings?: AccessMapping[] | null;
};

type RoleKey =
  | "super_admin"
  | "head_of_office"
  | "deputy_head_of_office"
  | "manager"
  | "adviser"
  | "director"
  | "team_leader"
  | "expert";

type ModuleKey =
  | "crop"
  | "livestock"
  | "trade"
  | "job"
  | "agribusiness"
  | "mechanization"
  | "cooperative"
  | "industry"
  | "investment"
  | "all";

function normalizeText(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizePhone(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeRole(role?: string | null): RoleKey {
  const value = normalizeText(role);
  if (["super_admin", "superadministrator", "system_administrator", "admin"].includes(value)) return "super_admin";
  if (["head_of_office", "office_head", "hogganaa_waajjiraa"].includes(value)) return "head_of_office";
  if (["deputy_head_of_office", "deputy_office_head", "itti_aanaa_itti_gaafatamaa_waajjiraa"].includes(value)) return "deputy_head_of_office";
  if (["manager", "program_manager", "project_manager"].includes(value)) return "manager";
  if (["adviser", "advisor", "advisory"].includes(value)) return "adviser";
  if (["director", "directora", "directorate_director"].includes(value) || value.includes("director")) return "director";
  if (["team_leader", "teamlead"].includes(value) || value.includes("team_leader")) return "team_leader";
  return "expert";
}

function contextText(role?: string | null, user?: SidebarUserContext | null) {
  return [
    role,
    user?.role,
    user?.display_role,
    user?.office_name,
    user?.office?.name,
    user?.directorate_name,
    user?.directorate?.name,
    user?.department_name,
    user?.department?.name,
    user?.team_name,
    user?.team?.name,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function isOcduContext(context: string) {
  const isPresidentOffice = ["president", "presedant", "presedent", "pirezidaant"]
    .some((name) => context.includes(name));
  return context.includes("ocdu") && isPresidentOffice;
}

const dashboardItem: SidebarItem = {
  label: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
};

const accountItem: SidebarItem = {
  label: "Notifications",
  icon: Bell,
  href: "/dashboard/notifications",
};

const planningHref = (module: ModuleKey = "all", extra = "") =>
  `/dashboard/planning-records?${module === "all" ? "" : `work=${module}&`}${extra}`.replace(/[?&]$/, "");

const planningReportHref = (module: ModuleKey = "all", extra = "") =>
  `/dashboard/planning-records/reports?${module === "all" ? "" : `work=${module}&`}${extra}`.replace(/[?&]$/, "");

function planWorkspace(module: ModuleKey, label: string): SidebarItem {
  return {
    label: `${label} Plans`,
    icon: Target,
    permission: "planning_records.read",
    children: [
      { label: "All Plans", href: planningHref(module), permission: "planning_records.read" },
      { label: "Annual Plans", href: planningHref(module, "period_type=annual"), permission: "planning_records.read" },
      { label: "Monthly Plans", href: planningHref(module, "period_type=monthly"), permission: "planning_records.read" },
      { label: "Draft Plans", href: planningHref(module, "status=draft"), permission: "planning_records.read" },
      { label: "Returned Plans", href: planningHref(module, "status=returned"), permission: "planning_records.read" },
      { label: "Approved Plans", href: planningHref(module, "status=approved"), permission: "planning_records.read" },
    ],
  };
}

function achievementWorkspace(module: ModuleKey, label: string): SidebarItem {
  return {
    label: `${label} Achievements`,
    icon: TrendingUp,
    permission: "planning_records.read",
    children: [
      { label: "Record Achievement", href: planningHref(module, "tab=achievement"), permission: "planning_records.update" },
      { label: "Monthly Achievements", href: planningHref(module, "tab=achievement&period_type=monthly"), permission: "planning_records.read" },
      { label: "Returned Achievements", href: planningHref(module, "tab=achievement&status=returned"), permission: "planning_records.read" },
      { label: "Approved Achievements", href: planningHref(module, "tab=achievement&status=approved"), permission: "planning_records.read" },
    ],
  };
}

function actionCenter(module: ModuleKey = "all", reviewer = false): SidebarItem {
  const children: SidebarChildItem[] = reviewer
    ? [
        { label: "Pending Reviews", href: planningHref(module, "status=submitted"), permission: "planning_records.read" },
        { label: "Resubmitted Records", href: planningHref(module, "status=resubmitted"), permission: "planning_records.read" },
        { label: "Returned Records", href: planningHref(module, "status=returned"), permission: "planning_records.read" },
        { label: "Approved Records", href: planningHref(module, "status=approved"), permission: "planning_records.read" },
      ]
    : [
        { label: "Assigned Work", href: planningHref(module), permission: "planning_records.read" },
        { label: "Draft Records", href: planningHref(module, "status=draft"), permission: "planning_records.read" },
        { label: "Returned Records", href: planningHref(module, "status=returned"), permission: "planning_records.read" },
        { label: "Submission History", href: planningHref(module, "status=submitted"), permission: "planning_records.read" },
      ];

  return {
    label: reviewer ? "Review Queue" : "My Work",
    icon: reviewer ? ClipboardCheck : ClipboardList,
    permission: "planning_records.read",
    children,
  };
}

function reportWorkspace(module: ModuleKey, label: string): SidebarItem {
  return {
    label: `${label} Reports`,
    icon: FileBarChart2,
    permission: "reports.read",
    children: [
      { label: "Performance Report", href: planningReportHref(module), permission: "reports.read" },
      { label: "Monthly Report", href: planningReportHref(module, "period_type=monthly"), permission: "reports.read" },
      { label: "Quarterly Report", href: planningReportHref(module, "period_type=quarterly"), permission: "reports.read" },
      { label: "Annual Report", href: planningReportHref(module, "period_type=annual"), permission: "reports.read" },
      { label: "Underperformance", href: planningReportHref(module, "performance=below_target"), permission: "reports.read" },
    ],
  };
}

function workCenter(module: ModuleKey, reviewer: boolean, canWrite: boolean): SidebarItem {
  const children: SidebarChildItem[] = [
    { label: "All Records", href: planningHref(module), permission: "planning_records.read" },
    { label: "Annual Plans", href: planningHref(module, "period_type=annual"), permission: "planning_records.read" },
    { label: "Monthly Plans", href: planningHref(module, "period_type=monthly"), permission: "planning_records.read" },
  ];

  if (canWrite) {
    children.push({
      label: "Record Achievement",
      href: planningHref(module, "tab=achievement"),
      permission: "planning_records.update",
    });
  }

  if (reviewer) {
    children.push(
      { label: "Pending Reviews", href: planningHref(module, "status=submitted"), permission: "planning_records.read" },
      { label: "Returned Records", href: planningHref(module, "status=returned"), permission: "planning_records.read" },
      { label: "Approved Records", href: planningHref(module, "status=approved"), permission: "planning_records.read" },
    );
  } else {
    children.push(
      { label: "Draft Records", href: planningHref(module, "status=draft"), permission: "planning_records.read" },
      { label: "Returned Records", href: planningHref(module, "status=returned"), permission: "planning_records.read" },
    );
  }

  return {
    label: reviewer ? "Review & Work" : "My Work",
    icon: reviewer ? ClipboardCheck : ClipboardList,
    permission: "planning_records.read",
    children,
  };
}

function moduleSidebar(options: {
  title: string;
  module: ModuleKey;
  label: string;
  icon: LucideIcon;
  reviewer?: boolean;
  canWrite?: boolean;
}): RoleSidebar {
  const { title, module, label, icon, reviewer = false, canWrite = false } = options;

  return {
    title,
    icon,
    sections: [
      { title: "Main Menu", items: [dashboardItem, workCenter(module, reviewer, canWrite || reviewer), reportWorkspace(module, label), accountItem] },
    ],
  };
}

function teamLeaderSidebar(title: string, module: ModuleKey = "all"): RoleSidebar {
  return {
    title,
    icon: Users,
    sections: [
      {
        title: "Main Menu",
        items: [
          {
            label: "Review & Work",
            icon: ClipboardCheck,
            permission: "planning_records.read",
            children: [
              {
                label: "Plan",
                href: planningHref(module),
                permission: "planning_records.read",
              },
            ],
          },
          {
            label: "Report",
            icon: FileBarChart2,
            permission: "reports.read",
            children: [
              {
                label: "See Report",
                href: planningReportHref(module),
                permission: "reports.read",
              },
            ],
          },
        ],
      },
    ],
  };
}

function expertSidebar(title: string, module: ModuleKey = "all"): RoleSidebar {
  return {
    title,
    icon: User,
    sections: [
      {
        title: "Main Menu",
        items: [
          dashboardItem,
          {
            label: "Plan & Achievement",
            icon: ClipboardList,
            children: [
              { label: "Plan", href: planningHref(module) },
            ],
          },
          {
            label: "Report",
            icon: FileBarChart2,
            children: [
              { label: "See Report", href: planningReportHref(module) },
            ],
          },
          accountItem,
        ],
      },
    ],
  };
}

type OcduReportScope = "agriculture" | "manufacturing" | "investment" | "job_creation" | "monitoring_evaluation" | "all";

function ocduScopeFromContext(context: string): OcduReportScope {
  if (context.includes("agricultural_value_chain")) return "agriculture";
  if (context.includes("manufacturing_value_chain")) return "manufacturing";
  if (context.includes("investment_monitoring")) return "investment";
  if (context.includes("job_creation_monitoring")) return "job_creation";
  if (context.includes("monitoring_and_evaluation") || context.includes("m_and_e_advisory")) return "monitoring_evaluation";
  return "all";
}

function ocduMonitoringSidebar(title: string, scope: OcduReportScope = "all", finalApprover = false): RoleSidebar {
  const reportHref = (view = "overview") => `/dashboard/ocdu/reports?scope=${scope}&view=${view}`;
  const reportChildren: SidebarChildItem[] = scope === "agriculture"
    ? [
        { label: "Agriculture Plans & Achievements", href: reportHref("agriculture"), permission: "reports.read" },
        { label: "Livestock Plans & Achievements", href: reportHref("livestock"), permission: "reports.read" },
        { label: "Consolidated Agriculture Report", href: reportHref("consolidated"), permission: "reports.read" },
      ]
    : scope === "manufacturing"
      ? [
          { label: "Manufacturing Plans", href: reportHref("manufacturing-plans"), permission: "reports.read" },
          { label: "Industry Achievements", href: reportHref("industry-achievements"), permission: "reports.read" },
          { label: "Value Addition Report", href: reportHref("value-addition"), permission: "reports.read" },
        ]
      : scope === "investment"
        ? [
            { label: "Investment Plans", href: reportHref("investment-plans"), permission: "reports.read" },
            { label: "Investment Achievements", href: reportHref("investment-achievements"), permission: "reports.read" },
            { label: "Delayed Investments", href: reportHref("delayed-investments"), permission: "reports.read" },
          ]
        : scope === "job_creation"
          ? [
              { label: "Employment Plans", href: reportHref("employment-plans"), permission: "reports.read" },
              { label: "Employment Achievements", href: reportHref("employment-achievements"), permission: "reports.read" },
              { label: "Employment by Office", href: reportHref("office-comparison"), permission: "reports.read" },
            ]
          : scope === "monitoring_evaluation"
            ? [
                { label: "Executive Overview", href: reportHref("executive"), permission: "reports.read" },
                { label: "Data Quality", href: reportHref("data-quality"), permission: "reports.read" },
                { label: "Trend Analysis", href: reportHref("trend-analysis"), permission: "reports.read" },
                { label: "Underperforming Indicators", href: reportHref("underperforming"), permission: "reports.read" },
              ]
            : [
                { label: "All Participating Offices", href: reportHref("overview"), permission: "reports.read" },
                { label: "Agriculture & Livestock", href: `${reportHref("agriculture")}&category=agriculture`, permission: "reports.read" },
                { label: "Office Performance", href: reportHref("office-comparison"), permission: "reports.read" },
                { label: "Consolidated Executive Report", href: reportHref("executive"), permission: "reports.read" },
              ];
  const items: SidebarItem[] = [
    {
      label: "Plan & Achievement",
      icon: ClipboardCheck,
      permission: "planning_records.read",
      children: [
        { label: "Plan", href: planningHref("crop"), permission: "planning_records.read" },
      ],
    },
  ];

  if (finalApprover) {
    items.push({
      label: "Final Approval",
      icon: ShieldCheck,
      permission: "planning_records.final_approve",
      children: [
        { label: "Plans Awaiting Approval", href: planningHref("all", "workflow_status=approved_director"), permission: "planning_records.final_approve" },
        { label: "Finally Approved Plans", href: planningHref("all", "workflow_status=finally_approved"), permission: "planning_records.read" },
        { label: "Returned or Rejected", href: planningHref("all", "workflow_status=returned"), permission: "planning_records.read" },
      ],
    });
  }

  items.push({
    label: finalApprover || scope === "monitoring_evaluation" ? "Consolidated Reports" : "Department Reports",
    icon: FileBarChart2,
    permission: "reports.read",
    children: reportChildren,
  });

  return { title, icon: BarChart3, sections: [{ title: "OCDU Monitoring", items }] };
}

const tradePlansItem: SidebarItem = {
  label: "Trade Plans",
  icon: PackageCheck,
  permission: "trade_records.read",
  children: [
    { label: "All Trade Records", href: "/dashboard/trade-records", permission: "trade_records.read" },
    { label: "Annual Plans", href: "/dashboard/trade-records?period_type=annual", permission: "trade_records.read" },
    { label: "Monthly Plans", href: "/dashboard/trade-records?period_type=monthly", permission: "trade_records.read" },
    { label: "Returned Records", href: "/dashboard/trade-records?status=returned", permission: "trade_records.read" },
    { label: "Approved Records", href: "/dashboard/trade-records?status=approved", permission: "trade_records.read" },
  ],
};

const tradeAchievementsItem: SidebarItem = {
  label: "Trade Achievements",
  icon: TrendingUp,
  permission: "trade_records.read",
  children: [
    { label: "Record Achievement", href: "/dashboard/trade-records?tab=achievement", permission: "trade_records.update" },
    { label: "Procurement Achievement", href: "/dashboard/trade-records?tab=achievement&indicator=procurement", permission: "trade_records.read" },
    { label: "Domestic Market", href: "/dashboard/trade-records?tab=achievement&indicator=domestic_market", permission: "trade_records.read" },
    { label: "International Market", href: "/dashboard/trade-records?tab=achievement&indicator=international_market", permission: "trade_records.read" },
    { label: "Employment Creation", href: "/dashboard/trade-records?tab=achievement&indicator=employment", permission: "trade_records.read" },
  ],
};

function tradeSidebar(title: string, reviewer: boolean): RoleSidebar {
  if (!reviewer) {
    return {
      title,
      icon: Users,
      sections: [
        {
          title: "Main Menu",
          items: [
            {
              label: "Review & Work",
              icon: ClipboardCheck,
              children: [
                {
                  label: "Plan",
                  href: "/dashboard/trade-records",
                },
              ],
            },
            {
              label: "Report",
              icon: FileBarChart2,
              children: [
                {
                  label: "See Report",
                  href: "/dashboard/trade-records/reports",
                },
              ],
            },
          ],
        },
      ],
    };
  }

  return {
    title,
    icon: reviewer ? FolderTree : Users,
    sections: [
      {
        title: "Main Menu",
        items: [
          dashboardItem,
          {
            label: reviewer ? "Review & Work" : "My Work",
            icon: reviewer ? ClipboardCheck : ClipboardList,
            children: [
              { label: "All Trade Records", href: "/dashboard/trade-records" },
              { label: "Annual Plans", href: "/dashboard/trade-records?period_type=annual" },
              { label: "Monthly Plans", href: "/dashboard/trade-records?period_type=monthly" },
              { label: reviewer ? "Pending Reviews" : "Record Achievement", href: reviewer ? "/dashboard/trade-records?status=submitted" : "/dashboard/trade-records?tab=achievement" },
              { label: "Returned Records", href: "/dashboard/trade-records?status=returned" },
              { label: "Approved Records", href: "/dashboard/trade-records?status=approved" },
            ],
          },
          {
            label: "Trade Reports",
            icon: FileBarChart2,
            children: [
              { label: "Performance Report", href: "/dashboard/trade-records/reports" },
              { label: "Monthly Report", href: "/dashboard/trade-records/reports?period_type=monthly" },
              { label: "Annual Report", href: "/dashboard/trade-records/reports?period_type=annual" },
            ],
          },
          accountItem,
        ],
      },
    ],
  };
}

const organizationItem: SidebarItem = {
  label: "Organization",
  icon: Building2,
  children: [
    { label: "Offices", href: "/dashboard/offices", permission: "offices.read" },
    { label: "Directorates", href: "/dashboard/directorates", permission: "directorates.read" },
    { label: "Departments", href: "/dashboard/departments", permission: "departments.view" },
    { label: "Teams", href: "/dashboard/teams", permission: "teams.read" },
  ],
};

const userManagementItem: SidebarItem = {
  label: "User Management",
  icon: UserCog,
  permission: "users.read",
  children: [
    { label: "Users", href: "/dashboard/users", permission: "users.read" },
    { label: "Roles", href: "/dashboard/users/roles", permission: "roles.read", superOnly: true },
    { label: "Access Mappings", href: "/dashboard/access-mappings", permission: "access_mappings.read", superOnly: true },
  ],
};

const masterDataItem: SidebarItem = {
  label: "Master Data",
  icon: Settings,
  children: [
    { label: "Crop Types", href: "/dashboard/crop-types", permission: "crop_types.read" },
    { label: "Crops", href: "/dashboard/crops", permission: "crops.read" },
    { label: "Livestock Products", href: "/dashboard/livestock-products", permission: "livestock_products.read" },
    { label: "Livestock Product Types", href: "/dashboard/livestock-product-types", permission: "livestock_product_types.read" },
    { label: "Work Types", href: "/dashboard/work-types", permission: "work_types.read" },
    { label: "Works", href: "/dashboard/works", permission: "works.read" },
  ],
};

const roleSidebars: Record<RoleKey, RoleSidebar> = {
  super_admin: {
    title: "Super Admin",
    icon: ShieldCheck,
    sections: [
      {
        title: "Administration",
        items: [
          {
            label: "Organization",
            icon: Building2,
            children: [
              { label: "Offices", href: "/dashboard/offices", permission: "offices.read" },
              { label: "Directorates", href: "/dashboard/directorates", permission: "directorates.read" },
              { label: "Departments", href: "/dashboard/departments", permission: "departments.view" },
              { label: "Teams", href: "/dashboard/teams", permission: "teams.read" },
            ],
          },
          {
            label: "User Management",
            icon: UserCog,
            permission: "users.read",
            children: [
              { label: "Users", href: "/dashboard/users", permission: "users.read" },
              { label: "Roles", href: "/dashboard/users/roles", permission: "roles.read", superOnly: true },
              { label: "Access Mappings", href: "/dashboard/access-mappings", permission: "access_mappings.read", superOnly: true },
            ],
          },
          {
            label: "Master Data",
            icon: FolderTree,
            children: [
              { label: "Crop Types", href: "/dashboard/crop-types", permission: "crop_types.read" },
              { label: "Crops", href: "/dashboard/crops", permission: "crops.read" },
              { label: "Livestock Products", href: "/dashboard/livestock-products", permission: "livestock_products.read" },
              { label: "Livestock Product Types", href: "/dashboard/livestock-product-types", permission: "livestock_product_types.read" },
              { label: "Work Types", href: "/dashboard/work-types", permission: "work_types.read" },
              { label: "Works", href: "/dashboard/works", permission: "works.read" },
              { label: "Planning Periods", href: "/dashboard/planning-settings", permission: "planning_settings.read", superOnly: true },
            ],
          },
          {
            label: "Settings",
            icon: Settings,
            children: [
              { label: "Planning Settings", href: "/dashboard/planning-settings", permission: "planning_settings.read", superOnly: true },
              { label: "Translations", href: "/dashboard/translations", permission: "translations.read", superOnly: true },
              { label: "Audit Logs", href: "/dashboard/audit-logs", permission: "audit_logs.read", superOnly: true },
            ],
          },
        ],
      },
    ],
  },
  head_of_office: moduleSidebar({
    title: "Head of Office",
    module: "all",
    label: "Office",
    icon: Building2,
    reviewer: true,
  }),
  deputy_head_of_office: moduleSidebar({
    title: "Deputy Head of Office",
    module: "all",
    label: "Office",
    icon: BriefcaseBusiness,
    reviewer: true,
  }),
  manager: moduleSidebar({
    title: "Manager",
    module: "all",
    label: "Management",
    icon: BriefcaseBusiness,
    reviewer: true,
  }),
  adviser: moduleSidebar({
    title: "Adviser",
    module: "all",
    label: "Advisory",
    icon: User,
    reviewer: true,
  }),
  director: teamLeaderSidebar("Director"),
  team_leader: teamLeaderSidebar("Team Leader"),
  expert: expertSidebar("Expert"),
};

const phoneProfiles: Record<string, { title: string; module: ModuleKey; label: string; reviewer: boolean; canWrite: boolean }> = {
  "251900000101": { title: "Coffee, Tea & Spice Director", module: "crop", label: "Cash Crop", reviewer: true, canWrite: false },
  "251900000102": { title: "Coffee Team Leader", module: "crop", label: "Coffee", reviewer: false, canWrite: true },
  "251900000103": { title: "Spice Development Director", module: "crop", label: "Spice", reviewer: false, canWrite: true },
  "251900000104": { title: "Fruit Development Director", module: "crop", label: "Fruit", reviewer: false, canWrite: true },
  "251900000105": { title: "Crop Development Director", module: "crop", label: "Crop", reviewer: true, canWrite: false },
  "251900000106": { title: "Cereal Team Leader", module: "crop", label: "Cereal", reviewer: false, canWrite: true },
  "251900000107": { title: "Pulse Team Leader", module: "crop", label: "Pulse", reviewer: false, canWrite: true },
  "251900000108": { title: "Oil Seed Team Leader", module: "crop", label: "Oil Seed", reviewer: false, canWrite: true },
  "251900000109": { title: "Vegetable Expert", module: "crop", label: "Vegetable", reviewer: false, canWrite: true },
  "251900000110": { title: "Livestock Development Director", module: "livestock", label: "Livestock", reviewer: true, canWrite: false },
  "251900000111": { title: "Live Animals & Meat Team Leader", module: "livestock", label: "Live Animals & Meat", reviewer: false, canWrite: true },
  "251900000112": { title: "Dairy Team Leader", module: "livestock", label: "Dairy", reviewer: false, canWrite: true },
  "251900000113": { title: "Poultry & Fish Team Leader", module: "livestock", label: "Poultry & Fish", reviewer: false, canWrite: true },
  "251900000114": { title: "Apiculture & Honey Team Leader", module: "livestock", label: "Apiculture & Honey", reviewer: false, canWrite: true },
  "251900000115": { title: "Animal Feed & Nutrition Team Leader", module: "livestock", label: "Animal Feed", reviewer: false, canWrite: true },
  "251900000116": { title: "Agriculture Job Creation Director", module: "job", label: "Job Creation", reviewer: true, canWrite: false },
  "251900000117": { title: "Agribusiness Director", module: "agribusiness", label: "Agribusiness", reviewer: true, canWrite: false },
  "251900000118": { title: "Mechanization Director", module: "mechanization", label: "Mechanization", reviewer: true, canWrite: false },
  "251900000501": { title: "OCDU Team Leader", module: "all", label: "Consolidated", reviewer: true, canWrite: false },
  "251900000502": { title: "Agricultural Value Chain Monitoring Manager", module: "all", label: "Agriculture", reviewer: true, canWrite: false },
  "251900000503": { title: "Manufacturing Value Chain Monitoring Manager", module: "industry", label: "Manufacturing", reviewer: true, canWrite: false },
  "251900000504": { title: "Job Creation Monitoring Manager", module: "job", label: "Job Creation", reviewer: true, canWrite: false },
  "251900000505": { title: "Monitoring & Evaluation Advisory", module: "all", label: "M&E", reviewer: true, canWrite: false },
};

const tradePhoneTitles: Record<string, string> = {
  "251900000401": "Coffee, Tea & Spice Trade Director",
  "251900000402": "Fruit & Vegetable Trade Director",
  "251900000403": "Crop Market Director",
  "251900000404": "Cereal Trade Team Leader",
  "251900000405": "Pulse Trade Team Leader",
  "251900000406": "Oil Seed Trade Team Leader",
  "251900000407": "Livestock Trade Director",
  "251900000408": "Live Animals Trade Team Leader",
  "251900000409": "Animal Products Trade Team Leader",
};

function titleProfile(text: string): RoleSidebar | null {
  const is = (...terms: string[]) => terms.some((term) => text.includes(normalizeText(term)));
  const roleIsTeam = is("team leader");

  if (is("trade") || is("crop market", "market development") && !is("cooperative")) {
    return tradeSidebar(
      text.split(" ").filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" "),
      !roleIsTeam,
    );
  }
  if (is("cooperative market")) return moduleSidebar({ title: "Cooperative Market Director", module: "cooperative", label: "Cooperative Market", icon: Building2, reviewer: true });
  if (is("cooperative job creation")) return moduleSidebar({ title: "Cooperative Job Creation Director", module: "job", label: "Cooperative Jobs", icon: BriefcaseBusiness, reviewer: true });
  if (is("industry value addition", "industry development and value addition")) return moduleSidebar({ title: "Industry Development & Value Addition Director", module: "industry", label: "Industry", icon: Building2, reviewer: true });
  if (is("industry job creation")) return moduleSidebar({ title: "Industry Job Creation Director", module: "job", label: "Industry Jobs", icon: BriefcaseBusiness, reviewer: true });
  if (is("investment monitoring")) return moduleSidebar({ title: "Investment Monitoring Manager", module: "investment", label: "Investment", icon: TrendingUp, reviewer: true });
  if (is("agricultural value chain")) return moduleSidebar({ title: "Agricultural Value Chain Monitoring Manager", module: "all", label: "Agriculture", icon: BarChart3, reviewer: true });
  if (is("manufacturing value chain")) return moduleSidebar({ title: "Manufacturing Value Chain Monitoring Manager", module: "industry", label: "Manufacturing", icon: BarChart3, reviewer: true });
  if (is("job creation monitoring")) return moduleSidebar({ title: "Job Creation Monitoring Manager", module: "job", label: "Job Creation", icon: BarChart3, reviewer: true });
  if (is("monitoring and evaluation", "m and e advisory")) return moduleSidebar({ title: "Monitoring & Evaluation Advisory", module: "all", label: "M&E", icon: BarChart3, reviewer: true });
  return null;
}

function getMappingSidebar(role: string | null | undefined, user?: SidebarUserContext | null): RoleSidebar | null {
  const mappings = (user?.access_mappings ?? []).filter((mapping) => Number(mapping.is_active ?? 1) === 1);
  if (!mappings.length) return null;

  const modules = [...new Set(mappings.map((mapping) => normalizeText(mapping.module) as ModuleKey))];
  const module: ModuleKey = modules.length === 1 ? modules[0] : "all";
  const canWrite = mappings.some((mapping) =>
    [mapping.can_create_annual_plan, mapping.can_divide_monthly_plan, mapping.can_update_achievement].some((value) => Number(value ?? 0) === 1),
  );
  const reviewer = mappings.some((mapping) => Number(mapping.can_comment ?? 0) === 1 || Number(mapping.can_approve ?? 0) === 1);
  const context = contextText(role, user);

  const workflowRole = normalizeRole(role ?? user?.role);
  if (isOcduContext(context)) {
    return ocduMonitoringSidebar(
      user?.display_role || role || user?.role || "OCDU Monitoring",
      ocduScopeFromContext(context),
      context.includes("director") || context.includes("manager"),
    );
  }
  const isTradeContext = module === "trade" || (
    context.includes("trade") &&
    !context.includes("cooperative")
  );
  if (isTradeContext) {
    const isTradeReviewer = reviewer || workflowRole === "director";
    return tradeSidebar(
      user?.display_role || role || user?.role || "Trade Office",
      isTradeReviewer,
    );
  }
  if (workflowRole === "team_leader" || workflowRole === "director") {
    return teamLeaderSidebar(
      user?.display_role || role || user?.role || (workflowRole === "director" ? "Director" : "Team Leader"),
      module,
    );
  }
  if (workflowRole === "expert") {
    return expertSidebar(user?.display_role || role || user?.role || "Expert", module);
  }

  const specialized = titleProfile(context);
  if (specialized) return specialized;

  return moduleSidebar({
    title: user?.display_role || role || "Assigned User",
    module,
    label: module === "all" ? "Assigned" : module[0].toUpperCase() + module.slice(1),
    icon: reviewer ? ClipboardCheck : Users,
    reviewer,
    canWrite,
  });
}

export const defaultSidebar = roleSidebars.super_admin;

export function getSidebarForRole(role?: string | null, user?: SidebarUserContext | null): RoleSidebar {
  const roleKey = normalizeRole(role ?? user?.role);
  if (roleKey === "super_admin") return roleSidebars.super_admin;

  const context = contextText(role, user);
  const phone = normalizePhone(user?.phone);
  const tradeTitle = tradePhoneTitles[phone];
  const isTradeContext = !isOcduContext(context) && (Boolean(tradeTitle) || (
    context.includes("trade") &&
    !context.includes("cooperative")
  ));
  if (isTradeContext) {
    return tradeSidebar(
      tradeTitle || user?.display_role || role || user?.role || "Trade Office",
      roleKey === "director" || Boolean(tradeTitle?.includes("Director")),
    );
  }

  const mappedSidebar = getMappingSidebar(role, user);
  if (mappedSidebar) return mappedSidebar;

  if (isOcduContext(context)) {
    return ocduMonitoringSidebar(
      user?.display_role || role || user?.role || "OCDU Monitoring",
      ocduScopeFromContext(context),
      context.includes("director") || context.includes("manager"),
    );
  }

  const phoneProfile = phoneProfiles[phone];
  if (phoneProfile) {
    const profileRole = normalizeRole(phoneProfile.title);
    if (["team_leader", "director"].includes(profileRole)) {
      return teamLeaderSidebar(phoneProfile.title, phoneProfile.module);
    }
    if (profileRole === "expert") return expertSidebar(phoneProfile.title, phoneProfile.module);
    return moduleSidebar({ ...phoneProfile, icon: phoneProfile.reviewer ? FolderTree : Users });
  }

  const specialized = titleProfile(context);
  return specialized ?? roleSidebars[roleKey];
}

export function filterSidebarByPermissions(roleSidebar: RoleSidebar, permissions: string[] = [], role?: string | null): RoleSidebar {
  const isSuper = normalizeRole(role) === "super_admin";
  const permissionSet = new Set(permissions);
  const hasPermission = (permission?: string) => {
    if (!permission || isSuper) return true;
    if (!permissions.length) return true;
    if (permissionSet.has("*") || permissionSet.has("all") || permissionSet.has(permission)) return true;
    return permissionSet.has(permission.replace(".read", ".view")) || permissionSet.has(permission.replace(".view", ".read"));
  };

  return {
    ...roleSidebar,
    sections: roleSidebar.sections
      .map((section) => ({
        ...section,
        items: section.items
          .filter((item) => !item.superOnly || isSuper)
          .filter((item) => hasPermission(item.permission))
          .map((item) => ({
            ...item,
            children: item.children
              ?.filter((child) => !child.superOnly || isSuper)
              .filter((child) => hasPermission(child.permission)),
          }))
          .filter((item) => !item.children || item.children.length > 0),
      }))
      .filter((section) => section.items.length > 0),
  };
}

export default defaultSidebar;
