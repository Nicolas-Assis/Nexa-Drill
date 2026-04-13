-- ============================================================
-- Fix: Alterar tipo de auth_id e adicionar FK para better-auth
-- (Políticas já foram removidas na migration 002)
-- ============================================================

-- Alterar tipo de UUID para TEXT (better-auth usa IDs texto)
ALTER TABLE public.perfuradores
  ALTER COLUMN auth_id TYPE TEXT USING auth_id::TEXT;

-- Adicionar FK para a tabela user do better-auth
ALTER TABLE public.perfuradores
  ADD CONSTRAINT perfuradores_auth_id_fkey
  FOREIGN KEY (auth_id) REFERENCES "user"(id) ON DELETE CASCADE;
