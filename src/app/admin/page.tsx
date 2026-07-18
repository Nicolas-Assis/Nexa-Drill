"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserPlus,
  DollarSign,
  CreditCard,
  AlertTriangle,
  TimerReset,
  Activity as ActivityIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminAreaChart, AdminBarChart, AdminDonut } from "@/components/admin/admin-charts";
import { formatCurrency } from "@/lib/utils";
import { activityLabel, relativeTime } from "@/lib/admin-format";
import { getAdminOverview, type AdminOverview } from "./actions";

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminOverview().then((res) => {
      if (res.error) toast.error(res.error);
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { kpis } = data;
  const planoData = data.planoDistribuicao.map((p) => ({ name: p.plano, value: p.qtd }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        description="Panorama de usuários, uso e receita da plataforma."
        icon={ActivityIcon}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Usuários" value={kpis.totalUsuarios} icon={Users} hint={`+${kpis.novosMes} este mês`} />
        <KpiCard
          title="Ativos (hoje)"
          value={kpis.ativosHoje}
          icon={UserCheck}
          iconClassName="bg-success/10 text-success-600"
          hint={`${kpis.ativos7d} em 7d · ${kpis.ativos30d} em 30d`}
        />
        <KpiCard
          title="MRR"
          value={formatCurrency(kpis.mrr)}
          icon={DollarSign}
          iconClassName="bg-primary/10 text-primary"
          hint={`${kpis.assinaturasAtivas} assinaturas ativas`}
        />
        <KpiCard
          title="Novos (mês)"
          value={kpis.novosMes}
          icon={UserPlus}
          iconClassName="bg-accent/10 text-accent-600"
        />
        <KpiCard title="Assinaturas ativas" value={kpis.assinaturasAtivas} icon={CreditCard} iconClassName="bg-primary/10 text-primary" />
        <KpiCard
          title="Trials expirando"
          value={kpis.trialsExpirando}
          icon={TimerReset}
          iconClassName="bg-accent/10 text-accent-600"
          hint="nos próximos 7 dias"
        />
        <KpiCard
          title="Inadimplentes"
          value={kpis.inadimplentes}
          icon={AlertTriangle}
          iconClassName="bg-danger/10 text-danger"
        />
        <KpiCard
          title="Ativos (30d)"
          value={kpis.ativos30d}
          icon={UserCheck}
          iconClassName="bg-success/10 text-success-600"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Novos cadastros" description="Últimos 30 dias">
          <AdminBarChart data={data.cadastrosSerie} id="grad-cadastros" />
        </ChartCard>
        <ChartCard title="Usuários ativos" description="Últimos 30 dias" >
          <AdminBarChart data={data.ativosSerie} color="#10B981" id="grad-ativos" />
        </ChartCard>
        <ChartCard title="Receita recebida" description="Faturas pagas nos últimos 6 meses">
          <AdminAreaChart data={data.receitaSerie} id="grad-receita" />
        </ChartCard>
        <ChartCard title="Distribuição por plano" description="Assinaturas ativas, trial e inadimplentes">
          <AdminDonut data={planoData} />
        </ChartCard>
      </div>

      {/* Atividade recente + últimos cadastros */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.atividadeRecente.length === 0 ? (
              <EmptyState compact icon={ActivityIcon} title="Nenhuma atividade ainda" />
            ) : (
              <ul className="divide-y divide-border">
                {data.atividadeRecente.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {a.perfurador_nome ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {activityLabel(a.action, a.event_type)}
                        {a.path ? ` · ${a.path}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos cadastros</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.ultimosCadastros.length === 0 ? (
              <EmptyState compact icon={Users} title="Nenhum cadastro ainda" />
            ) : (
              <ul className="divide-y divide-border">
                {data.ultimosCadastros.map((u) => (
                  <li key={u.id} className="py-2.5">
                    <Link
                      href={`/admin/usuarios/${u.id}`}
                      className="flex items-center justify-between gap-3 text-sm hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{u.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.nome_empresa || u.email || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {relativeTime(u.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
