"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Percent,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { getRelatorioMargem, type MargemRelatorioRow } from "./actions";
import { SOLO_LABELS } from "@/lib/constants";

type Periodo = "mes" | "3m" | "6m" | "ano" | "todo";
type SortKey =
  | "cliente"
  | "tipo_solo"
  | "profundidade"
  | "receita"
  | "custo"
  | "margem"
  | "margem_percentual"
  | "custo_por_metro";

const PERIODO_OPTIONS: { value: Periodo; label: string }[] = [
  { value: "mes", label: "Este mês" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "ano", label: "Este ano" },
  { value: "todo", label: "Todo o período" },
];

function withinPeriodo(date: string | null, periodo: Periodo): boolean {
  if (!date || periodo === "todo") return true;
  const d = new Date(date);
  const now = new Date();

  if (periodo === "mes") {
    return d >= new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (periodo === "3m") {
    return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
  }
  if (periodo === "6m") {
    return d >= new Date(now.getFullYear(), now.getMonth() - 5, 1);
  }
  if (periodo === "ano") {
    return d >= new Date(now.getFullYear(), 0, 1);
  }

  return true;
}

export default function RelatorioMargemPage() {
  const [rows, setRows] = useState<MargemRelatorioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("todo");
  const [soloFilter, setSoloFilter] = useState<string[]>([]);
  const [apenasPrejuizo, setApenasPrejuizo] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("margem");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getRelatorioMargem();
      if (result.error) {
        toast.error(result.error);
      } else {
        setRows(result.rows);
      }
      setLoading(false);
    }

    load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("apenasPrejuizo") === "1") {
      setApenasPrejuizo(true);
      setPeriodo("todo");
    }
  }, []);

  const tiposSoloDisponiveis = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => r.tipo_solo).filter(Boolean) as string[]),
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const base = rows.filter((row) => {
      if (!withinPeriodo(row.data_conclusao, periodo)) return false;
      if (apenasPrejuizo && row.margem >= 0) return false;
      if (soloFilter.length > 0) {
        return row.tipo_solo ? soloFilter.includes(row.tipo_solo) : false;
      }
      return true;
    });

    const sorted = [...base].sort((a, b) => {
      const factor = sortAsc ? 1 : -1;

      const getValue = (item: MargemRelatorioRow) => {
        switch (sortBy) {
          case "cliente":
            return item.cliente_nome ?? "";
          case "tipo_solo":
            return item.tipo_solo ?? "";
          case "profundidade":
            return item.profundidade ?? 0;
          case "receita":
            return item.receita;
          case "custo":
            return item.custo;
          case "margem":
            return item.margem;
          case "margem_percentual":
            return item.margem_percentual ?? -9999;
          case "custo_por_metro":
            return item.custo_por_metro ?? -9999;
          default:
            return 0;
        }
      };

      const av = getValue(a);
      const bv = getValue(b);

      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * factor;
      }

      return ((av as number) - (bv as number)) * factor;
    });

    return sorted;
  }, [rows, periodo, apenasPrejuizo, soloFilter, sortBy, sortAsc]);

  const resumo = useMemo(() => {
    const receita = filtered.reduce((s, r) => s + r.receita, 0);
    const custo = filtered.reduce((s, r) => s + r.custo, 0);
    const margem = filtered.reduce((s, r) => s + r.margem, 0);
    const margemPct = receita > 0 ? (margem / receita) * 100 : null;
    return { receita, custo, margem, margemPct, qtd: filtered.length };
  }, [filtered]);

  const semCustos = !loading && rows.length > 0 && rows.every((r) => r.custo === 0);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortAsc((v) => !v);
    else {
      setSortBy(key);
      setSortAsc(false);
    }
  }

  function toggleSolo(solo: string) {
    setSoloFilter((prev) =>
      prev.includes(solo) ? prev.filter((s) => s !== solo) : [...prev, solo],
    );
  }

  function SortHeader({
    label,
    field,
    align = "left",
  }: {
    label: string;
    field: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortBy === field;
    return (
      <TableHead className={align === "right" ? "text-right" : undefined}>
        <button
          className={cn(
            "inline-flex items-center gap-1 transition-colors hover:text-foreground",
            active && "text-foreground",
          )}
          onClick={() => toggleSort(field)}
        >
          {label}
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        icon={BarChart3}
        title="Relatório de Margem"
        description="Receita, custo e margem por serviço concluído"
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 sm:p-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-7 w-28" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              title="Serviços"
              value={String(resumo.qtd)}
              icon={BarChart3}
              iconClassName="bg-primary/10 text-primary"
              hint="no período/filtro"
            />
            <KpiCard
              title="Receita"
              value={formatCurrency(resumo.receita)}
              icon={TrendingUp}
              iconClassName="bg-success-50 text-success-600"
            />
            <KpiCard
              title="Custo"
              value={formatCurrency(resumo.custo)}
              icon={TrendingDown}
              iconClassName="bg-danger-50 text-danger"
            />
            <KpiCard
              title="Margem"
              value={formatCurrency(resumo.margem)}
              icon={Percent}
              iconClassName={
                resumo.margem >= 0
                  ? "bg-success-50 text-success-600"
                  : "bg-danger-50 text-danger"
              }
              hint={
                resumo.margemPct == null
                  ? undefined
                  : `${resumo.margemPct.toFixed(1)}% de margem média`
              }
            />
          </>
        )}
      </div>

      {/* Aviso quando não há custos cadastrados */}
      {semCustos && (
        <div className="flex items-start gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" />
          <p className="text-sm text-foreground">
            Nenhum <strong>custo</strong> registrado nos serviços — por isso a
            margem aparece como 100%. Cadastre materiais e custos ao concluir os
            serviços para acompanhar a margem real de cada poço.
          </p>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Período
            </span>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {PERIODO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {tiposSoloDisponiveis.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Solo
              </span>
              {tiposSoloDisponiveis.map((solo) => {
                const active = soloFilter.includes(solo);
                return (
                  <button
                    key={solo}
                    type="button"
                    onClick={() => toggleSolo(solo)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-input bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {SOLO_LABELS[solo] ?? solo}
                  </button>
                );
              })}
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm sm:ml-auto">
            <input
              type="checkbox"
              checked={apenasPrejuizo}
              onChange={(e) => setApenasPrejuizo(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Mostrar só prejuízo
          </label>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={
            rows.length === 0
              ? "Nenhum serviço concluído ainda"
              : "Nenhum resultado para os filtros"
          }
          description={
            rows.length === 0
              ? "Conclua serviços com receita e custos para acompanhar a margem por poço aqui."
              : "Ajuste o período ou os filtros de solo para ver os serviços."
          }
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader label="Serviço / Cliente" field="cliente" />
                      <SortHeader label="Solo" field="tipo_solo" />
                      <TableHead className="text-right">Prof.</TableHead>
                      <SortHeader label="Receita" field="receita" align="right" />
                      <SortHeader label="Custo" field="custo" align="right" />
                      <SortHeader label="Margem" field="margem" align="right" />
                      <SortHeader
                        label="%"
                        field="margem_percentual"
                        align="right"
                      />
                      <TableHead className="text-right">Custo/m</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow key={row.servico_id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/servicos/${row.servico_id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            #{row.servico_id.slice(0, 8).toUpperCase()}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {row.cliente_nome ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.tipo_solo
                            ? (SOLO_LABELS[row.tipo_solo] ?? row.tipo_solo)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.profundidade == null
                            ? "—"
                            : `${row.profundidade}m`}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.receita)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.custo)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold tabular-nums",
                            row.margem >= 0 ? "text-success-600" : "text-danger",
                          )}
                        >
                          {formatCurrency(row.margem)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.margem_percentual == null
                            ? "—"
                            : `${row.margem_percentual.toFixed(1)}%`}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.custo_por_metro == null
                            ? "—"
                            : `${formatCurrency(row.custo_por_metro)}/m`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((row) => (
              <Card key={row.servico_id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/servicos/${row.servico_id}`}
                      className="font-semibold text-primary"
                    >
                      Serviço #{row.servico_id.slice(0, 8).toUpperCase()}
                    </Link>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        row.margem >= 0 ? "text-success-600" : "text-danger",
                      )}
                    >
                      {formatCurrency(row.margem)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.cliente_nome ?? "—"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>
                      Solo:{" "}
                      {row.tipo_solo
                        ? (SOLO_LABELS[row.tipo_solo] ?? row.tipo_solo)
                        : "—"}
                    </span>
                    <span>
                      Prof.:{" "}
                      {row.profundidade == null ? "—" : `${row.profundidade}m`}
                    </span>
                    <span>Receita: {formatCurrency(row.receita)}</span>
                    <span>Custo: {formatCurrency(row.custo)}</span>
                  </div>
                  {row.data_conclusao && (
                    <p className="text-xs text-muted-foreground">
                      Conclusão: {formatDate(row.data_conclusao)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
