"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { OrcamentoPDF } from "./orcamento-pdf";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import type { Orcamento, Perfurador, Cliente } from "@/types";

interface Props {
  orcamento: Orcamento & { cliente?: Cliente };
  perfurador: Perfurador;
  publicUrl?: string;
}

export default function OrcamentoPDFDownload({
  orcamento,
  perfurador,
  publicUrl,
}: Props) {
  return (
    <PDFDownloadLink
      document={
        <OrcamentoPDF
          orcamento={orcamento}
          perfurador={perfurador}
          publicUrl={publicUrl}
        />
      }
      fileName={`orcamento-${orcamento.id.slice(0, 8)}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          {loading ? "Gerando PDF..." : "Baixar PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
