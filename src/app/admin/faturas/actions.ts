"use server";

import { pool } from "@/lib/db";
import { assertAdmin } from "@/lib/get-admin";
import { createServiceClient } from "@/lib/supabase/service";

const PER_PAGE = 20;

export type FaturaRow = {
  id: string;
  valor: number;
  status: string;
  vencimento: string | null;
  pago_em: string | null;
  competencia: string | null;
  created_at: string;
  metodo_pagamento: string | null;
  asaas_payment_id: string | null;
  perfurador_id: string | null;
  perfurador_nome: string | null;
  email: string | null;
  plano_nome: string | null;
};

export async function getAdminFaturas(
  search = "",
  page = 1,
  status = "",
): Promise<{
  faturas: FaturaRow[];
  total: number;
  totalPago: number;
  totalPendente: number;
  error: string | null;
}> {
  try {
    await assertAdmin();
    const term = search.trim();
    const like = `%${term}%`;
    const offset = (page - 1) * PER_PAGE;

    const where = `
      WHERE ($1 = '' OR perf.nome ILIKE $2 OR perf.email ILIKE $2)
        AND ($3 = '' OR f.status = $3)
    `;

    const [listRes, countRes, somasRes] = await Promise.all([
      pool.query(
        `SELECT f.id, f.valor, f.status, f.vencimento, f.pago_em, f.competencia,
                f.created_at, f.metodo_pagamento, f.asaas_payment_id,
                perf.id AS perfurador_id, perf.nome AS perfurador_nome, perf.email,
                pl.nome AS plano_nome
         FROM public.faturas f
         LEFT JOIN public.perfuradores perf ON perf.id = f.perfurador_id
         LEFT JOIN public.planos pl ON pl.id = f.plano_id
         ${where}
         ORDER BY f.created_at DESC
         LIMIT ${PER_PAGE} OFFSET ${offset}`,
        [term, like, status],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM public.faturas f
         LEFT JOIN public.perfuradores perf ON perf.id = f.perfurador_id
         ${where}`,
        [term, like, status],
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(valor_pago) FILTER (WHERE status = 'pago'), 0) AS total_pago,
           COALESCE(SUM(valor) FILTER (WHERE status IN ('pendente','atrasado')), 0) AS total_pendente
         FROM public.faturas`,
      ),
    ]);

    return {
      faturas: listRes.rows.map((r) => ({ ...r, valor: Number(r.valor) })) as FaturaRow[],
      total: countRes.rows[0]?.total ?? 0,
      totalPago: Number(somasRes.rows[0]?.total_pago ?? 0),
      totalPendente: Number(somasRes.rows[0]?.total_pendente ?? 0),
      error: null,
    };
  } catch (err) {
    return { faturas: [], total: 0, totalPago: 0, totalPendente: 0, error: (err as Error).message };
  }
}

/**
 * Baixa manual de uma fatura (reconciliação fora do Asaas: dinheiro, cortesia).
 * Marca a fatura como paga e ativa a assinatura, avançando o período.
 */
export async function marcarFaturaPaga(
  faturaId: string,
): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();

    const { data: fatura } = await supabase
      .from("faturas")
      .select("*")
      .eq("id", faturaId)
      .maybeSingle();
    if (!fatura) return { error: "Fatura não encontrada" };
    if (fatura.status === "pago") return { error: null };

    const now = new Date();
    await supabase
      .from("faturas")
      .update({
        status: "pago",
        pago_em: now.toISOString().slice(0, 10),
        valor_pago: fatura.valor,
        metodo_pagamento: fatura.metodo_pagamento ?? "outro",
      })
      .eq("id", faturaId);

    if (fatura.assinatura_id) {
      const { data: assinatura } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("id", fatura.assinatura_id)
        .maybeSingle();

      if (assinatura) {
        const inicioBase =
          assinatura.periodo_atual_fim && new Date(assinatura.periodo_atual_fim) > now
            ? new Date(assinatura.periodo_atual_fim)
            : now;
        const fim = new Date(inicioBase);
        if (assinatura.ciclo === "anual") fim.setFullYear(fim.getFullYear() + 1);
        else fim.setMonth(fim.getMonth() + 1);

        await supabase
          .from("assinaturas")
          .update({
            status: "ativa",
            periodo_atual_inicio: inicioBase.toISOString().slice(0, 10),
            periodo_atual_fim: fim.toISOString().slice(0, 10),
          })
          .eq("id", assinatura.id);
      }
    }

    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
