import { StatusOrcamento, TipoLancamento, StatusServico } from "@/types";

export const STATUS_ORCAMENTO_OPTIONS: {
  value: StatusOrcamento;
  label: string;
}[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "aprovado", label: "Aprovado" },
  { value: "em_execucao", label: "Em Execução" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

export const STATUS_ORCAMENTO_COLORS: Record<StatusOrcamento, string> = {
  rascunho: "bg-secondary-200 text-secondary-700",
  enviado: "bg-primary-100 text-primary-700",
  aprovado: "bg-success-100 text-success-700",
  em_execucao: "bg-accent-100 text-accent-700",
  concluido: "bg-success-200 text-success-800",
  cancelado: "bg-danger-100 text-danger-700",
};

export const STATUS_SERVICO_OPTIONS: { value: StatusServico; label: string }[] =
  [
    { value: "andamento", label: "Em Andamento" },
    { value: "concluido", label: "Concluído" },
    { value: "cancelado", label: "Cancelado" },
  ];

export const STATUS_SERVICO_COLORS: Record<StatusServico, string> = {
  andamento: "bg-accent-100 text-accent-700",
  concluido: "bg-success-100 text-success-700",
  cancelado: "bg-danger-100 text-danger-700",
};

export const TIPO_LANCAMENTO_OPTIONS: {
  value: TipoLancamento;
  label: string;
}[] = [
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
];

export const CATEGORIAS_RECEITA = ["servico", "manutencao", "outro"];

export const CATEGORIAS_DESPESA = [
  "combustivel",
  "material",
  "equipamento",
  "funcionario",
  "alimentacao",
  "outro",
];

export const CATEGORIAS_RECEITA_LABELS: Record<string, string> = {
  servico: "Serviço",
  manutencao: "Manutenção",
  outro: "Outro",
};

export const CATEGORIAS_DESPESA_LABELS: Record<string, string> = {
  combustivel: "Combustível",
  material: "Material",
  equipamento: "Equipamento",
  funcionario: "Funcionário",
  alimentacao: "Alimentação",
  outro: "Outro",
};

export const TIPOS_SERVICO_OPTIONS = [
  { value: "perfuracao", label: "Perfuração" },
  { value: "manutencao", label: "Manutenção" },
  { value: "limpeza", label: "Limpeza" },
  { value: "bombeamento", label: "Bombeamento" },
];

export const TIPOS_SOLO_OPTIONS = [
  { value: "rocha", label: "Rocha" },
  { value: "areia", label: "Areia" },
  { value: "argila", label: "Argila" },
  { value: "misto", label: "Misto" },
];

export const ESTADOS_BRASILEIROS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export const KANBAN_COLUMNS: { id: StatusOrcamento; title: string }[] = [
  { id: "rascunho", title: "Rascunho" },
  { id: "enviado", title: "Enviado" },
  { id: "aprovado", title: "Aprovado" },
  { id: "em_execucao", title: "Em Execução" },
  { id: "concluido", title: "Concluído" },
];

// ─── Labels centralizados ─────────────────────────────────────────────────────

export const SERVICO_LABELS: Record<string, string> = {
  perfuracao: "Perfuração",
  manutencao: "Manutenção",
  limpeza: "Limpeza",
  bombeamento: "Bombeamento",
};

export const SOLO_LABELS: Record<string, string> = {
  rocha: "Rocha",
  areia: "Areia",
  argila: "Argila",
  misto: "Misto",
  nao_identificado: "Não identificado",
};

// ─── Nav items do dashboard ───────────────────────────────────────────────────

export const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/clientes", label: "Clientes" },
  { href: "/dashboard/orcamentos", label: "Orçamentos" },
  { href: "/dashboard/servicos", label: "Serviços" },
  { href: "/dashboard/financeiro", label: "Financeiro" },
  { href: "/dashboard/perfil", label: "Meu Perfil" },
] as const;

// ─── Page titles ──────────────────────────────────────────────────────────────

export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/clientes": "Clientes",
  "/dashboard/orcamentos": "Orçamentos",
  "/dashboard/orcamentos/novo": "Novo Orçamento",
  "/dashboard/servicos": "Serviços",
  "/dashboard/financeiro": "Financeiro",
  "/dashboard/perfil": "Meu Perfil",
};
