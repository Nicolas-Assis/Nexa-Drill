"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
  DASHBOARD_NAV_ITEMS,
  NAV_GROUP_ORDER,
  type NavItem,
} from "@/lib/constants";
import { Logo } from "@/components/brand/logo";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

function isItemActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleLogout() {
    onClose();
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <Logo variant="full" surface="dark" height={22} />
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav agrupada */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUP_ORDER.map((group) => {
            const items = DASHBOARD_NAV_ITEMS.filter(
              (i: NavItem) => i.group === group,
            );
            if (items.length === 0) return null;
            return (
              <div key={group} className="space-y-1">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
                  {group}
                </p>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
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
                          "h-5 w-5 shrink-0",
                          active
                            ? "text-primary-300"
                            : "text-sidebar-muted group-hover:text-white",
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
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
      </div>
    </>
  );
}
