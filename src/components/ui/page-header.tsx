import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Conteúdo alinhado à direita (botões de ação, filtros). */
  actions?: ReactNode;
  /** Ícone opcional exibido num chip à esquerda do título. */
  icon?: LucideIcon;
  /** Pequeno rótulo acima do título (breadcrumb/seção). */
  eyebrow?: string;
  className?: string;
}

/**
 * Cabeçalho de página padronizado — substitui os blocos ad-hoc
 * `<div><h1/><p/></div>` repetidos em todas as telas do dashboard.
 */
export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
