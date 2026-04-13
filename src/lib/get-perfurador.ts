"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Perfurador } from "@/types";

/**
 * Helper centralizado para obter o perfurador autenticado.
 * Reutilize em todas as server actions que requerem autenticação.
 */
export async function getAuthenticatedPerfurador() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new Error("Não autenticado");
  }

  const supabase = createClient();

  const { data: perfurador, error: perfError } = await supabase
    .from("perfuradores")
    .select("*")
    .eq("auth_id", session.user.id)
    .single();

  if (perfError || !perfurador) {
    throw new Error("Perfurador não encontrado");
  }

  return {
    supabase,
    perfurador: perfurador as Perfurador,
    perfuradorId: perfurador.id as string,
    userId: session.user.id,
  };
}
