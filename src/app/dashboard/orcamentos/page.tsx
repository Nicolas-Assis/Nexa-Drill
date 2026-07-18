"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, AlertTriangle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import {
  getOrcamentos,
  updateOrcamentoStatus,
  deleteOrcamento,
  createServicoDeOrcamento,
  getServicoIdByOrcamento,
} from "./actions";
import type { Orcamento, Cliente, StatusOrcamento } from "@/types";

export default function OrcamentosPage() {
  const router = useRouter();
  const [orcamentos, setOrcamentos] = useState<
    (Orcamento & { cliente?: Cliente })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [aprovadoOrcamentoId, setAprovadoOrcamentoId] = useState<string | null>(
    null,
  );
  const [criandoServico, setCriandoServico] = useState(false);

  const fetchOrcamentos = useCallback(async () => {
    setLoading(true);
    const result = await getOrcamentos();
    if (result.error) {
      toast.error(result.error);
    } else {
      setOrcamentos(result.orcamentos);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrcamentos();
  }, [fetchOrcamentos]);

  async function handleStatusChange(
    orcamentoId: string,
    newStatus: StatusOrcamento,
  ) {
    const result = await updateOrcamentoStatus(orcamentoId, newStatus);
    if (result.error) {
      toast.error(result.error);
      fetchOrcamentos();
      return;
    }
    toast.success("Status atualizado");
    // Ao aprovar, pergunta se cria o serviço vinculado (se ainda não existir)
    if (newStatus === "aprovado") {
      const existing = await getServicoIdByOrcamento(orcamentoId);
      if (!existing.servicoId) setAprovadoOrcamentoId(orcamentoId);
    }
  }

  async function handleCriarServicoAprovado() {
    if (!aprovadoOrcamentoId) return;
    setCriandoServico(true);
    const result = await createServicoDeOrcamento(aprovadoOrcamentoId);
    setCriandoServico(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Serviço criado e vinculado ao orçamento!");
    }
    setAprovadoOrcamentoId(null);
  }

  function handleEdit(id: string) {
    router.push(`/dashboard/orcamentos/${id}`);
  }

  function handleDeleteClick(id: string) {
    setDeleteId(id);
    setShowDeleteDialog(true);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteOrcamento(deleteId);
    setDeleting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Orçamento excluído");
      setOrcamentos((prev) => prev.filter((o) => o.id !== deleteId));
    }
    setShowDeleteDialog(false);
    setDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cards para alterar o status
          </p>
        </div>
        <Link href="/dashboard/orcamentos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <KanbanBoard
          orcamentos={orcamentos}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      )}

      {/* Criar serviço ao aprovar */}
      <Dialog
        open={!!aprovadoOrcamentoId}
        onClose={() => setAprovadoOrcamentoId(null)}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Orçamento aprovado
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-2">
          Deseja criar o serviço vinculado a partir deste orçamento agora? O
          escopo (itens, valor e observações) é carregado automaticamente.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setAprovadoOrcamentoId(null)}
            disabled={criandoServico}
          >
            Agora não
          </Button>
          <Button onClick={handleCriarServicoAprovado} disabled={criandoServico}>
            {criandoServico ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="mr-2 h-4 w-4" />
            )}
            Criar serviço
          </Button>
        </div>
      </Dialog>

      {/* Delete confirmation dialog */}
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
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
