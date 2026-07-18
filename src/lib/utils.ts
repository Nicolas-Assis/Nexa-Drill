import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date, pattern: string = "dd/MM/yyyy"): string {
  return format(new Date(date), pattern, { locale: ptBR });
}

/**
 * Normaliza um embed de relacionamento do supabase-js.
 * Um FK to-one (ex.: `cliente:clientes(...)`) retorna um objeto único, mas
 * dependendo da inferência pode vir tipado/serializado como array. Este helper
 * lida com ambos os formatos e devolve o primeiro registro (ou null).
 */
export function firstOf<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed.length > 0 ? embed[0] : null;
  return embed ?? null;
}
