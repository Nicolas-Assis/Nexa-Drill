"use server";

import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";
import type { PerfilFormData } from "@/lib/validations";

export async function updatePerfurador(
  data: PerfilFormData,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, userId } = await getAuthenticatedPerfurador();

    const updatePayload: Record<string, unknown> = {
      nome: data.nome,
      telefone: data.telefone,
      nome_empresa: data.nome_empresa,
      bio: data.bio || null,
      cidade: data.cidade || null,
      estado: data.estado || null,
      logo_url: data.logo_url || null,
      raio_atendimento_km: data.raio_atendimento_km ?? 100,
      profundidade_max_metros: data.profundidade_max_metros ?? null,
      tipos_servico: data.tipos_servico ?? [],
      tipos_solo_experiencia: data.tipos_solo_experiencia ?? [],
    };

    if (data.slug) {
      updatePayload.slug = data.slug;
    }

    const { error } = await supabase
      .from("perfuradores")
      .update(updatePayload)
      .eq("auth_id", userId);

    if (error) {
      if (error.message.includes("unique") || error.code === "23505") {
        return {
          success: false,
          error: "Este slug já está em uso. Escolha outro.",
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getPerfuradorPerfil(): Promise<{
  perfurador: {
    id: string;
    nome: string;
    telefone: string;
    email: string;
    nome_empresa: string | null;
    bio: string | null;
    cidade: string | null;
    estado: string | null;
    slug: string | null;
    logo_url: string | null;
    raio_atendimento_km: number;
    profundidade_max_metros: number | null;
    tipos_servico: string[];
    tipos_solo_experiencia: string[];
    total_servicos: number;
    avaliacao_media: number;
  } | null;
  error: string | null;
}> {
  try {
    const { supabase, userId } = await getAuthenticatedPerfurador();
    const { data, error } = await supabase
      .from("perfuradores")
      .select(
        "id, nome, telefone, email, nome_empresa, bio, cidade, estado, slug, logo_url, raio_atendimento_km, profundidade_max_metros, tipos_servico, tipos_solo_experiencia, total_servicos, avaliacao_media",
      )
      .eq("auth_id", userId)
      .single();

    if (error || !data)
      return { perfurador: null, error: error?.message ?? "Não encontrado" };
    return {
      perfurador: data as typeof data & {
        tipos_servico: string[];
        tipos_solo_experiencia: string[];
      },
      error: null,
    };
  } catch (err) {
    return { perfurador: null, error: (err as Error).message };
  }
}
