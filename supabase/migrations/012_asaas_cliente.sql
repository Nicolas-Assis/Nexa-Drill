-- ============================================================
-- NexaDrill - Vínculo do cliente com o Asaas (Fase 3)
-- Migration: 012_asaas_cliente
-- ============================================================
-- Para gerar cobrança no Asaas precisamos: (1) do CPF/CNPJ do cliente
-- (obrigatório na criação do customer) e (2) guardar o id do customer
-- retornado pelo Asaas, para reusar em cobranças futuras (idempotência).
-- ============================================================

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20);

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_clientes_asaas_customer_id
  ON public.clientes(asaas_customer_id);
