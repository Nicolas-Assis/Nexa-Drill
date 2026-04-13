"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function ensurePerfurador(
  nome: string,
  telefone: string,
  empresa: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return { success: false, error: "Não autenticado" };
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("perfuradores")
      .update({
        nome: nome || session.user.name || "",
        telefone: telefone || "",
        nome_empresa: empresa || "",
      })
      .eq("auth_id", session.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
