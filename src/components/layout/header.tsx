"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { usePerfurador } from "@/hooks/use-perfurador";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PAGE_TITLES } from "@/lib/constants";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { perfurador } = usePerfurador();

  // Dynamic page title resolution - check exact match first, then check for dynamic route patterns
  const pageTitle =
    PAGE_TITLES[pathname] ||
    (pathname.match(/^\/dashboard\/orcamentos\/[^/]+$/)
      ? "Detalhes do Orçamento"
      : null) ||
    (pathname.match(/^\/dashboard\/clientes\/[^/]+$/)
      ? "Detalhes do Cliente"
      : null) ||
    (pathname.match(/^\/dashboard\/servicos\/[^/]+$/)
      ? "Detalhes do Serviço"
      : null) ||
    "NexaDrill";

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  const initials = perfurador?.nome
    ? perfurador.nome
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="flex h-16 items-center justify-between border-b border-secondary-200 bg-white px-4 lg:px-6">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-secondary-500 hover:bg-secondary-50 hover:text-secondary-900 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-secondary-900">
          {pageTitle}
        </h1>
      </div>

      {/* Right: avatar */}
      <div className="flex items-center gap-2">
        <DropdownMenu
          trigger={
            <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-secondary-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-secondary-900 leading-tight">
                  {perfurador?.nome || "Carregando..."}
                </p>
                <p className="text-xs text-secondary-400 leading-tight">
                  {perfurador?.nome_empresa || ""}
                </p>
              </div>
            </button>
          }
        >
          <DropdownMenuItem onClick={() => router.push("/dashboard/perfil")}>
            <UserCircle className="mr-2 h-4 w-4 text-secondary-400" />
            Meu Perfil
          </DropdownMenuItem>
          <div className="my-1 border-t border-secondary-100" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-danger hover:bg-danger-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </header>
  );
}
