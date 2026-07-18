"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIAS_DESPESA_LABELS } from "@/lib/constants";
import {
  CHART_CATEGORICAL,
  ChartTooltip,
} from "@/components/charts/chart-primitives";
import { EmptyState } from "@/components/ui/empty-state";

interface ChartDespesasCategoriaProps {
  data: { categoria: string; valor: number }[];
}

export function ChartDespesasCategoria({
  data,
}: ChartDespesasCategoriaProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        compact
        icon={PieIcon}
        title="Sem despesas no período"
        description="Lance despesas para ver a distribuição por categoria."
      />
    );
  }

  const chartData = data.map((d, i) => ({
    ...d,
    name: CATEGORIAS_DESPESA_LABELS[d.categoria] ?? d.categoria,
    color: CHART_CATEGORICAL[i % CHART_CATEGORICAL.length],
  }));
  const total = chartData.reduce((acc, d) => acc + d.valor, 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative mx-auto h-[220px] w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="valor"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((d, index) => (
                <Cell key={index} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-lg font-bold text-foreground">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Legenda custom */}
      <ul className="flex-1 space-y-2">
        {chartData
          .slice()
          .sort((a, b) => b.valor - a.valor)
          .map((d, i) => {
            const pct = total > 0 ? (d.valor / total) * 100 : 0;
            return (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: d.color }}
                />
                <span className="truncate text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-medium text-foreground">
                  {formatCurrency(d.valor)}
                </span>
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {pct.toFixed(0)}%
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
