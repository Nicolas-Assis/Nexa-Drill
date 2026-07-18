"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Users,
  FileText,
  Wrench,
  DollarSign,
  Clock,
  CalendarClock,
  ShieldCheck,
  Ban,
  CreditCard,
  Activity as ActivityIcon,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartCard } from "@/components/charts/chart-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminBarChart } from "@/components/admin/admin-charts";
import { GerenciarAssinaturaDialog } from "@/components/admin/gerenciar-assinatura-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  activityLabel,
  formatDateTime,
  formatDuration,
  relativeTime,
  STATUS_ASSINATURA_LABELS,
  STATUS_ASSINATURA_VARIANT,
  STATUS_FATURA_LABELS,
  STATUS_FATURA_VARIANT,
} from "@/lib/admin-format";
import type {
  CicloAssinatura,
  Plano,
  StatusAssinatura,
  StatusFatura,
} from "@/types";
import {
  getAdminUsuario,
  banUsuario,
  unbanUsuario,
  setUsuarioRole,
  type AdminUsuarioDetalhe,
} from "../actions";
import { getPlanos } from "@/app/admin/planos/actions";

export default function AdminUsuarioDetalhePage() {
  const params = useParams<{ id: string }>();
  const perfuradorId = params.id;

  const [data, setData] = useState<AdminUsuarioDetalhe | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await getAdminUsuario(perfuradorId);
    if (res.error) toast.error(res.error);
    setData(res.data);
    setLoading(false);
  }, [perfuradorId]);

  useEffect(() => {
    fetchData();
    getPlanos().then((r) => setPlanos(r.planos));
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={Users}
        title="Usuário não encontrado"
        action={
          <Link href="/admin/usuarios">
            <Button variant="outline">Voltar</Button>
          </Link>
        }
      />
    );
  }

  const { perfil, assinatura, counts, timeline, sessoes, tempoPorDia, faturas } = data;
  const authId = perfil.auth_id;
  const isAdmin = perfil.role === "admin";
  const isBanned = !!perfil.banned;

  async function handleToggleBan() {
    if (!authId) return toast.error("Usuário sem conta de login vinculada.");
    const confirmMsg = isBanned
      ? "Reativar o acesso deste usuário?"
      : "Suspender este usuário? As sessões dele serão encerradas e o login bloqueado.";
    if (!window.confirm(confirmMsg)) return;

    setActing(true);
    const res = isBanned ? await unbanUsuario(authId) : await banUsuario(authId);
    setActing(false);
    if (res.error) return toast.error(res.error);
    toast.success(isBanned ? "Usuário reativado." : "Usuário suspenso.");
    fetchData();
  }

  async function handleToggleRole() {
    if (!authId) return toast.error("Usuário sem conta de login vinculada.");
    const novoRole = isAdmin ? "user" : "admin";
    if (!window.confirm(isAdmin ? "Remover privilégios de admin?" : "Tornar este usuário um administrador?"))
      return;

    setActing(true);
    const res = await setUsuarioRole(authId, novoRole);
    setActing(false);
    if (res.error) return toast.error(res.error);
    toast.success("Papel atualizado.");
    fetchData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/usuarios"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Usuários
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {perfil.nome}
              </h1>
              {isAdmin && (
                <Badge variant="info">
                  <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                </Badge>
              )}
              {isBanned && (
                <Badge variant="danger">
                  <Ban className="mr-1 h-3 w-3" /> Suspenso
                </Badge>
              )}
              {assinatura && (
                <Badge variant={STATUS_ASSINATURA_VARIANT[assinatura.status as StatusAssinatura] ?? "default"}>
                  {STATUS_ASSINATURA_LABELS[assinatura.status as StatusAssinatura] ?? assinatura.status}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {perfil.nome_empresa || "—"} · {perfil.email || "—"} · {perfil.telefone || "sem telefone"}
            </p>
            <p className="text-xs text-muted-foreground">
              {perfil.cidade ? `${perfil.cidade}${perfil.estado ? "/" + perfil.estado : ""} · ` : ""}
              cadastro em {formatDate(perfil.created_at)}
              {perfil.slug ? ` · /perfil/${perfil.slug}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Gerenciar assinatura
            </Button>
            <Button variant="outline" onClick={handleToggleRole} disabled={acting || !authId}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {isAdmin ? "Rebaixar" : "Tornar admin"}
            </Button>
            <Button variant={isBanned ? "secondary" : "danger"} onClick={handleToggleBan} disabled={acting || !authId}>
              <Ban className="mr-2 h-4 w-4" />
              {isBanned ? "Reativar" : "Suspender"}
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Clientes" value={counts.clientes} icon={Users} />
        <KpiCard title="Orçamentos" value={counts.orcamentos} icon={FileText} />
        <KpiCard title="Serviços" value={counts.servicos} icon={Wrench} />
        <KpiCard title="Lançamentos" value={counts.financeiro} icon={DollarSign} />
        <KpiCard title="Tempo total" value={formatDuration(counts.tempo_total)} icon={Clock} />
        <KpiCard
          title="Último acesso"
          value={counts.ultimo_acesso ? relativeTime(counts.ultimo_acesso) : "Nunca"}
          icon={CalendarClock}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Assinatura + faturas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {assinatura ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Plano" value={assinatura.plano_nome ?? "—"} />
                  <Info
                    label="Status"
                    value={STATUS_ASSINATURA_LABELS[assinatura.status as StatusAssinatura] ?? assinatura.status}
                  />
                  <Info label="Ciclo" value={assinatura.ciclo === "anual" ? "Anual" : "Mensal"} />
                  <Info label="Valor" value={formatCurrency(Number(assinatura.preco))} />
                  {assinatura.trial_ate && (
                    <Info label="Trial até" value={formatDate(assinatura.trial_ate)} />
                  )}
                  {assinatura.periodo_atual_fim && (
                    <Info label="Renova em" value={formatDate(assinatura.periodo_atual_fim)} />
                  )}
                </div>
                {assinatura.asaas_subscription_id && (
                  <p className="text-xs text-muted-foreground">
                    Asaas: {assinatura.asaas_subscription_id}
                  </p>
                )}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Últimas faturas
                  </p>
                  {faturas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma fatura ainda.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {faturas.slice(0, 6).map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                          <span className="text-muted-foreground">
                            {f.vencimento ? formatDate(f.vencimento) : formatDate(f.created_at)}
                          </span>
                          <span className="font-medium text-foreground">{formatCurrency(f.valor)}</span>
                          <Badge variant={STATUS_FATURA_VARIANT[f.status as StatusFatura] ?? "default"}>
                            {STATUS_FATURA_LABELS[f.status as StatusFatura] ?? f.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <EmptyState compact icon={CreditCard} title="Sem assinatura" />
            )}
          </CardContent>
        </Card>

        {/* Tempo por dia */}
        <ChartCard title="Tempo de permanência" description="Minutos ativos por dia (últimos 14 dias)">
          <AdminBarChart data={tempoPorDia} id="grad-tempo-usuario" />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Timeline de atividade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {timeline.length === 0 ? (
              <EmptyState compact icon={ActivityIcon} title="Sem atividade registrada" />
            ) : (
              <ul className="divide-y divide-border">
                {timeline.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-foreground">{activityLabel(t.action, t.event_type)}</p>
                      {t.path && <p className="truncate text-xs text-muted-foreground">{t.path}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(t.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sessões / logins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessões & logins</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {sessoes.length === 0 ? (
              <EmptyState compact icon={History} title="Nenhuma sessão registrada" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Início</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Dispositivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessoes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(s.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.ip ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {s.user_agent ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <GerenciarAssinaturaDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        perfuradorId={perfuradorId}
        planos={planos}
        currentPlanoId={assinatura?.plano_id ?? undefined}
        currentCiclo={(assinatura?.ciclo as CicloAssinatura) ?? "mensal"}
        hasAssinaturaAtiva={!!assinatura && ["ativa", "inadimplente", "trial"].includes(assinatura.status)}
        onDone={fetchData}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
