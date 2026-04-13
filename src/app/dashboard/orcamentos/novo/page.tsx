"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { OrcamentoForm } from "@/components/orcamento/orcamento-form";
import { getClientesForSelect, createOrcamento } from "../actions";
import { createCliente } from "@/app/dashboard/clientes/actions";
import type { Cliente, StatusOrcamento } from "@/types";
import type { OrcamentoFormData, ClienteFormData } from "@/lib/validations";

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<
    Pick<Cliente, "id" | "nome" | "telefone" | "cidade" | "estado">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchClientes = useCallback(async () => {
    const result = await getClientesForSelect();
    if (result.error) toast.error(result.error);
    else setClientes(result.clientes);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  async function handleSubmit(
    data: OrcamentoFormData,
    status: StatusOrcamento,
  ) {
    setSubmitting(true);
    const result = await createOrcamento(data, status);
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (status === "enviado") {
      toast.success("Orçamento criado e enviado!");
      router.push(`/dashboard/orcamentos/${result.orcamento!.id}`);
    } else {
      toast.success("Rascunho salvo com sucesso!");
      router.push("/dashboard/orcamentos");
    }
  }

  async function handleCreateCliente(
    data: ClienteFormData,
  ): Promise<Cliente | null> {
    const result = await createCliente(data);
    if (result.error) {
      toast.error(result.error);
      return null;
    }
    toast.success("Cliente criado!");
    await fetchClientes();
    return result.cliente;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/orcamentos"
          className="inline-flex items-center gap-1 text-sm text-secondary-500 hover:text-secondary-700 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para orçamentos
        </Link>
        <h1 className="text-2xl font-bold text-secondary-900">
          Novo Orçamento
        </h1>
        <p className="text-sm text-secondary-500">
          Preencha os dados para criar um orçamento
        </p>
      </div>

      <OrcamentoForm
        clientes={clientes}
        onSubmit={handleSubmit}
        onCreateCliente={handleCreateCliente}
        loading={submitting}
      />
    </div>
  );
}
