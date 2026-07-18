"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Camera, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ServicoFotos } from "@/components/servicos/servico-fotos";
import { getServicos } from "@/app/dashboard/servicos/actions";
import { SERVICO_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Servico, Cliente, Orcamento } from "@/types";

type PortfolioItem = Servico & {
  cliente?: Cliente;
  orcamento?: Pick<Orcamento, "id" | "tipo_servico" | "valor_final">;
};

export function PortfolioManager() {
  const [servicos, setServicos] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await getServicos();
    if (res.error) {
      toast.error(res.error);
    } else {
      const concluidos = res.servicos
        .filter((s) => s.data_conclusao)
        .sort((a, b) =>
          (b.data_conclusao ?? "").localeCompare(a.data_conclusao ?? ""),
        )
        .slice(0, 12);
      setServicos(concluidos);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Portfólio público
        </CardTitle>
        <CardDescription>
          Adicione fotos dos serviços concluídos — elas aparecem em
          &quot;Trabalhos realizados&quot; no seu perfil público.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : servicos.length === 0 ? (
          <EmptyState
            compact
            icon={Camera}
            title="Nenhum serviço concluído ainda"
            description="Conclua um serviço para poder adicionar fotos ao seu portfólio."
          />
        ) : (
          <div className="space-y-4">
            {servicos.map((s) => {
              const titulo = s.orcamento?.tipo_servico
                ? (SERVICO_LABELS[s.orcamento.tipo_servico] ??
                  s.orcamento.tipo_servico)
                : `Serviço #${s.id.slice(0, 8).toUpperCase()}`;
              const local =
                s.endereco ||
                [s.cliente?.cidade, s.cliente?.estado]
                  .filter(Boolean)
                  .join(" / ") ||
                s.cliente?.nome ||
                "";
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[local, s.data_conclusao && formatDate(s.data_conclusao)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/servicos/${s.id}`}
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Abrir <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <ServicoFotos
                    compact
                    servicoId={s.id}
                    fotos={s.fotos ?? []}
                    onChanged={load}
                    emptyHint="Adicione fotos deste serviço para o portfólio"
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
