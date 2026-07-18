"use server";

import { headers } from "next/headers";
import { pool } from "@/lib/db";
import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/get-admin";

const PER_PAGE = 10;

export type AdminUsuarioRow = {
  perfurador_id: string;
  nome: string;
  nome_empresa: string | null;
  email: string | null;
  created_at: string;
  user_id: string | null;
  role: string | null;
  banned: boolean | null;
  assinatura_status: string | null;
  plano_nome: string | null;
  ultimo_acesso: string | null;
  tempo_total: number;
  servicos_count: number;
};

export async function getAdminUsuarios(
  search = "",
  page = 1,
  status = "",
): Promise<{ usuarios: AdminUsuarioRow[]; total: number; error: string | null }> {
  try {
    await assertAdmin();

    const term = search.trim();
    const like = `%${term}%`;
    const offset = (page - 1) * PER_PAGE;

    const where = `
      WHERE ($1 = '' OR perf.nome ILIKE $2 OR perf.email ILIKE $2 OR perf.nome_empresa ILIKE $2)
        AND ($3 = '' OR a.status = $3)
    `;

    const listRes = await pool.query(
      `
      SELECT
        perf.id AS perfurador_id, perf.nome, perf.nome_empresa, perf.email, perf.created_at,
        u.id AS user_id, u.role, u.banned,
        a.status AS assinatura_status,
        p.nome AS plano_nome,
        act.last_seen AS ultimo_acesso,
        COALESCE(act.total_seconds, 0) AS tempo_total,
        COALESCE(sv.qtd, 0) AS servicos_count
      FROM public.perfuradores perf
      LEFT JOIN public."user" u ON u.id = perf.auth_id
      LEFT JOIN public.assinaturas a ON a.perfurador_id = perf.id
      LEFT JOIN public.planos p ON p.id = a.plano_id
      LEFT JOIN (
        SELECT user_id, MAX(last_seen_at) last_seen, SUM(active_seconds) total_seconds
        FROM public.activity_sessions GROUP BY user_id
      ) act ON act.user_id = perf.auth_id
      LEFT JOIN (
        SELECT perfurador_id, COUNT(*) qtd FROM public.servicos GROUP BY perfurador_id
      ) sv ON sv.perfurador_id = perf.id
      ${where}
      ORDER BY perf.created_at DESC
      LIMIT ${PER_PAGE} OFFSET ${offset}
      `,
      [term, like, status],
    );

    const countRes = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM public.perfuradores perf
      LEFT JOIN public.assinaturas a ON a.perfurador_id = perf.id
      ${where}
      `,
      [term, like, status],
    );

    const usuarios = listRes.rows.map((r) => ({
      ...r,
      tempo_total: Number(r.tempo_total),
      servicos_count: Number(r.servicos_count),
    })) as AdminUsuarioRow[];

    return { usuarios, total: countRes.rows[0]?.total ?? 0, error: null };
  } catch (err) {
    return { usuarios: [], total: 0, error: (err as Error).message };
  }
}

export type AdminUsuarioDetalhe = {
  perfil: {
    perfurador_id: string;
    auth_id: string;
    nome: string;
    nome_empresa: string | null;
    email: string | null;
    telefone: string | null;
    cidade: string | null;
    estado: string | null;
    slug: string | null;
    created_at: string;
    user_id: string | null;
    role: string | null;
    banned: boolean | null;
    ban_reason: string | null;
    ban_expires: string | null;
    email_verified: boolean | null;
  };
  assinatura: {
    id: string;
    status: string;
    ciclo: string;
    preco: number;
    trial_ate: string | null;
    periodo_atual_fim: string | null;
    plano_id: string | null;
    plano_nome: string | null;
    plano_slug: string | null;
    asaas_subscription_id: string | null;
  } | null;
  counts: {
    clientes: number;
    orcamentos: number;
    servicos: number;
    financeiro: number;
    tempo_total: number;
    ultimo_acesso: string | null;
  };
  timeline: {
    id: string;
    event_type: string;
    action: string | null;
    entity_type: string | null;
    path: string | null;
    created_at: string;
  }[];
  sessoes: {
    id: string;
    ip: string | null;
    user_agent: string | null;
    created_at: string;
    expires_at: string;
  }[];
  tempoPorDia: { label: string; valor: number }[];
  faturas: {
    id: string;
    valor: number;
    status: string;
    vencimento: string | null;
    pago_em: string | null;
    created_at: string;
  }[];
};

export async function getAdminUsuario(
  perfuradorId: string,
): Promise<{ data: AdminUsuarioDetalhe | null; error: string | null }> {
  try {
    await assertAdmin();

    const perfilRes = await pool.query(
      `
      SELECT
        perf.id AS perfurador_id, perf.auth_id, perf.nome, perf.nome_empresa, perf.email,
        perf.telefone, perf.cidade, perf.estado, perf.slug, perf.created_at,
        u.id AS user_id, u.role, u.banned, u."banReason" AS ban_reason,
        u."banExpires" AS ban_expires, u."emailVerified" AS email_verified
      FROM public.perfuradores perf
      LEFT JOIN public."user" u ON u.id = perf.auth_id
      WHERE perf.id = $1
      `,
      [perfuradorId],
    );

    const perfil = perfilRes.rows[0];
    if (!perfil) return { data: null, error: "Usuário não encontrado" };

    const authId: string | null = perfil.auth_id;

    const [assinaturaRes, countsRes, timelineRes, sessoesRes, tempoRes, faturasRes] =
      await Promise.all([
        pool.query(
          `SELECT a.id, a.status, a.ciclo, a.preco, a.trial_ate, a.periodo_atual_fim,
                  a.plano_id, a.asaas_subscription_id, p.nome AS plano_nome, p.slug AS plano_slug
           FROM public.assinaturas a LEFT JOIN public.planos p ON p.id = a.plano_id
           WHERE a.perfurador_id = $1`,
          [perfuradorId],
        ),
        pool.query(
          `SELECT
             (SELECT COUNT(*) FROM public.clientes WHERE perfurador_id = $1) AS clientes,
             (SELECT COUNT(*) FROM public.orcamentos WHERE perfurador_id = $1) AS orcamentos,
             (SELECT COUNT(*) FROM public.servicos WHERE perfurador_id = $1) AS servicos,
             (SELECT COUNT(*) FROM public.financeiro WHERE perfurador_id = $1) AS financeiro,
             (SELECT COALESCE(SUM(active_seconds),0) FROM public.activity_sessions WHERE perfurador_id = $1) AS tempo_total,
             (SELECT MAX(last_seen_at) FROM public.activity_sessions WHERE perfurador_id = $1) AS ultimo_acesso`,
          [perfuradorId],
        ),
        pool.query(
          `SELECT id, event_type, action, entity_type, path, created_at
           FROM public.activity_logs WHERE perfurador_id = $1
           ORDER BY created_at DESC LIMIT 40`,
          [perfuradorId],
        ),
        authId
          ? pool.query(
              `SELECT id, "ipAddress" AS ip, "userAgent" AS user_agent,
                      "createdAt" AS created_at, "expiresAt" AS expires_at
               FROM public."session" WHERE "userId" = $1
               ORDER BY "createdAt" DESC LIMIT 20`,
              [authId],
            )
          : Promise.resolve({ rows: [] as unknown[] }),
        pool.query(
          `SELECT to_char(d::date,'DD/MM') AS label,
                  ROUND(COALESCE(t.secs,0) / 60.0) AS valor
           FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day') d
           LEFT JOIN (
             SELECT last_seen_at::date dia, SUM(active_seconds) secs
             FROM public.activity_sessions
             WHERE perfurador_id = $1 AND last_seen_at >= CURRENT_DATE - 13
             GROUP BY 1
           ) t ON t.dia = d::date
           ORDER BY d`,
          [perfuradorId],
        ),
        pool.query(
          `SELECT id, valor, status, vencimento, pago_em, created_at
           FROM public.faturas WHERE perfurador_id = $1
           ORDER BY created_at DESC LIMIT 20`,
          [perfuradorId],
        ),
      ]);

    const c = countsRes.rows[0];

    return {
      data: {
        perfil: perfil as AdminUsuarioDetalhe["perfil"],
        assinatura: (assinaturaRes.rows[0] as AdminUsuarioDetalhe["assinatura"]) ?? null,
        counts: {
          clientes: Number(c.clientes),
          orcamentos: Number(c.orcamentos),
          servicos: Number(c.servicos),
          financeiro: Number(c.financeiro),
          tempo_total: Number(c.tempo_total),
          ultimo_acesso: c.ultimo_acesso,
        },
        timeline: timelineRes.rows as AdminUsuarioDetalhe["timeline"],
        sessoes: sessoesRes.rows as AdminUsuarioDetalhe["sessoes"],
        tempoPorDia: tempoRes.rows.map((r) => ({ label: r.label, valor: Number(r.valor) })),
        faturas: faturasRes.rows.map((r) => ({ ...r, valor: Number(r.valor) })) as AdminUsuarioDetalhe["faturas"],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

// ── Ações de controle (Better Auth admin plugin) ──────────────────────────────

export async function setUsuarioRole(
  userId: string,
  role: "user" | "admin",
): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    await auth.api.setRole({ body: { userId, role }, headers: await headers() });
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function banUsuario(
  userId: string,
  banReason?: string,
): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    await auth.api.banUser({
      body: { userId, banReason: banReason || "Suspenso pelo administrador" },
      headers: await headers(),
    });
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function unbanUsuario(
  userId: string,
): Promise<{ error: string | null }> {
  try {
    await assertAdmin();
    await auth.api.unbanUser({ body: { userId }, headers: await headers() });
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
