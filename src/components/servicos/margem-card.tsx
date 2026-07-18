"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Unlink,
  QrCode,
  CheckCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  CATEGORIAS_DESPESA,
  CATEGORIAS_DESPESA_LABELS,
  MARGEM_BADGE_COLORS,
  MARGEM_THRESHOLD,
  SITUACAO_PARCELA_LABELS,
} from "@/lib/constants";
import {
  addDespesaServico,
  getMargemServico,
  vincularDespesaServico,
} from "@/app/dashboard/servicos/actions-margem";
import {
  getParcelasFiltradas,
  criarParcelas,
  type ParcelaComCliente,
} from "@/app/dashboard/servicos/actions-parcelas";
import {
  BaixarModal,
  CobrarModal,
  EditarParcelaModal,
  CancelarParcelaModal,
} from "@/components/parcelas/parcela-modais";
import type { Financeiro, MargemServico, SituacaoParcela } from "@/types";

type MargemCardProps = {
  servicoId: string;
  profundidadeReal: number | null;
};

type QuickDespesaForm = {
  valor: number | "";
  categoria: string;
  descricao: string;
  data: string;
};

type ParcelaModalState =
  | { type: "none" }
  | {
      type: "baixar" | "cobrar" | "editar" | "cancelar";
      parcela: ParcelaComCliente;
    };

const SITUACAO_BADGE: Record<
  SituacaoParcela,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  a_vencer: "info",
  vence_hoje: "warning",
  atrasada: "danger",
  pago: "success",
  cancelado: "default",
};

function getMarginStatus(margemPercentual: number | null) {
  if (margemPercentual === null) return "yellow" as const;
  if (margemPercentual >= MARGEM_THRESHOLD.green) return "green" as const;
  if (margemPercentual >= MARGEM_THRESHOLD.yellow) return "yellow" as const;
  return "red" as const;
}

function addDaysISO(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function MargemCard({ servicoId, profundidadeReal }: MargemCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [margem, setMargem] = useState<MargemServico | null>(null);
  const [despesas, setDespesas] = useState<Financeiro[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaComCliente[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [visaoMargem, setVisaoMargem] = useState<"previsto" | "recebido">(
    "previsto",
  );
  const [parcelaModal, setParcelaModal] = useState<ParcelaModalState>({
    type: "none",
  });
  const [showAddParcela, setShowAddParcela] = useState(false);
  const [addForm, setAddForm] = useState({
    descricao: "",
    valor: "" as number | "",
    vencimento: addDaysISO(30),
  });

  const [quickForm, setQuickForm] = useState<QuickDespesaForm>({
    valor: "",
    categoria: CATEGORIAS_DESPESA[0],
    descricao: "",
    data: new Date().toISOString().slice(0, 10),
  });

  const fetchMargem = useCallback(async () => {
    setLoading(true);
    const [margemRes, parcelasRes] = await Promise.all([
      getMargemServico(servicoId),
      getParcelasFiltradas({ servicoId }),
    ]);
    if (margemRes.error) {
      toast.error(margemRes.error);
    } else {
      setMargem(margemRes.margem);
      setDespesas(margemRes.despesas);
    }
    if (!parcelasRes.error) setParcelas(parcelasRes.parcelas);
    setLoading(false);
  }, [servicoId]);

  useEffect(() => {
    fetchMargem();
  }, [fetchMargem]);

  const recebido = margem?.receita_recebida ?? 0;
  const previsto = margem?.receita_prevista ?? 0;
  const aReceber = Math.max(0, previsto - recebido);
  const pctRecebido =
    previsto > 0 ? Math.min(100, (recebido / previsto) * 100) : 0;

  const margemMostrada =
    visaoMargem === "previsto"
      ? (margem?.margem_prevista ?? 0)
      : (margem?.margem_recebida ?? 0);
  const baseReceita = visaoMargem === "previsto" ? previsto : recebido;
  const pctMargem =
    baseReceita > 0 ? (margemMostrada / baseReceita) * 100 : null;

  const marginStatus = useMemo(() => getMarginStatus(pctMargem), [pctMargem]);
  const marginDotColor = MARGEM_BADGE_COLORS[marginStatus];

  const previsaoUltima = useMemo(() => {
    const pend = parcelas.filter(
      (p) => p.status !== "pago" && p.status !== "cancelado",
    );
    if (pend.length === 0) return null;
    return pend
      .map((p) => p.vencimento)
      .sort()
      .at(-1) as string;
  }, [parcelas]);

  async function handleQuickAdd() {
    setSaving(true);
    const result = await addDespesaServico({
      servicoId,
      valor: Number(quickForm.valor) || 0,
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
      valor: "",
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

  async function handleAddParcela() {
    setSaving(true);
    const result = await criarParcelas(servicoId, [
      {
        descricao: addForm.descricao || "Parcela avulsa",
        valor: Number(addForm.valor) || 0,
        vencimento: addForm.vencimento,
      },
    ]);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Parcela adicionada");
    setShowAddParcela(false);
    setAddForm({ descricao: "", valor: "", vencimento: addDaysISO(30) });
    await fetchMargem();
  }

  function closeParcelaModal() {
    setParcelaModal({ type: "none" });
  }
  async function onParcelaDone() {
    setParcelaModal({ type: "none" });
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
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os dados de margem.
          </p>
        </CardContent>
      </Card>
    );
  }

  const custo = margem.custo ?? 0;
  const temParcelas = parcelas.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Resultado do Poço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Receita prevista</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(previsto || margem.receita)}
            </span>
          </div>

          {/* Recebido / A receber */}
          {previsto > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              {aReceber <= 0 ? (
                <p className="text-sm font-medium text-success">
                  ✓ Totalmente recebido
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-success font-medium">
                      {formatCurrency(recebido)} recebido
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(aReceber)} a receber
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${pctRecebido}%` }}
                    />
                  </div>
                  {previsaoUltima && (
                    <p className="text-xs text-muted-foreground">
                      Previsão de receber tudo: {formatDate(previsaoUltima)}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Custo</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
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

          {/* Margem com toggle previsto x realizado */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">MARGEM</p>
                  <div className="inline-flex rounded-md border border-border overflow-hidden">
                    {(["previsto", "recebido"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVisaoMargem(v)}
                        className={cn(
                          "px-2 py-0.5 text-[11px] transition-colors",
                          visaoMargem === v
                            ? "bg-primary text-white"
                            : "bg-card text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {v === "previsto" ? "Prevista" : "Realizada"}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(margemMostrada)}
                  <span className="ml-2 text-base font-semibold text-muted-foreground">
                    {pctMargem == null ? "—" : `${pctMargem.toFixed(2)}%`}
                  </span>
                </p>
              </div>
              <span className={`h-3 w-3 rounded-full ${marginDotColor}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Custo por metro</p>
              <p className="font-semibold text-foreground">
                {margem.custo_por_metro == null
                  ? "—"
                  : `${formatCurrency(margem.custo_por_metro)}/m`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                em {profundidadeReal ?? margem.profundidade ?? 0}m
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Margem por metro</p>
              <p className="font-semibold text-foreground">
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
            <div className="border-t border-border pt-4 transition-all">
              {despesas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem custos registrados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
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
                          className="border-b border-border"
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
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-danger"
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

          {/* ── Seção de parcelas ─────────────────────────────────────── */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Parcelas
                {temParcelas ? (
                  <span className="ml-1 text-muted-foreground font-normal">
                    ({parcelas.length})
                  </span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={() => setShowAddParcela(true)}
                className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar parcela
              </button>
            </div>

            {!temParcelas ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma parcela. Conclua o serviço parcelado ou adicione uma
                cobrança avulsa.
              </p>
            ) : (
              <div className="space-y-2">
                {parcelas.map((p) => {
                  const operavel =
                    p.status !== "pago" && p.status !== "cancelado";
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {p.descricao ?? "Parcela"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          vence {formatDate(p.vencimento)} ·{" "}
                          {formatCurrency(p.valor)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant={SITUACAO_BADGE[p.situacao]}>
                          {SITUACAO_PARCELA_LABELS[p.situacao]}
                        </Badge>
                        {operavel && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                setParcelaModal({ type: "baixar", parcela: p })
                              }
                            >
                              Marcar como paga
                            </Button>
                            <button
                              type="button"
                              title="Cobrar (Pix)"
                              aria-label="Cobrar (Pix)"
                              onClick={() =>
                                setParcelaModal({ type: "cobrar", parcela: p })
                              }
                              className="h-11 w-11 rounded text-muted-foreground hover:text-primary hover:bg-primary-50 inline-flex items-center justify-center"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Editar"
                              aria-label="Editar"
                              onClick={() =>
                                setParcelaModal({ type: "editar", parcela: p })
                              }
                              className="h-11 w-11 rounded text-muted-foreground hover:text-primary hover:bg-primary-50 inline-flex items-center justify-center"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Cancelar"
                              aria-label="Cancelar"
                              onClick={() =>
                                setParcelaModal({
                                  type: "cancelar",
                                  parcela: p,
                                })
                              }
                              className="h-11 w-11 rounded text-muted-foreground hover:text-danger hover:bg-danger-50 inline-flex items-center justify-center"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {p.status === "pago" && (
                          <CheckCircle className="h-4 w-4 text-success" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick-add despesa */}
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
            inputMode="decimal"
            placeholder="0,00"
            value={quickForm.valor}
            onChange={(e) =>
              setQuickForm((prev) => ({
                ...prev,
                valor: e.target.value === "" ? "" : Number(e.target.value),
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

      {/* Adicionar parcela avulsa ao serviço */}
      <Dialog
        open={showAddParcela}
        onClose={() => setShowAddParcela(false)}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Adicionar parcela</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            label="Descrição"
            placeholder="Ex: Material adicional"
            value={addForm.descricao}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, descricao: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0,00"
              value={addForm.valor}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  valor:
                    e.target.value === "" ? "" : parseFloat(e.target.value),
                }))
              }
            />
            <Input
              label="Vencimento"
              type="date"
              value={addForm.vencimento}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, vencimento: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowAddParcela(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAddParcela} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </div>
      </Dialog>

      {/* Modais de ação da parcela (compartilhados) */}
      {parcelaModal.type === "baixar" && (
        <BaixarModal
          parcela={parcelaModal.parcela}
          onClose={closeParcelaModal}
          onDone={onParcelaDone}
        />
      )}
      {parcelaModal.type === "cobrar" && (
        <CobrarModal
          parcela={parcelaModal.parcela}
          onClose={closeParcelaModal}
          onGerou={fetchMargem}
        />
      )}
      {parcelaModal.type === "editar" && (
        <EditarParcelaModal
          parcela={parcelaModal.parcela}
          onClose={closeParcelaModal}
          onDone={onParcelaDone}
        />
      )}
      {parcelaModal.type === "cancelar" && (
        <CancelarParcelaModal
          parcela={parcelaModal.parcela}
          onClose={closeParcelaModal}
          onDone={onParcelaDone}
        />
      )}
    </>
  );
}
