"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Loader2, History } from "lucide-react";
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
import { formatDateTime } from "@/lib/admin-format";
import { getAdminSessoes, type SessaoRow } from "./actions";

const PER_PAGE = 25;

export default function AdminSessoesPage() {
  const [sessoes, setSessoes] = useState<SessaoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [ativas, setAtivas] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await getAdminSessoes(debounced || "", page);
    if (res.error) toast.error(res.error);
    else {
      setSessoes(res.sessoes);
      setTotal(res.total);
      setAtivas(res.ativas);
    }
    setLoading(false);
  }, [debounced, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessões & Logins"
        description="Histórico de acessos e sessões ativas."
        icon={History}
      />

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <KpiCard title="Sessões ativas" value={ativas} icon={History} iconClassName="bg-success/10 text-success-600" />
        <KpiCard title="Total de sessões" value={total} icon={History} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por usuário ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sessoes.length === 0 ? (
        <EmptyState icon={History} title="Nenhuma sessão encontrada" />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Expira</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessoes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {s.perfurador_id ? (
                          <Link
                            href={`/admin/usuarios/${s.perfurador_id}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {s.perfurador_nome ?? s.email ?? "—"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{s.email ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.ativa ? "success" : "default"}>
                          {s.ativa ? "Ativa" : "Expirada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.ip ?? "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                        {s.user_agent ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(s.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(s.expires_at)}
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
    </div>
  );
}
