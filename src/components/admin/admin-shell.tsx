"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X, ArrowLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_NAV_GROUP_ORDER,
  ADMIN_PAGE_TITLES,
  type AdminNavItem,
} from "@/lib/constants";
import { Logo } from "@/components/brand/logo";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function pageTitle(pathname: string): string {
  if (ADMIN_PAGE_TITLES[pathname]) return ADMIN_PAGE_TITLES[pathname];
  if (/^\/admin\/usuarios\/[^/]+$/.test(pathname)) return "Detalhes do Usuário";
  return "Admin";
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {ADMIN_NAV_GROUP_ORDER.map((group) => {
        const items = ADMIN_NAV_ITEMS.filter((i: AdminNavItem) => i.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
              {group}
            </p>
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
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
            })}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const router = useRouter();
  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }
  return (
    <div className="space-y-1 border-t border-sidebar-border p-3">
      <Link
        href="/dashboard"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
        Voltar ao app
      </Link>
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-danger/20 hover:text-white"
      >
        <LogOut className="h-5 w-5" />
        Sair
      </button>
    </div>
  );
}

export function AdminShell({
  adminName,
  adminEmail,
  children,
}: {
  adminName: string;
  adminEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const initials = adminName
    ? adminName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "A";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden bg-sidebar text-sidebar-foreground lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sidebar-border">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Logo variant="full" surface="dark" height={24} priority />
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-300">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </span>
        </div>
        <NavItems />
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex items-center gap-2">
            <Logo variant="full" surface="dark" height={22} />
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-300">
              Admin
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavItems onNavigate={() => setMobileOpen(false)} />
        <SidebarFooter />
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">
              {pageTitle(pathname)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-foreground">
                {adminName}
              </p>
              <p className="text-xs leading-tight text-muted-foreground">
                {adminEmail}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
