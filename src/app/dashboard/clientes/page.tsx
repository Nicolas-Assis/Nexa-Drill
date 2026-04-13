"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { ClienteCard } from "@/components/clientes/cliente-card";
import { ClientesEmptyState } from "@/components/clientes/clientes-empty-state";
import { DeleteConfirmDialog } from "@/components/clientes/delete-confirm-dialog";
import { getClientes, createCliente, updateCliente, deleteCliente } from "./actions";
import type { Cliente } from "@/types";
import type { ClienteFormData } from "@/lib/validations";

const PER_PAGE = 10;

export default function ClientesPage() {
  const [clientes, setClientes] = useState<(Cliente & { _orcamentosCount: number })[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch clientes
  const fetchClientes = useCallback(async () => {
    setLoading(true);
    const result = await getClientes(debouncedSearch || undefined, page);
    if (result.error) {
      toast.error(result.error);
    } else {
      setClientes(result.clientes);
      setTotal(result.total);
    }
    setLoading(false);
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const totalPages = Math.ceil(total / PER_PAGE);

  // Handlers
  async function handleCreate(data: ClienteFormData) {
    setSubmitting(true);
    const result = await createCliente(data);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Cliente criado com sucesso!");
    setShowCreateDialog(false);
    fetchClientes();
  }

  async function handleUpdate(data: ClienteFormData) {
    if (!editingCliente) return;
    setSubmitting(true);
    const result = await updateCliente(editingCliente.id, data);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Cliente atualizado com sucesso!");
    setEditingCliente(null);
    fetchClientes();
  }

  async function handleDelete() {
    if (!deletingCliente) return;
    setSubmitting(true);
    const result = await deleteCliente(deletingCliente.id);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Cliente excluído com sucesso!");
    setDeletingCliente(null);
    fetchClientes();
  }

  function handleCloseDialog() {
    setShowCreateDialog(false);
    setEditingCliente(null);
  }

  const isDialogOpen = showCreateDialog || !!editingCliente;
  const hasData = clientes.length > 0;
  const isEmptyWithoutSearch = !hasData && !debouncedSearch && !loading;
  const isEmptyWithSearch = !hasData && !!debouncedSearch && !loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Clientes</h1>
          <p className="text-secondary-500 text-sm">
            {total > 0 ? `${total} cliente${total !== 1 ? "s" : ""} cadastrado${total !== 1 ? "s" : ""}` : "Gerencie seus clientes"}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      {(!isEmptyWithoutSearch || loading) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white pl-10 pr-4 py-2 text-sm placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isEmptyWithoutSearch ? (
        <ClientesEmptyState onAdd={() => setShowCreateDialog(true)} />
      ) : isEmptyWithSearch ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-secondary-200 bg-white px-6 py-16">
          <Search className="h-10 w-10 text-secondary-300" />
          <h3 className="mt-4 text-lg font-semibold text-secondary-900">Nenhum resultado</h3>
          <p className="mt-1 text-sm text-secondary-500">
            Nenhum cliente encontrado para &ldquo;{debouncedSearch}&rdquo;
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <ClientesTable
                  clientes={clientes}
                  onEdit={setEditingCliente}
                  onDelete={setDeletingCliente}
                />
              </CardContent>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {clientes.map((cliente) => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                onEdit={setEditingCliente}
                onDelete={setDeletingCliente}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary-500">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Próximo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogHeader>
          <DialogTitle>
            {editingCliente ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>
        <ClienteForm
          key={editingCliente?.id ?? "new"}
          defaultValues={
            editingCliente
              ? {
                  nome: editingCliente.nome,
                  telefone: editingCliente.telefone,
                  email: editingCliente.email ?? "",
                  endereco: editingCliente.endereco ?? "",
                  cidade: editingCliente.cidade ?? "",
                  estado: editingCliente.estado ?? "",
                  notas: editingCliente.notas ?? "",
                }
              : undefined
          }
          onSubmit={editingCliente ? handleUpdate : handleCreate}
          onCancel={handleCloseDialog}
          loading={submitting}
        />
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingCliente}
        onClose={() => setDeletingCliente(null)}
        onConfirm={handleDelete}
        clienteNome={deletingCliente?.nome ?? ""}
        loading={submitting}
      />
    </div>
  );
}
