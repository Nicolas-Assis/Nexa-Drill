-- ============================================================
-- NexaDrill - Schema Inicial
-- Migration: 001_initial_schema
-- ============================================================

-- ============================================================
-- FUNÇÃO: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO: gerar slug único a partir do nome
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Normaliza: lowercase, remove acentos, substitui espaços por hifens
  base_slug := lower(unaccent(trim(base_name)));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '[\s]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(BOTH '-' FROM base_slug);

  final_slug := base_slug;

  -- Verifica unicidade
  WHILE EXISTS (SELECT 1 FROM public.perfuradores WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- EXTENSÃO: unaccent (necessário para gerar slugs)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- TABELA: perfuradores
-- ============================================================
CREATE TABLE public.perfuradores (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id                 UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                    VARCHAR(100) NOT NULL,
  telefone                VARCHAR(20) NOT NULL,
  email                   VARCHAR(150) NOT NULL,
  cpf_cnpj                VARCHAR(20),
  slug                    VARCHAR(50) UNIQUE,
  nome_empresa            VARCHAR(100),
  logo_url                TEXT,
  bio                     TEXT,
  cidade                  VARCHAR(100),
  estado                  CHAR(2),
  raio_atendimento_km     INT DEFAULT 100,
  tipos_servico           TEXT[] DEFAULT '{}',
  tipos_solo_experiencia  TEXT[] DEFAULT '{}',
  profundidade_max_metros  INT,
  total_servicos          INT DEFAULT 0,
  avaliacao_media         DECIMAL(2,1) DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER perfuradores_updated_at
  BEFORE UPDATE ON public.perfuradores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_perfuradores_auth_id ON public.perfuradores(auth_id);
CREATE INDEX idx_perfuradores_slug ON public.perfuradores(slug);
CREATE INDEX idx_perfuradores_cidade_estado ON public.perfuradores(cidade, estado);

-- ============================================================
-- TABELA: clientes
-- ============================================================
CREATE TABLE public.clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfurador_id   UUID NOT NULL REFERENCES public.perfuradores(id) ON DELETE CASCADE,
  nome            VARCHAR(100) NOT NULL,
  telefone        VARCHAR(20) NOT NULL,
  email           VARCHAR(150),
  endereco        TEXT,
  cidade          VARCHAR(100),
  estado          CHAR(2),
  latitude        DECIMAL(10,8),
  longitude       DECIMAL(11,8),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clientes_perfurador_id ON public.clientes(perfurador_id);
CREATE INDEX idx_clientes_nome ON public.clientes(nome);

-- ============================================================
-- TABELA: orcamentos
-- ============================================================
CREATE TABLE public.orcamentos (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfurador_id               UUID NOT NULL REFERENCES public.perfuradores(id) ON DELETE CASCADE,
  cliente_id                  UUID REFERENCES public.clientes(id),
  status                      VARCHAR(20) DEFAULT 'rascunho'
                              CHECK (status IN ('rascunho','enviado','aprovado','em_execucao','concluido','cancelado')),
  tipo_servico                VARCHAR(50),
  profundidade_estimada_metros INT,
  diametro_polegadas          DECIMAL(4,2),
  tipo_solo                   VARCHAR(50),
  itens                       JSONB DEFAULT '[]',
  valor_total                 DECIMAL(12,2),
  desconto                    DECIMAL(12,2) DEFAULT 0,
  valor_final                 DECIMAL(12,2),
  forma_pagamento             TEXT,
  prazo_execucao_dias         INT,
  validade_dias               INT DEFAULT 15,
  observacoes                 TEXT,
  link_publico                UUID DEFAULT gen_random_uuid(),
  enviado_em                  TIMESTAMPTZ,
  aprovado_em                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER orcamentos_updated_at
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_orcamentos_perfurador_id ON public.orcamentos(perfurador_id);
CREATE INDEX idx_orcamentos_cliente_id ON public.orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_status ON public.orcamentos(status);
CREATE INDEX idx_orcamentos_link_publico ON public.orcamentos(link_publico);
CREATE INDEX idx_orcamentos_created_at ON public.orcamentos(created_at DESC);

-- ============================================================
-- TABELA: servicos
-- ============================================================
CREATE TABLE public.servicos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfurador_id           UUID NOT NULL REFERENCES public.perfuradores(id) ON DELETE CASCADE,
  orcamento_id            UUID REFERENCES public.orcamentos(id),
  cliente_id              UUID REFERENCES public.clientes(id),
  profundidade_real_metros INT,
  diametro_polegadas      DECIMAL(4,2),
  tipo_solo_encontrado    VARCHAR(50),
  vazao_litros_hora       INT,
  nivel_estatico_metros   DECIMAL(6,2),
  nivel_dinamico_metros   DECIMAL(6,2),
  latitude                DECIMAL(10,8),
  longitude               DECIMAL(11,8),
  endereco                TEXT,
  materiais               JSONB DEFAULT '[]',
  fotos                   TEXT[] DEFAULT '{}',
  data_inicio             DATE,
  data_conclusao          DATE,
  notas                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_servicos_perfurador_id ON public.servicos(perfurador_id);
CREATE INDEX idx_servicos_orcamento_id ON public.servicos(orcamento_id);
CREATE INDEX idx_servicos_cliente_id ON public.servicos(cliente_id);
CREATE INDEX idx_servicos_data_inicio ON public.servicos(data_inicio DESC);

-- ============================================================
-- TABELA: financeiro
-- ============================================================
CREATE TABLE public.financeiro (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfurador_id   UUID NOT NULL REFERENCES public.perfuradores(id) ON DELETE CASCADE,
  servico_id      UUID REFERENCES public.servicos(id),
  tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('receita','despesa')),
  categoria       VARCHAR(50),
  descricao       VARCHAR(200),
  valor           DECIMAL(12,2) NOT NULL,
  data            DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_financeiro_perfurador_id ON public.financeiro(perfurador_id);
CREATE INDEX idx_financeiro_servico_id ON public.financeiro(servico_id);
CREATE INDEX idx_financeiro_tipo ON public.financeiro(tipo);
CREATE INDEX idx_financeiro_data ON public.financeiro(data DESC);
CREATE INDEX idx_financeiro_categoria ON public.financeiro(categoria);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.perfuradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: perfuradores
-- ============================================================

-- Perfurador pode ver/editar apenas seu próprio registro
CREATE POLICY "perfuradores_select_own" ON public.perfuradores
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "perfuradores_update_own" ON public.perfuradores
  FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "perfuradores_insert_own" ON public.perfuradores
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Perfil público: qualquer pessoa pode ver pelo slug (para página pública)
CREATE POLICY "perfuradores_select_public" ON public.perfuradores
  FOR SELECT USING (slug IS NOT NULL);

-- ============================================================
-- POLICIES: clientes
-- ============================================================

CREATE POLICY "clientes_select_own" ON public.clientes
  FOR SELECT USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "clientes_insert_own" ON public.clientes
  FOR INSERT WITH CHECK (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "clientes_update_own" ON public.clientes
  FOR UPDATE USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "clientes_delete_own" ON public.clientes
  FOR DELETE USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

-- ============================================================
-- POLICIES: orcamentos
-- ============================================================

CREATE POLICY "orcamentos_select_own" ON public.orcamentos
  FOR SELECT USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "orcamentos_insert_own" ON public.orcamentos
  FOR INSERT WITH CHECK (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "orcamentos_update_own" ON public.orcamentos
  FOR UPDATE USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "orcamentos_delete_own" ON public.orcamentos
  FOR DELETE USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

-- Acesso público pelo link_publico (para o cliente ver o orçamento)
CREATE POLICY "orcamentos_select_public" ON public.orcamentos
  FOR SELECT USING (link_publico IS NOT NULL);

-- ============================================================
-- POLICIES: servicos
-- ============================================================

CREATE POLICY "servicos_select_own" ON public.servicos
  FOR SELECT USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "servicos_insert_own" ON public.servicos
  FOR INSERT WITH CHECK (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "servicos_update_own" ON public.servicos
  FOR UPDATE USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "servicos_delete_own" ON public.servicos
  FOR DELETE USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

-- ============================================================
-- POLICIES: financeiro
-- ============================================================

CREATE POLICY "financeiro_select_own" ON public.financeiro
  FOR SELECT USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "financeiro_insert_own" ON public.financeiro
  FOR INSERT WITH CHECK (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "financeiro_update_own" ON public.financeiro
  FOR UPDATE USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

CREATE POLICY "financeiro_delete_own" ON public.financeiro
  FOR DELETE USING (
    perfurador_id IN (SELECT id FROM public.perfuradores WHERE auth_id = auth.uid())
  );

-- ============================================================
-- TRIGGER: criar perfurador automaticamente ao cadastrar user
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfuradores (auth_id, nome, telefone, email, slug, nome_empresa)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    NEW.email,
    public.generate_unique_slug(COALESCE(NEW.raw_user_meta_data->>'nome', NEW.id::TEXT)),
    COALESCE(NEW.raw_user_meta_data->>'empresa', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
