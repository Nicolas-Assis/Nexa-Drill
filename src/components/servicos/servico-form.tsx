"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TIPOS_SOLO_OPTIONS, STATUS_SERVICO_OPTIONS } from "@/lib/constants";
import type { ServicoCreateData } from "@/app/dashboard/servicos/actions";

interface ServicoFormProps {
  onSubmit: (data: ServicoCreateData) => void;
  defaultValues?: Partial<ServicoCreateData>;
  loading?: boolean;
  clientes?: { id: string; nome: string }[];
  orcamentos?: { id: string; label: string }[];
}

type RawForm = {
  cliente_id: string;
  orcamento_id: string;
  valor: string;
  status: string;
  endereco: string;
  data_inicio: string;
  data_conclusao: string;
  profundidade_real_metros: string;
  diametro_polegadas: string;
  tipo_solo_encontrado: string;
  vazao_litros_hora: string;
  nivel_estatico_metros: string;
  nivel_dinamico_metros: string;
  notas: string;
};

function toNum(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export function ServicoForm({
  onSubmit,
  defaultValues,
  loading,
  clientes = [],
  orcamentos = [],
}: ServicoFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit } = useForm<RawForm>({
    defaultValues: {
      cliente_id: defaultValues?.cliente_id ?? "",
      orcamento_id: defaultValues?.orcamento_id ?? "",
      valor: defaultValues?.valor?.toString() ?? "",
      status: defaultValues?.status ?? "andamento",
      endereco: defaultValues?.endereco ?? "",
      data_inicio: defaultValues?.data_inicio ?? today,
      data_conclusao: defaultValues?.data_conclusao ?? "",
      profundidade_real_metros:
        defaultValues?.profundidade_real_metros?.toString() ?? "",
      diametro_polegadas: defaultValues?.diametro_polegadas?.toString() ?? "",
      tipo_solo_encontrado: defaultValues?.tipo_solo_encontrado ?? "",
      vazao_litros_hora: defaultValues?.vazao_litros_hora?.toString() ?? "",
      nivel_estatico_metros:
        defaultValues?.nivel_estatico_metros?.toString() ?? "",
      nivel_dinamico_metros:
        defaultValues?.nivel_dinamico_metros?.toString() ?? "",
      notas: defaultValues?.notas ?? "",
    },
  });

  function onFormSubmit(raw: RawForm) {
    onSubmit({
      cliente_id: raw.cliente_id || null,
      orcamento_id: raw.orcamento_id || null,
      valor: toNum(raw.valor),
      status:
        (raw.status as "andamento" | "concluido" | "cancelado") || "andamento",
      endereco: raw.endereco || null,
      data_inicio: raw.data_inicio || null,
      data_conclusao: raw.data_conclusao || null,
      profundidade_real_metros: toNum(raw.profundidade_real_metros),
      diametro_polegadas: toNum(raw.diametro_polegadas),
      tipo_solo_encontrado: raw.tipo_solo_encontrado || null,
      vazao_litros_hora: toNum(raw.vazao_litros_hora),
      nivel_estatico_metros: toNum(raw.nivel_estatico_metros),
      nivel_dinamico_metros: toNum(raw.nivel_dinamico_metros),
      notas: raw.notas || null,
    });
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Vinculações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clientes.length > 0 && (
          <Select
            label="Cliente"
            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
            placeholder="Selecione um cliente"
            {...register("cliente_id")}
          />
        )}
        {orcamentos.length > 0 && (
          <Select
            label="Orçamento vinculado (opcional)"
            options={orcamentos.map((o) => ({ value: o.id, label: o.label }))}
            placeholder="Nenhum orçamento"
            {...register("orcamento_id")}
          />
        )}
      </div>

      {/* Valor e Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Valor do Serviço (R$)"
          type="number"
          step="0.01"
          min="0"
          placeholder="Ex: 5000.00"
          {...register("valor")}
        />
        <Select
          label="Status"
          options={STATUS_SERVICO_OPTIONS}
          {...register("status")}
        />
      </div>

      {/* Localização */}
      <Input
        label="Endereço / Localidade"
        placeholder="Ex: Rua das Flores, 123 — Ribeirão Preto/SP"
        {...register("endereco")}
      />

      {/* Datas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Data de início"
          type="date"
          {...register("data_inicio")}
        />
        <Input
          label="Data de conclusão (opcional)"
          type="date"
          {...register("data_conclusao")}
        />
      </div>

      {/* Dados técnicos */}
      <p className="text-sm font-medium text-secondary-700 pt-1">
        Dados técnicos (opcional)
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Input
          label="Profundidade real (m)"
          type="number"
          step="0.1"
          min="0"
          {...register("profundidade_real_metros")}
        />
        <Input
          label="Diâmetro (pol.)"
          type="number"
          step="0.1"
          min="0"
          {...register("diametro_polegadas")}
        />
        <Select
          label="Tipo de solo"
          options={TIPOS_SOLO_OPTIONS}
          placeholder="Selecione"
          {...register("tipo_solo_encontrado")}
        />
        <Input
          label="Vazão (L/h)"
          type="number"
          step="1"
          min="0"
          {...register("vazao_litros_hora")}
        />
        <Input
          label="Nível estático (m)"
          type="number"
          step="0.1"
          min="0"
          {...register("nivel_estatico_metros")}
        />
        <Input
          label="Nível dinâmico (m)"
          type="number"
          step="0.1"
          min="0"
          {...register("nivel_dinamico_metros")}
        />
      </div>

      <Textarea
        label="Notas"
        rows={3}
        placeholder="Observações sobre o serviço..."
        {...register("notas")}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Serviço"}
        </Button>
      </div>
    </form>
  );
}
