"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Loader2, Activity } from "lucide-react";
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
import { activityLabel, formatDateTime } from "@/lib/admin-format";
import { getAdminAtividade, type AtividadeRow } from "./actions";

const PER_PAGE = 25;

const EVENT_OPTIONS = [
  { value: "", label: "Todos os eventos" },
  { value: "action", label: "Ações" },
  { value: "pageview", label: "Páginas" },
  { value: "login", label: "Logins" },
  { value: "logout", label: "Logouts" },
];

const EVENT_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  action: "info",
  pageview: "default",
  login: "success",
  logout: "warning",
};

export default function AdminAtividadePage() {
  const [eventos, setEventos] = useState<AtividadeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [eventType, setEventType] = useState("");
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
    const res = await getAdminAtividade(debounced || "", page, eventType);
    if (res.error) toast.error(res.error);
    else {
      setEventos(res.eventos);
      setTotal(res.total);
    }
    setLoading(false);
  }, [debounced, page, eventType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atividade"
        description="Tudo o que os usuários fizeram no sistema."
        icon={Activity}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por usuário ou ação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={eventType}
          onChange={(e) => {
            setEventType(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-48"
        >
          {EVENT_OPTIONS.map((o) => (
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
      ) : eventos.length === 0 ? (
        <EmptyState icon={Activity} title="Nenhum evento encontrado" />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Detalhe</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Quando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventos.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        {e.perfurador_id ? (
                          <Link
                            href={`/admin/usuarios/${e.perfurador_id}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {e.perfurador_nome ?? e.email ?? "—"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={EVENT_VARIANT[e.event_type] ?? "default"}>
                          {activityLabel(e.action, e.event_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground">
                        {e.path ?? e.entity_type ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.ip ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(e.created_at)}
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
