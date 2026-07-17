-- ============================================================
-- NexaDrill - Rate limit do formulário público de solicitação
-- Migration: 008_public_requests
-- ============================================================
-- Registra cada solicitação enviada pelo perfil público (por IP)
-- para limitar a 5 requisições por hora por IP na action
-- `enviarSolicitacaoOrcamento`. Solução simples, serverless-safe.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.public_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip            VARCHAR(64) NOT NULL,
  perfurador_id UUID REFERENCES public.perfuradores(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para a query de contagem por IP na última hora
CREATE INDEX IF NOT EXISTS idx_public_requests_ip_created_at
  ON public.public_requests(ip, created_at DESC);

-- App usa better-auth (não Supabase Auth); RLS desabilitada como nas demais tabelas
ALTER TABLE public.public_requests DISABLE ROW LEVEL SECURITY;
