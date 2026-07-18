"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CHART_COLORS,
  ChartTooltip,
  GradientDef,
  axisTick,
  gridProps,
} from "@/components/charts/chart-primitives";

interface ChartRecebimentosProps {
  data: { label: string; valor: number }[];
  height?: number;
}

const compactCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(v);

/** Barras de recebimentos previstos (série única) — substitui a barra CSS. */
export function ChartRecebimentos({ data, height = 280 }: ChartRecebimentosProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <GradientDef id="grad-recebimentos" color={CHART_COLORS.primary} />
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: CHART_COLORS.grid }}
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => compactCurrency(Number(v))}
        />
        <Tooltip
          cursor={{ fill: "rgba(37,99,235,0.06)" }}
          content={<ChartTooltip />}
        />
        <Bar
          dataKey="valor"
          name="A receber"
          fill="url(#grad-recebimentos)"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
