"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { filterSidebarByPermissions, getSidebarForRole } from "@/config/sidebar.config";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth/auth.service";

type Props = {
  collapsed?: boolean;
};

function normalizeTranslationKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function translatedLabel(t: (key: string) => string, translationKey: string | undefined, fallback: string) {
  const key = translationKey || normalizeTranslationKey(fallback);
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function getPrimaryRole(user: any) {
  const roles = authService.getStoredRoles();
  return roles[0] ?? user?.role ?? "Expert";
}

function isHrefActive(pathname: string, currentSearch: string, href?: string) {
  if (!href) return false;
  const [cleanHref, expectedSearch = ""] = href.split("?");
  const pathMatches = pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
  if (!pathMatches || !expectedSearch) return pathMatches;

  const current = new URLSearchParams(currentSearch);
  const expected = new URLSearchParams(expectedSearch);
  return [...expected.entries()].every(([key, value]) => current.get(key) === value);
}

const OPEN_MENUS_KEY = "plan-achievement-sidebar-open-menus";

export default function SidebarContent({ collapsed = false }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const { t } = useTranslation();
  const user = authService.getStoredUser();
  const role = getPrimaryRole(user);
  const permissions = authService.getStoredPermissions();

  const roleSidebar = useMemo(() => getSidebarForRole(role, user), [role, user]);
  const filteredSidebar = useMemo(
    () => filterSidebarByPermissions(roleSidebar, permissions, role),
    [permissions, role, roleSidebar],
  );

  const sections = filteredSidebar.sections;
  const RoleIcon = filteredSidebar.icon;
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setOpenMenus(JSON.parse(localStorage.getItem(OPEN_MENUS_KEY) || "{}"));
    } catch {
      setOpenMenus({});
    }
  }, []);

  function toggleMenu(label: string, isOpen: boolean) {
    setOpenMenus((current) => {
      const next = { ...current, [label]: !isOpen };
      localStorage.setItem(OPEN_MENUS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border p-4">
        <div className={cn("flex items-center rounded-2xl bg-sidebar-accent p-3", collapsed ? "justify-center" : "gap-3")}>
          <div className="rounded-xl bg-sidebar-primary p-2 text-sidebar-primary-foreground">
            <RoleIcon className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold">Plan & Achievement</h1>
              <p className="truncate text-xs text-sidebar-foreground/70">{filteredSidebar.title}</p>
            </div>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 space-y-5 overflow-y-auto", collapsed ? "p-2" : "p-4")}>
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            {!collapsed && (
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                {translatedLabel(t, section.translationKey, section.title)}
              </p>
            )}

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isHrefActive(pathname, currentSearch, item.href);
                const hasChildren = Boolean(item.children?.length);
                const childIsActive = Boolean(item.children?.some((child) => isHrefActive(pathname, currentSearch, child.href)));
                const isOpen = openMenus[item.label] ?? childIsActive;
                const label = translatedLabel(t, item.translationKey, item.label);

                if (hasChildren) {
                  return (
                    <div key={item.label} className="space-y-1">
                      <button
                        type="button"
                        title={collapsed ? label : undefined}
                        onClick={() => toggleMenu(item.label, isOpen)}
                        aria-expanded={isOpen}
                        className={cn(
                          "flex w-full items-center rounded-xl text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          collapsed ? "justify-center px-2 py-2" : "gap-2 px-3 py-2",
                          (isOpen || childIsActive) && "bg-sidebar-accent text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                            <ChevronRight className={cn("h-4 w-4 transition", isOpen && "rotate-90")} />
                          </>
                        )}
                      </button>

                      {isOpen && !collapsed && (
                        <div className="ml-6 space-y-1 border-l border-sidebar-border pl-2">
                          {item.children?.map((child) => {
                            const childActive = isHrefActive(pathname, currentSearch, child.href);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  "block rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  childActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                                )}
                              >
                                {translatedLabel(t, child.translationKey, child.label)}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href || item.label}
                    href={item.href || "#"}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "flex items-center rounded-xl text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed ? "justify-center px-2 py-2" : "gap-2 px-3 py-2",
                      active && "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
