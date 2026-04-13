"use server";

import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";
import type { LancamentoFormData } from "@/lib/validations";
import type { Financeiro } from "@/types";

export type Periodo =
  | "mes_atual"
  | "3_meses"
  | "6_meses"
  | "ano_atual"
  | "tudo";

function getDateRange(periodo: Periodo): { start: string; end: string } | null {
  const now = new Date();
  switch (periodo) {
    case "mes_atual": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      return { start, end };
    }
    case "3_meses": {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        .toISOString()
        .slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      return { start, end };
    }
    case "6_meses": {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        .toISOString()
        .slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      return { start, end };
    }
    case "ano_atual":
      return {
        start: `${now.getFullYear()}-01-01`,
        end: `${now.getFullYear()}-12-31`,
      };
    case "tudo":
    default:
      return null;
  }
}

export async function getLancamentos(periodo: Periodo = "tudo"): Promise<{
  lancamentos: Financeiro[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    let query = supabase
      .from("financeiro")
      .select("*")
      .eq("perfurador_id", perfuradorId)
      .order("data", { ascending: false });

    const range = getDateRange(periodo);
    if (range) {
      query = query.gte("data", range.start).lte("data", range.end);
    }

    const { data, error } = await query;
    if (error) return { lancamentos: [], error: error.message };
    return { lancamentos: (data ?? []) as Financeiro[], error: null };
  } catch (err) {
    return { lancamentos: [], error: (err as Error).message };
  }
}

export async function createLancamento(data: LancamentoFormData): Promise<{
  lancamento: Financeiro | null;
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: lancamento, error } = await supabase
      .from("financeiro")
      .insert({
        perfurador_id: perfuradorId,
        tipo: data.tipo,
        categoria: data.categoria,
        descricao: data.descricao,
        valor: data.valor,
        data: data.data,
        servico_id: data.servico_id || null,
      })
      .select()
      .single();

    if (error) return { lancamento: null, error: error.message };
    return { lancamento: lancamento as Financeiro, error: null };
  } catch (err) {
    return { lancamento: null, error: (err as Error).message };
  }
}

export async function updateLancamento(
  id: string,
  data: LancamentoFormData,
): Promise<{ error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("financeiro")
      .update({
        tipo: data.tipo,
        categoria: data.categoria,
        descricao: data.descricao,
        valor: data.valor,
        data: data.data,
        servico_id: data.servico_id || null,
      })
      .eq("id", id)
      .eq("perfurador_id", perfuradorId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteLancamento(id: string): Promise<{
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("financeiro")
      .delete()
      .eq("id", id)
      .eq("perfurador_id", perfuradorId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export type ResumoFinanceiro = {
  totalReceita: number;
  totalDespesa: number;
  lucroLiquido: number;
  ticketMedio: number;
  porMes: { mes: string; receita: number; despesa: number }[];
  porCategoriaDespesa: { categoria: string; valor: number }[];
  error: string | null;
};

export async function getResumoFinanceiro(
  periodo: Periodo = "tudo",
): Promise<ResumoFinanceiro> {
  const empty: ResumoFinanceiro = {
    totalReceita: 0,
    totalDespesa: 0,
    lucroLiquido: 0,
    ticketMedio: 0,
    porMes: [],
    porCategoriaDespesa: [],
    error: null,
  };

  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const range = getDateRange(periodo);

    let query = supabase
      .from("financeiro")
      .select("tipo, valor, data, categoria")
      .eq("perfurador_id", perfuradorId)
      .order("data", { ascending: true });

    if (range) {
      query = query.gte("data", range.start).lte("data", range.end);
    }

    const { data: rows, error } = await query;
    if (error) return { ...empty, error: error.message };

    const allRows = rows ?? [];

    let totalReceita = 0;
    let totalDespesa = 0;
    let countReceita = 0;
    const mesMap = new Map<string, { receita: number; despesa: number }>();
    const catMap = new Map<string, number>();

    for (const row of allRows) {
      const mesKey = (row.data as string).slice(0, 7);
      if (!mesMap.has(mesKey)) mesMap.set(mesKey, { receita: 0, despesa: 0 });
      const bucket = mesMap.get(mesKey)!;

      if (row.tipo === "receita") {
        totalReceita += row.valor as number;
        bucket.receita += row.valor as number;
        countReceita++;
      } else {
        totalDespesa += row.valor as number;
        bucket.despesa += row.valor as number;
        const cat = (row.categoria as string) ?? "outro";
        catMap.set(cat, (catMap.get(cat) ?? 0) + (row.valor as number));
      }
    }

    const porMes = Array.from(mesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({ mes, ...v }));

    const porCategoriaDespesa = Array.from(catMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([categoria, valor]) => ({ categoria, valor }));

    return {
      totalReceita,
      totalDespesa,
      lucroLiquido: totalReceita - totalDespesa,
      ticketMedio: countReceita > 0 ? totalReceita / countReceita : 0,
      porMes,
      porCategoriaDespesa,
      error: null,
    };
  } catch (err) {
    return { ...empty, error: (err as Error).message };
  }
}

export async function getServicosForSelect(): Promise<{
  servicos: { id: string; label: string }[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("servicos")
      .select("id, endereco, cliente:clientes(nome)")
      .eq("perfurador_id", perfuradorId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { servicos: [], error: error.message };

    const servicos = (data ?? []).map((s) => {
      const clienteArray = s.cliente as { nome: string }[] | null;
      const clienteNome =
        clienteArray && clienteArray.length > 0 ? clienteArray[0].nome : null;
      return {
        id: s.id as string,
        label:
          clienteNome ??
          (s.endereco as string | null) ??
          `Serviço ${(s.id as string).slice(0, 8)}`,
      };
    });

    return { servicos, error: null };
  } catch (err) {
    return { servicos: [], error: (err as Error).message };
  }
}
