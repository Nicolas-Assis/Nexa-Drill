"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Plus,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ServicoForm } from "@/components/servicos/servico-form";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_SERVICO_OPTIONS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  getServicoById,
  updateServico,
  deleteServico,
  getClientesForSelect,
  getOrcamentosForSelect,
  concluirServicoComReceita,
  cancelarServico,
  addServicoFoto,
  removeServicoFoto,
  type ServicoCreateData,
} from "../actions";
import type { Servico, Cliente, Orcamento, StatusServico } from "@/types";

const SERVICO_LABELS: Record<string, string> = {
  perfuracao: "Perfuração",
  manutencao: "Manutenção",
  limpeza: "Limpeza",
  bombeamento: "Bombeamento",
};

const SOLO_LABELS: Record<string, string> = {
  rocha: "Rocha",
  areia: "Areia",
  argila: "Argila",
  misto: "Misto",
};

type ServicoWithRelations = Servico & {
  cliente?: Cliente;
  orcamento?: Orcamento;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-secondary-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-secondary-900">{value ?? "—"}</p>
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

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Modal de conclusão
  const [showConcluirModal, setShowConcluirModal] = useState(false);
  const [concluirForm, setConcluirForm] = useState({
    valor: 0,
    desconto: 0,
    data: new Date().toISOString().split("T")[0],
    descricao: "",
  });

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
    const valorBase = servico.valor ?? servico.orcamento?.valor_final ?? 0;
    setConcluirForm({
      valor: valorBase,
      desconto: 0,
      data: new Date().toISOString().split("T")[0],
      descricao: `Serviço concluído${servico.cliente ? ` - ${servico.cliente.nome}` : ""}`,
    });
    setShowConcluirModal(true);
  }

  async function handleConfirmarConclusao() {
    if (!servico) return;
    setSubmitting(true);
    const result = await concluirServicoComReceita(servico.id, concluirForm);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Serviço concluído e receita registrada!");
    setShowConcluirModal(false);
    fetchData();
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !servico) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploadingPhoto(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${servico.id}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("servicos")
      .upload(path, file);

    if (error) {
      toast.error("Erro ao fazer upload da imagem.");
      setUploadingPhoto(false);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("servicos")
      .getPublicUrl(data.path);

    const result = await addServicoFoto(servico.id, publicData.publicUrl);
    setUploadingPhoto(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Foto adicionada!");
    fetchData();

    // Clear input
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto(fotoUrl: string) {
    if (!servico) return;
    setDeletingPhoto(fotoUrl);
    const result = await removeServicoFoto(servico.id, fotoUrl);
    setDeletingPhoto(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Foto removida!");
    fetchData();
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
          className="inline-flex items-center gap-1 text-sm text-secondary-500 hover:text-secondary-700 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para serviços
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-secondary-900">
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

      {/* Client + Orcamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servico.cliente && (
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-secondary-900">
                {servico.cliente.nome}
              </p>
              {servico.cliente.telefone && (
                <p className="text-secondary-500">{servico.cliente.telefone}</p>
              )}
              {(servico.cliente.cidade || servico.cliente.estado) && (
                <p className="text-secondary-500">
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
                <p className="text-secondary-500">
                  {SERVICO_LABELS[servico.orcamento.tipo_servico] ??
                    servico.orcamento.tipo_servico}
                </p>
              )}
              {servico.orcamento.valor_final != null && (
                <p className="font-semibold text-secondary-900">
                  {formatCurrency(servico.orcamento.valor_final)}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
              <p className="text-xs text-secondary-400 mb-0.5">Notas</p>
              <p className="text-sm text-secondary-900 whitespace-pre-wrap">
                {servico.notas}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fotos do Serviço */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Fotos do Serviço
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Adicionar foto
            </Button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Upload de foto do serviço"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </CardHeader>
        <CardContent>
          {servico.fotos && servico.fotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {servico.fotos.map((foto, index) => (
                <div key={index} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto}
                    alt={`Foto ${index + 1}`}
                    className="h-32 w-full object-cover rounded-lg border border-secondary-200"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeletePhoto(foto)}
                    disabled={deletingPhoto === foto}
                  >
                    {deletingPhoto === foto ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-secondary-400">
              <ImageIcon className="h-12 w-12 mb-3" />
              <p className="text-sm">Nenhuma foto adicionada</p>
              <p className="text-xs mt-1">
                Adicione fotos para exibir no seu portfólio público
              </p>
            </div>
          )}
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
        <p className="text-sm text-secondary-600 mb-6">
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

      {/* Modal de Conclusão */}
      <Dialog
        open={showConcluirModal}
        onClose={() => setShowConcluirModal(false)}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Confirmar Conclusão do Serviço
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-600 mt-2 mb-4">
          Confirme os dados de recebimento. Um lançamento de receita será criado
          automaticamente no financeiro.
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
    </div>
  );
}
