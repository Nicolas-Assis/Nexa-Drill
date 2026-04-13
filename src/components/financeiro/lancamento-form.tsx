"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { lancamentoSchema, LancamentoFormData } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  TIPO_LANCAMENTO_OPTIONS,
  CATEGORIAS_RECEITA,
  CATEGORIAS_DESPESA,
  CATEGORIAS_RECEITA_LABELS,
  CATEGORIAS_DESPESA_LABELS,
} from "@/lib/constants";

interface LancamentoFormProps {
  onSubmit: (data: LancamentoFormData) => void;
  defaultValues?: Partial<LancamentoFormData>;
  loading?: boolean;
  tipoLocked?: "receita" | "despesa";
  servicos?: { id: string; label: string }[];
}

export function LancamentoForm({
  onSubmit,
  defaultValues,
  loading,
  tipoLocked,
  servicos,
}: LancamentoFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LancamentoFormData>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: {
      tipo: tipoLocked ?? "receita",
      data: today,
      ...defaultValues,
    },
  });

  const tipo = tipoLocked ?? watch("tipo");
  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const labels =
    tipo === "receita" ? CATEGORIAS_RECEITA_LABELS : CATEGORIAS_DESPESA_LABELS;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!tipoLocked && (
        <Select
          label="Tipo"
          options={TIPO_LANCAMENTO_OPTIONS}
          {...register("tipo")}
          error={errors.tipo?.message}
        />
      )}

      <Select
        label="Categoria"
        options={categorias.map((c) => ({ value: c, label: labels[c] ?? c }))}
        placeholder="Selecione uma categoria"
        {...register("categoria")}
        error={errors.categoria?.message}
      />

      <Input
        label="Descrição"
        placeholder="Ex: Serviço de perfuração – cliente João"
        {...register("descricao")}
        error={errors.descricao?.message}
      />

      <Input
        label="Valor (R$)"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0,00"
        {...register("valor", { valueAsNumber: true })}
        error={errors.valor?.message}
      />

      <Input
        label="Data"
        type="date"
        {...register("data")}
        error={errors.data?.message}
      />

      {servicos && servicos.length > 0 && (
        <Select
          label="Serviço vinculado (opcional)"
          options={servicos.map((s) => ({ value: s.id, label: s.label }))}
          placeholder="Nenhum serviço"
          {...register("servico_id")}
          error={errors.servico_id?.message}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Lançamento"}
        </Button>
      </div>
    </form>
  );
}
