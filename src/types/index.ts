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
  tipo: TipoLancamento;
  categoria: string | null;
  descricao: string | null;
  valor: number;
  data: string;
  created_at: string;
  // Relações (joins)
  servico?: Servico;
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
  "id" | "created_at" | "servico"
>;
export type FinanceiroUpdate = Partial<
  Omit<Financeiro, "id" | "perfurador_id" | "created_at" | "servico">
>;
