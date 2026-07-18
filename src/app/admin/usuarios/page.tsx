"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Ban,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/utils";
import {
  formatDuration,
  relativeTime,
  STATUS_ASSINATURA_LABELS,
  STATUS_ASSINATURA_VARIANT,
} from "@/lib/admin-format";
import type { StatusAssinatura } from "@/types";
import { getAdminUsuarios, type AdminUsuarioRow } from "./actions";

const PER_PAGE = 10;

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "trial", label: "Trial" },
  { value: "ativa", label: "Ativa" },
  { value: "inadimplente", label: "Inadimplente" },
  { value: "cancelada", label: "Cancelada" },
  { value: "expirada", label: "Expirada" },
];

function StatusAssinaturaBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const s = status as StatusAssinatura;
  return (
    <Badge variant={STATUS_ASSINATURA_VARIANT[s] ?? "default"}>
      {STATUS_ASSINATURA_LABELS[s] ?? status}
    </Badge>
  );
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<AdminUsuarioRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    const res = await getAdminUsuarios(debounced || "", page, status);
    if (res.error) toast.error(res.error);
    else {
      setUsuarios(res.usuarios);
      setTotal(res.total);
    }
    setLoading(false);
  }, [debounced, page, status]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description={total > 0 ? `${total} perfurador${total !== 1 ? "es" : ""}` : "Gerencie os usuários da plataforma"}
        icon={Users}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou empresa..."
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
          {STATUS_FILTER_OPTIONS.map((o) => (
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
      ) : usuarios.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros." />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Assinatura</TableHead>
                      <TableHead>Último acesso</TableHead>
                      <TableHead>Tempo total</TableHead>
                      <TableHead className="text-right">Serviços</TableHead>
                      <TableHead>Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((u) => (
                      <TableRow key={u.perfurador_id} className="cursor-pointer">
                        <TableCell>
                          <Link href={`/admin/usuarios/${u.perfurador_id}`} className="block">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{u.nome}</span>
                              {u.role === "admin" && (
                                <ShieldCheck className="h-4 w-4 text-primary" aria-label="Admin" />
                              )}
                              {u.banned && <Ban className="h-4 w-4 text-danger" aria-label="Suspenso" />}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {u.nome_empresa || u.email || "—"}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.plano_nome ?? "—"}</TableCell>
                        <TableCell>
                          <StatusAssinaturaBadge status={u.assinatura_status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.ultimo_acesso ? relativeTime(u.ultimo_acesso) : "Nunca"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDuration(u.tempo_total)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">{u.servicos_count}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(u.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {usuarios.map((u) => (
              <Link key={u.perfurador_id} href={`/admin/usuarios/${u.perfurador_id}`} className="block">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium text-foreground">{u.nome}</span>
                        {u.role === "admin" && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />}
                        {u.banned && <Ban className="h-4 w-4 shrink-0 text-danger" />}
                      </div>
                      <StatusAssinaturaBadge status={u.assinatura_status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {u.nome_empresa || u.email || "—"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Plano: {u.plano_nome ?? "—"}</span>
                      <span>Tempo: {formatDuration(u.tempo_total)}</span>
                      <span>Acesso: {u.ultimo_acesso ? relativeTime(u.ultimo_acesso) : "Nunca"}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

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
    </div>
  );
}
