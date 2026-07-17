"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Perfurador, Servico } from "@/types";

// Rate limit do formulário público: máx 5 requisições por hora por IP
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

export type PublicPerfurador = Pick<
  Perfurador,
  | "id"
  | "nome"
  | "nome_empresa"
  | "bio"
  | "cidade"
  | "estado"
  | "telefone"
  | "email"
  | "logo_url"
  | "raio_atendimento_km"
  | "tipos_servico"
  | "tipos_solo_experiencia"
  | "profundidade_max_metros"
  | "total_servicos"
  | "avaliacao_media"
  | "slug"
>;

export type PublicServico = Pick<
  Servico,
  | "id"
  | "endereco"
  | "profundidade_real_metros"
  | "vazao_litros_hora"
  | "fotos"
  | "data_conclusao"
> & { cliente_cidade?: string | null };

export async function getPerfuradorPublico(slug: string): Promise<{
  perfurador: PublicPerfurador | null;
  servicos: PublicServico[];
  error: string | null;
}> {
  try {
    const supabase = createClient();

    const { data: perfurador, error: perfError } = await supabase
      .from("perfuradores")
      .select(
        "id, nome, nome_empresa, bio, cidade, estado, telefone, email, logo_url, raio_atendimento_km, tipos_servico, tipos_solo_experiencia, profundidade_max_metros, total_servicos, avaliacao_media, slug",
      )
      .eq("slug", slug)
      .single();

    if (perfError || !perfurador) {
      return { perfurador: null, servicos: [], error: "Perfil não encontrado" };
    }

    // Only show concluded services (they have technical data)
    const { data: servicos } = await supabase
      .from("servicos")
      .select(
        "id, endereco, profundidade_real_metros, vazao_litros_hora, fotos, data_conclusao, cliente:clientes(cidade)",
      )
      .eq("perfurador_id", perfurador.id)
      .not("data_conclusao", "is", null)
      .order("data_conclusao", { ascending: false })
      .limit(12);

    const publicServicos: PublicServico[] = (servicos ?? []).map((s) => {
      const clienteArray = s.cliente as { cidade: string | null }[] | null;
      const clienteCidade =
        clienteArray && clienteArray.length > 0 ? clienteArray[0].cidade : null;
      return {
        id: s.id as string,
        endereco: s.endereco as string | null,
        profundidade_real_metros: s.profundidade_real_metros as number | null,
        vazao_litros_hora: s.vazao_litros_hora as number | null,
        fotos: (s.fotos as string[]) ?? [],
        data_conclusao: s.data_conclusao as string | null,
        cliente_cidade: clienteCidade,
      };
    });

    return {
      perfurador: perfurador as PublicPerfurador,
      servicos: publicServicos,
      error: null,
    };
  } catch (err) {
    return { perfurador: null, servicos: [], error: (err as Error).message };
  }
}

export type SolicitacaoData = {
  nome: string;
  telefone: string;
  cidade: string;
  descricao: string;
};

export async function enviarSolicitacaoOrcamento(
  perfuradorId: string,
  data: SolicitacaoData,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Rate limit: no máximo 5 solicitações por hora por IP
    const ip = await getClientIp();
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { count, error: rlError } = await supabase
      .from("public_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);

    if (rlError) {
      // Tabela ainda não migrada (migration 008) ou erro transitório:
      // não bloqueia o formulário — enforcement passa a valer após a migration.
      console.warn(
        "[rate-limit] falha ao consultar public_requests:",
        rlError.message,
      );
    } else if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return {
        success: false,
        error: "Muitas solicitações. Tente novamente em uma hora.",
      };
    }

    // Registra a tentativa (não bloqueia o fluxo em caso de erro de escrita)
    const { error: logError } = await supabase
      .from("public_requests")
      .insert({ ip, perfurador_id: perfuradorId });
    if (logError) {
      console.warn(
        "[rate-limit] falha ao registrar public_requests:",
        logError.message,
      );
    }

    // Create or find client
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .insert({
        perfurador_id: perfuradorId,
        nome: data.nome,
        telefone: data.telefone,
        cidade: data.cidade,
      })
      .select("id")
      .single();

    if (clienteError || !cliente) {
      return {
        success: false,
        error: clienteError?.message ?? "Erro ao criar cliente",
      };
    }

    // Create orcamento as rascunho with the description in observacoes
    const { error: orcError } = await supabase.from("orcamentos").insert({
      perfurador_id: perfuradorId,
      cliente_id: cliente.id,
      status: "rascunho",
      observacoes: `Solicitação via perfil público:\n${data.descricao}`,
      itens: [],
      valor_total: 0,
      desconto: 0,
      valor_final: 0,
      validade_dias: 15,
    });

    if (orcError) return { success: false, error: orcError.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
