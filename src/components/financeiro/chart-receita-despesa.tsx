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

interface ChartData {
  mes: string;
  receita: number;
  despesa: number;
}

interface ChartReceitaDespesaProps {
  data: ChartData[];
  height?: number;
}

const compactCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(v);

export function ChartReceitaDespesa({ data, height = 320 }: ChartReceitaDespesaProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={6}>
        <defs>
          <GradientDef id="grad-receita" color={CHART_COLORS.receita} />
          <GradientDef id="grad-despesa" color={CHART_COLORS.despesa} />
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="mes"
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
          dataKey="receita"
          name="Receita"
          fill="url(#grad-receita)"
          radius={[6, 6, 0, 0]}
          maxBarSize={44}
        />
        <Bar
          dataKey="despesa"
          name="Despesa"
          fill="url(#grad-despesa)"
          radius={[6, 6, 0, 0]}
          maxBarSize={44}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
