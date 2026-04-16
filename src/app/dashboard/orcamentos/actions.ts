"use server";

import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";
import { orcamentoSchema, type OrcamentoFormData } from "@/lib/validations";
import type { Orcamento, Cliente, StatusOrcamento } from "@/types";

export async function getClientesForSelect(): Promise<{
  clientes: Pick<Cliente, "id" | "nome" | "telefone" | "cidade" | "estado">[];
  error: string | null;
}> {
  try {
    const { supabase, perfurador } = await getAuthenticatedPerfurador();
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, telefone, cidade, estado")
      .eq("perfurador_id", perfurador.id)
      .order("nome");

    if (error) return { clientes: [], error: error.message };
    return { clientes: data ?? [], error: null };
  } catch (err) {
    return { clientes: [], error: (err as Error).message };
  }
}

export async function getOrcamentos(status?: StatusOrcamento): Promise<{
  orcamentos: (Orcamento & { cliente?: Cliente })[];
  error: string | null;
}> {
  try {
    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    let query = supabase
      .from("orcamentos")
      .select("*, cliente:clientes(id, nome, telefone, cidade)")
      .eq("perfurador_id", perfurador.id);

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) return { orcamentos: [], error: error.message };

    return {
      orcamentos: (data ?? []) as (Orcamento & { cliente?: Cliente })[],
      error: null,
    };
  } catch (err) {
    return { orcamentos: [], error: (err as Error).message };
  }
}

export async function getOrcamentoById(id: string): Promise<{
  orcamento: (Orcamento & { cliente?: Cliente }) | null;
  error: string | null;
}> {
  try {
    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("orcamentos")
      .select("*, cliente:clientes(*)")
      .eq("id", id)
      .eq("perfurador_id", perfurador.id)
      .single();

    if (error) return { orcamento: null, error: error.message };
    return {
      orcamento: data as Orcamento & { cliente?: Cliente },
      error: null,
    };
  } catch (err) {
    return { orcamento: null, error: (err as Error).message };
  }
}

export async function createOrcamento(
  data: OrcamentoFormData,
  status: StatusOrcamento = "rascunho",
): Promise<{ orcamento: Orcamento | null; error: string | null }> {
  try {
    const parsed = orcamentoSchema.safeParse(data);
    if (!parsed.success) {
      return { orcamento: null, error: parsed.error.issues[0].message };
    }

    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    const itens = parsed.data.itens;
    const valor_total = itens.reduce(
      (sum, item) => sum + item.qtd * item.valor_unit,
      0,
    );
    const desconto = parsed.data.desconto ?? 0;
    const valor_final = valor_total - desconto;

    const payload = {
      perfurador_id: perfurador.id,
      cliente_id: parsed.data.cliente_id,
      status,
      tipo_servico: parsed.data.tipo_servico || null,
      profundidade_estimada_metros:
        parsed.data.profundidade_estimada_metros || null,
      diametro_polegadas: parsed.data.diametro_polegadas || null,
      tipo_solo: parsed.data.tipo_solo || null,
      itens,
      valor_total,
      desconto,
      valor_final,
      forma_pagamento: parsed.data.forma_pagamento || null,
      prazo_execucao_dias: parsed.data.prazo_execucao_dias || null,
      validade_dias: parsed.data.validade_dias ?? 15,
      observacoes: parsed.data.observacoes || null,
      enviado_em: status === "enviado" ? new Date().toISOString() : null,
    };

    const { data: orcamento, error } = await supabase
      .from("orcamentos")
      .insert(payload)
      .select()
      .single();

    if (error) return { orcamento: null, error: error.message };
    return { orcamento: orcamento as Orcamento, error: null };
  } catch (err) {
    return { orcamento: null, error: (err as Error).message };
  }
}

export async function updateOrcamento(
  id: string,
  data: OrcamentoFormData,
  status?: StatusOrcamento,
): Promise<{ orcamento: Orcamento | null; error: string | null }> {
  try {
    const parsed = orcamentoSchema.safeParse(data);
    if (!parsed.success) {
      return { orcamento: null, error: parsed.error.issues[0].message };
    }

    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    const itens = parsed.data.itens;
    const valor_total = itens.reduce(
      (sum, item) => sum + item.qtd * item.valor_unit,
      0,
    );
    const desconto = parsed.data.desconto ?? 0;
    const valor_final = valor_total - desconto;

    const payload: Record<string, unknown> = {
      cliente_id: parsed.data.cliente_id,
      tipo_servico: parsed.data.tipo_servico || null,
      profundidade_estimada_metros:
        parsed.data.profundidade_estimada_metros || null,
      diametro_polegadas: parsed.data.diametro_polegadas || null,
      tipo_solo: parsed.data.tipo_solo || null,
      itens,
      valor_total,
      desconto,
      valor_final,
      forma_pagamento: parsed.data.forma_pagamento || null,
      prazo_execucao_dias: parsed.data.prazo_execucao_dias || null,
      validade_dias: parsed.data.validade_dias ?? 15,
      observacoes: parsed.data.observacoes || null,
    };

    if (status) {
      payload.status = status;
      if (status === "enviado") payload.enviado_em = new Date().toISOString();
    }

    const { data: orcamento, error } = await supabase
      .from("orcamentos")
      .update(payload)
      .eq("id", id)
      .eq("perfurador_id", perfurador.id)
      .select()
      .single();

    if (error) return { orcamento: null, error: error.message };
    return { orcamento: orcamento as Orcamento, error: null };
  } catch (err) {
    return { orcamento: null, error: (err as Error).message };
  }
}

export async function updateOrcamentoStatus(
  id: string,
  newStatus: StatusOrcamento,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    const payload: Record<string, unknown> = { status: newStatus };
    if (newStatus === "enviado") payload.enviado_em = new Date().toISOString();
    if (newStatus === "aprovado")
      payload.aprovado_em = new Date().toISOString();

    const { error } = await supabase
      .from("orcamentos")
      .update(payload)
      .eq("id", id)
      .eq("perfurador_id", perfurador.id);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteOrcamento(
  id: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    // Desvincular serviços associados antes de excluir
    await supabase
      .from("servicos")
      .update({ orcamento_id: null })
      .eq("orcamento_id", id)
      .eq("perfurador_id", perfurador.id);

    const { error } = await supabase
      .from("orcamentos")
      .delete()
      .eq("id", id)
      .eq("perfurador_id", perfurador.id);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getPerfuradorData() {
  try {
    const { perfurador } = await getAuthenticatedPerfurador();
    return { perfurador, error: null };
  } catch (err) {
    return { perfurador: null, error: (err as Error).message };
  }
}

export async function createServicoDeOrcamento(orcamentoId: string): Promise<{
  servicoId: string | null;
  error: string | null;
}> {
  try {
    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    const { data: orc, error: orcError } = await supabase
      .from("orcamentos")
      .select("cliente_id, profundidade_estimada_metros, diametro_polegadas")
      .eq("id", orcamentoId)
      .eq("perfurador_id", perfurador.id)
      .single();

    if (orcError || !orc)
      return {
        servicoId: null,
        error: orcError?.message ?? "Orçamento não encontrado",
      };

    const { data: existing } = await supabase
      .from("servicos")
      .select("id")
      .eq("orcamento_id", orcamentoId)
      .eq("perfurador_id", perfurador.id)
      .maybeSingle();

    if (existing) return { servicoId: existing.id, error: null };

    const { data: servico, error } = await supabase
      .from("servicos")
      .insert({
        perfurador_id: perfurador.id,
        orcamento_id: orcamentoId,
        cliente_id: orc.cliente_id ?? null,
        profundidade_real_metros: orc.profundidade_estimada_metros ?? null,
        diametro_polegadas: orc.diametro_polegadas ?? null,
        data_inicio: new Date().toISOString().split("T")[0],
        materiais: [],
        fotos: [],
      })
      .select("id")
      .single();

    if (error) return { servicoId: null, error: error.message };
    return { servicoId: servico.id, error: null };
  } catch (err) {
    return { servicoId: null, error: (err as Error).message };
  }
}

export async function createLancamentoConclusao(data: {
  servicoId: string | null;
  valor: number;
  desconto: number;
  data: string;
  descricao: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    const valorFinal = data.valor - data.desconto;

    const { error } = await supabase.from("financeiro").insert({
      perfurador_id: perfurador.id,
      servico_id: data.servicoId ?? null,
      tipo: "receita",
      categoria: "servico",
      descricao: data.descricao,
      valor: valorFinal,
      data: data.data,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function concluirServico(servicoId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("servicos")
      .update({ data_conclusao: new Date().toISOString().split("T")[0] })
      .eq("id", servicoId)
      .eq("perfurador_id", perfurador.id);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
