"use server";

import { createClient } from "@/lib/supabase/server";
import type { Orcamento, Perfurador, Cliente } from "@/types";

export async function getOrcamentoByLinkPublico(linkPublico: string): Promise<{
  orcamento: (Orcamento & { cliente?: Cliente }) | null;
  perfurador: Perfurador | null;
  error: string | null;
}> {
  try {
    const supabase = createClient();

    const { data: orcamento, error } = await supabase
      .from("orcamentos")
      .select("*, cliente:clientes(*)")
      .eq("link_publico", linkPublico)
      .single();

    if (error || !orcamento) {
      return { orcamento: null, perfurador: null, error: "Orçamento não encontrado" };
    }

    const { data: perfurador, error: perfError } = await supabase
      .from("perfuradores")
      .select("*")
      .eq("id", orcamento.perfurador_id)
      .single();

    if (perfError || !perfurador) {
      return { orcamento: null, perfurador: null, error: "Perfurador não encontrado" };
    }

    return {
      orcamento: orcamento as Orcamento & { cliente?: Cliente },
      perfurador: perfurador as Perfurador,
      error: null,
    };
  } catch (err) {
    return { orcamento: null, perfurador: null, error: (err as Error).message };
  }
}

export async function aprovarOrcamentoPublico(
  linkPublico: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("orcamentos")
      .update({
        status: "aprovado",
        aprovado_em: new Date().toISOString(),
      })
      .eq("link_publico", linkPublico)
      .eq("status", "enviado");

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function solicitarAlteracaoPublico(
  linkPublico: string,
  nota: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Append the note to observacoes
    const { data: orc } = await supabase
      .from("orcamentos")
      .select("observacoes")
      .eq("link_publico", linkPublico)
      .single();

    const existingNotes = orc?.observacoes || "";
    const timestamp = new Date().toLocaleDateString("pt-BR");
    const updatedNotes = `${existingNotes}\n\n--- Solicitação do cliente (${timestamp}) ---\n${nota}`.trim();

    const { error } = await supabase
      .from("orcamentos")
      .update({ observacoes: updatedNotes })
      .eq("link_publico", linkPublico);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
