-- ============================================================
-- NexaDrill - Painel Admin: rastreamento de atividade e tempo (Fase Admin)
-- Migration: 016_activity_tracking
-- ============================================================
-- Duas tabelas complementares:
--   • activity_logs      → eventos discretos (ações, pageviews, login/logout)
--   • activity_sessions  → tempo de permanência (heartbeat acumulando segundos)
-- Convenções do schema existente (ver 010): gen_random_uuid(), DECIMAL/TIMESTAMPTZ,
-- RLS desabilitada (auth é better-auth + service role filtrando em código).
-- Infra de observabilidade: user_id é o id do Better Auth (TEXT), perfurador_id
-- é resolvido quando disponível (ON DELETE SET NULL para preservar histórico).
-- ============================================================

-- ── Tabela: activity_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT,
  perfurador_id UUID REFERENCES public.perfuradores(id) ON DELETE SET NULL,
  event_type    VARCHAR(20) NOT NULL DEFAULT 'action'
                CHECK (event_type IN ('action','pageview','login','logout')),
  action        VARCHAR(100),          -- ex.: 'cliente.create', 'orcamento.update'
  entity_type   VARCHAR(50),           -- ex.: 'cliente', 'orcamento', 'servico'
  entity_id     TEXT,                  -- id da entidade afetada (quando houver)
  path          TEXT,                  -- rota (pageview)
  metadata      JSONB,                 -- payload livre (nome, valor, diffs...)
  ip            VARCHAR(64),
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user       ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_perf       ON public.activity_logs(perfurador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON public.activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action     ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;

-- ── Tabela: activity_sessions ─────────────────────────────────────────────────
-- Uma "sessão de uso" contínua. O heartbeat do cliente soma active_seconds
-- enquanto a aba está visível; um gap maior que a janela de ociosidade abre
-- uma nova sessão. Base do "tempo de permanência" no painel admin.
CREATE TABLE IF NOT EXISTS public.activity_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  perfurador_id  UUID REFERENCES public.perfuradores(id) ON DELETE SET NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_seconds INT NOT NULL DEFAULT 0,
  page_views     INT NOT NULL DEFAULT 0,
  current_path   TEXT,
  ip             VARCHAR(64),
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_sessions_user      ON public.activity_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_perf      ON public.activity_sessions(perfurador_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_last_seen ON public.activity_sessions(last_seen_at DESC);

ALTER TABLE public.activity_sessions DISABLE ROW LEVEL SECURITY;
