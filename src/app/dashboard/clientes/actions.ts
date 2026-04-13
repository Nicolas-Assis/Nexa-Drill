"use server";

import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";
import { clienteSchema, type ClienteFormData } from "@/lib/validations";
import type { Cliente } from "@/types";

export async function getClientes(
  search?: string,
  page: number = 1,
): Promise<{
  clientes: (Cliente & { _orcamentosCount: number })[];
  total: number;
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    let query = supabase
      .from("clientes")
      .select("*, orcamentos(count)", { count: "exact" })
      .eq("perfurador_id", perfuradorId);

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`nome.ilike.${term},telefone.ilike.${term}`);
    }

    query = query.order("created_at", { ascending: false });

    const perPage = 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { clientes: [], total: 0, error: error.message };
    }

    const clientes = (data ?? []).map((row: Record<string, unknown>) => {
      const { orcamentos, ...cliente } = row;
      const countArr = orcamentos as { count: number }[] | null;
      return {
        ...cliente,
        _orcamentosCount: countArr?.[0]?.count ?? 0,
      };
    }) as (Cliente & { _orcamentosCount: number })[];

    return { clientes, total: count ?? 0, error: null };
  } catch (err) {
    return { clientes: [], total: 0, error: (err as Error).message };
  }
}

export async function getClienteById(id: string): Promise<{
  cliente: Cliente | null;
  orcamentosCount: number;
  servicosCount: number;
  orcamentos: {
    id: string;
    status: string;
    tipo_servico: string | null;
    valor_final: number | null;
    created_at: string;
  }[];
  servicos: {
    id: string;
    status: string;
    valor: number | null;
    data_inicio: string | null;
    data_conclusao: string | null;
    orcamento?: {
      tipo_servico: string | null;
      valor_final: number | null;
    } | null;
  }[];
  valorTotalRecebido: number;
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const [clienteRes, orcRes, servRes, financeiroRes] = await Promise.all([
      supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .eq("perfurador_id", perfuradorId)
        .single(),
      supabase
        .from("orcamentos")
        .select("id, status, tipo_servico, valor_final, created_at")
        .eq("cliente_id", id)
        .eq("perfurador_id", perfuradorId)
        .order("created_at", { ascending: false }),
      supabase
        .from("servicos")
        .select(
          "id, status, valor, data_inicio, data_conclusao, orcamento:orcamentos(tipo_servico, valor_final)",
        )
        .eq("cliente_id", id)
        .eq("perfurador_id", perfuradorId)
        .order("created_at", { ascending: false }),
      supabase
        .from("financeiro")
        .select("valor")
        .eq("perfurador_id", perfuradorId)
        .eq("tipo", "receita")
        .in(
          "servico_id",
          (
            await supabase
              .from("servicos")
              .select("id")
              .eq("cliente_id", id)
              .eq("perfurador_id", perfuradorId)
          ).data?.map((s) => s.id) ?? [],
        ),
    ]);

    if (clienteRes.error) {
      return {
        cliente: null,
        orcamentosCount: 0,
        servicosCount: 0,
        orcamentos: [],
        servicos: [],
        valorTotalRecebido: 0,
        error: clienteRes.error.message,
      };
    }

    const valorTotalRecebido = (financeiroRes.data ?? []).reduce(
      (sum, f) => sum + (f.valor as number),
      0,
    );

    return {
      cliente: clienteRes.data as Cliente,
      orcamentosCount: orcRes.data?.length ?? 0,
      servicosCount: servRes.data?.length ?? 0,
      orcamentos: (orcRes.data ?? []) as {
        id: string;
        status: string;
        tipo_servico: string | null;
        valor_final: number | null;
        created_at: string;
      }[],
      servicos: (servRes.data ?? []).map((s) => ({
        id: s.id as string,
        status: s.status as string,
        valor: s.valor as number | null,
        data_inicio: s.data_inicio as string | null,
        data_conclusao: s.data_conclusao as string | null,
        orcamento:
          Array.isArray(s.orcamento) && s.orcamento.length > 0
            ? {
                tipo_servico: s.orcamento[0].tipo_servico as string | null,
                valor_final: s.orcamento[0].valor_final as number | null,
              }
            : null,
      })),
      valorTotalRecebido,
      error: null,
    };
  } catch (err) {
    return {
      cliente: null,
      orcamentosCount: 0,
      servicosCount: 0,
      orcamentos: [],
      servicos: [],
      valorTotalRecebido: 0,
      error: (err as Error).message,
    };
  }
}

export async function createCliente(
  data: ClienteFormData,
): Promise<{ cliente: Cliente | null; error: string | null }> {
  try {
    const parsed = clienteSchema.safeParse(data);
    if (!parsed.success) {
      return { cliente: null, error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const payload = {
      perfurador_id: perfuradorId,
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      email: parsed.data.email || null,
      endereco: parsed.data.endereco || null,
      cidade: parsed.data.cidade || null,
      estado: parsed.data.estado || null,
      notas: parsed.data.notas || null,
    };

    const { data: cliente, error } = await supabase
      .from("clientes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { cliente: null, error: error.message };
    }

    return { cliente: cliente as Cliente, error: null };
  } catch (err) {
    return { cliente: null, error: (err as Error).message };
  }
}

export async function updateCliente(
  id: string,
  data: ClienteFormData,
): Promise<{ cliente: Cliente | null; error: string | null }> {
  try {
    const parsed = clienteSchema.safeParse(data);
    if (!parsed.success) {
      return { cliente: null, error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const payload = {
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      email: parsed.data.email || null,
      endereco: parsed.data.endereco || null,
      cidade: parsed.data.cidade || null,
      estado: parsed.data.estado || null,
      notas: parsed.data.notas || null,
    };

    const { data: cliente, error } = await supabase
      .from("clientes")
      .update(payload)
      .eq("id", id)
      .eq("perfurador_id", perfuradorId)
      .select()
      .single();

    if (error) {
      return { cliente: null, error: error.message };
    }

    return { cliente: cliente as Cliente, error: null };
  } catch (err) {
    return { cliente: null, error: (err as Error).message };
  }
}

export async function deleteCliente(
  id: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id)
      .eq("perfurador_id", perfuradorId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
