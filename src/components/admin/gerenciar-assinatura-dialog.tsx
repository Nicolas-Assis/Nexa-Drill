"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { CicloAssinatura, Plano } from "@/types";
import {
  gerenciarAssinatura,
  cancelarAssinatura,
} from "@/app/admin/assinaturas/actions";

type Modo = "cobrar" | "cortesia";
type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";

export function GerenciarAssinaturaDialog({
  open,
  onClose,
  perfuradorId,
  planos,
  currentPlanoId,
  currentCiclo = "mensal",
  hasAssinaturaAtiva,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  perfuradorId: string;
  planos: Plano[];
  currentPlanoId?: string | null;
  currentCiclo?: CicloAssinatura;
  hasAssinaturaAtiva?: boolean;
  onDone: () => void;
}) {
  const ativos = useMemo(() => planos.filter((p) => p.ativo), [planos]);
  const [planoId, setPlanoId] = useState(currentPlanoId ?? ativos[0]?.id ?? "");
  const [ciclo, setCiclo] = useState<CicloAssinatura>(currentCiclo);
  const [modo, setModo] = useState<Modo>("cobrar");
  const [billingType, setBillingType] = useState<BillingType>("PIX");
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const plano = ativos.find((p) => p.id === planoId);
  const preco = plano
    ? ciclo === "anual"
      ? plano.preco_anual ?? plano.preco_mensal * 12
      : plano.preco_mensal
    : 0;

  async function handleSave() {
    if (!planoId) {
      toast.error("Selecione um plano");
      return;
    }
    setSaving(true);
    const res = await gerenciarAssinatura(perfuradorId, {
      plano_id: planoId,
      ciclo,
      billing_type: billingType,
      modo,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      modo === "cobrar"
        ? "Assinatura configurada — cobrança recorrente criada no Asaas."
        : "Acesso concedido (cortesia).",
    );
    onDone();
    onClose();
  }

  async function handleCancel() {
    setCanceling(true);
    const res = await cancelarAssinatura(perfuradorId);
    setCanceling(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Assinatura cancelada.");
    onDone();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Gerenciar assinatura</DialogTitle>
        <DialogDescription>
          Atribua um plano e cobre via Asaas, ou conceda acesso como cortesia.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <Select
          label="Plano"
          value={planoId}
          onChange={(e) => setPlanoId(e.target.value)}
          options={ativos.map((p) => ({ value: p.id, label: p.nome }))}
          placeholder="Selecione um plano"
        />

        <Select
          label="Ciclo"
          value={ciclo}
          onChange={(e) => setCiclo(e.target.value as CicloAssinatura)}
          options={[
            { value: "mensal", label: "Mensal" },
            { value: "anual", label: "Anual" },
          ]}
        />

        <Select
          label="Modo"
          value={modo}
          onChange={(e) => setModo(e.target.value as Modo)}
          options={[
            { value: "cobrar", label: "Cobrar (Asaas recorrente)" },
            { value: "cortesia", label: "Cortesia (sem cobrança)" },
          ]}
        />

        {modo === "cobrar" && (
          <Select
            label="Forma de pagamento"
            value={billingType}
            onChange={(e) => setBillingType(e.target.value as BillingType)}
            options={[
              { value: "PIX", label: "Pix" },
              { value: "BOLETO", label: "Boleto" },
              { value: "CREDIT_CARD", label: "Cartão de crédito" },
              { value: "UNDEFINED", label: "Deixar o cliente escolher" },
            ]}
          />
        )}

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor {ciclo === "anual" ? "anual" : "mensal"}</span>
            <span className="font-semibold text-foreground">{formatCurrency(preco)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
          {hasAssinaturaAtiva ? (
            <Button variant="danger" onClick={handleCancel} isLoading={canceling} type="button">
              Cancelar assinatura
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} type="button">
              Fechar
            </Button>
            <Button onClick={handleSave} isLoading={saving} type="button">
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
