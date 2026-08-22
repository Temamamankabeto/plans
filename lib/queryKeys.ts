export const queryKeys = {
  auth: {
    root: () => ["auth"] as const,
    me: () => ["auth", "me"] as const,
  },
  dashboard: {
    root: () => ["dashboard"] as const,
    byRole: (role?: string) => ["dashboard", role ?? "default"] as const,
    planAchievementSummary: (filters?: unknown) => ["dashboard", "plan-achievement-summary", filters] as const,
  },
  users: {
    root: () => ["users"] as const,
    list: (filters?: unknown) => ["users", "list", filters] as const,
    detail: (id: string | number) => ["users", "detail", id] as const,
  },
  roles: {
    root: () => ["roles"] as const,
    list: (filters?: unknown) => ["roles", "list", filters] as const,
    lite: () => ["roles", "lite"] as const,
    permissions: (id: string | number) => ["roles", "permissions", id] as const,
  },
  permissions: {
    root: () => ["permissions"] as const,
    list: (filters?: unknown) => ["permissions", "list", filters] as const,
    all: (search?: string) => ["permissions", "all", search ?? ""] as const,
    catalog: (search?: string) => ["permissions", "catalog", search ?? ""] as const,
  },
  offices: {
    root: () => ["offices"] as const,
    list: (filters?: unknown) => ["offices", "list", filters] as const,
    lite: () => ["offices", "lite"] as const,
  },
  directorates: {
    root: () => ["directorates"] as const,
    list: (officeId?: string | number) => ["directorates", officeId ?? "all"] as const,
  },
  plans: {
    root: () => ["plans"] as const,
    list: (filters?: unknown) => ["plans", "list", filters] as const,
    detail: (id: string | number) => ["plans", "detail", id] as const,
  },
  achievements: {
    root: () => ["achievements"] as const,
    list: (filters?: unknown) => ["achievements", "list", filters] as const,
    detail: (id: string | number) => ["achievements", "detail", id] as const,
  },
  auditLogs: {
    root: () => ["auditLogs"] as const,
    list: (filters?: unknown) => ["auditLogs", "list", filters] as const,
  },
};

export type QueryKeys = typeof queryKeys;
