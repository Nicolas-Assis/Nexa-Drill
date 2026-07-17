"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  AlertTriangle,
  CalendarClock,
  Clock,
  Pencil,
  Trash2,
  QrCode,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { SITUACAO_PARCELA_LABELS } from "@/lib/constants";
import {
  getParcelasResumo,
  getParcelasFiltradas,
  getClientesParaCobranca,
  type ParcelasResumo,
  type ParcelaComCliente,
} from "@/app/dashboard/servicos/actions-parcelas";
import {
  BaixarModal,
  CobrarModal,
  EditarParcelaModal,
  CancelarParcelaModal,
  NovaCobrancaModal,
} from "@/components/parcelas/parcela-modais";
import type { ParcelaAcao } from "@/components/parcelas/parcela-modais";
import type { SituacaoParcela } from "@/types";

type SituacaoFiltro = SituacaoParcela | "todas";

const SITUACAO_FILTROS: { value: SituacaoFiltro; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "atrasada", label: "Atrasadas" },
  { value: "vence_hoje", label: "Vence hoje" },
  { value: "a_vencer", label: "A vencer" },
  { value: "pago", label: "Pagas" },
];

const SITUACAO_BADGE: Record<
  SituacaoParcela,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  a_vencer: "info",
  vence_hoje: "warning",
  atrasada: "danger",
  pago: "success",
  cancelado: "default",
};

type ActionModal =
  | { type: "none" }
  | { type: "nova" }
  | { type: "baixar"; parcela: ParcelaAcao }
  | { type: "cobrar"; parcela: ParcelaAcao }
  | { type: "editar"; parcela: ParcelaAcao }
  | { type: "cancelar"; parcela: ParcelaAcao };

export default function ReceberPage() {
  const [resumo, setResumo] = useState<ParcelasResumo | null>(null);
  const [parcelas, setParcelas] = useState<ParcelaComCliente[]>([]);
  const [clientesLista, setClientesLista] = useState<
    {
      id: string;
      nome: string;
      telefone: string | null;
      cpf_cnpj: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [situacao, setSituacao] = useState<SituacaoFiltro>("todas");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [modal, setModal] = useState<ActionModal>({ type: "none" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [resumoRes, parcelasRes, clientesRes] = await Promise.all([
      getParcelasResumo(),
      getParcelasFiltradas(),
      getClientesParaCobranca(),
    ]);
    if (resumoRes.error) toast.error(resumoRes.error);
    else setResumo(resumoRes.resumo);
    if (parcelasRes.error) toast.error(parcelasRes.error);
    else setParcelas(parcelasRes.parcelas);
    if (!clientesRes.error) setClientesLista(clientesRes.clientes);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clientes = useMemo(
    () =>
      Array.from(
        new Set(
          parcelas.map((p) => p.cliente_nome).filter(Boolean) as string[],
        ),
      ).sort(),
    [parcelas],
  );

  const filtradas = useMemo(() => {
    return parcelas.filter((p) => {
      if (situacao !== "todas" && p.situacao !== situacao) return false;
      if (clienteFiltro && p.cliente_nome !== clienteFiltro) return false;
      return true;
    });
  }, [parcelas, situacao, clienteFiltro]);

  const totalFiltrado = useMemo(
    () => filtradas.reduce((sum, p) => sum + (p.valor ?? 0), 0),
    [filtradas],
  );

  function rowTone(s: SituacaoParcela): string {
    if (s === "atrasada") return "bg-danger-50/60";
    if (s === "vence_hoje") return "bg-accent-50/60";
    return "";
  }

  function closeAndRefetch() {
    setModal({ type: "none" });
    fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Contas a Receber
          </h1>
          <p className="text-secondary-500">
            Parcelas, cobrança por Pix e baixa de recebimentos
          </p>
        </div>
        <Button onClick={() => setModal({ type: "nova" })}>
          <Plus className="mr-2 h-4 w-4" />
          Nova cobrança
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="A receber"
          valor={loading ? null : formatCurrency(resumo?.aReceber ?? 0)}
          icon={Wallet}
          cor="text-primary bg-primary-50"
        />
        <KpiCard
          titulo="Atrasado"
          valor={loading ? null : formatCurrency(resumo?.atrasadoValor ?? 0)}
          sub={resumo ? `${resumo.atrasadoQtd} parcela(s)` : undefined}
          icon={AlertTriangle}
          cor="text-danger bg-danger-50"
        />
        <KpiCard
          titulo="Vence esta semana"
          valor={loading ? null : formatCurrency(resumo?.venceSemanaValor ?? 0)}
          sub={resumo ? `${resumo.venceSemanaQtd} parcela(s)` : undefined}
          icon={CalendarClock}
          cor="text-accent bg-accent-50"
        />
        <KpiCard
          titulo="DSO (dias p/ receber)"
          valor={
            loading ? null : resumo?.dso == null ? "—" : `${resumo.dso} dias`
          }
          sub="últimos 90 dias"
          icon={Clock}
          cor="text-secondary-600 bg-secondary-100"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {SITUACAO_FILTROS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setSituacao(f.value)}
              className={cn(
                "rounded-full border px-4 min-h-11 text-sm transition-colors",
                situacao === f.value
                  ? "border-primary bg-primary text-white"
                  : "border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto sm:w-64">
          <Select
            value={clienteFiltro}
            onChange={(e) => setClienteFiltro(e.target.value)}
            options={[
              { value: "", label: "Todos os clientes" },
              ...clientes.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>

      {!loading && filtradas.length > 0 && (
        <p className="text-sm text-secondary-500">
          {filtradas.length} parcela{filtradas.length !== 1 ? "s" : ""} · total{" "}
          <span className="font-semibold text-secondary-700">
            {formatCurrency(totalFiltrado)}
          </span>
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-1/3 rounded bg-secondary-200" />
                  <div className="h-3 w-2/3 rounded bg-secondary-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-secondary-400 text-sm space-y-3">
            {parcelas.length === 0 ? (
              <>
                <p>Nenhuma cobrança cadastrada ainda.</p>
                <Button onClick={() => setModal({ type: "nova" })}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeira cobrança
                </Button>
              </>
            ) : (
              <p>Nenhuma parcela para o filtro selecionado.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((p) => (
                      <TableRow key={p.id} className={rowTone(p.situacao)}>
                        <TableCell className="text-sm">
                          {formatDate(p.vencimento)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.cliente_nome ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.servico_id ? (
                            <Link
                              href={`/dashboard/servicos/${p.servico_id}`}
                              className="text-primary hover:underline"
                            >
                              {p.descricao ?? "Parcela"}
                            </Link>
                          ) : (
                            (p.descricao ?? "Parcela")
                          )}
                          {p.numero_parcela && p.total_parcelas ? (
                            <span className="text-xs text-secondary-400">
                              {" "}
                              ({p.numero_parcela}/{p.total_parcelas})
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatCurrency(p.valor)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={SITUACAO_BADGE[p.situacao]}>
                            {SITUACAO_PARCELA_LABELS[p.situacao]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <RowActions parcela={p} setModal={setModal} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtradas.map((p) => (
              <Card key={p.id} className={rowTone(p.situacao)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-secondary-900 text-sm truncate">
                        {p.descricao ?? "Parcela"}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {p.cliente_nome ?? "—"} · vence{" "}
                        {formatDate(p.vencimento)}
                      </p>
                    </div>
                    <Badge variant={SITUACAO_BADGE[p.situacao]}>
                      {SITUACAO_PARCELA_LABELS[p.situacao]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-secondary-900">
                      {formatCurrency(p.valor)}
                    </span>
                    <RowActions parcela={p} setModal={setModal} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {modal.type === "nova" && (
        <NovaCobrancaModal
          clientes={clientesLista}
          onClose={() => setModal({ type: "none" })}
          onDone={closeAndRefetch}
          onCobrar={(parcela) => setModal({ type: "cobrar", parcela })}
        />
      )}
      {modal.type === "baixar" && (
        <BaixarModal
          parcela={modal.parcela}
          onClose={() => setModal({ type: "none" })}
          onDone={closeAndRefetch}
        />
      )}
      {modal.type === "cobrar" && (
        <CobrarModal
          parcela={modal.parcela}
          onClose={() => setModal({ type: "none" })}
          onGerou={fetchData}
        />
      )}
      {modal.type === "editar" && (
        <EditarParcelaModal
          parcela={modal.parcela}
          onClose={() => setModal({ type: "none" })}
          onDone={closeAndRefetch}
        />
      )}
      {modal.type === "cancelar" && (
        <CancelarParcelaModal
          parcela={modal.parcela}
          onClose={() => setModal({ type: "none" })}
          onDone={closeAndRefetch}
        />
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function KpiCard({
  titulo,
  valor,
  sub,
  icon: Icon,
  cor,
}: {
  titulo: string;
  valor: string | null;
  sub?: string;
  icon: React.ElementType;
  cor: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-secondary-500">{titulo}</p>
            <p className="text-2xl font-bold text-secondary-900 mt-1">
              {valor ?? "—"}
            </p>
            {sub && <p className="text-xs text-secondary-400 mt-1">{sub}</p>}
          </div>
          <div className={cn("rounded-lg p-3", cor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RowActions({
  parcela,
  setModal,
}: {
  parcela: ParcelaComCliente;
  setModal: (m: ActionModal) => void;
}) {
  const podeOperar =
    parcela.status !== "pago" && parcela.status !== "cancelado";
  if (!podeOperar) {
    return <span className="text-xs text-secondary-400">—</span>;
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" onClick={() => setModal({ type: "baixar", parcela })}>
        Marcar como paga
      </Button>
      <Button
        size="sm"
        variant="outline"
        title="Cobrar (Pix)"
        aria-label="Cobrar (Pix)"
        className="h-11 w-11 p-0"
        onClick={() => setModal({ type: "cobrar", parcela })}
      >
        <QrCode className="h-4 w-4" />
      </Button>
      <button
        type="button"
        title="Editar"
        aria-label="Editar"
        onClick={() => setModal({ type: "editar", parcela })}
        className="h-11 w-11 rounded text-secondary-400 hover:text-primary hover:bg-primary-50 inline-flex items-center justify-center"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Cancelar"
        aria-label="Cancelar"
        onClick={() => setModal({ type: "cancelar", parcela })}
        className="h-11 w-11 rounded text-secondary-400 hover:text-danger hover:bg-danger-50 inline-flex items-center justify-center"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
