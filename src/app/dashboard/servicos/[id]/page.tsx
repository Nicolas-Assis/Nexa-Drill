"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  DollarSign,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServicoForm } from "@/components/servicos/servico-form";
import { MargemCard } from "@/components/servicos/margem-card";
import { ConcluirServicoModal } from "@/components/servicos/concluir-servico-modal";
import { ServicoFotos } from "@/components/servicos/servico-fotos";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  STATUS_SERVICO_OPTIONS,
  SERVICO_LABELS,
  SOLO_LABELS,
} from "@/lib/constants";
import {
  getServicoById,
  updateServico,
  deleteServico,
  getClientesForSelect,
  getOrcamentosForSelect,
  cancelarServico,
  type ServicoCreateData,
} from "../actions";
import type { Servico, Cliente, Orcamento, StatusServico } from "@/types";

type ServicoWithRelations = Servico & {
  cliente?: Cliente;
  orcamento?: Orcamento;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function getStatusBadge(status: StatusServico) {
  const statusOpt = STATUS_SERVICO_OPTIONS.find((s) => s.value === status);
  const label = statusOpt?.label ?? status;

  switch (status) {
    case "concluido":
      return <Badge variant="success">{label}</Badge>;
    case "cancelado":
      return <Badge variant="danger">{label}</Badge>;
    default:
      return <Badge variant="warning">{label}</Badge>;
  }
}

export default function ServicoDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [servico, setServico] = useState<ServicoWithRelations | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [orcamentos, setOrcamentos] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Modal de conclusão
  const [showConcluirModal, setShowConcluirModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [servRes, clientesRes, orcamentosRes] = await Promise.all([
      getServicoById(params.id),
      getClientesForSelect(),
      getOrcamentosForSelect(),
    ]);

    if (servRes.error || !servRes.servico) {
      toast.error(servRes.error ?? "Serviço não encontrado");
      router.push("/dashboard/servicos");
      return;
    }
    setServico(servRes.servico as ServicoWithRelations);
    if (!clientesRes.error) setClientes(clientesRes.clientes);
    if (!orcamentosRes.error) setOrcamentos(orcamentosRes.orcamentos);
    setLoading(false);
  }, [params.id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleUpdate(data: ServicoCreateData) {
    if (!servico) return;
    setSubmitting(true);
    const result = await updateServico(servico.id, data);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Serviço atualizado!");
    setShowEdit(false);
    fetchData();
  }

  function abrirModalConcluir() {
    if (!servico) return;
    setShowConcluirModal(true);
  }

  async function handleCancelar() {
    if (!servico) return;
    setSubmitting(true);
    const result = await cancelarServico(servico.id);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Serviço cancelado.");
    fetchData();
  }

  async function handleDelete() {
    if (!servico) return;
    setDeleting(true);
    const result = await deleteServico(servico.id);
    setDeleting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Serviço excluído.");
    router.push("/dashboard/servicos");
  }

  if (loading || !servico) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isOpen = servico.status === "andamento";

  const editDefaults: Partial<ServicoCreateData> = {
    cliente_id: servico.cliente_id,
    orcamento_id: servico.orcamento_id,
    valor: servico.valor,
    status: servico.status,
    endereco: servico.endereco,
    data_inicio: servico.data_inicio,
    data_conclusao: servico.data_conclusao,
    profundidade_real_metros: servico.profundidade_real_metros,
    diametro_polegadas: servico.diametro_polegadas,
    tipo_solo_encontrado: servico.tipo_solo_encontrado,
    vazao_litros_hora: servico.vazao_litros_hora,
    nivel_estatico_metros: servico.nivel_estatico_metros,
    nivel_dinamico_metros: servico.nivel_dinamico_metros,
    notas: servico.notas,
  };

  const valorServico = servico.valor ?? servico.orcamento?.valor_final ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/servicos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para serviços
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              Detalhes do Serviço
            </h1>
            {getStatusBadge(servico.status)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isOpen && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={abrirModalConcluir}
                  disabled={submitting}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Concluir serviço
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelar}
                  disabled={submitting}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Cancelar serviço
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEdit(true)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Valor destacado */}
      {valorServico != null && (
        <Card className="border-primary-200 bg-primary-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-primary-600">Valor do Serviço</p>
                <p className="text-2xl font-bold text-primary-700">
                  {formatCurrency(valorServico)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <MargemCard
        servicoId={servico.id}
        profundidadeReal={servico.profundidade_real_metros}
      />

      {/* Client + Orcamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servico.cliente && (
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                {servico.cliente.nome}
              </p>
              {servico.cliente.telefone && (
                <p className="text-muted-foreground">{servico.cliente.telefone}</p>
              )}
              {(servico.cliente.cidade || servico.cliente.estado) && (
                <p className="text-muted-foreground">
                  {[servico.cliente.cidade, servico.cliente.estado]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {servico.orcamento && (
          <Card>
            <CardHeader>
              <CardTitle>Orçamento Vinculado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Link
                href={`/dashboard/orcamentos/${servico.orcamento.id}`}
                className="font-medium text-primary hover:underline"
              >
                #{servico.orcamento.id.slice(0, 8).toUpperCase()}
              </Link>
              {servico.orcamento.tipo_servico && (
                <p className="text-muted-foreground">
                  {SERVICO_LABELS[servico.orcamento.tipo_servico] ??
                    servico.orcamento.tipo_servico}
                </p>
              )}
              {servico.orcamento.valor_final != null && (
                <p className="font-semibold text-foreground">
                  {formatCurrency(servico.orcamento.valor_final)}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Escopo do orçamento (itens + observações, via vínculo) */}
      {servico.orcamento &&
        Array.isArray(servico.orcamento.itens) &&
        servico.orcamento.itens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Escopo do Orçamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {servico.orcamento.itens.map((item, i) => (
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
              {servico.orcamento.valor_final != null && (
                <div className="mt-4 flex justify-between border-t border-border pt-3 text-sm">
                  <span className="font-semibold">Total do orçamento</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(servico.orcamento.valor_final)}
                  </span>
                </div>
              )}
              {servico.orcamento.observacoes && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-1 text-sm text-muted-foreground">
                    Observações do orçamento:
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {servico.orcamento.observacoes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Datas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <InfoRow
            label="Início"
            value={
              servico.data_inicio ? formatDate(servico.data_inicio) : undefined
            }
          />
          <InfoRow
            label="Conclusão"
            value={
              servico.data_conclusao
                ? formatDate(servico.data_conclusao)
                : "Em andamento"
            }
          />
          {servico.endereco && (
            <InfoRow label="Endereço" value={servico.endereco} />
          )}
        </CardContent>
      </Card>

      {/* Technical Data */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Técnicos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <InfoRow
            label="Profundidade real"
            value={
              servico.profundidade_real_metros != null
                ? `${servico.profundidade_real_metros} m`
                : undefined
            }
          />
          <InfoRow
            label="Diâmetro"
            value={
              servico.diametro_polegadas != null
                ? `${servico.diametro_polegadas}"`
                : undefined
            }
          />
          <InfoRow
            label="Solo encontrado"
            value={
              servico.tipo_solo_encontrado
                ? (SOLO_LABELS[servico.tipo_solo_encontrado] ??
                  servico.tipo_solo_encontrado)
                : undefined
            }
          />
          <InfoRow
            label="Vazão"
            value={
              servico.vazao_litros_hora != null
                ? `${servico.vazao_litros_hora} L/h`
                : undefined
            }
          />
          <InfoRow
            label="Nível estático"
            value={
              servico.nivel_estatico_metros != null
                ? `${servico.nivel_estatico_metros} m`
                : undefined
            }
          />
          <InfoRow
            label="Nível dinâmico"
            value={
              servico.nivel_dinamico_metros != null
                ? `${servico.nivel_dinamico_metros} m`
                : undefined
            }
          />
          {servico.notas && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground mb-0.5">Notas</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {servico.notas}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fotos do Serviço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotos do Serviço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ServicoFotos
            servicoId={servico.id}
            fotos={servico.fotos ?? []}
            onChanged={fetchData}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Editar Serviço</DialogTitle>
        </DialogHeader>
        <ServicoForm
          onSubmit={handleUpdate}
          loading={submitting}
          defaultValues={editDefaults}
          clientes={clientes}
          orcamentos={orcamentos}
        />
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        className="max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>Confirmar exclusão</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-6">
          Tem certeza que deseja excluir este serviço? Esta ação não pode ser
          desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <X className="mr-1 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1 h-4 w-4" />
            )}
            Excluir
          </Button>
        </div>
      </Dialog>

      {/* Modal de Conclusão (à vista / parcelado / com sinal) */}
      <ConcluirServicoModal
        open={showConcluirModal}
        onClose={() => setShowConcluirModal(false)}
        servico={servico}
        onConcluded={fetchData}
      />
    </div>
  );
}
