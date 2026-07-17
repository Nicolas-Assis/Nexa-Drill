"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CATEGORIAS_DESPESA,
  CATEGORIAS_DESPESA_LABELS,
  MARGEM_BADGE_COLORS,
  MARGEM_THRESHOLD,
} from "@/lib/constants";
import {
  addDespesaServico,
  getMargemServico,
  vincularDespesaServico,
} from "@/app/dashboard/servicos/actions-margem";
import type { Financeiro, MargemServico } from "@/types";

type MargemCardProps = {
  servicoId: string;
  profundidadeReal: number | null;
};

type QuickDespesaForm = {
  valor: number;
  categoria: string;
  descricao: string;
  data: string;
};

function getMarginStatus(margemPercentual: number | null) {
  if (margemPercentual === null) return "yellow" as const;
  if (margemPercentual >= MARGEM_THRESHOLD.green) return "green" as const;
  if (margemPercentual >= MARGEM_THRESHOLD.yellow) return "yellow" as const;
  return "red" as const;
}

export function MargemCard({ servicoId, profundidadeReal }: MargemCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [margem, setMargem] = useState<MargemServico | null>(null);
  const [despesas, setDespesas] = useState<Financeiro[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const [quickForm, setQuickForm] = useState<QuickDespesaForm>({
    valor: 0,
    categoria: CATEGORIAS_DESPESA[0],
    descricao: "",
    data: new Date().toISOString().slice(0, 10),
  });

  const fetchMargem = useCallback(async () => {
    setLoading(true);
    const result = await getMargemServico(servicoId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setMargem(result.margem);
      setDespesas(result.despesas);
    }
    setLoading(false);
  }, [servicoId]);

  useEffect(() => {
    fetchMargem();
  }, [fetchMargem]);

  const marginStatus = useMemo(
    () => getMarginStatus(margem?.margem_percentual ?? null),
    [margem?.margem_percentual],
  );

  const marginDotColor = MARGEM_BADGE_COLORS[marginStatus];

  async function handleQuickAdd() {
    setSaving(true);
    const result = await addDespesaServico({
      servicoId,
      valor: quickForm.valor,
      categoria: quickForm.categoria,
      descricao: quickForm.descricao || undefined,
      data: quickForm.data,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Despesa lançada com sucesso");
    setShowQuickAdd(false);
    setQuickForm({
      valor: 0,
      categoria: CATEGORIAS_DESPESA[0],
      descricao: "",
      data: new Date().toISOString().slice(0, 10),
    });
    await fetchMargem();
  }

  async function handleDesvincular(financeiroId: string) {
    const result = await vincularDespesaServico(financeiroId, null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Despesa desvinculada do serviço");
    await fetchMargem();
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!margem) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resultado do Poço</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-secondary-500">
            Não foi possível carregar os dados de margem.
          </p>
        </CardContent>
      </Card>
    );
  }

  const receita = margem.receita ?? 0;
  const custo = margem.custo ?? 0;
  const margemValor = margem.margem ?? 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Resultado do Poço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary-500">Receita</span>
            <span className="font-semibold text-secondary-900">
              {formatCurrency(receita)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary-500">Custo</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-secondary-900">
                {formatCurrency(custo)}
              </span>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                ver detalhe
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="border-t border-secondary-200 pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary-500">MARGEM</p>
              <p className="text-xl font-bold text-secondary-900">
                {formatCurrency(margemValor)}
                <span className="ml-2 text-base font-semibold text-secondary-600">
                  {margem.margem_percentual == null
                    ? "—"
                    : `${margem.margem_percentual.toFixed(2)}%`}
                </span>
              </p>
            </div>
            <span className={`h-3 w-3 rounded-full ${marginDotColor}`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-secondary-200 p-3">
              <p className="text-xs text-secondary-500">Custo por metro</p>
              <p className="font-semibold text-secondary-900">
                {margem.custo_por_metro == null
                  ? "—"
                  : `${formatCurrency(margem.custo_por_metro)}/m`}
              </p>
              <p className="text-xs text-secondary-500 mt-1">
                em {profundidadeReal ?? margem.profundidade ?? 0}m
              </p>
            </div>
            <div className="rounded-lg border border-secondary-200 p-3">
              <p className="text-xs text-secondary-500">Margem por metro</p>
              <p className="font-semibold text-secondary-900">
                {margem.margem_por_metro == null
                  ? "—"
                  : `${formatCurrency(margem.margem_por_metro)}/m`}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowQuickAdd(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />+ Lançar despesa deste poço
          </Button>

          {expanded && (
            <div className="border-t border-secondary-200 pt-4 transition-all">
              {despesas.length === 0 ? (
                <p className="text-sm text-secondary-500">
                  Sem custos registrados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-secondary-500 border-b border-secondary-200">
                        <th className="py-2 pr-2">Data</th>
                        <th className="py-2 pr-2">Categoria</th>
                        <th className="py-2 pr-2">Descrição</th>
                        <th className="py-2 pr-2 text-right">Valor</th>
                        <th className="py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {despesas.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-secondary-100"
                        >
                          <td className="py-2 pr-2">{formatDate(item.data)}</td>
                          <td className="py-2 pr-2">
                            {CATEGORIAS_DESPESA_LABELS[item.categoria ?? ""] ??
                              item.categoria ??
                              "—"}
                          </td>
                          <td className="py-2 pr-2 max-w-[200px] truncate">
                            {item.descricao ?? "—"}
                          </td>
                          <td className="py-2 pr-2 text-right font-medium text-danger">
                            {formatCurrency(item.valor)}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-secondary-500 hover:text-danger"
                              onClick={() => handleDesvincular(item.id)}
                            >
                              <Unlink className="h-3.5 w-3.5" />
                              Desvincular
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Lançar despesa do poço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            label="Valor"
            type="number"
            min="0.01"
            step="0.01"
            value={quickForm.valor}
            onChange={(e) =>
              setQuickForm((prev) => ({
                ...prev,
                valor: Number(e.target.value),
              }))
            }
          />

          <Select
            label="Categoria"
            value={quickForm.categoria}
            onChange={(e) =>
              setQuickForm((prev) => ({ ...prev, categoria: e.target.value }))
            }
            options={CATEGORIAS_DESPESA.map((categoria) => ({
              value: categoria,
              label: CATEGORIAS_DESPESA_LABELS[categoria] ?? categoria,
            }))}
          />

          <Input
            label="Descrição (opcional)"
            value={quickForm.descricao}
            onChange={(e) =>
              setQuickForm((prev) => ({ ...prev, descricao: e.target.value }))
            }
          />

          <Input
            label="Data"
            type="date"
            value={quickForm.data}
            onChange={(e) =>
              setQuickForm((prev) => ({ ...prev, data: e.target.value }))
            }
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowQuickAdd(false)}>
            Cancelar
          </Button>
          <Button onClick={handleQuickAdd} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </Dialog>
    </>
  );
}
