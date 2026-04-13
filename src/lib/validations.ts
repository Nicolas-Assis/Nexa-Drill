import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const cadastroSchema = z
  .object({
    nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    telefone: z.string().min(10, "Telefone inválido"),
    empresa: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type CadastroFormData = z.infer<typeof cadastroSchema>;

export const clienteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().min(10, "Telefone inválido"),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  notas: z.string().optional(),
});

export type ClienteFormData = z.infer<typeof clienteSchema>;

export const itemOrcamentoSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  qtd: z.number().min(1, "Quantidade deve ser no mínimo 1"),
  unidade: z.string().min(1, "Unidade é obrigatória"),
  valor_unit: z.number().min(0, "Valor deve ser positivo"),
});

export const orcamentoSchema = z.object({
  cliente_id: z.string().min(1, "Selecione um cliente"),
  tipo_servico: z.string().optional(),
  profundidade_estimada_metros: z.number().optional(),
  diametro_polegadas: z.number().optional(),
  tipo_solo: z.string().optional(),
  forma_pagamento: z.string().optional(),
  prazo_execucao_dias: z.number().optional(),
  validade_dias: z.number().optional(),
  desconto: z.number().optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemOrcamentoSchema).min(1, "Adicione pelo menos um item"),
});

export type OrcamentoFormData = z.infer<typeof orcamentoSchema>;

export const lancamentoSchema = z.object({
  tipo: z.enum(["receita", "despesa"]),
  categoria: z.string().min(1, "Selecione uma categoria"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  data: z.string().min(1, "Data é obrigatória"),
  servico_id: z.string().optional(),
});

export type LancamentoFormData = z.infer<typeof lancamentoSchema>;

export const perfilSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  telefone: z.string().min(10, "Telefone inválido"),
  nome_empresa: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
  bio: z
    .string()
    .max(500, "Bio deve ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  slug: z
    .string()
    .min(3, "Slug deve ter no mínimo 3 caracteres")
    .max(50, "Slug deve ter no máximo 50 caracteres")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens")
    .optional()
    .or(z.literal("")),
  logo_url: z.string().optional().or(z.literal("")),
  raio_atendimento_km: z.number().min(1).max(2000).optional(),
  profundidade_max_metros: z.number().min(1).max(10000).optional(),
  tipos_servico: z.array(z.string()).optional(),
  tipos_solo_experiencia: z.array(z.string()).optional(),
});

export type PerfilFormData = z.infer<typeof perfilSchema>;
