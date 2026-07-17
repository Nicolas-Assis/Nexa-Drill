import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// ============================================================
// Webhook do Asaas — confirmação de pagamento (Fase 4)
// ============================================================
// Regras críticas (ver docs/integracoes.md):
//   1. Valida a origem pelo header `asaas-access-token` == ASAAS_WEBHOOK_TOKEN.
//   2. Idempotência: cada evento (id) só é processado uma vez — índice único
//      em webhook_logs(origem, event_id) + guarda de status na parcela.
//   3. Responde 200 rápido; loga o payload cru antes de processar.
// ============================================================

type AsaasWebhookBody = {
  id?: string; // id do evento (idempotência)
  event?: string; // ex.: PAYMENT_CONFIRMED
  payment?: {
    id?: string;
    value?: number;
    billingType?: string;
    paymentDate?: string | null;
    status?: string;
  };
};

function mapMetodo(billingType?: string): string {
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

export async function POST(req: NextRequest) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  const token = req.headers.get("asaas-access-token");

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: AsaasWebhookBody;
  try {
    body = (await req.json()) as AsaasWebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const eventId = body.id ?? null;
  const evento = body.event ?? null;

  // 1) Log + idempotência (unique em origem,event_id)
  const { error: logError } = await supabase.from("webhook_logs").insert({
    origem: "asaas",
    event_id: eventId,
    evento,
    payload: body,
    processado: false,
  });

  if (logError) {
    // 23505 = evento já registrado → já processado, responde OK sem reprocessar
    if ((logError as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    // erro ao logar: ainda respondemos 200 para o Asaas não reenviar em loop,
    // mas sinalizamos no corpo (o Asaas registra o retorno).
    return NextResponse.json({ ok: false, logged: false });
  }

  let resultado = "ignorado";

  try {
    const paymentId = body.payment?.id;

    if (
      (evento === "PAYMENT_CONFIRMED" || evento === "PAYMENT_RECEIVED") &&
      paymentId
    ) {
      const { data: parcela } = await supabase
        .from("parcelas")
        .select("id, perfurador_id, servico_id, descricao, valor, status")
        .eq("asaas_cobranca_id", paymentId)
        .maybeSingle();

      if (
        parcela &&
        parcela.status !== "pago" &&
        parcela.status !== "cancelado"
      ) {
        const valorPago = body.payment?.value ?? (parcela.valor as number);
        const dataPagamento =
          body.payment?.paymentDate ?? new Date().toISOString().slice(0, 10);

        // Baixa atômica (mesma função da baixa manual); índice único evita
        // receita duplicada em caso de eventos concorrentes.
        const { error: rpcError } = await supabase.rpc("fn_baixar_parcela", {
          p_parcela_id: parcela.id,
          p_perfurador_id: parcela.perfurador_id,
          p_metodo: mapMetodo(body.payment?.billingType),
          p_data: dataPagamento,
          p_valor: valorPago,
        });
        if (rpcError) throw new Error(rpcError.message);

        resultado = "baixa_confirmada";
      } else if (parcela) {
        resultado =
          parcela.status === "cancelado" ? "cancelada_ignorada" : "ja_pago";
      } else {
        resultado = "parcela_nao_encontrada";
      }
    } else if (
      (evento === "PAYMENT_REFUNDED" || evento === "PAYMENT_DELETED") &&
      paymentId
    ) {
      const { data: parcela } = await supabase
        .from("parcelas")
        .select("id, perfurador_id")
        .eq("asaas_cobranca_id", paymentId)
        .maybeSingle();

      if (parcela) {
        await supabase
          .from("financeiro")
          .delete()
          .eq("parcela_id", parcela.id);
        await supabase
          .from("parcelas")
          .update({ status: "cancelado" })
          .eq("id", parcela.id);
        resultado = "estornado";
      } else {
        resultado = "parcela_nao_encontrada";
      }
    } else if (evento === "PAYMENT_OVERDUE" && paymentId) {
      await supabase
        .from("parcelas")
        .update({ status: "atrasado" })
        .eq("asaas_cobranca_id", paymentId)
        .eq("status", "pendente");
      resultado = "marcado_atrasado";
    }

    if (eventId) {
      await supabase
        .from("webhook_logs")
        .update({ processado: true, resultado })
        .eq("origem", "asaas")
        .eq("event_id", eventId);
    }

    return NextResponse.json({ ok: true, resultado });
  } catch (err) {
    if (eventId) {
      await supabase
        .from("webhook_logs")
        .update({ processado: false, erro: (err as Error).message })
        .eq("origem", "asaas")
        .eq("event_id", eventId);
    }
    // 200 para evitar reenvio em loop; erro fica registrado no log
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}
