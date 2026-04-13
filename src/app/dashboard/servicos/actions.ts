"use server";

import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";
import type { Servico, Cliente, Orcamento } from "@/types";

export async function getServicos(): Promise<{
  servicos: (Servico & {
    cliente?: Cliente;
    orcamento?: Pick<Orcamento, "id" | "tipo_servico" | "valor_final">;
  })[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("servicos")
      .select(
        "*, cliente:clientes(id, nome, telefone, cidade, estado), orcamento:orcamentos(id, tipo_servico, valor_final)",
      )
      .eq("perfurador_id", perfuradorId)
      .order("created_at", { ascending: false });

    if (error) return { servicos: [], error: error.message };
    return {
      servicos: (data ?? []) as (Servico & {
        cliente?: Cliente;
        orcamento?: Pick<Orcamento, "id" | "tipo_servico" | "valor_final">;
      })[],
      error: null,
    };
  } catch (err) {
    return { servicos: [], error: (err as Error).message };
  }
}

export async function getServicoById(id: string): Promise<{
  servico: (Servico & { cliente?: Cliente; orcamento?: Orcamento }) | null;
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("servicos")
      .select("*, cliente:clientes(*), orcamento:orcamentos(*)")
      .eq("id", id)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (error) return { servico: null, error: error.message };
    return {
      servico: data as Servico & { cliente?: Cliente; orcamento?: Orcamento },
      error: null,
    };
  } catch (err) {
    return { servico: null, error: (err as Error).message };
  }
}

export type ServicoCreateData = {
  cliente_id: string | null;
  orcamento_id: string | null;
  valor: number | null;
  status: "andamento" | "concluido" | "cancelado";
  endereco: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  profundidade_real_metros: number | null;
  diametro_polegadas: number | null;
  tipo_solo_encontrado: string | null;
  vazao_litros_hora: number | null;
  nivel_estatico_metros: number | null;
  nivel_dinamico_metros: number | null;
  notas: string | null;
};

export async function createServico(data: ServicoCreateData): Promise<{
  servico: Servico | null;
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: servico, error } = await supabase
      .from("servicos")
      .insert({
        perfurador_id: perfuradorId,
        ...data,
      })
      .select()
      .single();

    if (error) return { servico: null, error: error.message };
    return { servico: servico as Servico, error: null };
  } catch (err) {
    return { servico: null, error: (err as Error).message };
  }
}

export type ServicoUpdateData = Partial<ServicoCreateData>;

export async function updateServico(
  id: string,
  data: ServicoUpdateData,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("servicos")
      .update(data)
      .eq("id", id)
      .eq("perfurador_id", perfuradorId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// Concluir serviço e criar lançamento financeiro
export async function concluirServicoComReceita(
  servicoId: string,
  dados: {
    valor: number;
    desconto: number;
    data: string;
    descricao: string;
  },
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const valorFinal = dados.valor - dados.desconto;
    const today = new Date().toISOString().slice(0, 10);

    // Atualizar serviço para concluído
    const { error: updateError } = await supabase
      .from("servicos")
      .update({
        status: "concluido",
        data_conclusao: today,
        valor: dados.valor,
      })
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId);

    if (updateError) return { success: false, error: updateError.message };

    // Criar lançamento financeiro
    const { error: financeiroError } = await supabase
      .from("financeiro")
      .insert({
        perfurador_id: perfuradorId,
        servico_id: servicoId,
        tipo: "receita",
        categoria: "servico",
        descricao: dados.descricao,
        valor: valorFinal,
        data: dados.data,
      });

    if (financeiroError)
      return { success: false, error: financeiroError.message };

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// Cancelar serviço
export async function cancelarServico(
  id: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("servicos")
      .update({ status: "cancelado" })
      .eq("id", id)
      .eq("perfurador_id", perfuradorId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteServico(id: string): Promise<{
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("servicos")
      .delete()
      .eq("id", id)
      .eq("perfurador_id", perfuradorId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function getClientesForSelect(): Promise<{
  clientes: { id: string; nome: string }[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("perfurador_id", perfuradorId)
      .order("nome");

    if (error) return { clientes: [], error: error.message };
    return {
      clientes: (data ?? []) as { id: string; nome: string }[],
      error: null,
    };
  } catch (err) {
    return { clientes: [], error: (err as Error).message };
  }
}

export async function getOrcamentosForSelect(): Promise<{
  orcamentos: { id: string; label: string }[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("orcamentos")
      .select("id, tipo_servico, cliente:clientes(nome)")
      .eq("perfurador_id", perfuradorId)
      .in("status", ["aprovado", "em_execucao"])
      .order("created_at", { ascending: false });

    if (error) return { orcamentos: [], error: error.message };

    const orcamentos = (data ?? []).map((o) => {
      const clienteArray = o.cliente as { nome: string }[] | null;
      const clienteNome =
        clienteArray && clienteArray.length > 0 ? clienteArray[0].nome : null;
      return {
        id: o.id as string,
        label: `${clienteNome ?? "Cliente"} — ${o.tipo_servico ?? "Serviço"} (#${(o.id as string).slice(0, 6)})`,
      };
    });

    return { orcamentos, error: null };
  } catch (err) {
    return { orcamentos: [], error: (err as Error).message };
  }
}

export async function addServicoFoto(
  servicoId: string,
  fotoUrl: string,
): Promise<{ error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    // Get current fotos
    const { data: servico, error: fetchError } = await supabase
      .from("servicos")
      .select("fotos")
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (fetchError) return { error: fetchError.message };

    const currentFotos = (servico?.fotos as string[]) ?? [];
    const newFotos = [...currentFotos, fotoUrl];

    const { error } = await supabase
      .from("servicos")
      .update({ fotos: newFotos })
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function removeServicoFoto(
  servicoId: string,
  fotoUrl: string,
): Promise<{ error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    // Get current fotos
    const { data: servico, error: fetchError } = await supabase
      .from("servicos")
      .select("fotos")
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (fetchError) return { error: fetchError.message };

    const currentFotos = (servico?.fotos as string[]) ?? [];
    const newFotos = currentFotos.filter((f) => f !== fotoUrl);

    const { error } = await supabase
      .from("servicos")
      .update({ fotos: newFotos })
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
