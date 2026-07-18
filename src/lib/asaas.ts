// ============================================================
// Cliente Asaas — cobrança Pix / boleto / cartão (Fase 3)
// ============================================================
// Wrapper fino sobre a API v3 do Asaas. Toda chamada tem timeout e lança
// AsaasError com mensagem legível — quem chama trata sem derrubar a UI.
// Config vem do .env: ASAAS_API_URL + ASAAS_API_KEY (ver docs/integracoes.md).
// ============================================================

const TIMEOUT_MS = 10_000;

export class AsaasError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "AsaasError";
    this.status = status;
  }
}

// Em sandbox usa ASAAS_API_KEY_SANDBOX (chave hmlg); em produção, ASAAS_API_KEY.
// A chave do Asaas começa com "$" — no .env ela PRECISA vir escapada (\$aact_...),
// senão o Next.js expande e zera o valor (ver docs/integracoes.md).
function resolveApiKey(baseUrl: string): string | undefined {
  const isSandbox = baseUrl.includes("sandbox");
  const prod = process.env.ASAAS_API_KEY;
  const sandbox = process.env.ASAAS_API_KEY_SANDBOX;
  return isSandbox ? sandbox || prod : prod;
}

export function asaasConfigured(): boolean {
  const baseUrl = process.env.ASAAS_API_URL;
  if (!baseUrl) return false;
  return Boolean(resolveApiKey(baseUrl));
}

async function asaasFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const baseUrl = process.env.ASAAS_API_URL;
  const apiKey = baseUrl ? resolveApiKey(baseUrl) : undefined;

  if (!baseUrl || !apiKey) {
    throw new AsaasError(
      "Integração Asaas não configurada (defina ASAAS_API_URL e ASAAS_API_KEY).",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      const msg =
        data?.errors?.[0]?.description ??
        data?.message ??
        `Asaas respondeu ${res.status}`;
      throw new AsaasError(msg, res.status);
    }

    return data as T;
  } catch (err) {
    if (err instanceof AsaasError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new AsaasError("Tempo esgotado ao falar com o Asaas.");
    }
    throw new AsaasError((err as Error).message);
  } finally {
    clearTimeout(timeout);
  }
}

// ── Tipos (subconjunto do que usamos) ────────────────────────────────────────

export type AsaasCustomer = { id: string };

export type AsaasBillingType =
  | "PIX"
  | "BOLETO"
  | "CREDIT_CARD"
  | "UNDEFINED";

export type AsaasPayment = {
  id: string;
  status: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  value?: number;
  // Presentes em cobranças geradas por assinatura (roteamento no webhook).
  subscription?: string | null;
  externalReference?: string | null;
  billingType?: string | null;
  dueDate?: string | null;
  paymentDate?: string | null;
};

export type AsaasSubscriptionCycle =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "BIMONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

export type AsaasSubscription = {
  id: string;
  status: string; // ACTIVE | EXPIRED | INACTIVE
  customer?: string;
  billingType?: string;
  cycle?: string;
  value?: number;
  nextDueDate?: string | null;
  externalReference?: string | null;
  deleted?: boolean;
};

export type AsaasPixQrCode = {
  encodedImage: string; // base64 do QR
  payload: string; // copia-e-cola
  expirationDate?: string | null;
};

// ── Operações ────────────────────────────────────────────────────────────────

export async function createCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string | null;
  mobilePhone?: string | null;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
      email: input.email ?? undefined,
      mobilePhone: input.mobilePhone?.replace(/\D/g, "") || undefined,
    }),
  });
}

export async function createPayment(input: {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string | null;
  externalReference?: string | null;
}): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: input.billingType,
      value: input.value,
      dueDate: input.dueDate,
      description: input.description ?? undefined,
      externalReference: input.externalReference ?? undefined,
    }),
  });
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`, {
    method: "GET",
  });
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`, { method: "GET" });
}

// Busca cobrança já criada para um externalReference (nosso parcela_id).
// Usado para idempotência: se a gravação local falhou após criar a cobrança,
// evitamos criar uma segunda cobrança para o mesmo cliente.
export async function getPaymentByExternalReference(
  externalReference: string,
): Promise<AsaasPayment | null> {
  const res = await asaasFetch<{ data: AsaasPayment[] }>(
    `/payments?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
    { method: "GET" },
  );
  return res.data?.[0] ?? null;
}

// ── Assinaturas (recorrência da plataforma → perfurador) ─────────────────────
// Mesma conta Asaas das parcelas; o roteamento no webhook é por
// payment.subscription. Convenção de externalReference: "assinatura:<id>".

export async function createSubscription(input: {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string; // YYYY-MM-DD (data da 1ª cobrança)
  cycle: AsaasSubscriptionCycle;
  description?: string | null;
  externalReference?: string | null;
}): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: input.billingType,
      value: input.value,
      nextDueDate: input.nextDueDate,
      cycle: input.cycle,
      description: input.description ?? undefined,
      externalReference: input.externalReference ?? undefined,
    }),
  });
}

export async function getSubscription(id: string): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`, { method: "GET" });
}

export async function updateSubscription(
  id: string,
  input: {
    value?: number;
    billingType?: AsaasBillingType;
    nextDueDate?: string;
    cycle?: AsaasSubscriptionCycle;
    status?: "ACTIVE" | "INACTIVE";
    description?: string | null;
  },
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function cancelSubscription(
  id: string,
): Promise<{ deleted: boolean; id: string }> {
  return asaasFetch<{ deleted: boolean; id: string }>(`/subscriptions/${id}`, {
    method: "DELETE",
  });
}

export async function listSubscriptionPayments(
  id: string,
): Promise<AsaasPayment[]> {
  const res = await asaasFetch<{ data: AsaasPayment[] }>(
    `/subscriptions/${id}/payments`,
    { method: "GET" },
  );
  return res.data ?? [];
}
