"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

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

    const supabase = createServiceClient();
    const authId = session.user.id;
    const email = session.user.email;
    const nomeFinal = (nome || session.user.name || "").trim();
    const telefoneFinal = (telefone || "").trim();
    const empresaFinal = (empresa || "").trim();

    const { data: existing, error: findError } = await supabase
      .from("perfuradores")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (findError) {
      return { success: false, error: findError.message };
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("perfuradores")
        .update({
          nome: nomeFinal,
          telefone: telefoneFinal,
          nome_empresa: empresaFinal,
          email,
        })
        .eq("auth_id", authId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, error: null };
    }

    const baseSlug = generateSlug(
      nomeFinal || email.split("@")[0] || "perfurador",
    );
    let insertErrorMessage: string | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : generateSlug(baseSlug);
      const { error: insertError } = await supabase
        .from("perfuradores")
        .insert({
          auth_id: authId,
          nome: nomeFinal,
          telefone: telefoneFinal,
          email,
          nome_empresa: empresaFinal || null,
          slug,
        });

      if (!insertError) {
        return { success: true, error: null };
      }

      if (insertError.code === "23505") {
        const { data: nowExists } = await supabase
          .from("perfuradores")
          .select("id")
          .eq("auth_id", authId)
          .maybeSingle();
        if (nowExists?.id) {
          return { success: true, error: null };
        }
      }

      insertErrorMessage = insertError.message;
    }

    return {
      success: false,
      error:
        insertErrorMessage ?? "Não foi possível criar o perfil do perfurador",
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
