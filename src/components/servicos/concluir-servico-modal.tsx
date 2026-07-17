"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, DollarSign, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { METODO_PAGAMENTO_OPTIONS } from "@/lib/constants";
import {
  concluirServico,
  type ParcelaConclusaoInput,
} from "@/app/dashboard/servicos/actions";

type ServicoConcluir = {
  id: string;
  valor: number | null;
  cliente?: { nome: string } | null;
  orcamento?: { valor_final: number | null } | null;
};

type ConcluirServicoModalProps = {
  open: boolean;
  onClose: () => void;
  servico: ServicoConcluir | null;
  onConcluded: () => void;
};

type Modo = "a_vista" | "parcelado" | "parcelado_com_sinal";

type ParcelaRow = {
  descricao: string;
  valor: number;
  vencimento: string;
};

const MODOS: { value: Modo; label: string }[] = [
  { value: "a_vista", label: "À vista" },
  { value: "parcelado", label: "Parcelado" },
  { value: "parcelado_com_sinal", label: "Com sinal" },
];

const SUGESTOES_DESCRICAO = [
  "Sinal",
  "Mobilização",
  "Perfuração",
  "Instalação",
  "Final",
];

const CENTS_TOLERANCIA = 0.01;

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function descricaoPadrao(i: number, n: number, comSinal: boolean): string {
  if (comSinal && i === 0) return "Sinal";
  return `Parcela ${i + 1}/${n}`;
}

// Divide `total` em `n` parcelas com centavos exatos (a última leva o resto).
function gerarParcelasIguais(
  total: number,
  n: number,
  comSinal: boolean,
): ParcelaRow[] {
  const totalCent = Math.round(total * 100);
  const baseCent = Math.floor(totalCent / n);
  const resto = totalCent - baseCent * n;

  return Array.from({ length: n }, (_, i) => {
    const valorCent = baseCent + (i === n - 1 ? resto : 0);
    // com sinal: 1ª hoje, demais a cada 30 dias; parcelado puro: a cada 30 dias
    const dias = comSinal ? i * 30 : (i + 1) * 30;
    return {
      descricao: descricaoPadrao(i, n, comSinal),
      valor: valorCent / 100,
      vencimento: addDaysISO(dias),
    };
  });
}

export function ConcluirServicoModal({
  open,
  onClose,
  servico,
  onConcluded,
}: ConcluirServicoModalProps) {
  const baseTotal = servico?.valor ?? servico?.orcamento?.valor_final ?? 0;

  const [modo, setModo] = useState<Modo>("a_vista");
  const [dataConclusao, setDataConclusao] = useState(hojeISO());
  const [saving, setSaving] = useState(false);

  // À vista
  const [valorVista, setValorVista] = useState(0);
  const [descontoVista, setDescontoVista] = useState(0);
  const [descricaoVista, setDescricaoVista] = useState("");
  const [metodoVista, setMetodoVista] = useState("pix");

  // Parcelado / com sinal
  const [totalServico, setTotalServico] = useState(0);
  const [parcelas, setParcelas] = useState<ParcelaRow[]>([]);
  const [metodoSinal, setMetodoSinal] = useState("pix");

  // (Re)inicializa quando abre ou troca de serviço
  useEffect(() => {
    if (!open) return;
    setModo("a_vista");
    setDataConclusao(hojeISO());
    setValorVista(baseTotal);
    setDescontoVista(0);
    setDescricaoVista(
      `Serviço concluído${servico?.cliente ? ` - ${servico.cliente.nome}` : ""}`,
    );
    setMetodoVista("pix");
    setTotalServico(baseTotal);
    setParcelas(gerarParcelasIguais(baseTotal, 2, false));
    setMetodoSinal("pix");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servico?.id]);

  const comSinal = modo === "parcelado_com_sinal";

  const somaParcelas = useMemo(
    () => parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0),
    [parcelas],
  );

  const valorLiquidoVista = Math.max(0, valorVista - descontoVista);

  const somaBate =
    Math.abs(somaParcelas - totalServico) <= CENTS_TOLERANCIA &&
    totalServico > 0;

  function aplicarIguais(n: number) {
    setParcelas(gerarParcelasIguais(totalServico, n, comSinal));
  }

  function atualizarParcela(i: number, patch: Partial<ParcelaRow>) {
    setParcelas((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    );
  }

  function adicionarParcela() {
    setParcelas((prev) => [
      ...prev,
      {
        descricao: `Parcela ${prev.length + 1}`,
        valor: 0,
        vencimento: addDaysISO((prev.length + 1) * 30),
      },
    ]);
  }

  function removerParcela(i: number) {
    setParcelas((prev) => prev.filter((_, idx) => idx !== i));
  }

  function montarPayload(): ParcelaConclusaoInput[] | null {
    if (modo === "a_vista") {
      if (valorLiquidoVista <= 0) {
        toast.error("Valor líquido precisa ser maior que zero.");
        return null;
      }
      return [
        {
          descricao: descricaoVista.trim() || "Recebimento à vista",
          valor: valorLiquidoVista,
          vencimento: dataConclusao,
          pago: true,
          metodo_pagamento: metodoVista as ParcelaConclusaoInput["metodo_pagamento"],
        },
      ];
    }

    // parcelado / com sinal
    if (parcelas.length === 0) {
      toast.error("Adicione ao menos uma parcela.");
      return null;
    }
    if (parcelas.some((p) => !p.descricao.trim())) {
      toast.error("Toda parcela precisa de descrição.");
      return null;
    }
    if (parcelas.some((p) => !p.vencimento)) {
      toast.error("Toda parcela precisa de vencimento.");
      return null;
    }
    if (parcelas.some((p) => (Number(p.valor) || 0) <= 0)) {
      toast.error("Toda parcela precisa de valor maior que zero.");
      return null;
    }
    if (!somaBate) {
      toast.error("A soma das parcelas precisa bater com o total do serviço.");
      return null;
    }

    return parcelas.map((p, i) => ({
      descricao: p.descricao.trim(),
      valor: Number(p.valor),
      vencimento: p.vencimento,
      pago: comSinal && i === 0,
      metodo_pagamento:
        comSinal && i === 0
          ? (metodoSinal as ParcelaConclusaoInput["metodo_pagamento"])
          : null,
    }));
  }

  async function handleConfirmar() {
    if (!servico) return;
    const payload = montarPayload();
    if (!payload) return;

    setSaving(true);
    const result = await concluirServico(servico.id, {
      dataConclusao,
      parcelas: payload,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Serviço concluído!");
    onClose();
    onConcluded();
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-success" />
          Concluir serviço
        </DialogTitle>
      </DialogHeader>

      <datalist id="sugestoes-descricao-parcela">
        {SUGESTOES_DESCRICAO.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="space-y-4">
        {/* Seletor de modo */}
        <div className="grid grid-cols-3 gap-2">
          {MODOS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setModo(m.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                modo === m.value
                  ? "border-primary bg-primary text-white"
                  : "border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <Input
          label="Data de conclusão"
          type="date"
          value={dataConclusao}
          onChange={(e) => setDataConclusao(e.target.value)}
        />

        {/* ── Modo à vista ─────────────────────────────────────────── */}
        {modo === "a_vista" && (
          <div className="space-y-4">
            <p className="text-sm text-secondary-600">
              Recebido de uma vez. Cria a receita no financeiro e uma parcela já
              quitada.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Valor recebido (R$)"
                type="number"
                step="0.01"
                min="0"
                value={valorVista}
                onChange={(e) => setValorVista(parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Desconto (R$)"
                type="number"
                step="0.01"
                min="0"
                value={descontoVista}
                onChange={(e) =>
                  setDescontoVista(parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <Select
              label="Forma de pagamento"
              value={metodoVista}
              onChange={(e) => setMetodoVista(e.target.value)}
              options={METODO_PAGAMENTO_OPTIONS}
            />
            <Input
              label="Descrição"
              value={descricaoVista}
              onChange={(e) => setDescricaoVista(e.target.value)}
            />
            <div className="border-t border-secondary-100 pt-3 text-sm text-secondary-500">
              Valor líquido:{" "}
              <span className="font-semibold text-success">
                {formatCurrency(valorLiquidoVista)}
              </span>
            </div>
          </div>
        )}

        {/* ── Modos parcelado / com sinal ──────────────────────────── */}
        {modo !== "a_vista" && (
          <div className="space-y-4">
            <p className="text-sm text-secondary-600">
              {comSinal
                ? "A 1ª parcela é o sinal (recebido agora); as demais ficam a receber."
                : "Nenhuma receita entra agora — as parcelas ficam a receber."}
            </p>

            <Input
              label="Total do serviço (R$)"
              type="number"
              step="0.01"
              min="0"
              value={totalServico}
              onChange={(e) => setTotalServico(parseFloat(e.target.value) || 0)}
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-secondary-500">Dividir igual:</span>
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => aplicarIguais(n)}
                  className="h-8 w-8 rounded-md border border-secondary-300 text-sm hover:bg-secondary-50"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={adicionarParcela}
                className="inline-flex items-center gap-1 rounded-md border border-secondary-300 px-2 h-8 text-sm hover:bg-secondary-50"
              >
                <Plus className="h-3.5 w-3.5" /> Parcela
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {parcelas.map((p, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-secondary-200 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-secondary-500">
                      {comSinal && i === 0 ? "Sinal (recebido agora)" : `Parcela ${i + 1}`}
                    </span>
                    {parcelas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerParcela(i)}
                        className="text-secondary-400 hover:text-danger"
                        title="Remover parcela"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    label="Descrição"
                    list="sugestoes-descricao-parcela"
                    value={p.descricao}
                    onChange={(e) =>
                      atualizarParcela(i, { descricao: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Valor (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={p.valor}
                      onChange={(e) =>
                        atualizarParcela(i, {
                          valor: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <Input
                      label="Vencimento"
                      type="date"
                      value={p.vencimento}
                      onChange={(e) =>
                        atualizarParcela(i, { vencimento: e.target.value })
                      }
                    />
                  </div>
                  {comSinal && i === 0 && (
                    <Select
                      label="Forma de pagamento do sinal"
                      value={metodoSinal}
                      onChange={(e) => setMetodoSinal(e.target.value)}
                      options={METODO_PAGAMENTO_OPTIONS}
                    />
                  )}
                </div>
              ))}
            </div>

            <div
              className={cn(
                "border-t border-secondary-100 pt-3 text-sm flex items-center justify-between",
                somaBate ? "text-success" : "text-danger",
              )}
            >
              <span>
                Soma das parcelas:{" "}
                <span className="font-semibold">
                  {formatCurrency(somaParcelas)}
                </span>
              </span>
              <span className="text-secondary-500">
                Total: {formatCurrency(totalServico)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleConfirmar} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Concluir
        </Button>
      </div>
    </Dialog>
  );
}
