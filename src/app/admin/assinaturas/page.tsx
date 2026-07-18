"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GerenciarAssinaturaDialog } from "@/components/admin/gerenciar-assinatura-dialog";
import { formatCurrency } from "@/lib/utils";
import {
  STATUS_ASSINATURA_LABELS,
  STATUS_ASSINATURA_VARIANT,
} from "@/lib/admin-format";
import type { AdminAssinatura, CicloAssinatura, Plano, StatusAssinatura } from "@/types";
import { getAdminAssinaturas } from "./actions";
import { getPlanos } from "@/app/admin/planos/actions";

const PER_PAGE = 12;

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "trial", label: "Trial" },
  { value: "ativa", label: "Ativa" },
  { value: "inadimplente", label: "Inadimplente" },
  { value: "cancelada", label: "Cancelada" },
  { value: "expirada", label: "Expirada" },
];

export default function AdminAssinaturasPage() {
  const [assinaturas, setAssinaturas] = useState<AdminAssinatura[]>([]);
  const [total, setTotal] = useState(0);
  const [mrrTotal, setMrrTotal] = useState(0);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminAssinatura | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await getAdminAssinaturas(debounced || "", page, status);
    if (res.error) toast.error(res.error);
    else {
      setAssinaturas(res.assinaturas);
      setTotal(res.total);
      setMrrTotal(res.mrrTotal);
    }
    setLoading(false);
  }, [debounced, page, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getPlanos().then((r) => setPlanos(r.planos));
  }, []);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinaturas"
        description="Planos, status e receita recorrente dos usuários."
        icon={CreditCard}
      />

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <KpiCard title="MRR (filtro)" value={formatCurrency(mrrTotal)} icon={CreditCard} iconClassName="bg-primary/10 text-primary" />
        <KpiCard title="Assinaturas" value={total} icon={CreditCard} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por usuário, e-mail ou plano..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-52"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : assinaturas.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nenhuma assinatura encontrada" />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assinaturas.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link
                          href={`/admin/usuarios/${a.perfurador_id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {a.perfurador_nome ?? a.perfurador_email ?? "—"}
                        </Link>
                        <p className="text-xs text-muted-foreground">{a.perfurador_empresa ?? ""}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.plano_nome ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.ciclo === "anual" ? "Anual" : "Mensal"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_ASSINATURA_VARIANT[a.status as StatusAssinatura] ?? "default"}>
                          {STATUS_ASSINATURA_LABELS[a.status as StatusAssinatura] ?? a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-foreground">{formatCurrency(a.preco)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(a.mrr)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                          <Settings2 className="mr-1 h-4 w-4" />
                          Gerenciar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Próximo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {editing && (
        <GerenciarAssinaturaDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          perfuradorId={editing.perfurador_id}
          planos={planos}
          currentPlanoId={editing.plano_id ?? undefined}
          currentCiclo={(editing.ciclo as CicloAssinatura) ?? "mensal"}
          hasAssinaturaAtiva={["ativa", "inadimplente", "trial"].includes(editing.status)}
          onDone={fetchData}
        />
      )}
    </div>
  );
}
