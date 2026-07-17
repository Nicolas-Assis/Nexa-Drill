-- ============================================================
-- NexaDrill - Margem: recebido x previsto (Fase 9)
-- Migration: 013_margem_recebido_previsto
-- ============================================================
-- Atualiza vw_margem_servico para distinguir o que já entrou do que ainda
-- vai entrar:
--   receita_recebida  = receitas em financeiro com servico_id E parcela_id
--   receita_prevista  = soma das parcelas do serviço (exceto canceladas)
--   margem_recebida   = receita_recebida - custo
--   margem_prevista   = receita_prevista - custo
-- Mantém as colunas originais (receita/custo/margem/...) para não quebrar os
-- consumidores existentes (dashboard, relatório).
-- ============================================================

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
  END                                             AS margem_por_metro,
  -- ── Fase 9: recebido x previsto ──────────────────────────────────────────
  COALESCE(rr.receita_recebida, 0)                AS receita_recebida,
  COALESCE(pp.receita_prevista, 0)                AS receita_prevista,
  COALESCE(rr.receita_recebida, 0) - COALESCE(c.custo, 0) AS margem_recebida,
  COALESCE(pp.receita_prevista, 0) - COALESCE(c.custo, 0) AS margem_prevista
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
) c ON c.servico_id = s.id
LEFT JOIN (
  SELECT servico_id, SUM(valor) AS receita_recebida
  FROM public.financeiro
  WHERE tipo = 'receita'
    AND servico_id IS NOT NULL
    AND parcela_id IS NOT NULL
  GROUP BY servico_id
) rr ON rr.servico_id = s.id
LEFT JOIN (
  SELECT servico_id, SUM(valor) AS receita_prevista
  FROM public.parcelas
  WHERE servico_id IS NOT NULL
    AND status <> 'cancelado'
  GROUP BY servico_id
) pp ON pp.servico_id = s.id;
