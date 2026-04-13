"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import {
  getOrcamentos,
  updateOrcamentoStatus,
  deleteOrcamento,
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
    } else {
      toast.success("Status atualizado");
    }
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
          <h1 className="text-2xl font-bold text-secondary-900">Orçamentos</h1>
          <p className="text-sm text-secondary-500">
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
        <p className="text-sm text-secondary-600 mt-2">
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
