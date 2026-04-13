"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIAS_DESPESA_LABELS } from "@/lib/constants";

const COLORS = [
  "#EF4444",
  "#F59E0B",
  "#8B5CF6",
  "#3B82F6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

interface ChartDespesasCategoriaProps {
  data: { categoria: string; valor: number }[];
}

export function ChartDespesasCategoria({ data }: ChartDespesasCategoriaProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-secondary-400 text-center py-8">
        Nenhuma despesa no período selecionado.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: CATEGORIAS_DESPESA_LABELS[d.categoria] ?? d.categoria,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="valor"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius={90}
          label={({ percent }) =>
            (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ""
          }
          labelLine={false}
        >
          {chartData.map((_, index) => (
            <Cell
              key={index}
              fill={COLORS[index % COLORS.length]}
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
        />
        <Legend
          iconType="circle"
          iconSize={10}
          formatter={(value) => (
            <span style={{ fontSize: "12px", color: "#475569" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
