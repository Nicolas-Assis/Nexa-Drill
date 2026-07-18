"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Package, Plus, Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlanoForm } from "@/components/admin/plano-form";
import { formatCurrency } from "@/lib/utils";
import type { Plano } from "@/types";
import type { PlanoFormData } from "@/lib/validations";
import {
  getPlanos,
  createPlano,
  updatePlano,
  deletePlano,
  togglePlanoAtivo,
} from "./actions";

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Plano | null>(null);

  const fetchPlanos = useCallback(async () => {
    setLoading(true);
    const res = await getPlanos();
    if (res.error) toast.error(res.error);
    else setPlanos(res.planos);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlanos();
  }, [fetchPlanos]);

  async function handleCreate(data: PlanoFormData) {
    setSubmitting(true);
    const res = await createPlano(data);
    setSubmitting(false);
    if (res.error) return toast.error(res.error);
    toast.success("Plano criado.");
    setShowCreate(false);
    fetchPlanos();
  }

  async function handleUpdate(data: PlanoFormData) {
    if (!editing) return;
    setSubmitting(true);
    const res = await updatePlano(editing.id, data);
    setSubmitting(false);
    if (res.error) return toast.error(res.error);
    toast.success("Plano atualizado.");
    setEditing(null);
    fetchPlanos();
  }

  async function handleToggle(p: Plano) {
    const res = await togglePlanoAtivo(p.id, !p.ativo);
    if (res.error) return toast.error(res.error);
    toast.success(p.ativo ? "Plano desativado." : "Plano ativado.");
    fetchPlanos();
  }

  async function handleDelete(p: Plano) {
    if (!window.confirm(`Excluir o plano "${p.nome}"? Assinaturas ligadas a ele ficarão sem plano.`))
      return;
    const res = await deletePlano(p.id);
    if (res.error) return toast.error(res.error);
    toast.success("Plano excluído.");
    fetchPlanos();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos"
        description="Catálogo de planos de assinatura da plataforma."
        icon={Package}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo plano
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : planos.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum plano cadastrado"
          action={<Button onClick={() => setShowCreate(true)}>Criar primeiro plano</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planos.map((p) => (
            <Card key={p.id} className={p.destaque ? "ring-2 ring-primary/40" : ""}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-foreground">{p.nome}</h3>
                      {p.destaque && <Badge variant="info">Destaque</Badge>}
                      {!p.ativo && <Badge variant="default">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">/{p.slug}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(p.preco_mensal)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                  {p.preco_anual != null && p.preco_anual > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ou {formatCurrency(p.preco_anual)}/ano
                    </p>
                  )}
                </div>

                {p.descricao && (
                  <p className="mt-2 text-sm text-muted-foreground">{p.descricao}</p>
                )}

                {p.recursos.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {p.recursos.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex gap-2 pt-4">
                  <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(p)}>
                    {p.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p)} aria-label="Excluir">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate || !!editing} onClose={() => (editing ? setEditing(null) : setShowCreate(false))}>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle>
        </DialogHeader>
        <PlanoForm
          key={editing?.id ?? "new"}
          plano={editing}
          loading={submitting}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => (editing ? setEditing(null) : setShowCreate(false))}
        />
      </Dialog>
    </div>
  );
}
