"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
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
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-secondary-900">
          Solicitação enviada!
        </h3>
        <p className="text-secondary-500 text-sm max-w-xs">
          O perfurador receberá sua solicitação e entrará em contato em breve.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label
            htmlFor="sol-nome"
            className="block text-sm font-medium text-secondary-700"
          >
            Nome <span className="text-danger">*</span>
          </label>
          <input
            id="sol-nome"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Seu nome completo"
            className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="sol-telefone"
            className="block text-sm font-medium text-secondary-700"
          >
            Telefone / WhatsApp <span className="text-danger">*</span>
          </label>
          <input
            id="sol-telefone"
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
            className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="sol-cidade"
          className="block text-sm font-medium text-secondary-700"
        >
          Cidade / Estado <span className="text-danger">*</span>
        </label>
        <input
          id="sol-cidade"
          name="cidade"
          value={form.cidade}
          onChange={handleChange}
          placeholder="Ex: São Paulo - SP"
          className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="sol-descricao"
          className="block text-sm font-medium text-secondary-700"
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
          className="flex min-h-[100px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          "Solicitar orçamento"
        )}
      </button>

      <p className="text-xs text-center text-secondary-400">
        Ao enviar, você concorda que suas informações serão compartilhadas com o
        profissional.
      </p>
    </form>
  );
}
