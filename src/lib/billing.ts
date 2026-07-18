import { createServiceClient } from "@/lib/supabase/service";
import type {
  Assinatura,
  CicloAssinatura,
  Fatura,
  Plano,
} from "@/types";
import {
  asaasConfigured,
  createCustomer,
  createSubscription,
  type AsaasBillingType,
  type AsaasSubscriptionCycle,
} from "@/lib/asaas";

// ============================================================
// Camada de cobrança do SaaS (plataforma → perfurador)
// ============================================================
// Módulo utilitário de servidor. As cobranças recorrentes são geradas no Asaas
// (mesma conta das parcelas); o webhook concilia as faturas. O externalReference
// da assinatura é "assinatura:<assinaturaId>", copiado para cada cobrança gerada
// — o que permite rotear o webhook sem consultar a API.
// ============================================================

export const ASSINATURA_EXTERNAL_PREFIX = "assinatura:";
export const TRIAL_DIAS = 30;

type Supa = ReturnType<typeof createServiceClient>;

export function cicloToAsaasCycle(ciclo: CicloAssinatura): AsaasSubscriptionCycle {
  return ciclo === "anual" ? "YEARLY" : "MONTHLY";
}

export function precoPorCiclo(plano: Plano, ciclo: CicloAssinatura): number {
  if (ciclo === "anual") return plano.preco_anual ?? plano.preco_mensal * 12;
  return plano.preco_mensal;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addPeriodo(base: Date, ciclo: CicloAssinatura): Date {
  const d = new Date(base);
  if (ciclo === "anual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function mapMetodo(billingType?: string | null): string {
  switch (billingType) {
    case "PIX":
      return "pix";
    case "BOLETO":
      return "boleto";
    case "CREDIT_CARD":
      return "cartao";
    default:
      return "outro";
  }
}

/** Assinatura do perfurador; cria um trial sob demanda se ainda não existir. */
export async function getOrCreateAssinatura(
  perfuradorId: string,
  supabase?: Supa,
): Promise<Assinatura | null> {
  const supa = supabase ?? createServiceClient();

  const { data: existing } = await supa
    .from("assinaturas")
    .select("*")
    .eq("perfurador_id", perfuradorId)
    .maybeSingle();
  if (existing) return existing as Assinatura;

  const { data: trialPlano } = await supa
    .from("planos")
    .select("id")
    .eq("slug", "trial")
    .maybeSingle();

  const now = new Date();
  const trialAte = new Date(now);
  trialAte.setDate(trialAte.getDate() + TRIAL_DIAS);

  const { data: created, error } = await supa
    .from("assinaturas")
    .insert({
      perfurador_id: perfuradorId,
      plano_id: trialPlano?.id ?? null,
      status: "trial",
      ciclo: "mensal",
      preco: 0,
      trial_ate: isoDate(trialAte),
      inicio: isoDate(now),
    })
    .select("*")
    .maybeSingle();

  if (error) {
    // corrida com criação concorrente (perfurador_id é UNIQUE) → re-seleciona
    const { data: again } = await supa
      .from("assinaturas")
      .select("*")
      .eq("perfurador_id", perfuradorId)
      .maybeSingle();
    return (again as Assinatura) ?? null;
  }

  return (created as Assinatura) ?? null;
}

export async function getAssinaturaComPlano(
  perfuradorId: string,
): Promise<{ assinatura: Assinatura | null; plano: Plano | null }> {
  const supa = createServiceClient();
  const assinatura = await getOrCreateAssinatura(perfuradorId, supa);
  if (!assinatura?.plano_id) return { assinatura, plano: null };

  const { data: plano } = await supa
    .from("planos")
    .select("*")
    .eq("id", assinatura.plano_id)
    .maybeSingle();
  return { assinatura, plano: (plano as Plano) ?? null };
}

export async function getFaturas(
  perfuradorId: string,
  limit = 50,
): Promise<Fatura[]> {
  const supa = createServiceClient();
  const { data } = await supa
    .from("faturas")
    .select("*")
    .eq("perfurador_id", perfuradorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Fatura[];
}

/**
 * Atribui/troca o plano de um perfurador. Núcleo compartilhado entre o painel
 * admin e a página de assinatura do próprio perfurador. NÃO faz checagem de
 * permissão — quem chama deve autorizar (assertAdmin ou getAuthenticatedPerfurador).
 *  - modo "cortesia": acesso ativo sem cobrança (sem Asaas).
 *  - modo "cobrar": cria assinatura recorrente no Asaas; vira "ativa" quando o
 *    webhook confirmar o 1º pagamento.
 */
export async function configurarAssinatura(
  perfuradorId: string,
  input: {
    plano_id: string;
    ciclo: CicloAssinatura;
    billing_type: AsaasBillingType;
    modo: "cobrar" | "cortesia";
  },
  supabase?: Supa,
): Promise<{ error: string | null }> {
  const supa = supabase ?? createServiceClient();

  const { data: perfurador } = await supa
    .from("perfuradores")
    .select("*")
    .eq("id", perfuradorId)
    .maybeSingle();
  if (!perfurador) return { error: "Perfurador não encontrado" };

  const { data: plano } = await supa
    .from("planos")
    .select("*")
    .eq("id", input.plano_id)
    .maybeSingle();
  if (!plano) return { error: "Plano não encontrado" };

  const assinatura = await getOrCreateAssinatura(perfuradorId, supa);
  if (!assinatura) return { error: "Não foi possível carregar a assinatura" };

  const preco = precoPorCiclo(plano as Plano, input.ciclo);
  const now = new Date();

  if (input.modo === "cortesia") {
    await supa
      .from("assinaturas")
      .update({
        plano_id: input.plano_id,
        ciclo: input.ciclo,
        preco,
        status: "ativa",
        billing_type: null,
        asaas_subscription_id: null,
        inicio: assinatura.inicio ?? isoDate(now),
        periodo_atual_inicio: isoDate(now),
        periodo_atual_fim: isoDate(addPeriodo(now, input.ciclo)),
      })
      .eq("id", assinatura.id);
    return { error: null };
  }

  // modo "cobrar" — Asaas recorrente
  if (!asaasConfigured()) {
    return { error: "Integração Asaas não configurada (ASAAS_API_URL/ASAAS_API_KEY)." };
  }
  if (!perfurador.cpf_cnpj) {
    return { error: "Cadastre o CPF/CNPJ no perfil antes de assinar." };
  }

  let customerId = assinatura.asaas_customer_id;
  if (!customerId) {
    const customer = await createCustomer({
      name: perfurador.nome,
      cpfCnpj: perfurador.cpf_cnpj,
      email: perfurador.email,
      mobilePhone: perfurador.telefone,
    });
    customerId = customer.id;
  }

  const sub = await createSubscription({
    customer: customerId,
    billingType: input.billing_type,
    value: preco,
    nextDueDate: isoDate(now),
    cycle: cicloToAsaasCycle(input.ciclo),
    description: `Assinatura NexaDrill — ${plano.nome} (${input.ciclo})`,
    externalReference: `${ASSINATURA_EXTERNAL_PREFIX}${assinatura.id}`,
  });

  await supa
    .from("assinaturas")
    .update({
      plano_id: input.plano_id,
      ciclo: input.ciclo,
      preco,
      billing_type: input.billing_type,
      asaas_customer_id: customerId,
      asaas_subscription_id: sub.id,
      inicio: assinatura.inicio ?? isoDate(now),
    })
    .eq("id", assinatura.id);

  return { error: null };
}

// ── Webhook: aplica eventos de cobrança de assinatura ─────────────────────────

type WebhookPayment = {
  id?: string;
  subscription?: string | null;
  externalReference?: string | null;
  value?: number;
  billingType?: string | null;
  paymentDate?: string | null;
  dueDate?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  status?: string;
};

export function isAssinaturaPayment(payment?: WebhookPayment | null): boolean {
  if (!payment) return false;
  return (
    !!payment.subscription ||
    (payment.externalReference?.startsWith(ASSINATURA_EXTERNAL_PREFIX) ?? false)
  );
}

async function findAssinatura(
  supabase: Supa,
  payment: WebhookPayment,
): Promise<Assinatura | null> {
  if (payment.subscription) {
    const { data } = await supabase
      .from("assinaturas")
      .select("*")
      .eq("asaas_subscription_id", payment.subscription)
      .maybeSingle();
    if (data) return data as Assinatura;
  }
  const ref = payment.externalReference;
  if (ref?.startsWith(ASSINATURA_EXTERNAL_PREFIX)) {
    const id = ref.slice(ASSINATURA_EXTERNAL_PREFIX.length);
    const { data } = await supabase
      .from("assinaturas")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) return data as Assinatura;
  }
  return null;
}

/**
 * Concilia um evento PAYMENT_* de assinatura. Retorna um rótulo de resultado
 * para o log do webhook. Idempotente via unique index em faturas.asaas_payment_id.
 */
export async function applyAssinaturaPaymentEvent(
  supabase: Supa,
  evento: string | null,
  payment: WebhookPayment,
): Promise<string> {
  const paymentId = payment.id;
  if (!paymentId) return "assinatura_sem_payment_id";

  const assinatura = await findAssinatura(supabase, payment);
  if (!assinatura) return "assinatura_nao_encontrada";

  const baseFatura = {
    assinatura_id: assinatura.id,
    perfurador_id: assinatura.perfurador_id,
    plano_id: assinatura.plano_id,
    valor: payment.value ?? assinatura.preco,
    vencimento: payment.dueDate ?? null,
    asaas_payment_id: paymentId,
    link_pagamento: payment.invoiceUrl ?? null,
    boleto_url: payment.bankSlipUrl ?? null,
  };

  if (evento === "PAYMENT_CREATED") {
    // Cria (ou ignora, se já existe) a fatura pendente.
    const { error } = await supabase
      .from("faturas")
      .insert({ ...baseFatura, status: "pendente" });
    if (error && (error as { code?: string }).code === "23505") {
      return "fatura_ja_existe";
    }
    return error ? `erro:${error.message}` : "fatura_criada";
  }

  if (evento === "PAYMENT_CONFIRMED" || evento === "PAYMENT_RECEIVED") {
    const now = new Date();
    const periodoInicio =
      assinatura.periodo_atual_fim && new Date(assinatura.periodo_atual_fim) > now
        ? new Date(assinatura.periodo_atual_fim)
        : now;
    const periodoFim = addPeriodo(periodoInicio, assinatura.ciclo);

    // Upsert da fatura como paga (idempotente pelo asaas_payment_id).
    await supabase.from("faturas").upsert(
      {
        ...baseFatura,
        status: "pago",
        pago_em: payment.paymentDate ?? isoDate(now),
        valor_pago: payment.value ?? assinatura.preco,
        metodo_pagamento: mapMetodo(payment.billingType),
      },
      { onConflict: "asaas_payment_id" },
    );

    await supabase
      .from("assinaturas")
      .update({
        status: "ativa",
        periodo_atual_inicio: isoDate(periodoInicio),
        periodo_atual_fim: isoDate(periodoFim),
      })
      .eq("id", assinatura.id);

    return "assinatura_paga";
  }

  if (evento === "PAYMENT_OVERDUE") {
    await supabase
      .from("faturas")
      .update({ status: "atrasado" })
      .eq("asaas_payment_id", paymentId);
    await supabase
      .from("assinaturas")
      .update({ status: "inadimplente" })
      .eq("id", assinatura.id);
    return "assinatura_inadimplente";
  }

  if (evento === "PAYMENT_REFUNDED" || evento === "PAYMENT_DELETED") {
    await supabase
      .from("faturas")
      .update({ status: "cancelado" })
      .eq("asaas_payment_id", paymentId);
    return "fatura_cancelada";
  }

  return "assinatura_evento_ignorado";
}
