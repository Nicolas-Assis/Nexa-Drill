import { ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  title: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Classes de cor do chip do ícone (ex.: "bg-primary/10 text-primary"). */
  iconClassName?: string;
  /** Texto auxiliar pequeno abaixo do valor. */
  hint?: string;
  /** Torna o card clicável. */
  href?: string;
  /** Variação vs. período anterior. */
  delta?: { value: number; label?: string } | null;
  className?: string;
}

/**
 * Card de indicador (KPI) unificado — usado no Dashboard, Contas a Receber,
 * Financeiro e resumos de Serviços.
 */
export function KpiCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  hint,
  href,
  delta,
  className,
}: KpiCardProps) {
  const positive = (delta?.value ?? 0) >= 0;

  const inner = (
    <Card
      className={cn(
        "h-full",
        href && "cursor-pointer transition-shadow hover:shadow-md",
        className,
      )}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1.5 truncate text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {delta && (
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
                  positive ? "text-success-600" : "text-danger",
                )}
              >
                {positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {positive ? "+" : ""}
                {delta.value}%
                {delta.label && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    {delta.label}
                  </span>
                )}
              </p>
            )}
            {!delta && hint && (
              <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                iconClassName ?? "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
