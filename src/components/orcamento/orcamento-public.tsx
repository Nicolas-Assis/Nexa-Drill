"use client";

import { useState } from "react";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { Check, Pencil, Loader2, Clock, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  aprovarOrcamentoPublico,
  solicitarAlteracaoPublico,
} from "@/app/orcamento/actions";
import type { Orcamento, Perfurador, Cliente } from "@/types";

const SERVICO_LABELS: Record<string, string> = {
  perfuracao: "Perfuração",
  manutencao: "Manutenção",
  limpeza: "Limpeza",
  bombeamento: "Bombeamento",
};

interface OrcamentoPublicProps {
  orcamento: Orcamento & { cliente?: Cliente };
  perfurador: Perfurador;
}

export function OrcamentoPublic({
  orcamento,
  perfurador,
}: OrcamentoPublicProps) {
  const [showAlteracao, setShowAlteracao] = useState(false);
  const [alteracaoNota, setAlteracaoNota] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createdDate = new Date(orcamento.created_at);
  const expiresDate = addDays(createdDate, orcamento.validade_dias);
  const isExpired = new Date() > expiresDate;
  const isApproved = orcamento.status === "aprovado";
  const isCancelled = orcamento.status === "cancelado";
  const canApprove = orcamento.status === "enviado" && !isExpired;

  const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];
  const subtotal = itens.reduce((sum, i) => sum + i.qtd * i.valor_unit, 0);
  const desconto = orcamento.desconto ?? 0;
  const valorFinal = orcamento.valor_final ?? subtotal - desconto;

  async function handleAprovar() {
    setSubmitting(true);
    const result = await aprovarOrcamentoPublico(orcamento.link_publico);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Orçamento aprovado com sucesso!");
      window.location.reload();
    }
  }

  async function handleSolicitarAlteracao() {
    if (!alteracaoNota.trim()) {
      toast.error("Descreva a alteração solicitada");
      return;
    }
    setSubmitting(true);
    const result = await solicitarAlteracaoPublico(
      orcamento.link_publico,
      alteracaoNota,
    );
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Solicitação enviada com sucesso!");
      setAlteracaoNota("");
      setShowAlteracao(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Droplets className="h-6 w-6 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-secondary-900">
          {perfurador.nome_empresa || perfurador.nome}
        </h1>
        <p className="text-secondary-500 text-sm">
          {perfurador.telefone} | {perfurador.email}
        </p>
      </div>

      {/* Status */}
      <div className="flex justify-center">
        {isApproved && (
          <Badge variant="success" className="px-4 py-1.5 text-sm">
            Aprovado em {formatDate(orcamento.aprovado_em!)}
          </Badge>
        )}
        {orcamento.status === "enviado" && !isExpired && (
          <Badge
            variant="info"
            className="px-4 py-1.5 text-sm flex items-center gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            Aguardando aprovação
          </Badge>
        )}
        {isExpired && !isApproved && (
          <Badge variant="danger" className="px-4 py-1.5 text-sm">
            Orçamento expirado em {formatDate(expiresDate.toISOString())}
          </Badge>
        )}
        {isCancelled && (
          <Badge variant="danger" className="px-4 py-1.5 text-sm">
            Orçamento cancelado
          </Badge>
        )}
      </div>

      {/* Main content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Orçamento #{orcamento.id.slice(0, 8).toUpperCase()}
            </CardTitle>
            <span className="text-sm text-secondary-400">
              Emitido em {formatDate(orcamento.created_at)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client + Service info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {orcamento.cliente && (
              <div>
                <p className="text-secondary-400 mb-1">Cliente</p>
                <p className="font-medium text-secondary-900">
                  {orcamento.cliente.nome}
                </p>
                <p className="text-secondary-500">
                  {orcamento.cliente.telefone}
                </p>
              </div>
            )}
            {orcamento.tipo_servico && (
              <div>
                <p className="text-secondary-400 mb-1">Tipo de Serviço</p>
                <p className="font-medium text-secondary-900">
                  {SERVICO_LABELS[orcamento.tipo_servico] ||
                    orcamento.tipo_servico}
                </p>
              </div>
            )}
            {orcamento.profundidade_estimada_metros && (
              <div>
                <p className="text-secondary-400 mb-1">Profundidade Estimada</p>
                <p className="font-medium text-secondary-900">
                  {orcamento.profundidade_estimada_metros}m
                </p>
              </div>
            )}
            {orcamento.diametro_polegadas && (
              <div>
                <p className="text-secondary-400 mb-1">Diâmetro</p>
                <p className="font-medium text-secondary-900">
                  {orcamento.diametro_polegadas}&quot;
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border-t border-secondary-200 pt-4">
            <h3 className="font-semibold text-secondary-900 mb-3">Itens</h3>
            <div className="space-y-2">
              {itens.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm py-1.5 border-b border-secondary-100 last:border-0"
                >
                  <div>
                    <span className="text-secondary-900">{item.descricao}</span>
                    <span className="text-secondary-400 ml-2">
                      ({item.qtd} {item.unidade} ×{" "}
                      {formatCurrency(item.valor_unit)})
                    </span>
                  </div>
                  <span className="font-medium text-secondary-900 shrink-0 ml-4">
                    {formatCurrency(item.qtd * item.valor_unit)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-500">Subtotal</span>
                <span className="text-secondary-700">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary-500">Desconto</span>
                  <span className="text-danger">
                    - {formatCurrency(desconto)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-secondary-200 pt-3 mt-2">
                <span className="text-xl font-bold text-secondary-900">
                  Total
                </span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(valorFinal)}
                </span>
              </div>
            </div>
          </div>

          {/* Conditions */}
          {(orcamento.forma_pagamento || orcamento.prazo_execucao_dias) && (
            <div className="border-t border-secondary-200 pt-4">
              <h3 className="font-semibold text-secondary-900 mb-2">
                Condições
              </h3>
              {orcamento.forma_pagamento && (
                <p className="text-sm text-secondary-600 mb-1">
                  <span className="text-secondary-400">Pagamento:</span>{" "}
                  {orcamento.forma_pagamento}
                </p>
              )}
              {orcamento.prazo_execucao_dias && (
                <p className="text-sm text-secondary-600 mb-1">
                  <span className="text-secondary-400">Prazo:</span>{" "}
                  {orcamento.prazo_execucao_dias} dias úteis
                </p>
              )}
              <p className="text-sm text-secondary-600">
                <span className="text-secondary-400">Validade:</span> até{" "}
                {formatDate(expiresDate.toISOString())}
              </p>
            </div>
          )}

          {/* Observations */}
          {orcamento.observacoes && (
            <div className="border-t border-secondary-200 pt-4">
              <h3 className="font-semibold text-secondary-900 mb-2">
                Observações
              </h3>
              <p className="text-sm text-secondary-600 whitespace-pre-wrap">
                {orcamento.observacoes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      {!isCancelled && !isApproved && orcamento.status !== "rascunho" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 h-12 text-base bg-success hover:bg-success-700"
                disabled={!canApprove || submitting}
                onClick={handleAprovar}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Check className="mr-2 h-5 w-5" />
                )}
                Aprovar Orçamento
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 text-base"
                disabled={submitting}
                onClick={() => setShowAlteracao(!showAlteracao)}
              >
                <Pencil className="mr-2 h-5 w-5" />
                Solicitar Alteração
              </Button>
            </div>

            {isExpired && (
              <p className="text-sm text-danger text-center">
                Este orçamento expirou em{" "}
                {formatDate(expiresDate.toISOString())}. Entre em contato com o
                perfurador.
              </p>
            )}

            {showAlteracao && (
              <div className="space-y-3 border-t border-secondary-200 pt-4">
                <Textarea
                  label="Descreva a alteração desejada"
                  placeholder="Ex: Gostaria de alterar a profundidade para 150m..."
                  value={alteracaoNota}
                  onChange={(e) => setAlteracaoNota(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSolicitarAlteracao}
                    disabled={submitting}
                    size="sm"
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Enviar Solicitação
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-secondary-400 pb-4">
        Orçamento gerado pelo NexaDrill
      </p>
    </div>
  );
}
