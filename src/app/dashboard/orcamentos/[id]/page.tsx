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
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrcamentoForm } from "@/components/orcamento/orcamento-form";
import { ConcluirServicoModal } from "@/components/servicos/concluir-servico-modal";
import {
  getOrcamentoById,
  updateOrcamento,
  updateOrcamentoStatus,
  deleteOrcamento,
  getPerfuradorData,
  getClientesForSelect,
  createServicoDeOrcamento,
  getServicoIdByOrcamento,
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
  const [criandoServico, setCriandoServico] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [orcRes, perfRes, servRes] = await Promise.all([
      getOrcamentoById(params.id),
      getPerfuradorData(),
      getServicoIdByOrcamento(params.id),
    ]);

    if (orcRes.error || !orcRes.orcamento) {
      toast.error(orcRes.error || "Orçamento não encontrado");
      router.push("/dashboard/orcamentos");
      return;
    }

    setOrcamento(orcRes.orcamento);
    setPerfurador(perfRes.perfurador as Perfurador);
    setServicoId(servRes.servicoId);
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

  async function handleCriarServico() {
    if (!orcamento) return;
    setCriandoServico(true);
    const result = await createServicoDeOrcamento(orcamento.id);
    setCriandoServico(false);
    if (result.error || !result.servicoId) {
      toast.error(result.error ?? "Não foi possível criar o serviço");
      return;
    }
    setServicoId(result.servicoId);
    toast.success("Serviço criado e vinculado ao orçamento!");
  }

  async function handleOpenConcluir() {
    if (!orcamento) return;
    // Garante um serviço para concluir (idempotente); a conclusão reusa o
    // fluxo rico do serviço (à vista / parcelado / com sinal).
    if (!servicoId) {
      setSubmitting(true);
      const result = await createServicoDeOrcamento(orcamento.id);
      setSubmitting(false);
      if (result.error || !result.servicoId) {
        toast.error(result.error ?? "Não foi possível criar o serviço");
        return;
      }
      setServicoId(result.servicoId);
    }
    setShowConcluirModal(true);
  }

  async function handleOrcamentoConcluido() {
    if (!orcamento) return;
    const result = await updateOrcamentoStatus(orcamento.id, "concluido");
    if (result.error) toast.error(result.error);
    else toast.success("Orçamento concluído! Parcelas geradas em Contas a Receber.");
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
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <X className="h-4 w-4" />
            Cancelar edição
          </button>
          <h1 className="text-2xl font-bold text-foreground">
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
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para orçamentos
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              Orçamento #{orcamento.id.slice(0, 8).toUpperCase()}
            </h1>
            <Badge variant={statusBadgeVariant(orcamento.status)}>
              {statusLabel}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {servicoId && (
              <Link href={`/dashboard/servicos/${servicoId}`}>
                <Button variant="outline" size="sm">
                  <Wrench className="mr-2 h-4 w-4" />
                  Ver serviço
                </Button>
              </Link>
            )}
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
                {!servicoId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCriarServico}
                    disabled={criandoServico}
                  >
                    {criandoServico ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wrench className="mr-2 h-4 w-4" />
                    )}
                    Criar serviço vinculado
                  </Button>
                )}
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
                <p className="font-medium text-foreground">
                  {orcamento.cliente.nome}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
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
                  <p className="text-muted-foreground">Tipo de Serviço</p>
                  <p className="font-medium text-foreground">
                    {SERVICO_LABELS[orcamento.tipo_servico] ||
                      orcamento.tipo_servico}
                  </p>
                </div>
              )}
              {orcamento.profundidade_estimada_metros && (
                <div>
                  <p className="text-muted-foreground">Profundidade</p>
                  <p className="font-medium text-foreground">
                    {orcamento.profundidade_estimada_metros}m
                  </p>
                </div>
              )}
              {orcamento.diametro_polegadas && (
                <div>
                  <p className="text-muted-foreground">Diâmetro</p>
                  <p className="font-medium text-foreground">
                    {orcamento.diametro_polegadas}&quot;
                  </p>
                </div>
              )}
              {orcamento.tipo_solo && (
                <div>
                  <p className="text-muted-foreground">Tipo de Solo</p>
                  <p className="font-medium text-foreground">
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
                className="flex justify-between text-sm py-2 border-b border-border last:border-0"
              >
                <div>
                  <span className="text-foreground">{item.descricao}</span>
                  <span className="text-muted-foreground ml-2">
                    ({item.qtd} {item.unidade} ×{" "}
                    {formatCurrency(item.valor_unit)})
                  </span>
                </div>
                <span className="font-medium text-foreground shrink-0 ml-4">
                  {formatCurrency(item.qtd * item.valor_unit)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-sm border-t border-border pt-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-danger">
                  - {formatCurrency(desconto)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 mt-2">
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
                <span className="text-muted-foreground">Pagamento:</span>{" "}
                {orcamento.forma_pagamento}
              </p>
            )}
            {orcamento.prazo_execucao_dias && (
              <p>
                <span className="text-muted-foreground">Prazo:</span>{" "}
                {orcamento.prazo_execucao_dias} dias
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Validade:</span>{" "}
              {orcamento.validade_dias} dias
            </p>
            {orcamento.observacoes && (
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-muted-foreground mb-1">Observações:</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {orcamento.observacoes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <p className="text-sm text-muted-foreground">
        Criado em{" "}
        {formatDate(orcamento.created_at, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
        {orcamento.enviado_em &&
          ` | Enviado em ${formatDate(orcamento.enviado_em)}`}
        {orcamento.aprovado_em &&
          ` | Aprovado em ${formatDate(orcamento.aprovado_em)}`}
      </p>

      {/* Concluir: reusa o fluxo rico do serviço (à vista / parcelado / com sinal) */}
      <ConcluirServicoModal
        open={showConcluirModal && !!servicoId}
        onClose={() => setShowConcluirModal(false)}
        servico={
          servicoId
            ? {
                id: servicoId,
                valor: orcamento.valor_final ?? null,
                cliente: orcamento.cliente
                  ? { nome: orcamento.cliente.nome }
                  : null,
                orcamento: { valor_final: orcamento.valor_final ?? null },
              }
            : null
        }
        onConcluded={handleOrcamentoConcluido}
      />

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
        <p className="text-sm text-muted-foreground mt-2">
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
