"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";

import { LanguageSwitcher } from "@/components/language/language-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getDashboardForRole } from "@/config/dashboard.config";
import SidebarContent from "@/layouts/components/SidebarContent";
import { authService, type AuthUser } from "@/services/auth/auth.service";
import { useUnreadNotificationsQuery } from "@/hooks/notification/use-notifications";
import { useTranslation } from "react-i18next";

function toTranslationKey(value?: string | null) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function translateText(
  t: (key: string, options?: Record<string, unknown>) => string,
  value: string
) {
  const key = toTranslationKey(value);
  return key ? t(key, { defaultValue: value }) : value;
}

export default function DashboardHeader({
  sidebarCollapsed = false,
  onToggleSidebar,
}: {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const unreadNotifications = useUnreadNotificationsQuery();

  useEffect(() => {
    setUser(authService.getStoredUser());
  }, [pathname]);

  const role = authService.getStoredRoles()[0] ?? user?.role ?? "Super Admin";
  const dashboard = getDashboardForRole(role);
  const unreadCount = Number(
    typeof unreadNotifications.data === "number"
      ? unreadNotifications.data
      : unreadNotifications.data?.count ?? 0,
  );

  async function logout() {
    await authService.logout();
    toast.success(t("logged_out", { defaultValue: "Logged out" }));
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label={t("open_sidebar", { defaultValue: "Open sidebar" })}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="hidden md:inline-flex"
          onClick={onToggleSidebar}
          aria-label={
            sidebarCollapsed
              ? t("expand_sidebar", { defaultValue: "Expand sidebar" })
              : t("collapse_sidebar", { defaultValue: "Collapse sidebar" })
          }
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {t("current_workspace", { defaultValue: "Current workspace" })}
          </p>
          <h2 className="truncate text-sm font-semibold md:text-base">
            {translateText(t, dashboard.roleName)}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <LanguageSwitcher />

        <Button
          asChild
          variant="outline"
          size="icon"
          className="relative"
          aria-label={t("notifications", { defaultValue: "Notifications" })}
        >
          <Link href="/dashboard/notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </Button>

        <div className="hidden text-right sm:block">
          <p className="text-xs text-muted-foreground">
            {t("signed_in_as", { defaultValue: "Signed in as" })}
          </p>
          <p className="max-w-40 truncate text-sm font-medium">
            {user?.name ?? user?.email ?? t("user", { defaultValue: "User" })}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("user_menu", { defaultValue: "User menu" })}
            >
              <UserCircle className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="space-y-1">
                <p className="truncate text-sm font-semibold">
                  {user?.name ?? t("user", { defaultValue: "User" })}
                </p>
                <p className="truncate text-xs font-normal text-muted-foreground">
                  {user?.email ?? role}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                {t("profile", { defaultValue: "Profile" })}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout", { defaultValue: "Logout" })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
