"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
  DASHBOARD_NAV_ITEMS,
  NAV_GROUP_ORDER,
  type NavItem,
} from "@/lib/constants";
import { Logo } from "@/components/brand/logo";

function isItemActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const active = isItemActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      data-tour={`nav-${item.href.split("/").pop()}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-white"
          : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-white",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          active ? "text-primary-300" : "text-sidebar-muted group-hover:text-white",
        )}
      />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden bg-sidebar text-sidebar-foreground lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Link href="/dashboard" className="flex items-center">
          <Logo variant="full" surface="dark" height={24} priority />
        </Link>
      </div>

      {/* Navigation agrupada */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUP_ORDER.map((group) => {
          const items = DASHBOARD_NAV_ITEMS.filter((i) => i.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
                {group}
              </p>
              {items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-danger/20 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
