"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  StatsCards,
  type StatCardItem,
} from "@/components/dashboard/stats-cards";
import { Badge } from "@/components/ui/badge";
import { ChartReceitaDespesa } from "@/components/financeiro/chart-receita-despesa";
import { ChartRecebimentos } from "@/components/charts/chart-recebimentos";
import { PrimeirosPassos } from "@/components/onboarding/primeiros-passos";
import {
  getDashboardData,
  type DashboardData,
  type OrcamentoRecente,
} from "./actions";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { STATUS_ORCAMENTO_OPTIONS } from "@/lib/constants";

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function getGreeting(nome?: string): string {
  const hour = new Date().getHours();
  const firstName = (nome ?? "").split(" ")[0] || "Perfurador";
  if (hour < 12) return `Bom dia, ${firstName}!`;
  if (hour < 18) return `Boa tarde, ${firstName}!`;
  return `Boa noite, ${firstName}!`;
}

function buildStatCards(data: DashboardData): StatCardItem[] {
  return [
    {
      title: "Total de Clientes",
      value: data.totalClientes.toString(),
      icon: Users,
      iconColor: "text-primary bg-primary-50",
      href: "/dashboard/clientes",
      comparison: {
        percentage: calcPercentChange(
          data.totalClientes,
          data.totalClientesMesAnterior,
        ),
        label: "vs mês passado",
      },
    },
    {
      title: "Orçamentos Ativos",
      value: data.orcamentosAtivos.toString(),
      icon: FileText,
      iconColor: "text-accent bg-accent-50",
      href: "/dashboard/orcamentos",
      comparison: {
        percentage: calcPercentChange(
          data.orcamentosAtivos,
          data.orcamentosAtivosMesAnterior,
        ),
        label: "vs mês passado",
      },
    },
    {
      title: "Serviços este Mês",
      value: data.servicosMes.toString(),
      icon: Wrench,
      iconColor: "text-muted-foreground bg-muted",
      href: "/dashboard/servicos",
      comparison: {
        percentage: calcPercentChange(
          data.servicosMes,
          data.servicosMesAnterior,
        ),
        label: "vs mês passado",
      },
    },
    {
      title: "Margem do Mês",
      value: `${formatCurrency(data.margemMesValor)}${
        data.margemMesPercentual == null
          ? ""
          : ` (${data.margemMesPercentual.toFixed(2)}%)`
      }`,
      icon: TrendingUp,
      iconColor:
        data.margemMesValor >= 0
          ? "text-success bg-success-50"
          : "text-danger bg-danger-50",
      href: "/dashboard/relatorios/margem",
      comparison: {
        percentage: calcPercentChange(
          data.margemMesValor,
          data.margemMesValorAnterior,
        ),
        label: "vs mês passado",
      },
    },
  ];
}

// ─── Status badge mapping ────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const statusVariantMap: Record<string, BadgeVariant> = {
  concluido: "success",
  aprovado: "success",
  em_execucao: "warning",
  cancelado: "danger",
  enviado: "info",
  rascunho: "default",
};

const FALLBACK_DASHBOARD_DATA: DashboardData = {
  nomePerfurador: "",
  totalClientes: 0,
  totalClientesMesAnterior: 0,
  orcamentosAtivos: 0,
  orcamentosAtivosMesAnterior: 0,
  servicosMes: 0,
  servicosMesAnterior: 0,
  faturamentoMes: 0,
  faturamentoMesAnterior: 0,
  orcamentosRecentes: [],
  chartData: [],
  orcamentosAguardandoAprovacao: 0,
  servicosEmAndamento: 0,
  margemMesValor: 0,
  margemMesPercentual: null,
  margemMesValorAnterior: 0,
  margemMesPercentualAnterior: null,
  pocosNoPrejuizo: [],
  aReceberTotal: 0,
  atrasadoValor: 0,
  atrasadoQtd: 0,
  dso: null,
  recebimentos30: [],
  error: null,
};

// ─── Skeleton primitives ─────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div className={cn("bg-muted rounded animate-pulse", className)} />
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card shadow-card p-6"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-7 w-20" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
            <SkeletonBlock className="h-11 w-11 rounded-lg ml-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  const barClasses = [
    "h-[45%]",
    "h-[65%]",
    "h-[40%]",
    "h-[80%]",
    "h-[55%]",
    "h-[70%]",
  ];
  return (
    <div className="h-[350px] flex items-end gap-3 px-4 pb-8">
      {barClasses.map((heightClass, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end gap-1">
          <div
            className={cn(
              "w-full bg-muted rounded-t animate-pulse",
              heightClass,
            )}
          />
          <SkeletonBlock className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3">
          <div className="space-y-1.5">
            <SkeletonBlock className="h-3.5 w-32" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrcamentosRecentesList({ items }: { items: OrcamentoRecente[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum orçamento encontrado.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {items.map((o) => {
        const label =
          STATUS_ORCAMENTO_OPTIONS.find((s) => s.value === o.status)?.label ??
          o.status;
        return (
          <Link
            key={o.id}
            href={`/dashboard/orcamentos/${o.id}`}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {o.cliente?.nome ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(o.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              {o.valor_final != null && (
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(o.valor_final)}
                </span>
              )}
              <Badge variant={statusVariantMap[o.status] ?? "default"}>
                {label}
              </Badge>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function PocosNoPrejuizo({
  items,
}: {
  items: {
    servico_id: string;
    margem: number;
    margem_percentual: number | null;
  }[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-success-200 bg-success-50 p-4">
        <p className="text-sm text-success font-medium">
          Nenhum poço no prejuízo este mês 🎯
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-danger-200 bg-danger-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-danger">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm font-semibold">⚠ Poços no prejuízo</p>
        </div>
        <Link
          href="/dashboard/relatorios/margem?apenasPrejuizo=1"
          className="text-xs text-danger hover:underline"
        >
          Ver todos
        </Link>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <Link
            key={item.servico_id}
            href={`/dashboard/servicos/${item.servico_id}`}
            className="flex items-center justify-between rounded-md bg-card/80 px-3 py-2 hover:bg-card"
          >
            <span className="text-sm text-foreground">
              Serviço #{item.servico_id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-danger">
              {formatCurrency(item.margem)}
              {item.margem_percentual == null
                ? ""
                : ` (${item.margem_percentual.toFixed(2)}%)`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface ActionCardProps {
  icon: React.ElementType;
  label: string;
  href: string;
  iconColor: string;
  primary?: boolean;
}

function ActionCard({
  icon: Icon,
  label,
  href,
  iconColor,
  primary,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all",
        primary
          ? "border-primary bg-primary text-white hover:bg-primary/90"
          : "border-border bg-card shadow-card hover:bg-muted text-foreground",
      )}
    >
      <div
        className={cn(
          "rounded-lg p-2 shrink-0",
          primary ? "bg-card/20" : iconColor,
        )}
      >
        <Icon className={cn("h-5 w-5", primary ? "text-white" : "")} />
      </div>
      <span className="text-sm font-medium leading-tight">{label}</span>
      <ArrowRight className="h-4 w-4 ml-auto shrink-0 opacity-60" />
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const dashboardData = data ?? FALLBACK_DASHBOARD_DATA;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getDashboardData();
    if (result.error) toast.error(result.error);
    else setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {loading ? (
            <SkeletonBlock className="h-8 w-64 inline-block" />
          ) : (
            getGreeting(dashboardData.nomePerfurador)
          )}
        </h1>
        <p className="mt-1 text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      {/* Checklist de primeiros passos (onboarding) */}
      <PrimeirosPassos />

      {/* Alerta de parcelas atrasadas */}
      {!loading && dashboardData.atrasadoQtd > 0 && (
        <Link
          href="/dashboard/receber"
          className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 hover:bg-danger-100 transition-colors"
        >
          <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
          <span className="text-sm text-danger font-medium">
            Você tem {dashboardData.atrasadoQtd} parcela
            {dashboardData.atrasadoQtd !== 1 ? "s" : ""} atrasada
            {dashboardData.atrasadoQtd !== 1 ? "s" : ""} somando{" "}
            {formatCurrency(dashboardData.atrasadoValor)}
          </span>
          <ArrowRight className="h-4 w-4 text-danger ml-auto shrink-0" />
        </Link>
      )}

      {/* Cards de resumo */}
      {loading ? (
        <StatsCardsSkeleton />
      ) : (
        <StatsCards cards={buildStatCards(dashboardData)} />
      )}

      {/* Gráfico + Últimos Orçamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receita vs Despesa — 2/3 */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Receita vs Despesa
          </h2>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ChartReceitaDespesa data={dashboardData.chartData} />
          )}
        </div>

        {/* Últimos Orçamentos — 1/3 */}
        <div className="rounded-xl border border-border bg-card shadow-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Últimos Orçamentos
            </h2>
            <Link
              href="/dashboard/orcamentos"
              className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            <ListSkeleton rows={5} />
          ) : (
            <OrcamentosRecentesList items={dashboardData.orcamentosRecentes} />
          )}
        </div>
      </div>

      {/* Cobrança */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* A receber */}
        <div className="rounded-xl border border-border bg-card shadow-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-primary-50 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                💰 A receber
              </h2>
            </div>
            <Link
              href="/dashboard/receber"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            <SkeletonBlock className="h-9 w-40 mt-4" />
          ) : (
            <>
              <p className="text-3xl font-bold text-foreground mt-4">
                {formatCurrency(dashboardData.aReceberTotal)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                DSO:{" "}
                <span className="font-medium text-foreground">
                  {dashboardData.dso == null
                    ? "—"
                    : `${dashboardData.dso} dias p/ receber`}
                </span>
              </p>
            </>
          )}
        </div>

        {/* Recebimentos previstos - próximos 30 dias */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recebimentos previstos — próximos 30 dias
          </h2>
          {loading ? (
            <ChartSkeleton />
          ) : dashboardData.recebimentos30.every((r) => r.valor === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhum recebimento previsto para os próximos 30 dias.
            </p>
          ) : (
            <ChartRecebimentos data={dashboardData.recebimentos30} />
          )}
        </div>
      </div>

      {/* Próximas Ações */}
      <div className="rounded-xl border border-border bg-card shadow-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Próximas Ações
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ListSkeleton rows={1} />
            <ListSkeleton rows={1} />
            <ListSkeleton rows={1} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ActionCard
              icon={Clock}
              label={`${dashboardData.orcamentosAguardandoAprovacao} orçamento${dashboardData.orcamentosAguardandoAprovacao !== 1 ? "s" : ""} aguardando aprovação`}
              href="/dashboard/orcamentos"
              iconColor="text-primary bg-primary-50"
            />
            <ActionCard
              icon={Wrench}
              label={`${dashboardData.servicosEmAndamento} serviço${dashboardData.servicosEmAndamento !== 1 ? "s" : ""} em andamento`}
              href="/dashboard/servicos"
              iconColor="text-accent bg-accent-50"
            />
            <ActionCard
              icon={Plus}
              label="Criar novo orçamento"
              href="/dashboard/orcamentos/novo"
              iconColor=""
              primary
            />
          </div>
        )}

        <div className="mt-5">
          {loading ? (
            <ListSkeleton rows={2} />
          ) : (
            <PocosNoPrejuizo items={dashboardData.pocosNoPrejuizo} />
          )}
        </div>
      </div>
    </div>
  );
}
