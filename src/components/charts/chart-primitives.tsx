"use client";

import { formatCurrency } from "@/lib/utils";

/** Cores de gráfico alinhadas à paleta de marca (navy/azul). */
export const CHART_COLORS = {
  primary: "#2563EB",
  primaryLight: "#60A5FA",
  receita: "#10B981",
  despesa: "#EF4444",
  grid: "#E2E8F0",
  axis: "#94A3B8",
  axisLabel: "#64748B",
};

/** Escala categórica (pizza/donut) — azul-forward, coesa com a marca. */
export const CHART_CATEGORICAL = [
  "#2563EB",
  "#0EA5E9",
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#F43F5E",
  "#14B8A6",
];

export const axisTick = { fontSize: 12, fill: CHART_COLORS.axisLabel } as const;

export const gridProps = {
  strokeDasharray: "4 4",
  stroke: CHART_COLORS.grid,
  vertical: false,
} as const;

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: { fill?: string };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Formata os valores como moeda BRL (padrão). */
  currency?: boolean;
}

/** Tooltip customizado, look "dashboard pro". */
export function ChartTooltip({
  active,
  payload,
  label,
  currency = true,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-[140px] rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
      {label != null && label !== "" && (
        <p className="mb-1.5 text-xs font-semibold text-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: entry.color ?? entry.payload?.fill ?? CHART_COLORS.primary }}
            />
            {entry.name && (
              <span className="text-muted-foreground">{entry.name}</span>
            )}
            <span className="ml-auto font-semibold text-foreground">
              {currency ? formatCurrency(Number(entry.value)) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Define um gradiente vertical (topo opaco → base transparente) para fills. */
export function GradientDef({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.95} />
      <stop offset="100%" stopColor={color} stopOpacity={0.2} />
    </linearGradient>
  );
}
