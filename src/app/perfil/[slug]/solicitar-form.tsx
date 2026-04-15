"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Send, PartyPopper } from "lucide-react";
import { enviarSolicitacaoOrcamento, type SolicitacaoData } from "./actions";
import { formatPhoneNumber } from "@/lib/format-phone";

interface SolicitarFormProps {
  perfuradorId: string;
}

export function SolicitarForm({ perfuradorId }: SolicitarFormProps) {
  const [form, setForm] = useState<SolicitacaoData>({
    nome: "",
    telefone: "",
    cidade: "",
    descricao: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    if (name === "telefone") {
      setForm((prev) => ({ ...prev, telefone: formatPhoneNumber(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.telefone.trim() || !form.cidade.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    const result = await enviarSolicitacaoOrcamento(perfuradorId, form);
    setLoading(false);

    if (result.error) {
      setError("Ocorreu um erro. Tente novamente.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center animate-scale-in">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-success-50 to-success-100 ring-4 ring-success-100/50">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent shadow-md">
            <PartyPopper className="h-4 w-4 text-white" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-bold text-secondary-900">
            Solicitação enviada com sucesso!
          </h3>
          <p className="text-secondary-500 text-sm max-w-sm mt-2 leading-relaxed">
            O perfurador receberá sua solicitação e entrará em contato em breve.
            Fique de olho no seu telefone!
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="sol-nome"
            className="block text-sm font-semibold text-secondary-700"
          >
            Nome <span className="text-danger">*</span>
          </label>
          <input
            id="sol-nome"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Seu nome completo"
            className="flex h-11 w-full rounded-xl border border-secondary-200 bg-secondary-50/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="sol-telefone"
            className="block text-sm font-semibold text-secondary-700"
          >
            Telefone / WhatsApp <span className="text-danger">*</span>
          </label>
          <input
            id="sol-telefone"
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
            className="flex h-11 w-full rounded-xl border border-secondary-200 bg-secondary-50/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="sol-cidade"
          className="block text-sm font-semibold text-secondary-700"
        >
          Cidade / Estado <span className="text-danger">*</span>
        </label>
        <input
          id="sol-cidade"
          name="cidade"
          value={form.cidade}
          onChange={handleChange}
          placeholder="Ex: São Paulo - SP"
          className="flex h-11 w-full rounded-xl border border-secondary-200 bg-secondary-50/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="sol-descricao"
          className="block text-sm font-semibold text-secondary-700"
        >
          O que você precisa?
        </label>
        <textarea
          id="sol-descricao"
          name="descricao"
          value={form.descricao}
          onChange={handleChange}
          rows={4}
          placeholder="Descreva o que você precisa: tipo de serviço, profundidade estimada, finalidade do poço..."
          className="flex min-h-[110px] w-full rounded-xl border border-secondary-200 bg-secondary-50/50 px-4 py-3 text-sm placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger-50 border border-danger-100 rounded-xl px-4 py-3">
          <span className="shrink-0">⚠️</span>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-700 px-6 py-3.5 text-base font-bold text-white hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Solicitar orçamento gratuito
          </>
        )}
      </button>

      <p className="text-xs text-center text-secondary-400 leading-relaxed">
        Ao enviar, você concorda que suas informações serão compartilhadas com o
        profissional para contato.
      </p>
    </form>
  );
}
