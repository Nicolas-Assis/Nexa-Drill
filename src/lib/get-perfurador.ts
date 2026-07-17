"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { Perfurador } from "@/types";

function generateSlug(base: string): string {
  const normalized = (base || "perfurador")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${normalized || "perfurador"}-${suffix}`;
}

/**
 * Helper centralizado para obter o perfurador autenticado.
 * Usa service role client para bypassar RLS (auth é via better-auth, não Supabase Auth).
 * Reutilize em todas as server actions que requerem autenticação.
 */
export async function getAuthenticatedPerfurador() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new Error("Não autenticado");
  }

  const supabase = createServiceClient();
  const authId = session.user.id;
  const email = session.user.email;
  const fallbackNome = session.user.name?.trim() || email.split("@")[0];

  const { data: perfurador, error: perfError } = await supabase
    .from("perfuradores")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  if (perfError) {
    throw new Error(perfError.message);
  }

  if (!perfurador) {
    let created = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slug = generateSlug(fallbackNome);
      const { error: insertError } = await supabase
        .from("perfuradores")
        .insert({
          auth_id: authId,
          nome: fallbackNome,
          telefone: "",
          email,
          slug,
          nome_empresa: null,
        });

      if (!insertError) {
        created = true;
        break;
      }

      if (insertError.code === "23505") {
        const { data: exists } = await supabase
          .from("perfuradores")
          .select("id")
          .eq("auth_id", authId)
          .maybeSingle();
        if (exists?.id) {
          created = true;
          break;
        }
      }
    }

    if (!created) {
      throw new Error("Perfurador não encontrado");
    }

    const { data: recreated, error: recreatedError } = await supabase
      .from("perfuradores")
      .select("*")
      .eq("auth_id", authId)
      .single();

    if (recreatedError || !recreated) {
      throw new Error(recreatedError?.message ?? "Perfurador não encontrado");
    }

    return {
      supabase,
      perfurador: recreated as Perfurador,
      perfuradorId: recreated.id as string,
      userId: authId,
    };
  }

  return {
    supabase,
    perfurador: perfurador as Perfurador,
    perfuradorId: perfurador.id as string,
    userId: authId,
  };
}
