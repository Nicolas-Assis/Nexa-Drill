"use server";

import { assertAdmin } from "@/lib/get-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { planoSchema, type PlanoFormData } from "@/lib/validations";
import type { Plano } from "@/types";

export async function getPlanos(): Promise<{ planos: Plano[]; error: string | null }> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("planos")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) return { planos: [], error: error.message };
    return { planos: (data ?? []) as Plano[], error: null };
  } catch (err) {
    return { planos: [], error: (err as Error).message };
  }
}

function toPayload(data: PlanoFormData) {
  return {
    nome: data.nome,
    slug: data.slug,
    descricao: data.descricao || null,
    preco_mensal: data.preco_mensal,
    preco_anual: data.preco_anual ?? null,
    recursos: data.recursos ?? [],
    destaque: data.destaque ?? false,
    ativo: data.ativo ?? true,
    ordem: data.ordem ?? 0,
  };
}

export async function createPlano(
  data: PlanoFormData,
): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    const parsed = planoSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = createServiceClient();
    const { error } = await supabase.from("planos").insert(toPayload(parsed.data));
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return { error: "Já existe um plano com esse slug." };
      }
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updatePlano(
  id: string,
  data: PlanoFormData,
): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    const parsed = planoSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("planos")
      .update(toPayload(parsed.data))
      .eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function togglePlanoAtivo(
  id: string,
  ativo: boolean,
): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase.from("planos").update({ ativo }).eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deletePlano(id: string): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase.from("planos").delete().eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
