"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  CreditCard,
  Check,
  AlertTriangle,
  Copy,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  STATUS_ASSINATURA_LABELS,
  STATUS_ASSINATURA_VARIANT,
  STATUS_FATURA_LABELS,
  STATUS_FATURA_VARIANT,
} from "@/lib/admin-format";
import type {
  Assinatura,
  CicloAssinatura,
  Fatura,
  Plano,
  StatusAssinatura,
  StatusFatura,
} from "@/types";
import type { AsaasBillingType } from "@/lib/asaas";
import { assinarPlano, getFaturaPix, getMinhaAssinatura } from "./actions";

export default function AssinaturaPage() {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [planoAtual, setPlanoAtual] = useState<Plano | null>(null);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [temCpf, setTemCpf] = useState(true);
  const [loading, setLoading] = useState(true);

  const [planoParaAssinar, setPlanoParaAssinar] = useState<Plano | null>(null);
  const [ciclo, setCiclo] = useState<CicloAssinatura>("mensal");
  const [billingType, setBillingType] = useState<AsaasBillingType>("PIX");
  const [assinando, setAssinando] = useState(false);

  const [pixOpen, setPixOpen] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pix, setPix] = useState<{ encodedImage: string; payload: string } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await getMinhaAssinatura();
    if (res.error) toast.error(res.error);
    setAssinatura(res.assinatura);
    setPlanoAtual(res.plano);
    setFaturas(res.faturas);
    setPlanos(res.planos);
    setTemCpf(res.temCpf);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAssinar() {
    if (!planoParaAssinar) return;
    setAssinando(true);
    const res = await assinarPlano(planoParaAssinar.id, ciclo, billingType);
    setAssinando(false);
    if (res.error) return toast.error(res.error);
    toast.success("Assinatura criada! A cobrança foi gerada — verifique suas faturas.");
    setPlanoParaAssinar(null);
    fetchData();
  }

  async function handleVerPix(fatura: Fatura) {
    setPixOpen(true);
    setPixLoading(true);
    setPix(null);
    const res = await getFaturaPix(fatura.id);
    setPixLoading(false);
    if ("error" in res) {
      toast.error(res.error);
      setPixOpen(false);
      return;
    }
    setPix(res);
  }

  function copyPix() {
    if (!pix) return;
    navigator.clipboard.writeText(pix.payload);
    toast.success("Código Pix copiado!");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = assinatura?.status as StatusAssinatura | undefined;
  const precoDoCiclo = (p: Plano, c: CicloAssinatura) =>
    c === "anual" ? p.preco_anual ?? p.preco_mensal * 12 : p.preco_mensal;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinatura"
        description="Seu plano, cobranças e formas de pagamento."
        icon={CreditCard}
      />

      {/* Banners de status */}
      {(status === "inadimplente" || status === "expirada" || status === "cancelada") && (
        <div className="flex items-start gap-3 rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              {status === "inadimplente"
                ? "Pagamento pendente"
                : status === "expirada"
                ? "Assinatura expirada"
                : "Assinatura cancelada"}
            </p>
            <p>Regularize para manter o acesso completo à plataforma.</p>
          </div>
        </div>
      )}
      {!temCpf && (
        <div className="flex items-start gap-3 rounded-lg border border-accent-200 bg-accent-50 p-4 text-sm text-accent-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Cadastre seu CPF/CNPJ</p>
            <p>
              Para assinar um plano pago, informe o CPF/CNPJ em{" "}
              <Link href="/dashboard/perfil" className="underline">
                Meu Perfil
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {/* Plano atual */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plano atual</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {planoAtual?.nome ?? "Sem plano"}
                </h2>
                {status && (
                  <Badge variant={STATUS_ASSINATURA_VARIANT[status] ?? "default"}>
                    {STATUS_ASSINATURA_LABELS[status] ?? status}
                  </Badge>
                )}
              </div>
              {assinatura && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {assinatura.ciclo === "anual" ? "Anual" : "Mensal"} ·{" "}
                  {formatCurrency(Number(assinatura.preco))}
                  {status === "trial" && assinatura.trial_ate
                    ? ` · trial até ${formatDate(assinatura.trial_ate)}`
                    : assinatura.periodo_atual_fim
                    ? ` · renova em ${formatDate(assinatura.periodo_atual_fim)}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planos disponíveis */}
      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-foreground">Planos disponíveis</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planos
            .filter((p) => p.preco_mensal > 0)
            .map((p) => {
              const atual = planoAtual?.id === p.id && (status === "ativa" || status === "inadimplente");
              return (
                <Card key={p.id} className={p.destaque ? "ring-2 ring-primary/40" : ""}>
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-lg font-bold text-foreground">{p.nome}</h4>
                      {p.destaque && <Badge variant="info">Popular</Badge>}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-foreground">
                        {formatCurrency(p.preco_mensal)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
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
                    <div className="mt-auto pt-4">
                      <Button
                        className="w-full"
                        variant={atual ? "outline" : "primary"}
                        disabled={atual}
                        onClick={() => {
                          setPlanoParaAssinar(p);
                          setCiclo("mensal");
                          setBillingType("PIX");
                        }}
                      >
                        {atual ? "Plano atual" : "Assinar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      {/* Faturas */}
      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-foreground">Minhas faturas</h3>
        {faturas.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhuma fatura ainda.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {faturas.map((f) => (
                <div key={f.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{formatCurrency(f.valor)}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.vencimento ? `Vence ${formatDate(f.vencimento)}` : formatDate(f.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_FATURA_VARIANT[f.status as StatusFatura] ?? "default"}>
                      {STATUS_FATURA_LABELS[f.status as StatusFatura] ?? f.status}
                    </Badge>
                    {(f.status === "pendente" || f.status === "atrasado") && (
                      <>
                        {f.asaas_payment_id && (
                          <Button variant="outline" size="sm" onClick={() => handleVerPix(f)}>
                            <QrCode className="mr-1 h-4 w-4" />
                            Pix
                          </Button>
                        )}
                        {(f.boleto_url || f.link_pagamento) && (
                          <a href={(f.boleto_url || f.link_pagamento)!} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="mr-1 h-4 w-4" />
                              Abrir
                            </Button>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog assinar */}
      <Dialog open={!!planoParaAssinar} onClose={() => setPlanoParaAssinar(null)}>
        <DialogHeader>
          <DialogTitle>Assinar {planoParaAssinar?.nome}</DialogTitle>
          <DialogDescription>Escolha o ciclo e a forma de pagamento.</DialogDescription>
        </DialogHeader>
        {planoParaAssinar && (
          <div className="space-y-4">
            <Select
              label="Ciclo"
              value={ciclo}
              onChange={(e) => setCiclo(e.target.value as CicloAssinatura)}
              options={[
                { value: "mensal", label: `Mensal — ${formatCurrency(precoDoCiclo(planoParaAssinar, "mensal"))}` },
                ...(planoParaAssinar.preco_anual
                  ? [{ value: "anual", label: `Anual — ${formatCurrency(precoDoCiclo(planoParaAssinar, "anual"))}` }]
                  : []),
              ]}
            />
            <Select
              label="Forma de pagamento"
              value={billingType}
              onChange={(e) => setBillingType(e.target.value as AsaasBillingType)}
              options={[
                { value: "PIX", label: "Pix" },
                { value: "BOLETO", label: "Boleto" },
                { value: "CREDIT_CARD", label: "Cartão de crédito" },
              ]}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPlanoParaAssinar(null)}>
                Cancelar
              </Button>
              <Button onClick={handleAssinar} isLoading={assinando} disabled={!temCpf}>
                Confirmar assinatura
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog Pix */}
      <Dialog open={pixOpen} onClose={() => setPixOpen(false)}>
        <DialogHeader>
          <DialogTitle>Pagar com Pix</DialogTitle>
        </DialogHeader>
        {pixLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : pix ? (
          <div className="space-y-4 text-center">
            {pix.encodedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pix.encodedImage}`}
                alt="QR Code Pix"
                className="mx-auto h-52 w-52 rounded-lg border border-border"
              />
            )}
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pix copia e cola
              </p>
              <p className="break-all text-xs text-foreground">{pix.payload}</p>
            </div>
            <Button className="w-full" onClick={copyPix}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar código Pix
            </Button>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
