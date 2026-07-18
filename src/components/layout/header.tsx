"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Menu,
  UserCircle,
  ShieldCheck,
  Compass,
  ListChecks,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { usePerfurador } from "@/hooks/use-perfurador";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/brand/logo";
import { PAGE_TITLES } from "@/lib/constants";
import { startTour, showPrimeirosPassos } from "@/lib/onboarding";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { perfurador } = usePerfurador();

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

  function handleRefazerTour() {
    router.push("/dashboard");
    startTour();
  }

  function handlePrimeirosPassos() {
    router.push("/dashboard?guia=1");
    showPrimeirosPassos();
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
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      {/* Left: hamburger + emblema (mobile) + título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo variant="mark" height={28} className="lg:hidden" />
        <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
      </div>

      {/* Right: avatar */}
      <div className="flex items-center gap-2">
        <DropdownMenu
          trigger={
            <button
              data-tour="user-menu"
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight text-foreground">
                  {perfurador?.nome || "Carregando..."}
                </p>
                <p className="text-xs leading-tight text-muted-foreground">
                  {perfurador?.nome_empresa || ""}
                </p>
              </div>
            </button>
          }
        >
          <DropdownMenuItem onClick={() => router.push("/dashboard/perfil")}>
            <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
            Meu Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard/termos")}>
            <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
            Termos e Privacidade
          </DropdownMenuItem>
          <div className="my-1 border-t border-border" />
          <DropdownMenuItem onClick={handlePrimeirosPassos}>
            <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
            Primeiros passos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRefazerTour}>
            <Compass className="mr-2 h-4 w-4 text-muted-foreground" />
            Refazer tour
          </DropdownMenuItem>
          <div className="my-1 border-t border-border" />
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
