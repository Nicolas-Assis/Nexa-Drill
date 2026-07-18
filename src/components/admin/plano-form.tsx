"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Plano } from "@/types";
import type { PlanoFormData } from "@/lib/validations";

function slugify(base: string): string {
  return base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function PlanoForm({
  plano,
  loading,
  onSubmit,
  onCancel,
}: {
  plano?: Plano | null;
  loading?: boolean;
  onSubmit: (data: PlanoFormData) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(plano?.nome ?? "");
  const [slug, setSlug] = useState(plano?.slug ?? "");
  const [descricao, setDescricao] = useState(plano?.descricao ?? "");
  const [precoMensal, setPrecoMensal] = useState(String(plano?.preco_mensal ?? ""));
  const [precoAnual, setPrecoAnual] = useState(
    plano?.preco_anual != null ? String(plano.preco_anual) : "",
  );
  const [recursosText, setRecursosText] = useState((plano?.recursos ?? []).join("\n"));
  const [ordem, setOrdem] = useState(String(plano?.ordem ?? 0));
  const [destaque, setDestaque] = useState(plano?.destaque ?? false);
  const [ativo, setAtivo] = useState(plano?.ativo ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      nome: nome.trim(),
      slug: (slug || slugify(nome)).trim(),
      descricao: descricao.trim(),
      preco_mensal: Number(precoMensal) || 0,
      preco_anual: precoAnual === "" ? undefined : Number(precoAnual),
      recursos: recursosText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      destaque,
      ativo,
      ordem: Number(ordem) || 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Nome"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            if (!plano && !slug) setSlug(slugify(e.target.value));
          }}
          required
        />
        <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>

      <Textarea
        label="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        rows={2}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Preço mensal (R$)"
          type="number"
          step="0.01"
          min="0"
          value={precoMensal}
          onChange={(e) => setPrecoMensal(e.target.value)}
        />
        <Input
          label="Preço anual (R$)"
          type="number"
          step="0.01"
          min="0"
          value={precoAnual}
          onChange={(e) => setPrecoAnual(e.target.value)}
        />
        <Input
          label="Ordem"
          type="number"
          min="0"
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
        />
      </div>

      <Textarea
        label="Recursos (um por linha)"
        value={recursosText}
        onChange={(e) => setRecursosText(e.target.value)}
        rows={4}
      />

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Plano em destaque
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Ativo
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={loading}>
          Salvar plano
        </Button>
      </div>
    </form>
  );
}
