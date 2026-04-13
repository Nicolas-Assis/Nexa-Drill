-- ============================================================
-- NexaDrill - Adicionar valor e status aos serviços
-- Migration: 004_servicos_valor_status
-- ============================================================

-- Adicionar campo de valor do serviço
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS valor DECIMAL(12,2);

-- Adicionar campo de status do serviço
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'andamento'
  CHECK (status IN ('andamento', 'concluido', 'cancelado'));

-- Criar índice no status
CREATE INDEX IF NOT EXISTS idx_servicos_status ON public.servicos(status);

-- Migrar dados existentes: serviços com data_conclusao vão para 'concluido'
UPDATE public.servicos 
SET status = 'concluido' 
WHERE data_conclusao IS NOT NULL AND status = 'andamento';
