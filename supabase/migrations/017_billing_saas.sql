-- ============================================================
-- NexaDrill - Painel Admin: cobrança/assinaturas do SaaS (Fase Admin)
-- Migration: 017_billing_saas
-- ============================================================
-- Cobrança da PLATAFORMA → perfurador (assinatura do SaaS), distinta da
-- cobrança perfurador → cliente já existente (parcelas). Reusa a mesma conta
-- Asaas: o roteamento no webhook é por presença de payment.subscription.
--   • planos       → catálogo de planos
--   • assinaturas  → 1 por perfurador (estado da assinatura + vínculo Asaas)
--   • faturas      → cobranças geradas pela assinatura (conciliadas via webhook)
-- Convenções do schema existente (010): gen_random_uuid(), DECIMAL(12,2),
-- trigger handle_updated_at(), RLS desabilitada.
-- ============================================================

-- ── Tabela: planos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         VARCHAR(80) NOT NULL,
  slug         VARCHAR(50) UNIQUE NOT NULL,
  descricao    TEXT,
  preco_mensal DECIMAL(12,2) NOT NULL DEFAULT 0,
  preco_anual  DECIMAL(12,2),
  recursos     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- lista de features (string[])
  limites      JSONB NOT NULL DEFAULT '{}'::jsonb,   -- ex.: {"max_clientes":100}
  destaque     BOOLEAN NOT NULL DEFAULT false,
  ativo        BOOLEAN NOT NULL DEFAULT true,
  ordem        INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planos_ativo ON public.planos(ativo, ordem);

DROP TRIGGER IF EXISTS planos_updated_at ON public.planos;
CREATE TRIGGER planos_updated_at
  BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.planos DISABLE ROW LEVEL SECURITY;

-- ── Tabela: assinaturas ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfurador_id         UUID NOT NULL UNIQUE REFERENCES public.perfuradores(id) ON DELETE CASCADE,
  plano_id              UUID REFERENCES public.planos(id) ON DELETE SET NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'trial'
                        CHECK (status IN ('trial','ativa','inadimplente','cancelada','expirada')),
  ciclo                 VARCHAR(10) NOT NULL DEFAULT 'mensal'
                        CHECK (ciclo IN ('mensal','anual')),
  preco                 DECIMAL(12,2) NOT NULL DEFAULT 0,   -- snapshot do preço contratado
  trial_ate             DATE,
  inicio                DATE,
  periodo_atual_inicio  DATE,
  periodo_atual_fim     DATE,
  cancelada_em          TIMESTAMPTZ,
  asaas_customer_id     TEXT,
  asaas_subscription_id TEXT,
  billing_type          VARCHAR(20),   -- PIX | BOLETO | CREDIT_CARD | UNDEFINED
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_status    ON public.assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano     ON public.assinaturas(plano_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_asaas_sub ON public.assinaturas(asaas_subscription_id);

DROP TRIGGER IF EXISTS assinaturas_updated_at ON public.assinaturas;
CREATE TRIGGER assinaturas_updated_at
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.assinaturas DISABLE ROW LEVEL SECURITY;

-- ── Tabela: faturas ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faturas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id    UUID REFERENCES public.assinaturas(id) ON DELETE CASCADE,
  perfurador_id    UUID REFERENCES public.perfuradores(id) ON DELETE CASCADE,
  plano_id         UUID REFERENCES public.planos(id) ON DELETE SET NULL,
  competencia      DATE,
  valor            DECIMAL(12,2) NOT NULL,
  vencimento       DATE,
  status           VARCHAR(20) NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  pago_em          DATE,
  valor_pago       DECIMAL(12,2),
  metodo_pagamento VARCHAR(20),
  asaas_payment_id TEXT,
  pix_copia_cola   TEXT,
  boleto_url       TEXT,
  link_pagamento   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotência do webhook: uma cobrança Asaas só vira uma fatura.
CREATE UNIQUE INDEX IF NOT EXISTS uq_faturas_asaas_payment
  ON public.faturas(asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faturas_assinatura ON public.faturas(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_faturas_perf       ON public.faturas(perfurador_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status     ON public.faturas(status, vencimento);

DROP TRIGGER IF EXISTS faturas_updated_at ON public.faturas;
CREATE TRIGGER faturas_updated_at
  BEFORE UPDATE ON public.faturas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.faturas DISABLE ROW LEVEL SECURITY;

-- ── View: vw_admin_assinaturas ────────────────────────────────────────────────
-- Assinatura + plano + perfurador + MRR normalizado (anual → /12) para o painel.
DROP VIEW IF EXISTS public.vw_admin_assinaturas;
CREATE VIEW public.vw_admin_assinaturas AS
SELECT
  a.*,
  p.nome              AS plano_nome,
  p.slug              AS plano_slug,
  perf.nome           AS perfurador_nome,
  perf.nome_empresa   AS perfurador_empresa,
  perf.email          AS perfurador_email,
  CASE
    WHEN a.status IN ('ativa','inadimplente')
      THEN CASE WHEN a.ciclo = 'anual' THEN a.preco / 12.0 ELSE a.preco END
    ELSE 0
  END                 AS mrr
FROM public.assinaturas a
LEFT JOIN public.planos       p    ON p.id    = a.plano_id
LEFT JOIN public.perfuradores perf ON perf.id = a.perfurador_id;

-- ── Seed: planos iniciais ─────────────────────────────────────────────────────
INSERT INTO public.planos (nome, slug, descricao, preco_mensal, preco_anual, recursos, limites, destaque, ativo, ordem)
VALUES
  ('Trial', 'trial', 'Período de avaliação gratuito', 0, 0,
    '["Acesso completo por tempo limitado"]'::jsonb, '{}'::jsonb, false, true, 0),
  ('Essencial', 'essencial', 'Para autônomos começando', 49.90, 499.00,
    '["Clientes ilimitados","Orçamentos e serviços","Perfil público"]'::jsonb, '{}'::jsonb, false, true, 1),
  ('Profissional', 'profissional', 'Para quem quer crescer', 99.90, 999.00,
    '["Tudo do Essencial","Cobrança Pix/boleto/cartão","Relatórios de margem","Contas a receber"]'::jsonb,
    '{}'::jsonb, true, true, 2),
  ('Business', 'business', 'Operação completa', 199.90, 1999.00,
    '["Tudo do Profissional","Prioridade no suporte"]'::jsonb, '{}'::jsonb, false, true, 3)
ON CONFLICT (slug) DO NOTHING;

-- ── Backfill: assinatura trial para perfuradores já existentes ────────────────
-- Ninguém fica sem assinatura (nem bloqueado) ao ativar o sistema. Novos
-- perfuradores recebem trial sob demanda em src/lib/billing.ts.
INSERT INTO public.assinaturas (perfurador_id, plano_id, status, ciclo, preco, trial_ate, inicio)
SELECT
  perf.id,
  (SELECT id FROM public.planos WHERE slug = 'trial'),
  'trial',
  'mensal',
  0,
  (CURRENT_DATE + INTERVAL '30 days')::date,
  CURRENT_DATE
FROM public.perfuradores perf
WHERE NOT EXISTS (SELECT 1 FROM public.assinaturas a WHERE a.perfurador_id = perf.id)
ON CONFLICT (perfurador_id) DO NOTHING;
