"use server";

import { pool } from "@/lib/db";
import { assertAdmin } from "@/lib/get-admin";

const PER_PAGE = 25;

export type AtividadeRow = {
  id: string;
  event_type: string;
  action: string | null;
  entity_type: string | null;
  path: string | null;
  ip: string | null;
  created_at: string;
  perfurador_id: string | null;
  perfurador_nome: string | null;
  email: string | null;
};

export async function getAdminAtividade(
  search = "",
  page = 1,
  eventType = "",
): Promise<{ eventos: AtividadeRow[]; total: number; error: string | null }> {
  try {
    await assertAdmin();
    const term = search.trim();
    const like = `%${term}%`;
    const offset = (page - 1) * PER_PAGE;

    const where = `
      WHERE ($1 = '' OR perf.nome ILIKE $2 OR perf.email ILIKE $2 OR l.action ILIKE $2)
        AND ($3 = '' OR l.event_type = $3)
    `;

    const [listRes, countRes] = await Promise.all([
      pool.query(
        `SELECT l.id, l.event_type, l.action, l.entity_type, l.path, l.ip, l.created_at,
                perf.id AS perfurador_id, perf.nome AS perfurador_nome, perf.email
         FROM public.activity_logs l
         LEFT JOIN public.perfuradores perf ON perf.id = l.perfurador_id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT ${PER_PAGE} OFFSET ${offset}`,
        [term, like, eventType],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM public.activity_logs l
         LEFT JOIN public.perfuradores perf ON perf.id = l.perfurador_id
         ${where}`,
        [term, like, eventType],
      ),
    ]);

    return {
      eventos: listRes.rows as AtividadeRow[],
      total: countRes.rows[0]?.total ?? 0,
      error: null,
    };
  } catch (err) {
    return { eventos: [], total: 0, error: (err as Error).message };
  }
}
