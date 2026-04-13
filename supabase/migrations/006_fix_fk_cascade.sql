-- ============================================================
-- NexaDrill - Fix FK cascade + garantir RLS desabilitada
-- Migration: 006_fix_fk_cascade
-- ============================================================

-- ============================================================
-- FIX: servicos.orcamento_id → ON DELETE SET NULL
-- Permite excluir orçamento mesmo que tenha serviços vinculados
-- ============================================================
ALTER TABLE public.servicos
  DROP CONSTRAINT IF EXISTS servicos_orcamento_id_fkey;

ALTER TABLE public.servicos
  ADD CONSTRAINT servicos_orcamento_id_fkey
  FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) ON DELETE SET NULL;

-- ============================================================
-- GARANTIR: RLS desabilitada (app usa better-auth, não Supabase Auth)
-- ============================================================
ALTER TABLE public.perfuradores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro   DISABLE ROW LEVEL SECURITY;
