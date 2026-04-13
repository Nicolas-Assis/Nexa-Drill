"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  MapPin,
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  DollarSign,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ServicoForm } from "@/components/servicos/servico-form";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { STATUS_SERVICO_OPTIONS, SERVICO_LABELS } from "@/lib/constants";
import {
  getServicos,
  createServico,
  deleteServico,
  getClientesForSelect,
  getOrcamentosForSelect,
  concluirServicoComReceita,
  cancelarServico,
  type ServicoCreateData,
} from "./actions";
import type { Servico, Cliente, Orcamento, StatusServico } from "@/types";

type ServicoWithRelations = Servico & {
  cliente?: Cliente;
  orcamento?: Pick<Orcamento, "id" | "tipo_servico" | "valor_final">;
};

type FilterStatus = "todos" | "andamento" | "concluido" | "cancelado";

export default function ServicosPage() {
  const [servicos, setServicos] = useState<ServicoWithRelations[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [orcamentos, setOrcamentos] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("todos");

  // Modal de conclusão
  const [showConcluirModal, setShowConcluirModal] = useState(false);
  const [servicoParaConcluir, setServicoParaConcluir] =
    useState<ServicoWithRelations | null>(null);
  const [concluirForm, setConcluirForm] = useState({
    valor: 0,
    desconto: 0,
    data: new Date().toISOString().split("T")[0],
    descricao: "",
  });

  // Confirmação de exclusão/cancelamento
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [servRes, clientesRes, orcamentosRes] = await Promise.all([
      getServicos(),
      getClientesForSelect(),
      getOrcamentosForSelect(),
    ]);
    if (servRes.error) toast.error(servRes.error);
    else setServicos(servRes.servicos as ServicoWithRelations[]);
    if (!clientesRes.error) setClientes(clientesRes.clientes);
    if (!orcamentosRes.error) setOrcamentos(orcamentosRes.orcamentos);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreate(data: ServicoCreateData) {
    setSubmitting(true);
    const result = await createServico(data);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Serviço criado com sucesso!");
    setShowForm(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteServico(id);
    setDeletingId(null);
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Serviço excluído.");
    fetchData();
  }

  function confirmDelete(id: string) {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  }

  function abrirModalConcluir(servico: ServicoWithRelations) {
    const valorBase = servico.valor ?? servico.orcamento?.valor_final ?? 0;
    setConcluirForm({
      valor: valorBase,
      desconto: 0,
      data: new Date().toISOString().split("T")[0],
      descricao: `Serviço concluído${servico.cliente ? ` - ${servico.cliente.nome}` : ""}`,
    });
    setServicoParaConcluir(servico);
    setShowConcluirModal(true);
  }

  async function handleConfirmarConclusao() {
    if (!servicoParaConcluir) return;
    setSubmitting(true);
    const result = await concluirServicoComReceita(
      servicoParaConcluir.id,
      concluirForm,
    );
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Serviço concluído e receita registrada!");
    setShowConcluirModal(false);
    setServicoParaConcluir(null);
    fetchData();
  }

  async function handleCancelar(id: string) {
    setSubmitting(true);
    const result = await cancelarServico(id);
    setSubmitting(false);
    setShowCancelConfirm(false);
    setCancelTargetId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Serviço cancelado.");
    fetchData();
  }

  function confirmCancel(id: string) {
    setCancelTargetId(id);
    setShowCancelConfirm(true);
  }

  const filtered = servicos.filter((s) => {
    const matchSearch =
      !search ||
      s.cliente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      s.endereco?.toLowerCase().includes(search.toLowerCase()) ||
      s.orcamento?.tipo_servico?.toLowerCase().includes(search.toLowerCase());

    const matchStatus = filterStatus === "todos" || s.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const andamentoCount = servicos.filter(
    (s) => s.status === "andamento",
  ).length;
  const concluidoCount = servicos.filter(
    (s) => s.status === "concluido",
  ).length;
  const canceladoCount = servicos.filter(
    (s) => s.status === "cancelado",
  ).length;

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

  function getServicoValor(s: ServicoWithRelations): number | null {
    return s.valor ?? s.orcamento?.valor_final ?? null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Serviços</h1>
          <p className="text-secondary-500">
            Gerencie seus serviços de perfuração
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-500">Total</p>
            <p className="text-2xl font-bold text-secondary-900 mt-1">
              {loading ? "—" : servicos.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-500">Em andamento</p>
            <p className="text-2xl font-bold text-accent mt-1">
              {loading ? "—" : andamentoCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-500">Concluídos</p>
            <p className="text-2xl font-bold text-success mt-1">
              {loading ? "—" : concluidoCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-500">Cancelados</p>
            <p className="text-2xl font-bold text-danger mt-1">
              {loading ? "—" : canceladoCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, local ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-secondary-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-secondary-200 bg-secondary-50 p-1 h-9">
          {(
            [
              { value: "todos", label: "Todos" },
              { value: "andamento", label: "Em andamento" },
              { value: "concluido", label: "Concluídos" },
              { value: "cancelado", label: "Cancelados" },
            ] as { value: FilterStatus; label: string }[]
          ).map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={cn(
                "px-3 rounded-md text-xs font-medium transition-colors",
                filterStatus === opt.value
                  ? "bg-white text-secondary-900 shadow-sm"
                  : "text-secondary-500 hover:text-secondary-700",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo de Serviço</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-secondary-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-secondary-400"
                  >
                    {servicos.length === 0
                      ? 'Nenhum serviço cadastrado. Clique em "Novo Serviço" para começar.'
                      : "Nenhum serviço encontrado com os filtros aplicados."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id} className="hover:bg-secondary-50">
                    <TableCell>
                      <Link
                        href={`/dashboard/servicos/${s.id}`}
                        className="font-medium text-secondary-900 hover:text-primary transition-colors"
                      >
                        {s.cliente?.nome ?? "—"}
                      </Link>
                      {s.cliente?.cidade && (
                        <span className="flex items-center gap-1 text-xs text-secondary-400 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {s.cliente.cidade}
                          {s.cliente.estado ? `, ${s.cliente.estado}` : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-secondary-600">
                      {s.orcamento?.tipo_servico
                        ? (SERVICO_LABELS[s.orcamento.tipo_servico] ??
                          s.orcamento.tipo_servico)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-secondary-600 max-w-[160px] truncate">
                      {s.endereco ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-secondary-600">
                      {s.data_inicio ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(s.data_inicio)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-secondary-900">
                      {getServicoValor(s) != null
                        ? formatCurrency(getServicoValor(s)!)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {s.status === "andamento" && (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirModalConcluir(s)}
                              className="p-1.5 rounded text-secondary-400 hover:text-success hover:bg-success-50 transition-colors"
                              title="Concluir serviço"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmCancel(s.id)}
                              className="p-1.5 rounded text-secondary-400 hover:text-danger hover:bg-danger-50 transition-colors"
                              title="Cancelar serviço"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => confirmDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 rounded text-secondary-300 hover:text-danger hover:bg-danger-50 transition-colors disabled:opacity-50"
                          title="Excluir serviço"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Novo Serviço</DialogTitle>
        </DialogHeader>
        <ServicoForm
          onSubmit={handleCreate}
          loading={submitting}
          clientes={clientes}
          orcamentos={orcamentos}
        />
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

      {/* Confirmação de Exclusão */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTargetId(null);
        }}
        className="max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <Trash2 className="h-5 w-5" />
            Excluir Serviço
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-600 mt-2 mb-6">
          Tem certeza que deseja excluir este serviço? Esta ação não pode ser
          desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteTargetId(null);
            }}
            disabled={!!deletingId}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
            disabled={!!deletingId}
          >
            {deletingId ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Excluir
          </Button>
        </div>
      </Dialog>

      {/* Confirmação de Cancelamento */}
      <Dialog
        open={showCancelConfirm}
        onClose={() => {
          setShowCancelConfirm(false);
          setCancelTargetId(null);
        }}
        className="max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-accent-700">
            <XCircle className="h-5 w-5" />
            Cancelar Serviço
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-600 mt-2 mb-6">
          Tem certeza que deseja cancelar este serviço? O serviço será marcado
          como cancelado e não poderá ser revertido.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowCancelConfirm(false);
              setCancelTargetId(null);
            }}
            disabled={submitting}
          >
            Voltar
          </Button>
          <Button
            variant="danger"
            onClick={() => cancelTargetId && handleCancelar(cancelTargetId)}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Confirmar Cancelamento
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
