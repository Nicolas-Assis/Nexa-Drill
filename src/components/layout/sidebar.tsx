"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  DollarSign,
  UserCircle,
  LogOut,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { DASHBOARD_NAV_ITEMS } from "@/lib/constants";

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/clientes": Users,
  "/dashboard/orcamentos": FileText,
  "/dashboard/servicos": Wrench,
  "/dashboard/financeiro": DollarSign,
  "/dashboard/perfil": UserCircle,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-secondary-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-secondary-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-secondary-900">NexaDrill</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.href] || LayoutDashboard;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-secondary-500 hover:bg-secondary-50 hover:text-secondary-900",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-primary" : "text-secondary-400",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-secondary-200 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-500 hover:bg-danger-50 hover:text-danger transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
