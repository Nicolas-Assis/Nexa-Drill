import { formatDate } from "@/lib/utils";
import type { StatusAssinatura, StatusFatura } from "@/types";

/** Segundos → "2h 15min" / "45min" / "30s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const restMin = min % 60;
  return restMin ? `${h}h ${restMin}min` : `${h}h`;
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, "dd/MM/yyyy HH:mm");
}

/** Tempo relativo curto em pt-BR ("há 3 min", "há 2 h", "há 4 d"). */
export function relativeTime(date: string | Date): string {
  const then = new Date(date).getTime();
  const diff = Math.max(0, Date.now() - then) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} d`;
  return formatDate(date, "dd/MM/yyyy");
}

/** Rótulos legíveis para ações do log de atividade. */
const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Fez login",
  pageview: "Visitou uma página",
  "cliente.create": "Criou um cliente",
  "cliente.update": "Editou um cliente",
  "cliente.delete": "Excluiu um cliente",
  "orcamento.create": "Criou um orçamento",
  "orcamento.update": "Editou um orçamento",
  "orcamento.delete": "Excluiu um orçamento",
  "servico.create": "Criou um serviço",
  "servico.update": "Editou um serviço",
  "servico.delete": "Excluiu um serviço",
  "financeiro.create": "Registrou um lançamento",
  "financeiro.update": "Editou um lançamento",
  "financeiro.delete": "Excluiu um lançamento",
  "parcela.create": "Criou uma cobrança",
  "parcela.update": "Atualizou uma cobrança",
  "parcela.delete": "Excluiu uma cobrança",
  "perfil.update": "Atualizou o perfil",
};

export function activityLabel(action: string | null, eventType: string): string {
  if (action && ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (eventType === "pageview") return "Visitou uma página";
  if (eventType === "login") return "Fez login";
  if (eventType === "logout") return "Saiu";
  return action ?? eventType;
}

// ── Status: rótulo + variante de Badge ────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export const STATUS_ASSINATURA_LABELS: Record<StatusAssinatura, string> = {
  trial: "Trial",
  ativa: "Ativa",
  inadimplente: "Inadimplente",
  cancelada: "Cancelada",
  expirada: "Expirada",
};

export const STATUS_ASSINATURA_VARIANT: Record<StatusAssinatura, BadgeVariant> = {
  trial: "info",
  ativa: "success",
  inadimplente: "danger",
  cancelada: "default",
  expirada: "warning",
};

export const STATUS_FATURA_LABELS: Record<StatusFatura, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export const STATUS_FATURA_VARIANT: Record<StatusFatura, BadgeVariant> = {
  pendente: "warning",
  pago: "success",
  atrasado: "danger",
  cancelado: "default",
};
