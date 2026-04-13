"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orcamentoSchema, type OrcamentoFormData, type ClienteFormData } from "@/lib/validations";
import { TIPOS_SERVICO_OPTIONS, TIPOS_SOLO_OPTIONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { Plus, Trash2, Loader2, UserPlus, AlertTriangle } from "lucide-react";
import type { Cliente, StatusOrcamento } from "@/types";

const DIAMETRO_OPTIONS = [
  { value: "4", label: '4"' },
  { value: "6", label: '6"' },
  { value: "8", label: '8"' },
  { value: "10", label: '10"' },
];

const UNIDADE_OPTIONS = [
  { value: "metro", label: "Metro" },
  { value: "unidade", label: "Unidade" },
  { value: "hora", label: "Hora" },
  { value: "diária", label: "Diária" },
  { value: "verba", label: "Verba" },
];

const SOLO_OPTIONS = [
  ...TIPOS_SOLO_OPTIONS,
  { value: "nao_identificado", label: "Não identificado" },
];

const QUICK_CHIPS = [
  "Perfuração por metro",
  "Tubo de revestimento",
  "Bomba submersa",
  "Filtro",
  "Cimentação",
  "Mobilização de equipamento",
  "Cap de proteção",
  "Teste de vazão",
];

interface OrcamentoFormProps {
  clientes: Pick<Cliente, "id" | "nome" | "telefone" | "cidade" | "estado">[];
  onSubmit: (data: OrcamentoFormData, status: StatusOrcamento) => Promise<void>;
  onCreateCliente?: (data: ClienteFormData) => Promise<Cliente | null>;
  defaultValues?: Partial<OrcamentoFormData>;
  loading?: boolean;
  isEdit?: boolean;
  currentStatus?: StatusOrcamento;
}

export function OrcamentoForm({
  clientes,
  onSubmit,
  onCreateCliente,
  defaultValues,
  loading,
  isEdit,
  currentStatus,
}: OrcamentoFormProps) {
  const [showClienteDialog, setShowClienteDialog] = useState(false);
  const [creatingCliente, setCreatingCliente] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrcamentoFormData>({
    resolver: zodResolver(orcamentoSchema),
    defaultValues: {
      itens: [{ descricao: "", qtd: 1, unidade: "metro", valor_unit: 0 }],
      validade_dias: 15,
      desconto: 0,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "itens" });

  const watchedItens = watch("itens");
  const watchedDesconto = watch("desconto") ?? 0;
  const watchedClienteId = watch("cliente_id");

  const subtotal = (watchedItens ?? []).reduce(
    (sum, item) => sum + (item?.qtd || 0) * (item?.valor_unit || 0),
    0
  );
  const valorFinal = Math.max(0, subtotal - watchedDesconto);

  const selectedCliente = clientes.find((c) => c.id === watchedClienteId);

  function submitWithStatus(status: StatusOrcamento) {
    handleSubmit((data) => onSubmit(data, status))();
  }

  async function handleNewCliente(data: ClienteFormData) {
    if (!onCreateCliente) return;
    setCreatingCliente(true);
    const newCliente = await onCreateCliente(data);
    setCreatingCliente(false);
    if (newCliente) {
      setValue("cliente_id", newCliente.id);
      setShowClienteDialog(false);
    }
  }

  return (
    <>
      <form className="space-y-6">
        {/* Warning for non-draft edits */}
        {isEdit && currentStatus && currentStatus !== "rascunho" && (
          <div className="flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4">
            <AlertTriangle className="h-5 w-5 text-accent-600 shrink-0" />
            <p className="text-sm text-accent-700">
              Este orçamento já foi <strong>{currentStatus === "enviado" ? "enviado ao cliente" : "aprovado"}</strong>.
              Alterações podem afetar a percepção do cliente.
            </p>
          </div>
        )}

        {/* Section 1: Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Select
                  id="cliente_id"
                  label="Selecione o cliente *"
                  options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                  placeholder="Selecione um cliente"
                  {...register("cliente_id")}
                  error={errors.cliente_id?.message}
                />
              </div>
              {onCreateCliente && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClienteDialog(true)}
                  className="shrink-0 mb-1"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              )}
            </div>
            {selectedCliente && (
              <div className="rounded-lg bg-secondary-50 px-3 py-2 text-sm text-secondary-600">
                <span className="font-medium">{selectedCliente.telefone}</span>
                {selectedCliente.cidade && (
                  <span> — {selectedCliente.cidade}{selectedCliente.estado ? `/${selectedCliente.estado}` : ""}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Dados do Serviço */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="tipo_servico"
                label="Tipo de Serviço"
                options={TIPOS_SERVICO_OPTIONS}
                placeholder="Selecione"
                {...register("tipo_servico")}
              />
              <Input
                id="profundidade_estimada_metros"
                label="Profundidade Estimada (m)"
                type="number"
                placeholder="Ex: 120"
                {...register("profundidade_estimada_metros", { valueAsNumber: true })}
              />
              <Select
                id="diametro_polegadas"
                label="Diâmetro (pol)"
                options={DIAMETRO_OPTIONS}
                placeholder="Selecione"
                {...register("diametro_polegadas", { valueAsNumber: true })}
              />
              <Select
                id="tipo_solo"
                label="Tipo de Solo"
                options={SOLO_OPTIONS}
                placeholder="Selecione"
                {...register("tipo_solo")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Itens */}
        <Card>
          <CardHeader>
            <CardTitle>Itens do Orçamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick chips */}
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => append({ descricao: chip, qtd: 1, unidade: "metro", valor_unit: 0 })}
                  className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {/* Items */}
            <div className="space-y-3">
              {fields.map((field, index) => {
                const itemSubtotal = (watchedItens?.[index]?.qtd || 0) * (watchedItens?.[index]?.valor_unit || 0);
                return (
                  <div
                    key={field.id}
                    className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-medium text-secondary-400">Item {index + 1}</span>
                      <button
                        type="button"
                        title="Remover item"
                        onClick={() => remove(index)}
                        className="rounded-lg p-1 text-secondary-400 hover:bg-danger-50 hover:text-danger transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      placeholder="Descrição do item"
                      {...register(`itens.${index}.descricao`)}
                      error={errors.itens?.[index]?.descricao?.message}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input
                        label="Qtd"
                        type="number"
                        min={1}
                        {...register(`itens.${index}.qtd`, { valueAsNumber: true })}
                      />
                      <Select
                        label="Unidade"
                        options={UNIDADE_OPTIONS}
                        {...register(`itens.${index}.unidade`)}
                      />
                      <Input
                        label="Valor Unit. (R$)"
                        type="number"
                        step="0.01"
                        min={0}
                        {...register(`itens.${index}.valor_unit`, { valueAsNumber: true })}
                      />
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-secondary-700">Subtotal</label>
                        <div className="flex h-10 items-center rounded-lg bg-secondary-100 px-3 text-sm font-semibold text-secondary-900">
                          {formatCurrency(itemSubtotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {errors.itens?.root && (
              <p className="text-sm text-danger">{errors.itens.root.message}</p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ descricao: "", qtd: 1, unidade: "metro", valor_unit: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>

            {/* Totals footer */}
            <div className="border-t border-secondary-200 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary-500">Subtotal</span>
                <span className="font-medium text-secondary-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-secondary-500">Desconto (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="w-32 h-9 rounded-lg border border-secondary-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                  {...register("desconto", { valueAsNumber: true })}
                />
              </div>
              <div className="flex items-center justify-between border-t border-primary-200 pt-3">
                <span className="text-lg font-bold text-secondary-900">VALOR FINAL</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(valorFinal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Condições */}
        <Card>
          <CardHeader>
            <CardTitle>Condições</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              id="forma_pagamento"
              label="Forma de Pagamento"
              placeholder="Ex: 50% na aprovação + 50% na conclusão"
              {...register("forma_pagamento")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="prazo_execucao_dias"
                label="Prazo de Execução (dias)"
                type="number"
                placeholder="Ex: 15"
                {...register("prazo_execucao_dias", { valueAsNumber: true })}
              />
              <Input
                id="validade_dias"
                label="Validade do Orçamento (dias)"
                type="number"
                placeholder="15"
                {...register("validade_dias", { valueAsNumber: true })}
              />
            </div>
            <Textarea
              id="observacoes"
              label="Observações"
              placeholder="Observações adicionais..."
              {...register("observacoes")}
            />
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => submitWithStatus("rascunho")}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar como Rascunho
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={() => submitWithStatus("enviado")}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar e Enviar ao Cliente
          </Button>
        </div>
      </form>

      {/* New client dialog */}
      <Dialog open={showClienteDialog} onClose={() => setShowClienteDialog(false)}>
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <ClienteForm
          onSubmit={handleNewCliente}
          onCancel={() => setShowClienteDialog(false)}
          loading={creatingCliente}
        />
      </Dialog>
    </>
  );
}
