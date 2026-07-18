import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  /** Slot à direita do cabeçalho (legenda em pills, seletor de período…). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Chrome consistente para gráficos: card + título + slot de ação. */
export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-4">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && (
            <CardDescription className="mt-1">{description}</CardDescription>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className={cn("pt-2", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

/** Item de legenda (pill) para compor no slot `action` do ChartCard. */
export function ChartLegendPill({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
