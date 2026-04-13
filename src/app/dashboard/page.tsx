"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  Wrench,
  DollarSign,
  Clock,
  Plus,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { StatsCards, type StatCardItem } from "@/components/dashboard/stats-cards";
import { Badge } from "@/components/ui/badge";
import { ChartReceitaDespesa } from "@/components/financeiro/chart-receita-despesa";
import { getDashboardData, type DashboardData, type OrcamentoRecente } from "./actions";
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
          data.totalClientesMesAnterior
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
          data.orcamentosAtivosMesAnterior
        ),
        label: "vs mês passado",
      },
    },
    {
      title: "Serviços este Mês",
      value: data.servicosMes.toString(),
      icon: Wrench,
      iconColor: "text-secondary-600 bg-secondary-100",
      href: "/dashboard/servicos",
      comparison: {
        percentage: calcPercentChange(data.servicosMes, data.servicosMesAnterior),
        label: "vs mês passado",
      },
    },
    {
      title: "Faturamento do Mês",
      value: formatCurrency(data.faturamentoMes),
      icon: DollarSign,
      iconColor: "text-success bg-success-50",
      href: "/dashboard/financeiro",
      comparison: {
        percentage: calcPercentChange(
          data.faturamentoMes,
          data.faturamentoMesAnterior
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

// ─── Skeleton primitives ─────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div className={cn("bg-secondary-200 rounded animate-pulse", className)} />
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-secondary-200 bg-white p-6"
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
              "w-full bg-secondary-200 rounded-t animate-pulse",
              heightClass
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
      <p className="text-sm text-secondary-500 py-4 text-center">
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
            className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-secondary-900 truncate">
                {o.cliente?.nome ?? "—"}
              </p>
              <p className="text-xs text-secondary-400">
                {formatDate(o.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              {o.valor_final != null && (
                <span className="text-sm font-medium text-secondary-700">
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

interface ActionCardProps {
  icon: React.ElementType;
  label: string;
  href: string;
  iconColor: string;
  primary?: boolean;
}

function ActionCard({ icon: Icon, label, href, iconColor, primary }: ActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all",
        primary
          ? "border-primary bg-primary text-white hover:bg-primary/90"
          : "border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700"
      )}
    >
      <div className={cn("rounded-lg p-2 shrink-0", primary ? "bg-white/20" : iconColor)}>
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
        <h1 className="text-2xl font-bold text-secondary-900">
          {loading ? (
            <SkeletonBlock className="h-8 w-64 inline-block" />
          ) : (
            getGreeting(data?.nomePerfurador)
          )}
        </h1>
        <p className="text-secondary-500 mt-1">Visão geral do seu negócio</p>
      </div>

      {/* Cards de resumo */}
      {loading ? (
        <StatsCardsSkeleton />
      ) : (
        <StatsCards cards={buildStatCards(data!)} />
      )}

      {/* Gráfico + Últimos Orçamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Receita vs Despesa — 2/3 */}
        <div className="lg:col-span-2 rounded-xl border border-secondary-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">
            Receita vs Despesa
          </h2>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ChartReceitaDespesa data={data!.chartData} />
          )}
        </div>

        {/* Últimos Orçamentos — 1/3 */}
        <div className="rounded-xl border border-secondary-200 bg-white p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary-900">
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
            <OrcamentosRecentesList items={data!.orcamentosRecentes} />
          )}
        </div>

      </div>

      {/* Próximas Ações */}
      <div className="rounded-xl border border-secondary-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">
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
              label={`${data!.orcamentosAguardandoAprovacao} orçamento${data!.orcamentosAguardandoAprovacao !== 1 ? "s" : ""} aguardando aprovação`}
              href="/dashboard/orcamentos"
              iconColor="text-primary bg-primary-50"
            />
            <ActionCard
              icon={Wrench}
              label={`${data!.servicosEmAndamento} serviço${data!.servicosEmAndamento !== 1 ? "s" : ""} em andamento`}
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
      </div>

    </div>
  );
}
