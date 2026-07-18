"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Receipt,
  Check,
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_FATURA_LABELS, STATUS_FATURA_VARIANT } from "@/lib/admin-format";
import type { StatusFatura } from "@/types";
import { getAdminFaturas, marcarFaturaPaga, type FaturaRow } from "./actions";

const PER_PAGE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

export default function AdminFaturasPage() {
  const [faturas, setFaturas] = useState<FaturaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPago, setTotalPago] = useState(0);
  const [totalPendente, setTotalPendente] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await getAdminFaturas(debounced || "", page, status);
    if (res.error) toast.error(res.error);
    else {
      setFaturas(res.faturas);
      setTotal(res.total);
      setTotalPago(res.totalPago);
      setTotalPendente(res.totalPendente);
    }
    setLoading(false);
  }, [debounced, page, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleMarcarPaga(f: FaturaRow) {
    if (!window.confirm(`Marcar a fatura de ${formatCurrency(f.valor)} como paga?`)) return;
    setMarcando(f.id);
    const res = await marcarFaturaPaga(f.id);
    setMarcando(null);
    if (res.error) return toast.error(res.error);
    toast.success("Fatura marcada como paga.");
    fetchData();
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faturas"
        description="Cobranças de assinatura geradas para os usuários."
        icon={Receipt}
      />

      <div className="grid grid-cols-2 gap-4 sm:max-w-lg">
        <KpiCard title="Recebido (total)" value={formatCurrency(totalPago)} icon={Receipt} iconClassName="bg-success/10 text-success-600" />
        <KpiCard title="A receber" value={formatCurrency(totalPendente)} icon={Receipt} iconClassName="bg-accent/10 text-accent-600" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por usuário ou e-mail..."
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
      ) : faturas.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma fatura encontrada" description="As faturas aparecem quando uma assinatura gera cobranças." />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faturas.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        {f.perfurador_id ? (
                          <Link
                            href={`/admin/usuarios/${f.perfurador_id}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {f.perfurador_nome ?? f.email ?? "—"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{f.plano_nome ?? "—"}</TableCell>
                      <TableCell className="text-right text-foreground">{formatCurrency(f.valor)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.vencimento ? formatDate(f.vencimento) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_FATURA_VARIANT[f.status as StatusFatura] ?? "default"}>
                          {STATUS_FATURA_LABELS[f.status as StatusFatura] ?? f.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(f.status === "pendente" || f.status === "atrasado") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarcarPaga(f)}
                            isLoading={marcando === f.id}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Marcar pago
                          </Button>
                        )}
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
