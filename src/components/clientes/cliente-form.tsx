"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { clienteSchema, ClienteFormData } from "@/lib/validations";
import { formatPhoneNumber } from "@/lib/format-phone";
import { ESTADOS_BRASILEIROS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ClienteFormProps {
  defaultValues?: Partial<ClienteFormData>;
  onSubmit: (data: ClienteFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ClienteForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading,
}: ClienteFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues,
  });

  const notasValue = watch("notas") ?? "";

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhoneNumber(e.target.value);
    setValue("telefone", formatted, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-lg border border-secondary-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-secondary-800">
          Dados principais
        </h3>

        <Input
          id="nome"
          label="Nome completo *"
          placeholder="Nome do cliente"
          {...register("nome", {
            setValueAs: (value: string) => value.trim().replace(/\s+/g, " "),
          })}
          error={errors.nome?.message}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="telefone"
            label="Telefone *"
            placeholder="(00) 00000-0000"
            {...register("telefone", { onChange: handlePhoneChange })}
            error={errors.telefone?.message}
          />

          <Input
            id="email"
            label="E-mail"
            type="email"
            placeholder="email@exemplo.com"
            {...register("email", {
              setValueAs: (value: string) => value.trim().toLowerCase(),
            })}
            error={errors.email?.message}
          />
        </div>
      </div>

      <div className="rounded-lg border border-secondary-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-secondary-800">
          Endereço e observações
        </h3>

        <Input
          id="endereco"
          label="Endereço"
          placeholder="Rua, número, bairro"
          {...register("endereco", {
            setValueAs: (value: string) => value.trim(),
          })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="cidade"
            label="Cidade"
            placeholder="Cidade"
            {...register("cidade", {
              setValueAs: (value: string) => value.trim(),
            })}
          />
          <Select
            id="estado"
            label="Estado"
            options={ESTADOS_BRASILEIROS.map((uf) => ({
              value: uf,
              label: uf,
            }))}
            placeholder="UF"
            {...register("estado", {
              onChange: (e) => {
                setValue("estado", (e.target.value as string).toUpperCase(), {
                  shouldValidate: true,
                });
              },
            })}
            error={errors.estado?.message}
          />
        </div>

        <div className="space-y-1">
          <Textarea
            id="notas"
            label="Notas"
            placeholder="Observações importantes sobre o cliente..."
            maxLength={500}
            {...register("notas", {
              setValueAs: (value: string) => value.trim(),
            })}
            error={errors.notas?.message}
          />
          <p className="text-xs text-secondary-500 text-right">
            {notasValue.length}/500
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar"
          )}
        </Button>
      </div>
    </form>
  );
}
