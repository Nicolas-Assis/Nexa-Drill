"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_CATEGORICAL,
  CHART_COLORS,
  ChartTooltip,
  GradientDef,
  axisTick,
  gridProps,
} from "@/components/charts/chart-primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

type SeriePonto = { label: string; valor: number };

function hasData(data: SeriePonto[]) {
  return data.some((d) => d.valor > 0);
}

export function AdminBarChart({
  data,
  color = CHART_COLORS.primary,
  height = 260,
  id = "grad-admin-bar",
}: {
  data: SeriePonto[];
  color?: string;
  height?: number;
  id?: string;
}) {
  if (!hasData(data)) {
    return <EmptyState compact icon={BarChart3} title="Sem dados no período" />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <GradientDef id={id} color={color} />
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        <Tooltip content={<ChartTooltip currency={false} />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
        <Bar dataKey="valor" fill={`url(#${id})`} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AdminAreaChart({
  data,
  color = CHART_COLORS.receita,
  height = 260,
  currency = true,
  id = "grad-admin-area",
}: {
  data: SeriePonto[];
  color?: string;
  height?: number;
  currency?: boolean;
  id?: string;
}) {
  if (!hasData(data)) {
    return <EmptyState compact icon={BarChart3} title="Sem dados no período" />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <GradientDef id={id} color={color} />
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={56} />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Area type="monotone" dataKey="valor" stroke={color} strokeWidth={2} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AdminDonut({
  data,
  height = 260,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <EmptyState compact icon={BarChart3} title="Sem assinaturas" />;
  }
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={height} className="max-w-[240px]">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_CATEGORICAL[i % CHART_CATEGORICAL.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip currency={false} />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="w-full space-y-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CHART_CATEGORICAL[i % CHART_CATEGORICAL.length] }}
            />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-semibold text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
