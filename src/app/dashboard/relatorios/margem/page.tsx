"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
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
  const [periodo, setPeriodo] = useState<Periodo>("mes");
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

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortAsc((v) => !v);
    else {
      setSortBy(key);
      setSortAsc(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">
          Relatório de Margem
        </h1>
        <p className="text-secondary-500">
          Margem por poço com filtros e ordenação
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className="h-10 rounded-lg border border-secondary-300 bg-white px-3 text-sm"
            >
              <option value="mes">Mês</option>
              <option value="3m">3 meses</option>
              <option value="6m">6 meses</option>
              <option value="ano">Ano</option>
              <option value="todo">Todo</option>
            </select>

            <select
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(
                  (o) => o.value,
                );
                setSoloFilter(selected);
              }}
              multiple
              className="h-24 rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm"
            >
              {tiposSoloDisponiveis.map((solo) => (
                <option key={solo} value={solo}>
                  {SOLO_LABELS[solo] ?? solo}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 rounded-lg border border-secondary-300 px-3 h-10 text-sm">
              <input
                type="checkbox"
                checked={apenasPrejuizo}
                onChange={(e) => setApenasPrejuizo(e.target.checked)}
              />
              Mostrar só prejuízo
            </label>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort("cliente")}
                        >
                          Serviço / Cliente{" "}
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort("tipo_solo")}
                        >
                          Solo <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>Prof.</TableHead>
                      <TableHead>Receita</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort("margem")}
                        >
                          Margem <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Custo/m</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow key={row.servico_id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/servicos/${row.servico_id}`}
                            className="text-primary hover:underline"
                          >
                            #{row.servico_id.slice(0, 8).toUpperCase()}
                          </Link>
                          <div className="text-xs text-secondary-500">
                            {row.cliente_nome ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.tipo_solo
                            ? (SOLO_LABELS[row.tipo_solo] ?? row.tipo_solo)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {row.profundidade == null
                            ? "—"
                            : `${row.profundidade}m`}
                        </TableCell>
                        <TableCell>{formatCurrency(row.receita)}</TableCell>
                        <TableCell>{formatCurrency(row.custo)}</TableCell>
                        <TableCell
                          className={
                            row.margem >= 0
                              ? "text-success font-semibold"
                              : "text-danger font-semibold"
                          }
                        >
                          {formatCurrency(row.margem)}
                        </TableCell>
                        <TableCell>
                          {row.margem_percentual == null
                            ? "—"
                            : `${row.margem_percentual.toFixed(2)}%`}
                        </TableCell>
                        <TableCell>
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

          <div className="md:hidden space-y-3">
            {filtered.map((row) => (
              <Card key={row.servico_id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/servicos/${row.servico_id}`}
                      className="font-semibold text-primary"
                    >
                      Serviço #{row.servico_id.slice(0, 8).toUpperCase()}
                    </Link>
                    <span
                      className={
                        row.margem >= 0
                          ? "text-success font-semibold"
                          : "text-danger font-semibold"
                      }
                    >
                      {formatCurrency(row.margem)}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-600">
                    {row.cliente_nome ?? "—"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-secondary-500">
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
                    <p className="text-xs text-secondary-400">
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
