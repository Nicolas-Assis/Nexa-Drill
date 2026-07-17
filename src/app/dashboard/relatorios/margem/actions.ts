"use server";

import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";

export type MargemRelatorioRow = {
  servico_id: string;
  cliente_nome: string | null;
  tipo_solo: string | null;
  profundidade: number | null;
  receita: number;
  custo: number;
  margem: number;
  margem_percentual: number | null;
  custo_por_metro: number | null;
  data_conclusao: string | null;
};

export async function getRelatorioMargem(): Promise<{
  rows: MargemRelatorioRow[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const [
      { data: margemRows, error: margemError },
      { data: servicosRows, error: servicosError },
    ] = await Promise.all([
      supabase
        .from("vw_margem_servico")
        .select(
          "servico_id, tipo_solo, profundidade, receita, custo, margem, margem_percentual, custo_por_metro",
        )
        .eq("perfurador_id", perfuradorId),
      supabase
        .from("servicos")
        .select("id, data_conclusao, cliente:clientes(nome)")
        .eq("perfurador_id", perfuradorId),
    ]);

    if (margemError) {
      return { rows: [], error: margemError.message };
    }
    if (servicosError) {
      return { rows: [], error: servicosError.message };
    }

    const servicoMap = new Map<
      string,
      { cliente_nome: string | null; data_conclusao: string | null }
    >();

    for (const servico of servicosRows ?? []) {
      const clienteArray = servico.cliente as { nome: string }[] | null;
      servicoMap.set(servico.id as string, {
        cliente_nome:
          clienteArray && clienteArray.length > 0
            ? (clienteArray[0].nome as string)
            : null,
        data_conclusao: (servico.data_conclusao as string | null) ?? null,
      });
    }

    const rows: MargemRelatorioRow[] = (margemRows ?? []).map((row) => {
      const meta = servicoMap.get(row.servico_id as string);
      return {
        servico_id: row.servico_id as string,
        cliente_nome: meta?.cliente_nome ?? null,
        tipo_solo: (row.tipo_solo as string | null) ?? null,
        profundidade: (row.profundidade as number | null) ?? null,
        receita: (row.receita as number) ?? 0,
        custo: (row.custo as number) ?? 0,
        margem: (row.margem as number) ?? 0,
        margem_percentual: (row.margem_percentual as number | null) ?? null,
        custo_por_metro: (row.custo_por_metro as number | null) ?? null,
        data_conclusao: meta?.data_conclusao ?? null,
      };
    });

    return { rows, error: null };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}
