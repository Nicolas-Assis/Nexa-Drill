-- ============================================================
-- NexaDrill - Retrocompatibilidade de parcelas (Fase 2)
-- Migration: 011_parcelas_retrocompat
-- ============================================================
-- Serviços concluídos ANTES da Fase 2 têm receita em `financeiro` sem parcela.
-- Para os relatórios e a view de margem realizada (Fase 9) baterem, cada receita
-- com servico_id ganha uma parcela `pago` retroativa, e o financeiro passa a
-- apontar para ela via parcela_id.
--
-- Idempotente: o filtro `f.parcela_id IS NULL` faz reexecuções não duplicarem.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  nova_parcela UUID;
BEGIN
  FOR r IN
    SELECT
      f.id           AS financeiro_id,
      f.perfurador_id,
      f.servico_id,
      f.valor,
      f.data,
      f.descricao,
      s.cliente_id
    FROM public.financeiro f
    JOIN public.servicos s ON s.id = f.servico_id
    WHERE f.tipo = 'receita'
      AND f.servico_id IS NOT NULL
      AND f.parcela_id IS NULL
  LOOP
    INSERT INTO public.parcelas (
      perfurador_id, servico_id, cliente_id, descricao, valor, vencimento,
      status, metodo_pagamento, data_pagamento, valor_pago,
      numero_parcela, total_parcelas
    )
    VALUES (
      r.perfurador_id,
      r.servico_id,
      r.cliente_id,
      COALESCE(NULLIF(r.descricao, ''), 'Recebimento (migração)'),
      r.valor,
      r.data,
      'pago',
      'outro',
      r.data,
      r.valor,
      1,
      1
    )
    RETURNING id INTO nova_parcela;

    UPDATE public.financeiro
      SET parcela_id = nova_parcela
      WHERE id = r.financeiro_id;
  END LOOP;
END $$;
