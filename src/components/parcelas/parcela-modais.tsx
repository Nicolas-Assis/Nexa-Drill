"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Copy,
  Check,
  ExternalLink,
  CheckCircle,
  Trash2,
  MessageCircle,
  FileText,
  AlertTriangle,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { METODO_PAGAMENTO_OPTIONS } from "@/lib/constants";
import {
  baixarParcelaManual,
  gerarCobrancaAsaas,
  cancelarParcela,
  editarParcela,
  criarCobrancaAvulsa,
} from "@/app/dashboard/servicos/actions-parcelas";
import type { MetodoPagamento } from "@/types";

// Forma mínima de parcela que os modais precisam (compatível com Parcela e
// ParcelaComCliente).
export type ParcelaAcao = {
  id: string;
  descricao: string | null;
  valor: number;
  vencimento: string;
  status: string;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  pix_copia_cola?: string | null;
  boleto_url?: string | null;
  link_pagamento?: string | null;
  asaas_cobranca_id?: string | null;
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function copiar(texto: string | null, label: string) {
  if (!texto) return;
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado!`);
  } catch {
    toast.error("Não foi possível copiar — copie manualmente.");
  }
}

// ── Marcar como paga (baixa manual) ──────────────────────────────────────────
export function BaixarModal({
  parcela,
  onClose,
  onDone,
}: {
  parcela: ParcelaAcao;
  onClose: () => void;
  onDone: () => void;
}) {
  const [metodo, setMetodo] = useState<MetodoPagamento>("pix");
  const [data, setData] = useState(hojeISO());
  const [valor, setValor] = useState<number | "">(parcela.valor);
  const [saving, setSaving] = useState(false);

  async function handle() {
    setSaving(true);
    const res = await baixarParcelaManual(parcela.id, {
      metodo,
      data,
      valor: Number(valor) || 0,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Pagamento registrado!");
    onDone();
  }

  return (
    <Dialog open onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>Marcar como paga</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground mb-4">
        {parcela.descricao ?? "Parcela"}
        {parcela.cliente_nome ? ` · ${parcela.cliente_nome}` : ""}
      </p>
      <div className="space-y-4">
        <Select
          label="Forma de pagamento"
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as MetodoPagamento)}
          options={METODO_PAGAMENTO_OPTIONS}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valor recebido (R$)"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) =>
              setValor(e.target.value === "" ? "" : parseFloat(e.target.value))
            }
          />
          <Input
            label="Data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handle} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Registrar pagamento
        </Button>
      </div>
    </Dialog>
  );
}

// ── Cobrar por Pix (confirma → gera) ─────────────────────────────────────────
type CobrancaData = {
  pixCopiaCola: string | null;
  boletoUrl: string | null;
  linkPagamento: string | null;
  encodedImage: string | null;
};

// Bloco de resultado da cobrança (QR, Pix copia-e-cola, WhatsApp, link/boleto).
// Reusado por CobrarModal (após gerar) e VisualizarCobrancaModal (persistido).
function CobrancaResultado({
  dados,
  parcela,
}: {
  dados: CobrancaData;
  parcela: ParcelaAcao;
}) {
  const [copiado, setCopiado] = useState(false);
  const semPix = !dados.pixCopiaCola && !dados.encodedImage;

  async function copiarPix() {
    await copiar(dados.pixCopiaCola, "Código Pix");
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function whatsappHref(): string {
    const tel = (parcela.cliente_telefone ?? "").replace(/\D/g, "");
    const nome = parcela.cliente_nome ?? "";
    const cobrancaTxt = dados.pixCopiaCola ?? dados.linkPagamento ?? "";
    const msg = `Olá ${nome}! Segue a cobrança de ${formatCurrency(parcela.valor)} referente a ${parcela.descricao ?? "serviço"} (vence ${formatDate(parcela.vencimento)}).${cobrancaTxt ? `\n\nPague pelo Pix:\n${cobrancaTxt}` : ""}`;
    return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-4">
      {dados.encodedImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/png;base64,${dados.encodedImage}`}
          alt="QR Code Pix"
          className="mx-auto h-48 w-48"
        />
      )}

      {dados.pixCopiaCola && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Pix copia e cola</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={dados.pixCopiaCola}
              className="flex-1 rounded-lg border border-input bg-muted px-3 py-2 text-xs"
            />
            <Button size="sm" onClick={copiarPix}>
              {copiado ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {semPix && (
        <div className="rounded-lg border border-accent-200 bg-accent-50 p-3">
          <p className="text-sm text-foreground">
            Sem chave Pix nesta cobrança — use o boleto ou o link de pagamento
            abaixo.
          </p>
        </div>
      )}

      {parcela.cliente_telefone && (
        <a
          href={whatsappHref()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-success px-3 py-2.5 text-sm font-medium text-white hover:bg-success/90"
        >
          <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
        </a>
      )}

      <div className="grid grid-cols-1 gap-2">
        {dados.linkPagamento && (
          <div className="flex gap-2">
            <a
              href={dados.linkPagamento}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" /> Link de pagamento
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copiar(dados.linkPagamento, "Link")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
        {dados.boletoUrl && (
          <a
            href={dados.boletoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted"
          >
            <FileText className="h-4 w-4" /> Baixar boleto
          </a>
        )}
      </div>
    </div>
  );
}

export function CobrarModal({
  parcela,
  onClose,
  onGerou,
}: {
  parcela: ParcelaAcao;
  onClose: () => void;
  onGerou?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [gerado, setGerado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<CobrancaData | null>(null);

  async function gerar() {
    setLoading(true);
    setErro(null);
    const res = await gerarCobrancaAsaas(parcela.id);
    setLoading(false);
    setGerado(true);
    if (res.error) {
      setErro(res.error);
    } else {
      setDados(res.data);
      onGerou?.();
    }
  }

  const isCpfErro = !!erro && /cpf|cnpj/i.test(erro);

  return (
    <Dialog open onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>Cobrar por Pix</DialogTitle>
      </DialogHeader>

      {/* Resumo + confirmação (antes de gerar) */}
      {!gerado && !loading && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-1">
            <p className="text-sm text-muted-foreground">
              {parcela.cliente_nome ?? "Cliente"}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(parcela.valor)}
            </p>
            <p className="text-sm text-muted-foreground">
              {parcela.descricao ?? "Parcela"} · vence{" "}
              {formatDate(parcela.vencimento)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Isso gera uma cobrança real no Asaas e o cliente pode ser notificado
            automaticamente.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={gerar}>
              <QrCode className="mr-2 h-4 w-4" />
              Gerar Pix
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Gerando cobrança...</p>
        </div>
      )}

      {/* Erro */}
      {gerado && erro && (
        <div className="space-y-4">
          <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 flex gap-2">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
            <p className="text-sm text-danger">{erro}</p>
          </div>
          {isCpfErro && (
            <Link
              href="/dashboard/clientes"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary hover:bg-primary/10"
            >
              Editar cliente
            </Link>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {gerado && !erro && dados && (
        <div className="space-y-4">
          <CobrancaResultado dados={dados} parcela={parcela} />
          <p className="text-xs text-muted-foreground">
            O Asaas também notifica o cliente automaticamente conforme a régua
            configurada na conta.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ── Visualizar cobrança existente (dados persistidos, sem gerar de novo) ─────
export function VisualizarCobrancaModal({
  parcela,
  onClose,
}: {
  parcela: ParcelaAcao;
  onClose: () => void;
}) {
  const dados: CobrancaData = {
    pixCopiaCola: parcela.pix_copia_cola ?? null,
    boletoUrl: parcela.boleto_url ?? null,
    linkPagamento: parcela.link_pagamento ?? null,
    encodedImage: null,
  };

  return (
    <Dialog open onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>Cobrança</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="rounded-lg border border-border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            {parcela.cliente_nome ?? "Cliente"}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(parcela.valor)}
          </p>
          <p className="text-sm text-muted-foreground">
            {parcela.descricao ?? "Parcela"} · vence{" "}
            {formatDate(parcela.vencimento)}
          </p>
        </div>
        <CobrancaResultado dados={dados} parcela={parcela} />
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Editar parcela ───────────────────────────────────────────────────────────
export function EditarParcelaModal({
  parcela,
  onClose,
  onDone,
}: {
  parcela: ParcelaAcao;
  onClose: () => void;
  onDone: () => void;
}) {
  const [descricao, setDescricao] = useState(parcela.descricao ?? "");
  const [valor, setValor] = useState<number | "">(parcela.valor);
  const [vencimento, setVencimento] = useState(parcela.vencimento);
  const [saving, setSaving] = useState(false);

  async function handle() {
    setSaving(true);
    const res = await editarParcela(parcela.id, {
      descricao,
      valor: Number(valor) || 0,
      vencimento,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Parcela atualizada!");
    onDone();
  }

  return (
    <Dialog open onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>Editar parcela</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <Input
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) =>
              setValor(e.target.value === "" ? "" : parseFloat(e.target.value))
            }
          />
          <Input
            label="Vencimento"
            type="date"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handle} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </Dialog>
  );
}

// ── Cancelar parcela ─────────────────────────────────────────────────────────
export function CancelarParcelaModal({
  parcela,
  onClose,
  onDone,
}: {
  parcela: ParcelaAcao;
  onClose: () => void;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handle() {
    setSaving(true);
    const res = await cancelarParcela(parcela.id);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Parcela cancelada.");
    onDone();
  }

  return (
    <Dialog open onClose={onClose} className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-danger">
          <Trash2 className="h-5 w-5" />
          Cancelar parcela
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Cancelar &quot;{parcela.descricao ?? "parcela"}&quot; de{" "}
        {formatCurrency(parcela.valor)}? Parcelas já pagas não podem ser
        canceladas.
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Voltar
        </Button>
        <Button variant="danger" onClick={handle} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Cancelar parcela
        </Button>
      </div>
    </Dialog>
  );
}

// ── Nova cobrança avulsa ─────────────────────────────────────────────────────
type ClienteCobranca = {
  id: string;
  nome: string;
  telefone: string | null;
  cpf_cnpj: string | null;
};

export function NovaCobrancaModal({
  clientes,
  onClose,
  onDone,
  onCobrar,
}: {
  clientes: ClienteCobranca[];
  onClose: () => void;
  onDone: () => void;
  onCobrar: (parcela: ParcelaAcao) => void;
}) {
  const [clienteId, setClienteId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<number | "">("");
  const [vencimento, setVencimento] = useState(addDaysISO(7));
  const [saving, setSaving] = useState(false);

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const semDoc = !!cliente && !cliente.cpf_cnpj;

  async function criar(depois: "fechar" | "cobrar"): Promise<void> {
    if (!clienteId) {
      toast.error("Selecione um cliente.");
      return;
    }
    setSaving(true);
    const res = await criarCobrancaAvulsa({
      clienteId,
      descricao,
      valor: Number(valor) || 0,
      vencimento,
    });
    setSaving(false);
    if (res.error || !res.parcelaId) {
      toast.error(res.error ?? "Erro ao criar cobrança");
      return;
    }
    if (depois === "cobrar") {
      onCobrar({
        id: res.parcelaId,
        descricao,
        valor: Number(valor) || 0,
        vencimento,
        status: "pendente",
        cliente_nome: cliente?.nome ?? null,
        cliente_telefone: cliente?.telefone ?? null,
      });
    } else {
      toast.success("Cobrança criada!");
      onDone();
    }
  }

  return (
    <Dialog open onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>Nova cobrança avulsa</DialogTitle>
      </DialogHeader>
      {clientes.length === 0 ? (
        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Cadastre um cliente antes de criar uma cobrança.
          </p>
          <Link
            href="/dashboard/clientes"
            className="text-sm text-primary hover:underline"
          >
            Ir para Clientes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Select
            label="Cliente"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            placeholder="Selecione um cliente"
            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
          />
          {semDoc && (
            <div className="rounded-lg border border-accent-200 bg-accent-50 p-3 text-sm text-foreground">
              Este cliente não tem CPF/CNPJ — necessário para gerar Pix/boleto.{" "}
              <Link
                href="/dashboard/clientes"
                className="text-primary hover:underline"
              >
                Completar cadastro
              </Link>
            </div>
          )}
          <Input
            label="Descrição"
            placeholder="Ex: Visita técnica, material avulso..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={(e) =>
                setValor(
                  e.target.value === "" ? "" : parseFloat(e.target.value),
                )
              }
            />
            <Input
              label="Vencimento"
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Valor mínimo para cobrança (Pix/boleto): R$ 5,00.
          </p>
        </div>
      )}
      {clientes.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => criar("fechar")}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar
          </Button>
          <Button onClick={() => criar("cobrar")} disabled={saving}>
            <QrCode className="mr-2 h-4 w-4" />
            Criar e gerar Pix
          </Button>
        </div>
      )}
    </Dialog>
  );
}
