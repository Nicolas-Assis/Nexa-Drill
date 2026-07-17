"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";
import type { Financeiro, MargemServico } from "@/types";

const servicoIdSchema = z.string().uuid("ID do serviço inválido");

const getMargemServicoSchema = z.object({
  servicoId: servicoIdSchema,
});

const addDespesaServicoSchema = z.object({
  servicoId: servicoIdSchema,
  valor: z.number().positive("Valor deve ser maior que zero"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  descricao: z.string().trim().optional(),
  data: z
    .string()
    .min(1, "Data é obrigatória")
    .optional()
    .default(() => new Date().toISOString().slice(0, 10)),
});

const vincularDespesaServicoSchema = z.object({
  financeiroId: z.string().uuid("ID do lançamento inválido"),
  servicoId: z.string().uuid("ID do serviço inválido").nullable(),
});

type JobPrejuizo = {
  servico_id: string;
  margem: number;
  margem_percentual: number | null;
  custo: number;
  receita: number;
};

type SoloAggregate = {
  tipo_solo: string | null;
  margem_percentual_media: number;
  jobs_count: number;
};

export type MargemResumo = {
  margemMediaMesAtual: number | null;
  custoPorMetroMedio: number | null;
  jobsNoPrejuizo: JobPrejuizo[];
  porTipoSolo: SoloAggregate[];
};

export async function getMargemServico(servicoId: string): Promise<{
  margem: MargemServico | null;
  despesas: Financeiro[];
  error: string | null;
}> {
  try {
    const parsed = getMargemServicoSchema.safeParse({ servicoId });
    if (!parsed.success) {
      return { margem: null, despesas: [], error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: servico, error: servicoError } = await supabase
      .from("servicos")
      .select("id")
      .eq("id", parsed.data.servicoId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (servicoError || !servico) {
      return {
        margem: null,
        despesas: [],
        error: servicoError?.message ?? "Serviço não encontrado",
      };
    }

    const [{ data: margemRow, error: margemError }, { data: despesasRows, error: despesasError }] =
      await Promise.all([
        supabase
          .from("vw_margem_servico")
          .select("*")
          .eq("servico_id", parsed.data.servicoId)
          .eq("perfurador_id", perfuradorId)
          .single(),
        supabase
          .from("financeiro")
          .select("*")
          .eq("perfurador_id", perfuradorId)
          .eq("servico_id", parsed.data.servicoId)
          .eq("tipo", "despesa")
          .order("data", { ascending: false }),
      ]);

    if (margemError) {
      return { margem: null, despesas: [], error: margemError.message };
    }
    if (despesasError) {
      return { margem: null, despesas: [], error: despesasError.message };
    }

    return {
      margem: margemRow as MargemServico,
      despesas: (despesasRows ?? []) as Financeiro[],
      error: null,
    };
  } catch (err) {
    return { margem: null, despesas: [], error: (err as Error).message };
  }
}

export async function addDespesaServico(input: {
  servicoId: string;
  valor: number;
  categoria: string;
  descricao?: string;
  data?: string;
}): Promise<{ lancamento: Financeiro | null; error: string | null }> {
  try {
    const parsed = addDespesaServicoSchema.safeParse(input);
    if (!parsed.success) {
      return { lancamento: null, error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: servico, error: servicoError } = await supabase
      .from("servicos")
      .select("id")
      .eq("id", parsed.data.servicoId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (servicoError || !servico) {
      return {
        lancamento: null,
        error: servicoError?.message ?? "Serviço não encontrado",
      };
    }

    const { data: lancamento, error } = await supabase
      .from("financeiro")
      .insert({
        perfurador_id: perfuradorId,
        servico_id: parsed.data.servicoId,
        tipo: "despesa",
        categoria: parsed.data.categoria,
        descricao: parsed.data.descricao?.trim() || null,
        valor: parsed.data.valor,
        data: parsed.data.data,
      })
      .select("*")
      .single();

    if (error) {
      return { lancamento: null, error: error.message };
    }

    revalidatePath(`/dashboard/servicos/${parsed.data.servicoId}`);

    return { lancamento: lancamento as Financeiro, error: null };
  } catch (err) {
    return { lancamento: null, error: (err as Error).message };
  }
}

export async function vincularDespesaServico(
  financeiroId: string,
  servicoId: string | null,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parsed = vincularDespesaServicoSchema.safeParse({ financeiroId, servicoId });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: lancamento, error: lancamentoError } = await supabase
      .from("financeiro")
      .select("id, tipo, perfurador_id, servico_id")
      .eq("id", parsed.data.financeiroId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (lancamentoError || !lancamento) {
      return {
        success: false,
        error: lancamentoError?.message ?? "Lançamento não encontrado",
      };
    }

    if (lancamento.tipo !== "despesa") {
      return { success: false, error: "Apenas despesas podem ser vinculadas" };
    }

    if (parsed.data.servicoId) {
      const { data: servico, error: servicoError } = await supabase
        .from("servicos")
        .select("id")
        .eq("id", parsed.data.servicoId)
        .eq("perfurador_id", perfuradorId)
        .single();

      if (servicoError || !servico) {
        return {
          success: false,
          error: servicoError?.message ?? "Serviço não encontrado",
        };
      }
    }

    const { error } = await supabase
      .from("financeiro")
      .update({ servico_id: parsed.data.servicoId })
      .eq("id", parsed.data.financeiroId)
      .eq("perfurador_id", perfuradorId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/financeiro");
    if (parsed.data.servicoId) {
      revalidatePath(`/dashboard/servicos/${parsed.data.servicoId}`);
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getMargemResumo(): Promise<{
  resumo: MargemResumo | null;
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    const { data: servicosConcluidosMes, error: servicosMesError } = await supabase
      .from("servicos")
      .select("id")
      .eq("perfurador_id", perfuradorId)
      .eq("status", "concluido")
      .gte("data_conclusao", startMonth)
      .lte("data_conclusao", endMonth);

    if (servicosMesError) {
      return { resumo: null, error: servicosMesError.message };
    }

    const servicoIdsMes = (servicosConcluidosMes ?? []).map((row) => row.id as string);

    let margemMediaMesAtual: number | null = null;
    let custoPorMetroMedio: number | null = null;

    if (servicoIdsMes.length > 0) {
      const { data: margemMesRows, error: margemMesError } = await supabase
        .from("vw_margem_servico")
        .select("margem_percentual, custo_por_metro")
        .eq("perfurador_id", perfuradorId)
        .in("servico_id", servicoIdsMes);

      if (margemMesError) {
        return { resumo: null, error: margemMesError.message };
      }

      const margens = (margemMesRows ?? [])
        .map((row) => row.margem_percentual as number | null)
        .filter((value): value is number => value !== null);

      const custosPorMetro = (margemMesRows ?? [])
        .map((row) => row.custo_por_metro as number | null)
        .filter((value): value is number => value !== null);

      if (margens.length > 0) {
        margemMediaMesAtual = Number(
          (margens.reduce((sum, value) => sum + value, 0) / margens.length).toFixed(2),
        );
      }

      if (custosPorMetro.length > 0) {
        custoPorMetroMedio = Number(
          (
            custosPorMetro.reduce((sum, value) => sum + value, 0) /
            custosPorMetro.length
          ).toFixed(2),
        );
      }
    }

    const { data: jobsPrejuizoRows, error: jobsPrejuizoError } = await supabase
      .from("vw_margem_servico")
      .select("servico_id, margem, margem_percentual, custo, receita")
      .eq("perfurador_id", perfuradorId)
      .lt("margem", 0)
      .order("margem", { ascending: true })
      .limit(10);

    if (jobsPrejuizoError) {
      return { resumo: null, error: jobsPrejuizoError.message };
    }

    const { data: margemSoloRows, error: margemSoloError } = await supabase
      .from("vw_margem_servico")
      .select("tipo_solo, margem_percentual")
      .eq("perfurador_id", perfuradorId);

    if (margemSoloError) {
      return { resumo: null, error: margemSoloError.message };
    }

    const soloAggMap = new Map<string | null, { total: number; count: number }>();

    for (const row of margemSoloRows ?? []) {
      const tipoSolo = (row.tipo_solo as string | null) ?? null;
      const margemPercentual = row.margem_percentual as number | null;

      if (margemPercentual === null) continue;

      const current = soloAggMap.get(tipoSolo) ?? { total: 0, count: 0 };
      current.total += margemPercentual;
      current.count += 1;
      soloAggMap.set(tipoSolo, current);
    }

    const porTipoSolo: SoloAggregate[] = Array.from(soloAggMap.entries())
      .map(([tipo_solo, stats]) => ({
        tipo_solo,
        margem_percentual_media: Number((stats.total / stats.count).toFixed(2)),
        jobs_count: stats.count,
      }))
      .sort((a, b) => b.jobs_count - a.jobs_count);

    return {
      resumo: {
        margemMediaMesAtual,
        custoPorMetroMedio,
        jobsNoPrejuizo: (jobsPrejuizoRows ?? []) as JobPrejuizo[],
        porTipoSolo,
      },
      error: null,
    };
  } catch (err) {
    return { resumo: null, error: (err as Error).message };
  }
}
