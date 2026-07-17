-- ============================================================
-- NexaDrill - Contas a Receber / Parcelas (Fase 2)
-- Migration: 010_contas_a_receber
-- ============================================================
-- "Receber de verdade": parcelas por serviço, conciliação por Pix/boleto/cartão
-- via Asaas, e log de webhooks. O Asaas dispara as notificações de cobrança
-- (e-mail/SMS/WhatsApp) — por isso NÃO há tabela de régua nem de mensagens aqui.
--
-- Convenções seguidas do schema existente:
--   • perfurador_id UUID NOT NULL ... ON DELETE CASCADE (isolamento por tenant)
--   • DECIMAL(12,2) para valores; gen_random_uuid() para PKs
--   • RLS desabilitada (auth é better-auth + service role filtrando em código)
-- Tudo idempotente (IF NOT EXISTS / OR REPLACE) para rodar com segurança.
-- ============================================================

-- ── Tabela: parcelas ─────────────────────────────────────────────────────────
-- Uma cobrança de um serviço. Ex.: "Sinal", "2/4 - Perfuração".
CREATE TABLE IF NOT EXISTS public.parcelas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfurador_id     UUID NOT NULL REFERENCES public.perfuradores(id) ON DELETE CASCADE,
  servico_id        UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
  cliente_id        UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  descricao         TEXT,
  valor             DECIMAL(12,2) NOT NULL,
  vencimento        DATE NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  metodo_pagamento  VARCHAR(20)
                    CHECK (metodo_pagamento IN
                      ('pix','boleto','cartao','dinheiro','transferencia','outro')),
  data_pagamento    DATE,
  valor_pago        DECIMAL(12,2),
  -- Vínculo com o gateway (preenchido a partir da Fase 3)
  asaas_cobranca_id TEXT,
  pix_copia_cola    TEXT,
  boleto_url        TEXT,
  link_pagamento    TEXT,
  -- Posição na sequência (2/5, 3/5 ...)
  numero_parcela    INT,
  total_parcelas    INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcelas_perf_status_venc
  ON public.parcelas(perfurador_id, status, vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_asaas_cobranca_id
  ON public.parcelas(asaas_cobranca_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_servico_id
  ON public.parcelas(servico_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cliente_id
  ON public.parcelas(cliente_id);

ALTER TABLE public.parcelas DISABLE ROW LEVEL SECURITY;

-- Mantém updated_at em dia (reusa a função handle_updated_at do 001)
DROP TRIGGER IF EXISTS parcelas_updated_at ON public.parcelas;
CREATE TRIGGER parcelas_updated_at
  BEFORE UPDATE ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Tabela: webhook_logs ─────────────────────────────────────────────────────
-- Log cru de todo webhook recebido (Asaas, etc.). Infra-level: sem perfurador_id
-- (o tenant é resolvido pela parcela). Base da idempotência do webhook.
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem      VARCHAR(30) NOT NULL DEFAULT 'asaas',
  event_id    TEXT,               -- id do evento no provedor (idempotência)
  evento      TEXT,               -- ex.: PAYMENT_CONFIRMED
  payload     JSONB NOT NULL,
  processado  BOOLEAN NOT NULL DEFAULT false,
  resultado   TEXT,
  erro        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotência: um mesmo (origem, event_id) só entra uma vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_origem_event_id
  ON public.webhook_logs(origem, event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at
  ON public.webhook_logs(created_at DESC);

ALTER TABLE public.webhook_logs DISABLE ROW LEVEL SECURITY;

-- ── financeiro: vínculo com a parcela de origem ──────────────────────────────
-- Quando um recebimento nasce da baixa de uma parcela, aponta para ela.
-- servico_id continua (redundância intencional para a view de margem).
ALTER TABLE public.financeiro
  ADD COLUMN IF NOT EXISTS parcela_id UUID
    REFERENCES public.parcelas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financeiro_parcela_id
  ON public.financeiro(parcela_id);

-- ── View: vw_parcelas_status ─────────────────────────────────────────────────
-- Parcelas + dias até o vencimento + situação derivada em tempo real.
-- Expõe perfurador_id (via p.*) para filtro por tenant.
DROP VIEW IF EXISTS public.vw_parcelas_status;

CREATE VIEW public.vw_parcelas_status AS
SELECT
  p.*,
  (p.vencimento - CURRENT_DATE)                     AS dias_ate_vencimento,
  CASE
    WHEN p.status = 'pago'         THEN 'pago'
    WHEN p.status = 'cancelado'    THEN 'cancelado'
    WHEN p.vencimento < CURRENT_DATE THEN 'atrasada'
    WHEN p.vencimento = CURRENT_DATE THEN 'vence_hoje'
    ELSE 'a_vencer'
  END                                               AS situacao
FROM public.parcelas p;
