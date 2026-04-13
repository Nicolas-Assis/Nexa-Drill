"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  FileText,
  Wrench,
  Loader2,
  DollarSign,
  TrendingUp,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { DeleteConfirmDialog } from "@/components/clientes/delete-confirm-dialog";
import { getClienteById, updateCliente, deleteCliente } from "../actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  STATUS_ORCAMENTO_OPTIONS,
  STATUS_SERVICO_OPTIONS,
} from "@/lib/constants";
import type { Cliente } from "@/types";
import type { ClienteFormData } from "@/lib/validations";

type OrcamentoHistorico = {
  id: string;
  status: string;
  tipo_servico: string | null;
  valor_final: number | null;
  created_at: string;
};

type ServicoHistorico = {
  id: string;
  status: string;
  valor: number | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  orcamento?: {
    tipo_servico: string | null;
    valor_final: number | null;
  } | null;
};

export default function ClienteDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [orcamentosCount, setOrcamentosCount] = useState(0);
  const [servicosCount, setServicosCount] = useState(0);
  const [orcamentos, setOrcamentos] = useState<OrcamentoHistorico[]>([]);
  const [servicos, setServicos] = useState<ServicoHistorico[]>([]);
  const [valorTotalRecebido, setValorTotalRecebido] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCliente = useCallback(async () => {
    setLoading(true);
    const result = await getClienteById(params.id);
    if (result.error || !result.cliente) {
      toast.error(result.error || "Cliente não encontrado");
      router.push("/dashboard/clientes");
      return;
    }
    setCliente(result.cliente);
    setOrcamentosCount(result.orcamentosCount);
    setServicosCount(result.servicosCount);
    setOrcamentos(result.orcamentos);
    setServicos(result.servicos);
    setValorTotalRecebido(result.valorTotalRecebido);
    setLoading(false);
  }, [params.id, router]);

  useEffect(() => {
    fetchCliente();
  }, [fetchCliente]);

  async function handleUpdate(data: ClienteFormData) {
    if (!cliente) return;
    setSubmitting(true);
    const result = await updateCliente(cliente.id, data);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Cliente atualizado com sucesso!");
    setShowEditDialog(false);
    fetchCliente();
  }

  async function handleDelete() {
    if (!cliente) return;
    setSubmitting(true);
    const result = await deleteCliente(cliente.id);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Cliente excluído com sucesso!");
    router.push("/dashboard/clientes");
  }

  function handleWhatsApp() {
    if (!cliente) return;
    const phone = cliente.telefone.replace(/\D/g, "");
    const number = phone.startsWith("55") ? phone : `55${phone}`;
    window.open(`https://wa.me/${number}`, "_blank");
  }

  if (loading || !cliente) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const location = [cliente.cidade, cliente.estado].filter(Boolean).join(" / ");

  // Calculate client quality score
  const servicosConcluidos = servicos.filter(
    (s) => s.status === "concluido",
  ).length;
  const servicosCancelados = servicos.filter(
    (s) => s.status === "cancelado",
  ).length;
  const taxaSucesso =
    servicosCount > 0
      ? Math.round((servicosConcluidos / servicosCount) * 100)
      : 0;

  const getStatusBadgeOrcamento = (status: string) => {
    const option = STATUS_ORCAMENTO_OPTIONS.find((o) => o.value === status);
    const variants: Record<
      string,
      "default" | "info" | "warning" | "success" | "danger"
    > = {
      rascunho: "default",
      enviado: "info",
      negociacao: "warning",
      aprovado: "success",
      rejeitado: "danger",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {option?.label || status}
      </Badge>
    );
  };

  const getStatusBadgeServico = (status: string) => {
    const option = STATUS_SERVICO_OPTIONS.find((o) => o.value === status);
    const variants: Record<
      string,
      "default" | "info" | "warning" | "success" | "danger"
    > = {
      andamento: "info",
      concluido: "success",
      cancelado: "danger",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {option?.label || status}
      </Badge>
    );
  };

  const getClienteQualidadeBadge = () => {
    if (servicosCount === 0) {
      return <Badge variant="default">Novo</Badge>;
    }
    if (taxaSucesso >= 80 && servicosConcluidos >= 2) {
      return <Badge variant="success">Excelente</Badge>;
    }
    if (taxaSucesso >= 50) {
      return <Badge variant="info">Bom</Badge>;
    }
    if (servicosCancelados > servicosConcluidos) {
      return <Badge variant="danger">Atenção</Badge>;
    }
    return <Badge variant="warning">Regular</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/dashboard/clientes"
          className="inline-flex items-center gap-1 text-sm text-secondary-500 hover:text-secondary-700 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para clientes
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-secondary-900">
            {cliente.nome}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleWhatsApp}>
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-secondary-400">Telefone</p>
                <a
                  href={`tel:${cliente.telefone}`}
                  className="text-sm font-medium text-secondary-900 hover:text-primary transition-colors"
                >
                  {cliente.telefone}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
                <Mail className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-secondary-400">E-mail</p>
                <p className="text-sm font-medium text-secondary-900">
                  {cliente.email || "Não informado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50">
                <MapPin className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-secondary-400">Localização</p>
                <p className="text-sm font-medium text-secondary-900">
                  {location || "Não informado"}
                </p>
                {cliente.endereco && (
                  <p className="text-xs text-secondary-400 mt-0.5">
                    {cliente.endereco}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-secondary-400">Orçamentos</p>
                  <p className="text-lg font-bold text-secondary-900">
                    {orcamentosCount}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50">
                  <Wrench className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-secondary-400">Serviços</p>
                  <p className="text-lg font-bold text-secondary-900">
                    {servicosCount}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-secondary-400">Valor Recebido</p>
                  <p className="text-lg font-bold text-secondary-900">
                    {formatCurrency(valorTotalRecebido)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-50">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-secondary-400">Qualidade</p>
                  <p className="text-sm font-medium text-secondary-500">
                    {taxaSucesso}% sucesso
                  </p>
                </div>
              </div>
              {getClienteQualidadeBadge()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Orçamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Orçamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orcamentos.length === 0 ? (
            <p className="text-sm text-secondary-500 text-center py-4">
              Nenhum orçamento encontrado
            </p>
          ) : (
            <div className="space-y-3">
              {orcamentos.map((orc) => (
                <div
                  key={orc.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-secondary-200 hover:bg-secondary-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-secondary-900">
                        {orc.tipo_servico || "Sem tipo"}
                      </span>
                      <span className="text-xs text-secondary-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(orc.created_at, "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-secondary-900">
                      {orc.valor_final ? formatCurrency(orc.valor_final) : "-"}
                    </span>
                    {getStatusBadgeOrcamento(orc.status)}
                    <Link href={`/dashboard/orcamentos/${orc.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Serviços */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Histórico de Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          {servicos.length === 0 ? (
            <p className="text-sm text-secondary-500 text-center py-4">
              Nenhum serviço encontrado
            </p>
          ) : (
            <div className="space-y-3">
              {servicos.map((srv) => (
                <div
                  key={srv.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-secondary-200 hover:bg-secondary-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-secondary-900">
                        {srv.orcamento?.tipo_servico || "Sem tipo"}
                      </span>
                      <span className="text-xs text-secondary-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {srv.data_inicio
                          ? formatDate(srv.data_inicio, "dd/MM/yyyy")
                          : "Data não definida"}
                        {srv.data_conclusao && (
                          <> → {formatDate(srv.data_conclusao, "dd/MM/yyyy")}</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-secondary-900">
                      {srv.valor
                        ? formatCurrency(srv.valor)
                        : srv.orcamento?.valor_final
                          ? formatCurrency(srv.orcamento.valor_final)
                          : "-"}
                    </span>
                    {getStatusBadgeServico(srv.status)}
                    <Link href={`/dashboard/servicos/${srv.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      {cliente.notas && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-secondary-600 whitespace-pre-wrap">
              {cliente.notas}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <p className="text-sm text-secondary-400">
        Cadastrado em {formatDate(cliente.created_at, "dd 'de' MMMM 'de' yyyy")}
      </p>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)}>
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <ClienteForm
          key={cliente.id}
          defaultValues={{
            nome: cliente.nome,
            telefone: cliente.telefone,
            email: cliente.email ?? "",
            endereco: cliente.endereco ?? "",
            cidade: cliente.cidade ?? "",
            estado: cliente.estado ?? "",
            notas: cliente.notas ?? "",
          }}
          onSubmit={handleUpdate}
          onCancel={() => setShowEditDialog(false)}
          loading={submitting}
        />
      </Dialog>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        clienteNome={cliente.nome}
        loading={submitting}
      />
    </div>
  );
}
