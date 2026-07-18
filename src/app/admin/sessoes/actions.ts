"use server";

import { pool } from "@/lib/db";
import { assertAdmin } from "@/lib/get-admin";

const PER_PAGE = 25;

export type SessaoRow = {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  ativa: boolean;
  user_id: string;
  perfurador_id: string | null;
  perfurador_nome: string | null;
  email: string | null;
};

export async function getAdminSessoes(
  search = "",
  page = 1,
): Promise<{
  sessoes: SessaoRow[];
  total: number;
  ativas: number;
  error: string | null;
}> {
  try {
    await assertAdmin();
    const term = search.trim();
    const like = `%${term}%`;
    const offset = (page - 1) * PER_PAGE;

    const where = `WHERE ($1 = '' OR perf.nome ILIKE $2 OR perf.email ILIKE $2)`;

    const [listRes, countRes, ativasRes] = await Promise.all([
      pool.query(
        `SELECT s.id, s."ipAddress" AS ip, s."userAgent" AS user_agent,
                s."createdAt" AS created_at, s."expiresAt" AS expires_at,
                (s."expiresAt" > NOW()) AS ativa, s."userId" AS user_id,
                perf.id AS perfurador_id, perf.nome AS perfurador_nome, perf.email
         FROM public."session" s
         LEFT JOIN public.perfuradores perf ON perf.auth_id = s."userId"
         ${where}
         ORDER BY s."createdAt" DESC
         LIMIT ${PER_PAGE} OFFSET ${offset}`,
        [term, like],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM public."session" s
         LEFT JOIN public.perfuradores perf ON perf.auth_id = s."userId"
         ${where}`,
        [term, like],
      ),
      pool.query(`SELECT COUNT(*)::int AS ativas FROM public."session" WHERE "expiresAt" > NOW()`),
    ]);

    return {
      sessoes: listRes.rows as SessaoRow[],
      total: countRes.rows[0]?.total ?? 0,
      ativas: ativasRes.rows[0]?.ativas ?? 0,
      error: null,
    };
  } catch (err) {
    return { sessoes: [], total: 0, ativas: 0, error: (err as Error).message };
  }
}
