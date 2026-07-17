-- ============================================================
-- NexaDrill - Integridade das cobranças (Fase 2 - hardening)
-- Migration: 014_cobranca_integridade
-- ============================================================
-- 1. Funções transacionais (atômicas) para conclusão de serviço e baixa de
--    parcela — evitam estado inconsistente e duplicação em retry.
-- 2. Índices únicos que garantem, no nível do banco:
--    - uma parcela nunca gera 2 receitas (corrida webhook / retry / manual+webhook)
--    - asaas_cobranca_id único (matching determinístico no webhook)
-- Tudo idempotente (CREATE OR REPLACE / IF NOT EXISTS).
-- ============================================================

-- ── Limpeza de duplicatas pré-existentes (mantém a receita mais antiga) ───────
DELETE FROM public.financeiro f
WHERE f.tipo = 'receita'
  AND f.parcela_id IS NOT NULL
  AND f.id <> (
    SELECT f2.id
    FROM public.financeiro f2
    WHERE f2.parcela_id = f.parcela_id
      AND f2.tipo = 'receita'
    ORDER BY f2.created_at ASC, f2.id ASC
    LIMIT 1
  );

-- ── Índices únicos de integridade ────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_financeiro_parcela_receita
  ON public.financeiro(parcela_id)
  WHERE tipo = 'receita' AND parcela_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_parcelas_asaas_cobranca
  ON public.parcelas(asaas_cobranca_id)
  WHERE asaas_cobranca_id IS NOT NULL;

-- ── fn_concluir_servico — conclui e cria parcelas/receitas em UMA transação ───
-- p_parcelas: jsonb array de { descricao, valor, vencimento, pago, metodo_pagamento }
CREATE OR REPLACE FUNCTION public.fn_concluir_servico(
  p_servico_id uuid,
  p_perfurador_id uuid,
  p_data date,
  p_parcelas jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_cliente_id uuid;
  v_total numeric := 0;
  v_recebido numeric := 0;
  v_count int;
  v_n int;
  v_i int := 0;
  r jsonb;
  v_parcela_id uuid;
  v_pago boolean;
  v_valor numeric;
BEGIN
  -- posse + lock
  SELECT cliente_id INTO v_cliente_id
  FROM public.servicos
  WHERE id = p_servico_id AND perfurador_id = p_perfurador_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SERVICO_NAO_ENCONTRADO';
  END IF;

  -- idempotência: não reconcluir (evita duplicar parcelas/receitas em retry)
  SELECT count(*) INTO v_count
  FROM public.parcelas WHERE servico_id = p_servico_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'SERVICO_JA_TEM_PARCELAS';
  END IF;

  v_n := jsonb_array_length(p_parcelas);

  FOR r IN SELECT * FROM jsonb_array_elements(p_parcelas)
  LOOP
    v_i := v_i + 1;
    v_pago := COALESCE((r->>'pago')::boolean, false);
    v_valor := (r->>'valor')::numeric;
    v_total := v_total + v_valor;
    IF v_pago THEN v_recebido := v_recebido + v_valor; END IF;

    INSERT INTO public.parcelas
      (perfurador_id, servico_id, cliente_id, descricao, valor, vencimento, status,
       metodo_pagamento, data_pagamento, valor_pago, numero_parcela, total_parcelas)
    VALUES (
      p_perfurador_id, p_servico_id, v_cliente_id,
      r->>'descricao', v_valor, (r->>'vencimento')::date,
      CASE WHEN v_pago THEN 'pago' ELSE 'pendente' END,
      CASE WHEN v_pago THEN COALESCE(NULLIF(r->>'metodo_pagamento', ''), 'outro') ELSE NULL END,
      CASE WHEN v_pago THEN p_data ELSE NULL END,
      CASE WHEN v_pago THEN v_valor ELSE NULL END,
      v_i, v_n
    ) RETURNING id INTO v_parcela_id;

    IF v_pago THEN
      INSERT INTO public.financeiro
        (perfurador_id, servico_id, parcela_id, tipo, categoria, descricao, valor, data)
      VALUES (p_perfurador_id, p_servico_id, v_parcela_id, 'receita', 'servico',
              r->>'descricao', v_valor, p_data);
    END IF;
  END LOOP;

  UPDATE public.servicos
    SET status = 'concluido',
        data_conclusao = p_data,
        valor = v_total,
        valor_recebido = v_recebido
    WHERE id = p_servico_id AND perfurador_id = p_perfurador_id;
END;
$$;

-- ── fn_baixar_parcela — baixa manual/webhook em UMA transação ─────────────────
CREATE OR REPLACE FUNCTION public.fn_baixar_parcela(
  p_parcela_id uuid,
  p_perfurador_id uuid,
  p_metodo text,
  p_data date,
  p_valor numeric
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_servico_id uuid;
  v_descricao text;
  v_status text;
BEGIN
  SELECT servico_id, descricao, status
    INTO v_servico_id, v_descricao, v_status
  FROM public.parcelas
  WHERE id = p_parcela_id AND perfurador_id = p_perfurador_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PARCELA_NAO_ENCONTRADA';
  END IF;
  IF v_status = 'pago' THEN
    RAISE EXCEPTION 'PARCELA_JA_PAGA';
  END IF;
  IF v_status = 'cancelado' THEN
    RAISE EXCEPTION 'PARCELA_CANCELADA';
  END IF;

  UPDATE public.parcelas
    SET status = 'pago',
        metodo_pagamento = p_metodo,
        data_pagamento = p_data,
        valor_pago = p_valor
    WHERE id = p_parcela_id;

  -- índice único protege contra receita duplicada (corrida/retry)
  INSERT INTO public.financeiro
    (perfurador_id, servico_id, parcela_id, tipo, categoria, descricao, valor, data)
  VALUES (p_perfurador_id, v_servico_id, p_parcela_id, 'receita', 'servico',
          COALESCE(v_descricao, 'Recebimento de parcela'), p_valor, p_data)
  ON CONFLICT (parcela_id) WHERE tipo = 'receita' DO NOTHING;
END;
$$;
