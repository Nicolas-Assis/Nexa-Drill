-- ============================================================
-- NexaDrill - Margem por Job (Fase 1)
-- Migration: 009_margem_por_job
-- ============================================================
-- Modelo de dados para "quanto lucrei em cada poço":
--   • índice de performance em financeiro(servico_id)
--   • colunas de apoio em servicos
--   • view vw_margem_servico (agrega receita/custo/margem por serviço)
-- A view expõe perfurador_id para que as queries filtrem por tenant.
-- ============================================================

-- ── Índice de performance (já criado em 001; garantido aqui) ─────────────────
CREATE INDEX IF NOT EXISTS idx_financeiro_servico_id
  ON public.financeiro(servico_id);

-- ── Colunas opcionais em servicos ────────────────────────────────────────────
-- custo_previsto: virá do orçamento no futuro (planejado x realizado)
-- valor_recebido: redundância de leitura rápida do total recebido
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS custo_previsto DECIMAL(12,2);
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS valor_recebido DECIMAL(12,2);

-- ── View de margem por serviço ───────────────────────────────────────────────
-- receita = soma das receitas com aquele servico_id
-- custo   = soma das despesas com aquele servico_id
-- Divisão por zero (profundidade ou receita = 0/NULL) => campo NULL, não erro.
DROP VIEW IF EXISTS public.vw_margem_servico;

CREATE VIEW public.vw_margem_servico AS
SELECT
  s.id                                            AS servico_id,
  s.perfurador_id                                 AS perfurador_id,
  s.status                                        AS status,
  s.tipo_solo_encontrado                          AS tipo_solo,
  s.profundidade_real_metros                      AS profundidade,
  COALESCE(r.receita, 0)                          AS receita,
  COALESCE(c.custo, 0)                            AS custo,
  COALESCE(r.receita, 0) - COALESCE(c.custo, 0)   AS margem,
  CASE
    WHEN COALESCE(r.receita, 0) > 0
      THEN ROUND(
        (COALESCE(r.receita, 0) - COALESCE(c.custo, 0)) / r.receita * 100,
        2
      )
    ELSE NULL
  END                                             AS margem_percentual,
  CASE
    WHEN s.profundidade_real_metros IS NOT NULL
     AND s.profundidade_real_metros > 0
      THEN ROUND(COALESCE(c.custo, 0) / s.profundidade_real_metros, 2)
    ELSE NULL
  END                                             AS custo_por_metro,
  CASE
    WHEN s.profundidade_real_metros IS NOT NULL
     AND s.profundidade_real_metros > 0
      THEN ROUND(
        (COALESCE(r.receita, 0) - COALESCE(c.custo, 0))
          / s.profundidade_real_metros,
        2
      )
    ELSE NULL
  END                                             AS margem_por_metro
FROM public.servicos s
LEFT JOIN (
  SELECT servico_id, SUM(valor) AS receita
  FROM public.financeiro
  WHERE tipo = 'receita' AND servico_id IS NOT NULL
  GROUP BY servico_id
) r ON r.servico_id = s.id
LEFT JOIN (
  SELECT servico_id, SUM(valor) AS custo
  FROM public.financeiro
  WHERE tipo = 'despesa' AND servico_id IS NOT NULL
  GROUP BY servico_id
) c ON c.servico_id = s.id;
