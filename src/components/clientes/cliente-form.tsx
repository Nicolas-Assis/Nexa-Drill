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

export function ClienteForm({ defaultValues, onSubmit, onCancel, loading }: ClienteFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues,
  });

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhoneNumber(e.target.value);
    setValue("telefone", formatted, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        id="nome"
        label="Nome *"
        placeholder="Nome do cliente"
        {...register("nome")}
        error={errors.nome?.message}
      />

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
        {...register("email")}
        error={errors.email?.message}
      />

      <Input
        id="endereco"
        label="Endereço"
        placeholder="Rua, número, bairro"
        {...register("endereco")}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="cidade"
          label="Cidade"
          placeholder="Cidade"
          {...register("cidade")}
        />
        <Select
          id="estado"
          label="Estado"
          options={ESTADOS_BRASILEIROS.map((uf) => ({ value: uf, label: uf }))}
          placeholder="UF"
          {...register("estado")}
        />
      </div>

      <Textarea
        id="notas"
        label="Notas"
        placeholder="Observações sobre o cliente..."
        {...register("notas")}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
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
