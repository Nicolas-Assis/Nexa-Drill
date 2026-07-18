// ============================================================
// Tipos auxiliares (JSONB items)
// ============================================================

export type OrcamentoItem = {
  descricao: string;
  qtd: number;
  unidade: string;
  valor_unit: number;
};

export type MaterialItem = {
  descricao: string;
  qtd: number;
  unidade: string;
  valor_unit?: number;
};

// ============================================================
// Enums
// ============================================================

export type StatusOrcamento =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "em_execucao"
  | "concluido"
  | "cancelado";

export type TipoLancamento = "receita" | "despesa";

export type TipoServico =
  | "perfuracao"
  | "manutencao"
  | "limpeza"
  | "bombeamento";

export type TipoSolo = "rocha" | "areia" | "argila" | "misto";

export type CategoriaReceita = "servico" | "manutencao" | "outro";

export type CategoriaDespesa =
  | "combustivel"
  | "material"
  | "equipamento"
  | "funcionario"
  | "outro";

// ============================================================
// Tabelas
// ============================================================

export type Perfurador = {
  id: string;
  auth_id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf_cnpj: string | null;
  slug: string | null;
  nome_empresa: string | null;
  logo_url: string | null;
  bio: string | null;
  cidade: string | null;
  estado: string | null;
  raio_atendimento_km: number;
  tipos_servico: TipoServico[];
  tipos_solo_experiencia: TipoSolo[];
  profundidade_max_metros: number | null;
  total_servicos: number;
  avaliacao_media: number;
  created_at: string;
  updated_at: string;
};

export type Cliente = {
  id: string;
  perfurador_id: string;
  nome: string;
  telefone: string;
  email: string | null;
  cpf_cnpj: string | null;
  asaas_customer_id: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  notas: string | null;
  created_at: string;
};

export type Orcamento = {
  id: string;
  perfurador_id: string;
  cliente_id: string | null;
  status: StatusOrcamento;
  tipo_servico: string | null;
  profundidade_estimada_metros: number | null;
  diametro_polegadas: number | null;
  tipo_solo: string | null;
  itens: OrcamentoItem[];
  valor_total: number | null;
  desconto: number;
  valor_final: number | null;
  forma_pagamento: string | null;
  prazo_execucao_dias: number | null;
  validade_dias: number;
  observacoes: string | null;
  link_publico: string;
  enviado_em: string | null;
  aprovado_em: string | null;
  created_at: string;
  updated_at: string;
  // Relações (joins)
  cliente?: Cliente;
  perfurador?: Perfurador;
};

export type StatusServico = "andamento" | "concluido" | "cancelado";

export type Servico = {
  id: string;
  perfurador_id: string;
  orcamento_id: string | null;
  cliente_id: string | null;
  valor: number | null;
  custo_previsto: number | null;
  valor_recebido: number | null;
  status: StatusServico;
  profundidade_real_metros: number | null;
  diametro_polegadas: number | null;
  tipo_solo_encontrado: string | null;
  vazao_litros_hora: number | null;
  nivel_estatico_metros: number | null;
  nivel_dinamico_metros: number | null;
  latitude: number | null;
  longitude: number | null;
  endereco: string | null;
  materiais: MaterialItem[];
  fotos: string[];
  data_inicio: string | null;
  data_conclusao: string | null;
  notas: string | null;
  created_at: string;
  // Relações (joins)
  cliente?: Cliente;
  orcamento?: Orcamento;
};

export type Financeiro = {
  id: string;
  perfurador_id: string;
  servico_id: string | null;
  parcela_id: string | null;
  tipo: TipoLancamento;
  categoria: string | null;
  descricao: string | null;
  valor: number;
  data: string;
  created_at: string;
  // Relações (joins)
  servico?: Servico;
  parcela?: Parcela;
};

// ============================================================
// Contas a receber / parcelas (Fase 2)
// ============================================================

export type StatusParcela = "pendente" | "pago" | "atrasado" | "cancelado";

export type MetodoPagamento =
  | "pix"
  | "boleto"
  | "cartao"
  | "dinheiro"
  | "transferencia"
  | "outro";

export type Parcela = {
  id: string;
  perfurador_id: string;
  servico_id: string | null;
  cliente_id: string | null;
  descricao: string | null;
  valor: number;
  vencimento: string;
  status: StatusParcela;
  metodo_pagamento: MetodoPagamento | null;
  data_pagamento: string | null;
  valor_pago: number | null;
  asaas_cobranca_id: string | null;
  pix_copia_cola: string | null;
  boleto_url: string | null;
  link_pagamento: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  created_at: string;
  updated_at: string;
  // Relações (joins)
  servico?: Servico;
  cliente?: Cliente;
};

// Situação derivada em tempo real pela view (independe do status gravado)
export type SituacaoParcela =
  | "a_vencer"
  | "vence_hoje"
  | "atrasada"
  | "pago"
  | "cancelado";

// View: vw_parcelas_status (parcela + campos calculados)
export type ParcelaStatus = Parcela & {
  dias_ate_vencimento: number | null;
  situacao: SituacaoParcela;
};

// Log cru de webhooks (Asaas, etc.) — infra-level, sem perfurador_id
export type WebhookLog = {
  id: string;
  origem: string;
  event_id: string | null;
  evento: string | null;
  payload: unknown;
  processado: boolean;
  resultado: string | null;
  erro: string | null;
  created_at: string;
};

// ============================================================
// View: vw_margem_servico (margem por job — Fase 1)
// ============================================================

export type MargemServico = {
  servico_id: string;
  perfurador_id: string;
  status: StatusServico;
  tipo_solo: string | null;
  profundidade: number | null;
  receita: number;
  custo: number;
  margem: number;
  margem_percentual: number | null;
  custo_por_metro: number | null;
  margem_por_metro: number | null;
  // Fase 9 — recebido x previsto
  receita_recebida: number;
  receita_prevista: number;
  margem_recebida: number;
  margem_prevista: number;
};

// ============================================================
// Tipos utilitários para formulários (sem campos auto-gerados)
// ============================================================

export type PerfuradorInsert = Omit<
  Perfurador,
  "id" | "created_at" | "updated_at" | "total_servicos" | "avaliacao_media"
>;
export type PerfuradorUpdate = Partial<
  Omit<Perfurador, "id" | "auth_id" | "created_at" | "updated_at">
>;

export type ClienteInsert = Omit<Cliente, "id" | "created_at">;
export type ClienteUpdate = Partial<
  Omit<Cliente, "id" | "perfurador_id" | "created_at">
>;

export type OrcamentoInsert = Omit<
  Orcamento,
  "id" | "created_at" | "updated_at" | "link_publico" | "cliente" | "perfurador"
>;
export type OrcamentoUpdate = Partial<
  Omit<
    Orcamento,
    | "id"
    | "perfurador_id"
    | "created_at"
    | "updated_at"
    | "link_publico"
    | "cliente"
    | "perfurador"
  >
>;

export type ServicoInsert = Omit<
  Servico,
  "id" | "created_at" | "cliente" | "orcamento"
>;
export type ServicoUpdate = Partial<
  Omit<Servico, "id" | "perfurador_id" | "created_at" | "cliente" | "orcamento">
>;

export type FinanceiroInsert = Omit<
  Financeiro,
  "id" | "created_at" | "servico" | "parcela"
>;
export type FinanceiroUpdate = Partial<
  Omit<Financeiro, "id" | "perfurador_id" | "created_at" | "servico" | "parcela">
>;

export type ParcelaInsert = Omit<
  Parcela,
  "id" | "created_at" | "updated_at" | "servico" | "cliente"
>;
export type ParcelaUpdate = Partial<
  Omit<
    Parcela,
    "id" | "perfurador_id" | "created_at" | "updated_at" | "servico" | "cliente"
  >
>;

// ============================================================
// Painel Admin — RBAC, atividade e cobrança (Fase Admin)
// ============================================================

// Conta de login do Better Auth (tabela "user") + campos do plugin admin.
export type UserRole = "user" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  updatedAt: string;
};

// Sessão do Better Auth (tabela "session") — base do histórico de logins.
export type AuthSession = {
  id: string;
  userId: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  impersonatedBy: string | null;
};

// ── Atividade ────────────────────────────────────────────────────────────────
export type ActivityEventType = "action" | "pageview" | "login" | "logout";

export type ActivityLog = {
  id: string;
  user_id: string | null;
  perfurador_id: string | null;
  event_type: ActivityEventType;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  path: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type ActivitySession = {
  id: string;
  user_id: string;
  perfurador_id: string | null;
  started_at: string;
  last_seen_at: string;
  active_seconds: number;
  page_views: number;
  current_path: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

// ── Cobrança / assinaturas ─────────────────────────────────────────────────────
export type CicloAssinatura = "mensal" | "anual";

export type StatusAssinatura =
  | "trial"
  | "ativa"
  | "inadimplente"
  | "cancelada"
  | "expirada";

export type StatusFatura = "pendente" | "pago" | "atrasado" | "cancelado";

export type Plano = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number | null;
  recursos: string[];
  limites: Record<string, number>;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type Assinatura = {
  id: string;
  perfurador_id: string;
  plano_id: string | null;
  status: StatusAssinatura;
  ciclo: CicloAssinatura;
  preco: number;
  trial_ate: string | null;
  inicio: string | null;
  periodo_atual_inicio: string | null;
  periodo_atual_fim: string | null;
  cancelada_em: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  billing_type: string | null;
  created_at: string;
  updated_at: string;
  // Relações (joins)
  plano?: Plano | null;
};

// View: vw_admin_assinaturas (assinatura + plano + perfurador + MRR)
export type AdminAssinatura = Assinatura & {
  plano_nome: string | null;
  plano_slug: string | null;
  perfurador_nome: string | null;
  perfurador_empresa: string | null;
  perfurador_email: string | null;
  mrr: number;
};

export type Fatura = {
  id: string;
  assinatura_id: string | null;
  perfurador_id: string | null;
  plano_id: string | null;
  competencia: string | null;
  valor: number;
  vencimento: string | null;
  status: StatusFatura;
  pago_em: string | null;
  valor_pago: number | null;
  metodo_pagamento: string | null;
  asaas_payment_id: string | null;
  pix_copia_cola: string | null;
  boleto_url: string | null;
  link_pagamento: string | null;
  created_at: string;
  updated_at: string;
};
