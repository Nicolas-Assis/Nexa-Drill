"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Send,
  Trash2,
  Copy,
  Play,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  X,
  Phone,
  MapPin,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OrcamentoForm } from "@/components/orcamento/orcamento-form";
import {
  getOrcamentoById,
  updateOrcamento,
  updateOrcamentoStatus,
  deleteOrcamento,
  getPerfuradorData,
  getClientesForSelect,
  createServicoDeOrcamento,
  createLancamentoConclusao,
  concluirServico,
} from "../actions";
import { createCliente } from "@/app/dashboard/clientes/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  STATUS_ORCAMENTO_OPTIONS,
  SERVICO_LABELS,
  SOLO_LABELS,
} from "@/lib/constants";
import type { Orcamento, Perfurador, Cliente, StatusOrcamento } from "@/types";
import type { OrcamentoFormData, ClienteFormData } from "@/lib/validations";

const OrcamentoPDFDownload = dynamic(
  () => import("@/components/orcamento/orcamento-pdf-download"),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Preparando PDF...
      </Button>
    ),
  },
);

function statusBadgeVariant(
  status: StatusOrcamento,
): "default" | "info" | "success" | "warning" | "danger" {
  const map: Record<
    StatusOrcamento,
    "default" | "info" | "success" | "warning" | "danger"
  > = {
    rascunho: "default",
    enviado: "info",
    aprovado: "success",
    em_execucao: "warning",
    concluido: "success",
    cancelado: "danger",
  };
  return map[status];
}

export default function OrcamentoDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [orcamento, setOrcamento] = useState<
    (Orcamento & { cliente?: Cliente }) | null
  >(null);
  const [perfurador, setPerfurador] = useState<Perfurador | null>(null);
  const [clientes, setClientes] = useState<
    Pick<Cliente, "id" | "nome" | "telefone" | "cidade" | "estado">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConcluirModal, setShowConcluirModal] = useState(false);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [concluirForm, setConcluirForm] = useState({
    valor: 0,
    desconto: 0,
    data: new Date().toISOString().split("T")[0],
    descricao: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [orcRes, perfRes] = await Promise.all([
      getOrcamentoById(params.id),
      getPerfuradorData(),
    ]);

    if (orcRes.error || !orcRes.orcamento) {
      toast.error(orcRes.error || "Orçamento não encontrado");
      router.push("/dashboard/orcamentos");
      return;
    }

    setOrcamento(orcRes.orcamento);
    setPerfurador(perfRes.perfurador as Perfurador);
    setLoading(false);
  }, [params.id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleEdit() {
    const result = await getClientesForSelect();
    if (!result.error) setClientes(result.clientes);
    setMode("edit");
  }

  async function handleUpdateSubmit(
    data: OrcamentoFormData,
    status: StatusOrcamento,
  ) {
    if (!orcamento) return;
    setSubmitting(true);
    const result = await updateOrcamento(orcamento.id, data, status);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      status === "enviado"
        ? "Orçamento atualizado e enviado!"
        : "Orçamento atualizado!",
    );
    setMode("view");
    fetchData();
  }

  async function handleStatusChange(newStatus: StatusOrcamento) {
    if (!orcamento) return;
    setSubmitting(true);
    const result = await updateOrcamentoStatus(orcamento.id, newStatus);

    if (result.error) {
      setSubmitting(false);
      toast.error(result.error);
      return;
    }

    if (newStatus === "em_execucao") {
      const servicoResult = await createServicoDeOrcamento(orcamento.id);
      if (servicoResult.error) {
        toast.error(servicoResult.error);
      } else {
        setServicoId(servicoResult.servicoId);
        toast.success("Execução iniciada! Serviço criado e registrado.");
      }
    } else {
      const statusLabel =
        STATUS_ORCAMENTO_OPTIONS.find((s) => s.value === newStatus)?.label ||
        newStatus;
      toast.success(`Status alterado para "${statusLabel}"`);
    }

    setSubmitting(false);
    fetchData();
  }

  function handleOpenConcluir() {
    if (!orcamento) return;
    setConcluirForm({
      valor: orcamento.valor_final ?? 0,
      desconto: 0,
      data: new Date().toISOString().split("T")[0],
      descricao: `Serviço concluído${orcamento.cliente ? ` - ${orcamento.cliente.nome}` : ""}`,
    });
    setShowConcluirModal(true);
  }

  async function handleConfirmarConclusao() {
    if (!orcamento) return;
    setSubmitting(true);

    const [statusResult, lancamentoResult] = await Promise.all([
      updateOrcamentoStatus(orcamento.id, "concluido"),
      createLancamentoConclusao({
        servicoId: servicoId,
        valor: concluirForm.valor,
        desconto: concluirForm.desconto,
        data: concluirForm.data,
        descricao: concluirForm.descricao,
      }),
    ]);

    let hasError = false;
    if (statusResult.error) {
      toast.error(statusResult.error);
      hasError = true;
    }
    if (lancamentoResult.error) {
      toast.error(`Erro no lançamento: ${lancamentoResult.error}`);
      hasError = true;
    }

    if (servicoId) {
      const s = await concluirServico(servicoId);
      if (s.error) toast.error(`Erro ao concluir serviço: ${s.error}`);
    }

    setSubmitting(false);
    setShowConcluirModal(false);
    if (!hasError) toast.success("Orçamento concluído e receita registrada!");
    fetchData();
  }

  async function handleDelete() {
    if (!orcamento) return;
    setSubmitting(true);
    const result = await deleteOrcamento(orcamento.id);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Orçamento excluído");
    router.push("/dashboard/orcamentos");
  }

  function handleCopyLink() {
    if (!orcamento) return;
    const url = `${window.location.origin}/orcamento/${orcamento.link_publico}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  function handleWhatsAppShare() {
    if (!orcamento) return "#";
    const url = `${window.location.origin}/orcamento/${orcamento.link_publico}`;
    const clienteNome = orcamento.cliente?.nome || "Cliente";
    const valor = formatCurrency(orcamento.valor_final ?? 0);
    const msg = `Olá ${clienteNome}! Segue seu orçamento no valor de ${valor}. Acesse pelo link para visualizar e aprovar: ${url}`;
    const phone = orcamento.cliente?.telefone?.replace(/\D/g, "") || "";
    return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
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
    const updated = await getClientesForSelect();
    if (!updated.error) setClientes(updated.clientes);
    return result.cliente;
  }

  if (loading || !orcamento) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusLabel =
    STATUS_ORCAMENTO_OPTIONS.find((s) => s.value === orcamento.status)?.label ||
    orcamento.status;
  const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];
  const subtotal = itens.reduce((sum, i) => sum + i.qtd * i.valor_unit, 0);
  const desconto = orcamento.desconto ?? 0;
  const valorFinal = orcamento.valor_final ?? subtotal - desconto;

  // Edit mode
  if (mode === "edit") {
    const formDefaults: Partial<OrcamentoFormData> = {
      cliente_id: orcamento.cliente_id ?? "",
      tipo_servico: orcamento.tipo_servico ?? "",
      profundidade_estimada_metros:
        orcamento.profundidade_estimada_metros ?? undefined,
      diametro_polegadas: orcamento.diametro_polegadas ?? undefined,
      tipo_solo: orcamento.tipo_solo ?? "",
      itens:
        Array.isArray(orcamento.itens) && orcamento.itens.length > 0
          ? orcamento.itens
          : [{ descricao: "", qtd: 1, unidade: "metro", valor_unit: 0 }],
      desconto: orcamento.desconto ?? 0,
      forma_pagamento: orcamento.forma_pagamento ?? "",
      prazo_execucao_dias: orcamento.prazo_execucao_dias ?? undefined,
      validade_dias: orcamento.validade_dias ?? 15,
      observacoes: orcamento.observacoes ?? "",
    };

    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => setMode("view")}
            className="inline-flex items-center gap-1 text-sm text-secondary-500 hover:text-secondary-700 transition-colors mb-3"
          >
            <X className="h-4 w-4" />
            Cancelar edição
          </button>
          <h1 className="text-2xl font-bold text-secondary-900">
            Editar Orçamento
          </h1>
        </div>
        <OrcamentoForm
          key={orcamento.id}
          clientes={clientes}
          onSubmit={handleUpdateSubmit}
          onCreateCliente={handleCreateCliente}
          defaultValues={formDefaults}
          loading={submitting}
          isEdit
          currentStatus={orcamento.status}
        />
      </div>
    );
  }

  // View mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/orcamentos"
          className="inline-flex items-center gap-1 text-sm text-secondary-500 hover:text-secondary-700 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para orçamentos
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-secondary-900">
              Orçamento #{orcamento.id.slice(0, 8).toUpperCase()}
            </h1>
            <Badge variant={statusBadgeVariant(orcamento.status)}>
              {statusLabel}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Action buttons per status */}
            {orcamento.status === "rascunho" && (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("enviado")}
                  disabled={submitting}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar ao Cliente
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </>
            )}
            {orcamento.status === "enviado" && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Link
                </Button>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </>
            )}
            {orcamento.status === "aprovado" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("em_execucao")}
                  disabled={submitting}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar Execução
                </Button>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </>
            )}
            {orcamento.status === "em_execucao" && (
              <Button
                size="sm"
                onClick={handleOpenConcluir}
                disabled={submitting}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Concluir
              </Button>
            )}
            {perfurador && (
              <OrcamentoPDFDownload
                orcamento={orcamento}
                perfurador={perfurador}
                publicUrl={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/orcamento/${orcamento.link_publico}`
                    : undefined
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* Public link */}
      {(orcamento.status === "enviado" || orcamento.status === "aprovado") && (
        <Card className="border-primary-200 bg-primary-50/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-primary-700">
                  Link público do orçamento
                </p>
                <p className="text-xs text-primary-500 mt-0.5 break-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/orcamento/${orcamento.link_publico}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
                <a
                  href={handleWhatsAppShare()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-success border-success-200 hover:bg-success-50"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    WhatsApp
                  </Button>
                </a>
                <a
                  href={`/orcamento/${orcamento.link_publico}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client info */}
      {orcamento.cliente && (
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-secondary-900">
                  {orcamento.cliente.nome}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-secondary-500">
                  <a
                    href={`tel:${orcamento.cliente.telefone}`}
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {orcamento.cliente.telefone}
                  </a>
                  {(orcamento.cliente.cidade || orcamento.cliente.estado) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {[orcamento.cliente.cidade, orcamento.cliente.estado]
                        .filter(Boolean)
                        .join(" / ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical */}
      {(orcamento.tipo_servico ||
        orcamento.profundidade_estimada_metros ||
        orcamento.diametro_polegadas ||
        orcamento.tipo_solo) && (
        <Card>
          <CardHeader>
            <CardTitle>Dados Técnicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {orcamento.tipo_servico && (
                <div>
                  <p className="text-secondary-400">Tipo de Serviço</p>
                  <p className="font-medium text-secondary-900">
                    {SERVICO_LABELS[orcamento.tipo_servico] ||
                      orcamento.tipo_servico}
                  </p>
                </div>
              )}
              {orcamento.profundidade_estimada_metros && (
                <div>
                  <p className="text-secondary-400">Profundidade</p>
                  <p className="font-medium text-secondary-900">
                    {orcamento.profundidade_estimada_metros}m
                  </p>
                </div>
              )}
              {orcamento.diametro_polegadas && (
                <div>
                  <p className="text-secondary-400">Diâmetro</p>
                  <p className="font-medium text-secondary-900">
                    {orcamento.diametro_polegadas}&quot;
                  </p>
                </div>
              )}
              {orcamento.tipo_solo && (
                <div>
                  <p className="text-secondary-400">Tipo de Solo</p>
                  <p className="font-medium text-secondary-900">
                    {SOLO_LABELS[orcamento.tipo_solo] || orcamento.tipo_solo}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {itens.map((item, i) => (
              <div
                key={i}
                className="flex justify-between text-sm py-2 border-b border-secondary-100 last:border-0"
              >
                <div>
                  <span className="text-secondary-900">{item.descricao}</span>
                  <span className="text-secondary-400 ml-2">
                    ({item.qtd} {item.unidade} ×{" "}
                    {formatCurrency(item.valor_unit)})
                  </span>
                </div>
                <span className="font-medium text-secondary-900 shrink-0 ml-4">
                  {formatCurrency(item.qtd * item.valor_unit)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-sm border-t border-secondary-200 pt-4">
            <div className="flex justify-between">
              <span className="text-secondary-500">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between">
                <span className="text-secondary-500">Desconto</span>
                <span className="text-danger">
                  - {formatCurrency(desconto)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-secondary-200 pt-3 mt-2">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(valorFinal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditions */}
      {(orcamento.forma_pagamento ||
        orcamento.prazo_execucao_dias ||
        orcamento.observacoes) && (
        <Card>
          <CardHeader>
            <CardTitle>Condições e Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {orcamento.forma_pagamento && (
              <p>
                <span className="text-secondary-400">Pagamento:</span>{" "}
                {orcamento.forma_pagamento}
              </p>
            )}
            {orcamento.prazo_execucao_dias && (
              <p>
                <span className="text-secondary-400">Prazo:</span>{" "}
                {orcamento.prazo_execucao_dias} dias
              </p>
            )}
            <p>
              <span className="text-secondary-400">Validade:</span>{" "}
              {orcamento.validade_dias} dias
            </p>
            {orcamento.observacoes && (
              <div className="border-t border-secondary-200 pt-3 mt-3">
                <p className="text-secondary-400 mb-1">Observações:</p>
                <p className="text-secondary-600 whitespace-pre-wrap">
                  {orcamento.observacoes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <p className="text-sm text-secondary-400">
        Criado em{" "}
        {formatDate(orcamento.created_at, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
        {orcamento.enviado_em &&
          ` | Enviado em ${formatDate(orcamento.enviado_em)}`}
        {orcamento.aprovado_em &&
          ` | Aprovado em ${formatDate(orcamento.aprovado_em)}`}
      </p>

      {/* Concluir dialog */}
      <Dialog
        open={showConcluirModal}
        onClose={() => setShowConcluirModal(false)}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Confirmar Conclusão
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-600 mt-2 mb-4">
          Confirme os dados de recebimento. Um lançamento de receita será criado
          automaticamente.
        </p>
        <div className="space-y-4">
          <Input
            label="Valor recebido (R$)"
            type="number"
            step="0.01"
            min="0"
            value={concluirForm.valor}
            onChange={(e) =>
              setConcluirForm((f) => ({
                ...f,
                valor: parseFloat(e.target.value) || 0,
              }))
            }
          />
          <Input
            label="Desconto (R$)"
            type="number"
            step="0.01"
            min="0"
            value={concluirForm.desconto}
            onChange={(e) =>
              setConcluirForm((f) => ({
                ...f,
                desconto: parseFloat(e.target.value) || 0,
              }))
            }
          />
          <Input
            label="Data de recebimento"
            type="date"
            value={concluirForm.data}
            onChange={(e) =>
              setConcluirForm((f) => ({ ...f, data: e.target.value }))
            }
          />
          <Input
            label="Descrição"
            value={concluirForm.descricao}
            onChange={(e) =>
              setConcluirForm((f) => ({ ...f, descricao: e.target.value }))
            }
          />
          <div className="border-t border-secondary-100 pt-3">
            <p className="text-sm text-secondary-500">
              Valor líquido:{" "}
              <span className="font-semibold text-success">
                {formatCurrency(
                  Math.max(0, concluirForm.valor - concluirForm.desconto),
                )}
              </span>
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowConcluirModal(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirmarConclusao} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Confirmar
          </Button>
        </div>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger" />
            Excluir Orçamento
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-600 mt-2">
          Tem certeza que deseja excluir este orçamento? Esta ação não pode ser
          desfeita.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
