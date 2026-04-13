-- ============================================================
-- NexaDrill - Migração para better-auth
-- Migration: 002_better_auth
-- Substitui Supabase Auth por better-auth com OTP por e-mail
-- ============================================================

-- ============================================================
-- REMOVER TRIGGER ANTIGO DO SUPABASE AUTH
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================
-- TABELAS DO BETTER-AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS "user" (
  "id"            TEXT PRIMARY KEY NOT NULL,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "image"         TEXT,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"          TEXT PRIMARY KEY NOT NULL,
  "expiresAt"   TIMESTAMP NOT NULL,
  "token"       TEXT NOT NULL UNIQUE,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "ipAddress"   TEXT,
  "userAgent"   TEXT,
  "userId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                     TEXT PRIMARY KEY NOT NULL,
  "accountId"              TEXT NOT NULL,
  "providerId"             TEXT NOT NULL,
  "userId"                 TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken"            TEXT,
  "refreshToken"           TEXT,
  "idToken"                TEXT,
  "accessTokenExpiresAt"   TIMESTAMP,
  "refreshTokenExpiresAt"  TIMESTAMP,
  "scope"                  TEXT,
  "password"               TEXT,
  "createdAt"              TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         TEXT PRIMARY KEY NOT NULL,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  TIMESTAMP NOT NULL,
  "createdAt"  TIMESTAMP DEFAULT NOW(),
  "updatedAt"  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ATUALIZAR perfuradores.auth_id PARA REFERENCIAR user.id
-- ============================================================

-- Remover FK antiga que aponta para auth.users(id)
ALTER TABLE public.perfuradores
  DROP CONSTRAINT IF EXISTS perfuradores_auth_id_fkey;

-- Mudar tipo de UUID para TEXT (ids do better-auth são strings)
ALTER TABLE public.perfuradores
  ALTER COLUMN auth_id TYPE TEXT USING auth_id::TEXT;

-- Remover constraint NOT NULL temporariamente para facilitar
-- (já existe UNIQUE, vamos manter)
-- Adicionar nova FK para a tabela user do better-auth
ALTER TABLE public.perfuradores
  ADD CONSTRAINT perfuradores_auth_id_fkey
  FOREIGN KEY (auth_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- ============================================================
-- DESABILITAR RLS (agora a autorização é feita na camada da app)
-- ============================================================

ALTER TABLE public.perfuradores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro   DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- REMOVER POLICIES ANTIGAS (usavam auth.uid() do Supabase)
-- ============================================================

DROP POLICY IF EXISTS "perfuradores_select_own"    ON public.perfuradores;
DROP POLICY IF EXISTS "perfuradores_update_own"    ON public.perfuradores;
DROP POLICY IF EXISTS "perfuradores_insert_own"    ON public.perfuradores;
DROP POLICY IF EXISTS "perfuradores_select_public" ON public.perfuradores;

DROP POLICY IF EXISTS "clientes_select_own"  ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_own"  ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_own"  ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_own"  ON public.clientes;

DROP POLICY IF EXISTS "orcamentos_select_own"    ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_insert_own"    ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_update_own"    ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_delete_own"    ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_select_public" ON public.orcamentos;

DROP POLICY IF EXISTS "servicos_select_own"  ON public.servicos;
DROP POLICY IF EXISTS "servicos_insert_own"  ON public.servicos;
DROP POLICY IF EXISTS "servicos_update_own"  ON public.servicos;
DROP POLICY IF EXISTS "servicos_delete_own"  ON public.servicos;

DROP POLICY IF EXISTS "financeiro_select_own"  ON public.financeiro;
DROP POLICY IF EXISTS "financeiro_insert_own"  ON public.financeiro;
DROP POLICY IF EXISTS "financeiro_update_own"  ON public.financeiro;
DROP POLICY IF EXISTS "financeiro_delete_own"  ON public.financeiro;
