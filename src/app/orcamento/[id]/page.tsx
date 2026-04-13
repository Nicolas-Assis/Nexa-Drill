"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, AlertCircle } from "lucide-react";
import { OrcamentoPublic } from "@/components/orcamento/orcamento-public";
import { getOrcamentoByLinkPublico } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import type { Orcamento, Perfurador, Cliente } from "@/types";

const OrcamentoPDFDownload = dynamic(
  () => import("@/components/orcamento/orcamento-pdf-download"),
  { ssr: false },
);

export default function OrcamentoPublicoPage({
  params,
}: {
  params: { id: string };
}) {
  const [orcamento, setOrcamento] = useState<
    (Orcamento & { cliente?: Cliente }) | null
  >(null);
  const [perfurador, setPerfurador] = useState<Perfurador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const result = await getOrcamentoByLinkPublico(params.id);
      if (result.error || !result.orcamento || !result.perfurador) {
        setError(result.error || "Orçamento não encontrado");
      } else {
        setOrcamento(result.orcamento);
        setPerfurador(result.perfurador);
      }
      setLoading(false);
    }
    fetch();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !orcamento || !perfurador) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-secondary-900 mb-2">
              Orçamento não encontrado
            </h2>
            <p className="text-sm text-secondary-500">
              Este link pode estar inválido ou o orçamento foi removido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <OrcamentoPublic orcamento={orcamento} perfurador={perfurador} />
      {/* PDF download for client */}
      <div className="max-w-3xl mx-auto mt-4 flex justify-center">
        <OrcamentoPDFDownload
          orcamento={orcamento}
          perfurador={perfurador}
          publicUrl={
            typeof window !== "undefined" ? window.location.href : undefined
          }
        />
      </div>
    </div>
  );
}
