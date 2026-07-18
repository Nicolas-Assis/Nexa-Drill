-- ============================================================
-- NexaDrill - Painel Admin: RBAC + suspensão/ban (Fase Admin)
-- Migration: 015_admin_rbac
-- ============================================================
-- Habilita o plugin `admin` do Better Auth: adiciona papéis (role) e os
-- campos de banimento à tabela "user", além de "impersonatedBy" em "session".
-- Nomes em camelCase CITADO para casar com o schema do Better Auth (002).
-- Tudo idempotente (ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- ── "user": papel + banimento ────────────────────────────────────────────────
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "role"       TEXT DEFAULT 'user';
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "banned"     BOOLEAN DEFAULT false;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "banReason"  TEXT;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "banExpires" TIMESTAMPTZ;

-- Backfill: nenhuma linha antiga fica com role NULL (o gate compara string).
UPDATE public."user" SET "role" = 'user' WHERE "role" IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_role ON public."user"("role");

-- ── "session": impersonação (coluna exigida pelo plugin, mesmo sem uso) ───────
ALTER TABLE public."session" ADD COLUMN IF NOT EXISTS "impersonatedBy" TEXT;

-- ── Bootstrap do 1º admin ─────────────────────────────────────────────────────
-- Promove a conta da equipe NexaDrill. Idempotente e sem efeito caso o e-mail
-- ainda não exista. Ajuste/duplique a linha para promover outros admins.
UPDATE public."user"
   SET "role" = 'admin'
 WHERE lower("email") = 'nicolas.assis@souagrosolucoes.com.br';
