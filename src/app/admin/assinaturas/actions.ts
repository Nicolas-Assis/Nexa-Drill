"use server";

import { pool } from "@/lib/db";
import { assertAdmin } from "@/lib/get-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { configurarAssinatura } from "@/lib/billing";
import { cancelSubscription } from "@/lib/asaas";
import {
  gerenciarAssinaturaSchema,
  type GerenciarAssinaturaFormData,
} from "@/lib/validations";
import type { AdminAssinatura } from "@/types";

const PER_PAGE = 12;

export async function getAdminAssinaturas(
  search = "",
  page = 1,
  status = "",
): Promise<{
  assinaturas: AdminAssinatura[];
  total: number;
  mrrTotal: number;
  error: string | null;
}> {
  try {
    await assertAdmin();
    const term = search.trim();
    const like = `%${term}%`;
    const offset = (page - 1) * PER_PAGE;

    const where = `
      WHERE ($1 = '' OR perfurador_nome ILIKE $2 OR perfurador_email ILIKE $2 OR plano_nome ILIKE $2)
        AND ($3 = '' OR status = $3)
    `;

    const [listRes, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM public.vw_admin_assinaturas ${where}
         ORDER BY mrr DESC, created_at DESC
         LIMIT ${PER_PAGE} OFFSET ${offset}`,
        [term, like, status],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total, COALESCE(SUM(mrr),0) AS mrr_total
         FROM public.vw_admin_assinaturas ${where}`,
        [term, like, status],
      ),
    ]);

    return {
      assinaturas: listRes.rows.map((r) => ({
        ...r,
        preco: Number(r.preco),
        mrr: Number(r.mrr),
      })) as AdminAssinatura[],
      total: countRes.rows[0]?.total ?? 0,
      mrrTotal: Number(countRes.rows[0]?.mrr_total ?? 0),
      error: null,
    };
  } catch (err) {
    return { assinaturas: [], total: 0, mrrTotal: 0, error: (err as Error).message };
  }
}

/**
 * Atribui/troca o plano de um perfurador.
 *  - modo "cortesia": concede acesso ativo sem cobrança (sem Asaas).
 *  - modo "cobrar": cria assinatura recorrente no Asaas; a assinatura vira
 *    "ativa" quando o webhook confirmar o 1º pagamento.
 */
export async function gerenciarAssinatura(
  perfuradorId: string,
  input: GerenciarAssinaturaFormData,
): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    const parsed = gerenciarAssinaturaSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    return await configurarAssinatura(perfuradorId, parsed.data);
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function cancelarAssinatura(
  perfuradorId: string,
): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();

    const { data: a } = await supabase
      .from("assinaturas")
      .select("*")
      .eq("perfurador_id", perfuradorId)
      .maybeSingle();
    if (!a) return { error: "Assinatura não encontrada" };

    if (a.asaas_subscription_id) {
      try {
        await cancelSubscription(a.asaas_subscription_id);
      } catch (err) {
        // registra mas segue cancelando localmente
        console.error("[billing] Erro ao cancelar assinatura Asaas:", err);
      }
    }

    await supabase
      .from("assinaturas")
      .update({ status: "cancelada", cancelada_em: new Date().toISOString() })
      .eq("id", a.id);

    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
