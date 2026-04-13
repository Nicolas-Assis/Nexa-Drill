"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Pencil,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartReceitaDespesa } from "@/components/financeiro/chart-receita-despesa";
import { ChartDespesasCategoria } from "@/components/financeiro/chart-despesas-categoria";
import { LancamentoForm } from "@/components/financeiro/lancamento-form";
import { LancamentoFormData } from "@/lib/validations";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  CATEGORIAS_DESPESA_LABELS,
  CATEGORIAS_RECEITA_LABELS,
} from "@/lib/constants";
import {
  getLancamentos,
  createLancamento,
  updateLancamento,
  deleteLancamento,
  getResumoFinanceiro,
  getServicosForSelect,
  type Periodo,
  type ResumoFinanceiro,
} from "./actions";
import type { Financeiro } from "@/types";

const PERIODO_OPTIONS: { value: Periodo; label: string }[] = [
  { value: "mes_atual", label: "Mês atual" },
  { value: "3_meses", label: "Últimos 3 meses" },
  { value: "6_meses", label: "Últimos 6 meses" },
  { value: "ano_atual", label: "Este ano" },
  { value: "tudo", label: "Todo o período" },
];

type ModalState =
  | { type: "none" }
  | { type: "receita" }
  | { type: "despesa" }
  | { type: "edit"; lancamento: Financeiro };

function getCategoriaLabel(tipo: string, categoria: string | null): string {
  if (!categoria) return "—";
  const map =
    tipo === "receita" ? CATEGORIAS_RECEITA_LABELS : CATEGORIAS_DESPESA_LABELS;
  return map[categoria] ?? categoria;
}

export default function FinanceiroPage() {
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const [lancamentos, setLancamentos] = useState<Financeiro[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro>({
    totalReceita: 0,
    totalDespesa: 0,
    lucroLiquido: 0,
    ticketMedio: 0,
    porMes: [],
    porCategoriaDespesa: [],
    error: null,
  });
  const [servicos, setServicos] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [lancRes, resumoRes, servicosRes] = await Promise.all([
      getLancamentos(periodo),
      getResumoFinanceiro(periodo),
      getServicosForSelect(),
    ]);

    if (lancRes.error) toast.error(lancRes.error);
    else setLancamentos(lancRes.lancamentos);

    if (!resumoRes.error) setResumo(resumoRes);
    if (!servicosRes.error) setServicos(servicosRes.servicos);

    setPage(1);
    setLoading(false);
  }, [periodo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(data: LancamentoFormData) {
    setSubmitting(true);
    let result: { error: string | null };

    if (modal.type === "edit") {
      result = await updateLancamento(modal.lancamento.id, data);
    } else {
      const r = await createLancamento(data);
      result = { error: r.error };
    }

    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      modal.type === "edit"
        ? "Lançamento atualizado!"
        : "Lançamento criado com sucesso!",
    );
    setModal({ type: "none" });
    fetchData();
  }

  function confirmDelete(id: string) {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteLancamento(id);
    setDeletingId(null);
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Lançamento excluído.");
    fetchData();
  }

  const totalPages = Math.max(1, Math.ceil(lancamentos.length / PER_PAGE));
  const paginated = lancamentos.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const modalTipoLocked =
    modal.type === "receita"
      ? "receita"
      : modal.type === "despesa"
        ? "despesa"
        : undefined;

  const modalDefaultValues =
    modal.type === "edit"
      ? {
          tipo: modal.lancamento.tipo,
          categoria: modal.lancamento.categoria ?? "",
          descricao: modal.lancamento.descricao ?? "",
          valor: modal.lancamento.valor,
          data: modal.lancamento.data,
          servico_id: modal.lancamento.servico_id ?? undefined,
        }
      : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Financeiro</h1>
          <p className="text-secondary-500">
            Acompanhe suas receitas e despesas
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label="Período"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
            className="h-9 rounded-lg border border-secondary-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {PERIODO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModal({ type: "receita" })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Receita
          </Button>
          <Button size="sm" onClick={() => setModal({ type: "despesa" })}>
            <Plus className="h-4 w-4 mr-1" />
            Despesa
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500">Receita Total</p>
                <p className="text-2xl font-bold text-success mt-1">
                  {loading ? "—" : formatCurrency(resumo.totalReceita)}
                </p>
              </div>
              <div className="rounded-lg p-3 bg-success-50 text-success">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500">Despesas Total</p>
                <p className="text-2xl font-bold text-danger mt-1">
                  {loading ? "—" : formatCurrency(resumo.totalDespesa)}
                </p>
              </div>
              <div className="rounded-lg p-3 bg-danger-50 text-danger">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500">Lucro Líquido</p>
                <p
                  className={cn(
                    "text-2xl font-bold mt-1",
                    loading
                      ? "text-secondary-400"
                      : resumo.lucroLiquido >= 0
                        ? "text-primary"
                        : "text-danger",
                  )}
                >
                  {loading ? "—" : formatCurrency(resumo.lucroLiquido)}
                </p>
              </div>
              <div className="rounded-lg p-3 bg-primary-50 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500">Ticket Médio</p>
                <p className="text-2xl font-bold text-accent mt-1">
                  {loading ? "—" : formatCurrency(resumo.ticketMedio)}
                </p>
              </div>
              <div className="rounded-lg p-3 bg-accent-50 text-accent">
                <Target className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita vs Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && resumo.porMes.length > 0 ? (
              <ChartReceitaDespesa data={resumo.porMes} />
            ) : (
              <p className="text-sm text-secondary-400 text-center py-12">
                {loading
                  ? "Carregando..."
                  : "Nenhum dado no período selecionado."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-secondary-400 text-center py-12">
                Carregando...
              </p>
            ) : (
              <ChartDespesasCategoria data={resumo.porCategoriaDespesa} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions — Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Lançamentos
                {!loading && (
                  <span className="ml-2 text-sm font-normal text-secondary-400">
                    ({lancamentos.length})
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-secondary-100 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-secondary-400"
                    >
                      Nenhum lançamento encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm text-secondary-600">
                        {formatDate(l.data)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={l.tipo === "receita" ? "success" : "danger"}
                        >
                          {l.tipo === "receita" ? "Receita" : "Despesa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-secondary-600">
                        {getCategoriaLabel(l.tipo, l.categoria)}
                      </TableCell>
                      <TableCell className="text-sm text-secondary-900 max-w-xs truncate">
                        {l.descricao ?? "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium text-sm",
                          l.tipo === "receita" ? "text-success" : "text-danger",
                        )}
                      >
                        {l.tipo === "despesa" ? "− " : "+ "}
                        {formatCurrency(l.valor)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ type: "edit", lancamento: l })
                            }
                            className="p-1.5 rounded text-secondary-400 hover:text-primary hover:bg-primary-50 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDelete(l.id)}
                            disabled={deletingId === l.id}
                            className="p-1.5 rounded text-secondary-400 hover:text-danger hover:bg-danger-50 transition-colors disabled:opacity-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-100">
                <p className="text-sm text-secondary-500">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions — Mobile Cards */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-secondary-700">
            Lançamentos
            {!loading && (
              <span className="ml-1 text-secondary-400 font-normal">
                ({lancamentos.length})
              </span>
            )}
          </h3>
        </div>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-4 bg-secondary-100 rounded animate-pulse mb-2 w-3/4" />
                <div className="h-3 bg-secondary-100 rounded animate-pulse w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : paginated.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-secondary-400 text-sm">
              Nenhum lançamento encontrado para o período selecionado.
            </CardContent>
          </Card>
        ) : (
          paginated.map((l) => (
            <Card key={l.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-secondary-900 text-sm truncate">
                      {l.descricao ?? getCategoriaLabel(l.tipo, l.categoria)}
                    </p>
                    <p className="text-xs text-secondary-500 mt-0.5">
                      {formatDate(l.data)} ·{" "}
                      {getCategoriaLabel(l.tipo, l.categoria)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={cn(
                        "font-semibold text-sm",
                        l.tipo === "receita" ? "text-success" : "text-danger",
                      )}
                    >
                      {l.tipo === "despesa" ? "− " : "+ "}
                      {formatCurrency(l.valor)}
                    </p>
                    <Badge
                      variant={l.tipo === "receita" ? "success" : "danger"}
                      className="mt-1"
                    >
                      {l.tipo === "receita" ? "Receita" : "Despesa"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-secondary-100">
                  <button
                    type="button"
                    onClick={() => setModal({ type: "edit", lancamento: l })}
                    className="p-2 rounded text-secondary-400 hover:text-primary hover:bg-primary-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(l.id)}
                    disabled={deletingId === l.id}
                    className="p-2 rounded text-secondary-400 hover:text-danger hover:bg-danger-50 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-secondary-500">
              {page}/{totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog
        open={modal.type !== "none"}
        onClose={() => setModal({ type: "none" })}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>
            {modal.type === "edit"
              ? "Editar Lançamento"
              : modal.type === "receita"
                ? "Nova Receita"
                : "Nova Despesa"}
          </DialogTitle>
        </DialogHeader>
        {modal.type !== "none" && (
          <LancamentoForm
            key={modal.type === "edit" ? modal.lancamento.id : modal.type}
            onSubmit={handleSubmit}
            loading={submitting}
            tipoLocked={modalTipoLocked}
            defaultValues={modalDefaultValues}
            servicos={servicos}
          />
        )}
      </Dialog>

      {/* Confirmação de Exclusão */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTargetId(null);
        }}
        className="max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <Trash2 className="h-5 w-5" />
            Excluir Lançamento
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-600 mt-2 mb-6">
          Tem certeza que deseja excluir este lançamento? Esta ação não pode ser
          desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteTargetId(null);
            }}
            disabled={!!deletingId}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
            disabled={!!deletingId}
          >
            {deletingId ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
