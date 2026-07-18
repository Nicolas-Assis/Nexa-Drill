"use server";

import { pool } from "@/lib/db";
import { assertAdmin } from "@/lib/get-admin";

export type AdminOverviewKpis = {
  totalUsuarios: number;
  ativosHoje: number;
  ativos7d: number;
  ativos30d: number;
  novosMes: number;
  mrr: number;
  assinaturasAtivas: number;
  trialsExpirando: number;
  inadimplentes: number;
};

export type SeriePonto = { label: string; valor: number };
export type PlanoDistribuicao = { plano: string; qtd: number };
export type AtividadeRecente = {
  id: string;
  event_type: string;
  action: string | null;
  entity_type: string | null;
  path: string | null;
  created_at: string;
  perfurador_nome: string | null;
};
export type UltimoCadastro = {
  id: string;
  nome: string;
  nome_empresa: string | null;
  email: string | null;
  created_at: string;
};

export type AdminOverview = {
  kpis: AdminOverviewKpis;
  cadastrosSerie: SeriePonto[];
  ativosSerie: SeriePonto[];
  receitaSerie: SeriePonto[];
  planoDistribuicao: PlanoDistribuicao[];
  atividadeRecente: AtividadeRecente[];
  ultimosCadastros: UltimoCadastro[];
  error: string | null;
};

const EMPTY_OVERVIEW: Omit<AdminOverview, "error"> = {
  kpis: {
    totalUsuarios: 0,
    ativosHoje: 0,
    ativos7d: 0,
    ativos30d: 0,
    novosMes: 0,
    mrr: 0,
    assinaturasAtivas: 0,
    trialsExpirando: 0,
    inadimplentes: 0,
  },
  cadastrosSerie: [],
  ativosSerie: [],
  receitaSerie: [],
  planoDistribuicao: [],
  atividadeRecente: [],
  ultimosCadastros: [],
};

export async function getAdminOverview(): Promise<AdminOverview> {
  try {
    await assertAdmin();

    const [kpisRes, cadastrosRes, ativosRes, receitaRes, planoRes, atividadeRes, cadRes] =
      await Promise.all([
        pool.query(`
          SELECT
            (SELECT COUNT(*) FROM public.perfuradores) AS total_usuarios,
            (SELECT COUNT(DISTINCT user_id) FROM public.activity_sessions WHERE last_seen_at >= NOW() - INTERVAL '1 day') AS ativos_hoje,
            (SELECT COUNT(DISTINCT user_id) FROM public.activity_sessions WHERE last_seen_at >= NOW() - INTERVAL '7 days') AS ativos_7d,
            (SELECT COUNT(DISTINCT user_id) FROM public.activity_sessions WHERE last_seen_at >= NOW() - INTERVAL '30 days') AS ativos_30d,
            (SELECT COUNT(*) FROM public.perfuradores WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS novos_mes,
            (SELECT COALESCE(SUM(mrr),0) FROM public.vw_admin_assinaturas) AS mrr,
            (SELECT COUNT(*) FROM public.assinaturas WHERE status = 'ativa') AS assinaturas_ativas,
            (SELECT COUNT(*) FROM public.assinaturas WHERE status = 'trial' AND trial_ate IS NOT NULL AND trial_ate <= CURRENT_DATE + 7) AS trials_expirando,
            (SELECT COUNT(*) FROM public.assinaturas WHERE status = 'inadimplente') AS inadimplentes
        `),
        pool.query(`
          SELECT to_char(d::date,'DD/MM') AS label, COALESCE(c.qtd,0) AS valor
          FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, '1 day') d
          LEFT JOIN (
            SELECT created_at::date AS dia, COUNT(*) qtd FROM public.perfuradores
            WHERE created_at >= CURRENT_DATE - 29 GROUP BY 1
          ) c ON c.dia = d::date
          ORDER BY d
        `),
        pool.query(`
          SELECT to_char(d::date,'DD/MM') AS label, COALESCE(a.qtd,0) AS valor
          FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, '1 day') d
          LEFT JOIN (
            SELECT last_seen_at::date AS dia, COUNT(DISTINCT user_id) qtd
            FROM public.activity_sessions WHERE last_seen_at >= CURRENT_DATE - 29 GROUP BY 1
          ) a ON a.dia = d::date
          ORDER BY d
        `),
        pool.query(`
          SELECT to_char(m,'MM/YYYY') AS label, COALESCE(f.total,0) AS valor
          FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), '1 month') m
          LEFT JOIN (
            SELECT date_trunc('month', pago_em) mes, SUM(valor_pago) total
            FROM public.faturas WHERE status = 'pago' AND pago_em IS NOT NULL GROUP BY 1
          ) f ON f.mes = m
          ORDER BY m
        `),
        pool.query(`
          SELECT COALESCE(p.nome,'Sem plano') AS plano, COUNT(*) AS qtd
          FROM public.assinaturas a LEFT JOIN public.planos p ON p.id = a.plano_id
          WHERE a.status IN ('ativa','trial','inadimplente')
          GROUP BY 1 ORDER BY qtd DESC
        `),
        pool.query(`
          SELECT l.id, l.event_type, l.action, l.entity_type, l.path, l.created_at,
                 perf.nome AS perfurador_nome
          FROM public.activity_logs l
          LEFT JOIN public.perfuradores perf ON perf.id = l.perfurador_id
          ORDER BY l.created_at DESC LIMIT 15
        `),
        pool.query(`
          SELECT id, nome, nome_empresa, email, created_at
          FROM public.perfuradores ORDER BY created_at DESC LIMIT 6
        `),
      ]);

    const k = kpisRes.rows[0];

    return {
      kpis: {
        totalUsuarios: Number(k.total_usuarios),
        ativosHoje: Number(k.ativos_hoje),
        ativos7d: Number(k.ativos_7d),
        ativos30d: Number(k.ativos_30d),
        novosMes: Number(k.novos_mes),
        mrr: Number(k.mrr),
        assinaturasAtivas: Number(k.assinaturas_ativas),
        trialsExpirando: Number(k.trials_expirando),
        inadimplentes: Number(k.inadimplentes),
      },
      cadastrosSerie: cadastrosRes.rows.map((r) => ({ label: r.label, valor: Number(r.valor) })),
      ativosSerie: ativosRes.rows.map((r) => ({ label: r.label, valor: Number(r.valor) })),
      receitaSerie: receitaRes.rows.map((r) => ({ label: r.label, valor: Number(r.valor) })),
      planoDistribuicao: planoRes.rows.map((r) => ({ plano: r.plano, qtd: Number(r.qtd) })),
      atividadeRecente: atividadeRes.rows as AtividadeRecente[],
      ultimosCadastros: cadRes.rows as UltimoCadastro[],
      error: null,
    };
  } catch (err) {
    return { ...EMPTY_OVERVIEW, error: (err as Error).message };
  }
}
