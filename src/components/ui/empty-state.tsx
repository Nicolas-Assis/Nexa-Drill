import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Botão(ões) de ação — normalmente um <Button>. */
  action?: ReactNode;
  className?: string;
  /** Compacto (para dentro de cards/gráficos vazios). */
  compact?: boolean;
}

/**
 * Estado vazio padronizado — usado em listas, tabelas e gráficos sem dados.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card text-center",
        compact ? "px-4 py-10" : "px-6 py-16",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
            compact ? "h-12 w-12" : "h-16 w-16",
          )}
        >
          <Icon className={compact ? "h-6 w-6" : "h-8 w-8"} />
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
