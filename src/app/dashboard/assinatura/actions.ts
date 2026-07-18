"use server";

import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";
import { createServiceClient } from "@/lib/supabase/service";
import {
  configurarAssinatura,
  getAssinaturaComPlano,
  getFaturas,
} from "@/lib/billing";
import { getPixQrCode, type AsaasBillingType } from "@/lib/asaas";
import { logActivity } from "@/lib/activity";
import type { Assinatura, CicloAssinatura, Fatura, Plano } from "@/types";

export async function getMinhaAssinatura(): Promise<{
  assinatura: Assinatura | null;
  plano: Plano | null;
  faturas: Fatura[];
  planos: Plano[];
  temCpf: boolean;
  error: string | null;
}> {
  try {
    const { perfuradorId, perfurador } = await getAuthenticatedPerfurador();
    const { assinatura, plano } = await getAssinaturaComPlano(perfuradorId);
    const faturas = await getFaturas(perfuradorId, 12);

    const supabase = createServiceClient();
    const { data: planos } = await supabase
      .from("planos")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    return {
      assinatura,
      plano,
      faturas,
      planos: (planos ?? []) as Plano[],
      temCpf: !!perfurador.cpf_cnpj,
      error: null,
    };
  } catch (err) {
    return {
      assinatura: null,
      plano: null,
      faturas: [],
      planos: [],
      temCpf: false,
      error: (err as Error).message,
    };
  }
}

export async function assinarPlano(
  planoId: string,
  ciclo: CicloAssinatura,
  billingType: AsaasBillingType,
): Promise<{ error: string | null }> {
  try {
    const { perfuradorId } = await getAuthenticatedPerfurador();
    const res = await configurarAssinatura(perfuradorId, {
      plano_id: planoId,
      ciclo,
      billing_type: billingType,
      modo: "cobrar",
    });
    if (!res.error) {
      await logActivity({
        action: "assinatura.assinar",
        entityType: "assinatura",
        metadata: { planoId, ciclo, billingType },
        perfuradorId,
      });
    }
    return res;
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function getFaturaPix(
  faturaId: string,
): Promise<{ encodedImage: string; payload: string } | { error: string }> {
  try {
    const { perfuradorId } = await getAuthenticatedPerfurador();
    const supabase = createServiceClient();
    const { data: fatura } = await supabase
      .from("faturas")
      .select("asaas_payment_id, perfurador_id")
      .eq("id", faturaId)
      .maybeSingle();

    if (!fatura || fatura.perfurador_id !== perfuradorId) {
      return { error: "Fatura não encontrada" };
    }
    if (!fatura.asaas_payment_id) {
      return { error: "Esta cobrança ainda não tem Pix disponível." };
    }

    const qr = await getPixQrCode(fatura.asaas_payment_id);
    return { encodedImage: qr.encodedImage, payload: qr.payload };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
