import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActivityEventType } from "@/types";

/**
 * Registro de atividade do usuário (painel admin).
 *
 * Módulo utilitário de servidor — NÃO leva "use server" (não deve virar uma
 * server action exposta). É chamado de dentro de outras server actions após
 * uma mutação bem-sucedida. É best-effort: qualquer erro é engolido para
 * nunca derrubar a ação de negócio.
 *
 * Passe userId/perfuradorId quando já os tiver (via getAuthenticatedPerfurador)
 * para evitar uma nova resolução de sessão/consulta.
 */
export type LogActivityInput = {
  action: string;
  eventType?: ActivityEventType;
  entityType?: string;
  entityId?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
  userId?: string;
  perfuradorId?: string | null;
};

function clientIpFrom(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return h.get("x-real-ip");
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const h = await headers();

    let userId = input.userId;
    if (!userId) {
      const session = await auth.api.getSession({ headers: h });
      userId = session?.user?.id;
    }
    if (!userId) return;

    const supabase = createServiceClient();

    let perfuradorId = input.perfuradorId;
    if (perfuradorId === undefined) {
      const { data } = await supabase
        .from("perfuradores")
        .select("id")
        .eq("auth_id", userId)
        .maybeSingle();
      perfuradorId = data?.id ?? null;
    }

    await supabase.from("activity_logs").insert({
      user_id: userId,
      perfurador_id: perfuradorId ?? null,
      event_type: input.eventType ?? "action",
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      path: input.path ?? null,
      metadata: input.metadata ?? null,
      ip: clientIpFrom(h),
      user_agent: h.get("user-agent"),
    });
  } catch (err) {
    console.error("[activity] logActivity falhou:", err);
  }
}
