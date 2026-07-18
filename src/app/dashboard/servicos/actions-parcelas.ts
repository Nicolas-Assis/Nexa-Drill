"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";
import { createServiceClient } from "@/lib/supabase/service";
import { firstOf } from "@/lib/utils";
import {
  asaasConfigured,
  createCustomer,
  createPayment,
  getPixQrCode,
  getPaymentByExternalReference,
  AsaasError,
  type AsaasPayment,
} from "@/lib/asaas";
import type {
  Parcela,
  ParcelaStatus,
  SituacaoParcela,
  MetodoPagamento,
} from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const metodoEnum = z.enum([
  "pix",
  "boleto",
  "cartao",
  "dinheiro",
  "transferencia",
  "outro",
]);

const parcelaInputSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição é obrigatória"),
  valor: z.number().positive("Valor deve ser maior que zero"),
  vencimento: z.string().min(1, "Vencimento é obrigatório"),
});

// Espelha a lógica da view vw_parcelas_status (situação em tempo real).
function computeSituacao(
  status: string,
  vencimento: string,
): { situacao: SituacaoParcela; dias: number } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(`${vencimento}T00:00:00`);
  const dias = Math.round((venc.getTime() - hoje.getTime()) / 86_400_000);

  if (status === "pago") return { situacao: "pago", dias };
  if (status === "cancelado") return { situacao: "cancelado", dias };
  if (dias < 0) return { situacao: "atrasada", dias };
  if (dias === 0) return { situacao: "vence_hoje", dias };
  return { situacao: "a_vencer", dias };
}

// ── 1. criarParcelas ─────────────────────────────────────────────────────────
export async function criarParcelas(
  servicoId: string,
  parcelas: { descricao: string; valor: number; vencimento: string }[],
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parsed = z.array(parcelaInputSchema).min(1).safeParse(parcelas);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: servico, error: servicoError } = await supabase
      .from("servicos")
      .select("id, cliente_id")
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (servicoError || !servico) {
      return {
        success: false,
        error: servicoError?.message ?? "Serviço não encontrado",
      };
    }

    const total = parsed.data.length;
    const rows = parsed.data.map((p, i) => ({
      perfurador_id: perfuradorId,
      servico_id: servicoId,
      cliente_id: (servico.cliente_id as string | null) ?? null,
      descricao: p.descricao.trim(),
      valor: p.valor,
      vencimento: p.vencimento,
      status: "pendente",
      numero_parcela: i + 1,
      total_parcelas: total,
    }));

    const { error } = await supabase.from("parcelas").insert(rows);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/servicos/${servicoId}`);
    revalidatePath("/dashboard/receber");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── 1b. criarCobrancaAvulsa (parcela solta, sem serviço) ─────────────────────
const cobrancaAvulsaSchema = z.object({
  clienteId: z.string().uuid("Selecione um cliente"),
  descricao: z.string().trim().min(1, "Descrição é obrigatória"),
  valor: z.number().positive("Valor deve ser maior que zero"),
  vencimento: z.string().min(1, "Vencimento é obrigatório"),
});

export async function criarCobrancaAvulsa(input: {
  clienteId: string;
  descricao: string;
  valor: number;
  vencimento: string;
}): Promise<{ parcelaId: string | null; error: string | null }> {
  try {
    const parsed = cobrancaAvulsaSchema.safeParse(input);
    if (!parsed.success) {
      return { parcelaId: null, error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", parsed.data.clienteId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (clienteError || !cliente) {
      return {
        parcelaId: null,
        error: clienteError?.message ?? "Cliente não encontrado",
      };
    }

    const { data: parcela, error } = await supabase
      .from("parcelas")
      .insert({
        perfurador_id: perfuradorId,
        servico_id: null,
        cliente_id: parsed.data.clienteId,
        descricao: parsed.data.descricao.trim(),
        valor: parsed.data.valor,
        vencimento: parsed.data.vencimento,
        status: "pendente",
      })
      .select("id")
      .single();

    if (error) return { parcelaId: null, error: error.message };

    revalidatePath("/dashboard/receber");
    return { parcelaId: parcela.id as string, error: null };
  } catch (err) {
    return { parcelaId: null, error: (err as Error).message };
  }
}

// ── 2. baixarParcelaManual ───────────────────────────────────────────────────
const baixaSchema = z.object({
  metodo: metodoEnum,
  data: z.string().min(1, "Data é obrigatória"),
  valor: z.number().positive("Valor deve ser maior que zero"),
});

export async function baixarParcelaManual(
  parcelaId: string,
  input: { metodo: MetodoPagamento; data: string; valor: number },
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parsed = baixaSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    // Transação: atualiza parcela → pago e cria a receita atomicamente
    // (índice único protege contra receita duplicada).
    const { error } = await supabase.rpc("fn_baixar_parcela", {
      p_parcela_id: parcelaId,
      p_perfurador_id: perfuradorId,
      p_metodo: parsed.data.metodo,
      p_data: parsed.data.data,
      p_valor: parsed.data.valor,
    });

    if (error) {
      const msg = error.message.includes("PARCELA_JA_PAGA")
        ? "Parcela já está paga."
        : error.message.includes("PARCELA_CANCELADA")
          ? "Parcela cancelada não pode ser baixada."
          : error.message.includes("PARCELA_NAO_ENCONTRADA")
            ? "Parcela não encontrada"
            : error.message;
      return { success: false, error: msg };
    }

    revalidatePath("/dashboard/receber");
    revalidatePath("/dashboard/financeiro");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── 3. cancelarParcela ───────────────────────────────────────────────────────
export async function cancelarParcela(
  parcelaId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: parcela, error: parcelaError } = await supabase
      .from("parcelas")
      .select("id, servico_id, status")
      .eq("id", parcelaId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (parcelaError || !parcela) {
      return {
        success: false,
        error: parcelaError?.message ?? "Parcela não encontrada",
      };
    }

    // Trava: não cancelar parcela já paga (evita apagar receita confirmada).
    if (parcela.status === "pago") {
      return {
        success: false,
        error:
          "Parcela já paga não pode ser cancelada. Faça o estorno pelo financeiro/Asaas.",
      };
    }
    if (parcela.status === "cancelado") {
      return { success: false, error: "Parcela já está cancelada." };
    }

    // Regra: só remove receita vinculada quando a parcela não está paga.
    // (Em fluxo normal não existe receita para pendente/atrasada, mas limpa
    // inconsistências legadas sem afetar parcelas já quitadas.)
    const { error: deleteFinError } = await supabase
      .from("financeiro")
      .delete()
      .eq("parcela_id", parcelaId)
      .eq("tipo", "receita")
      .eq("perfurador_id", perfuradorId);
    if (deleteFinError)
      return { success: false, error: deleteFinError.message };

    const { error } = await supabase
      .from("parcelas")
      .update({ status: "cancelado" })
      .eq("id", parcelaId)
      .eq("perfurador_id", perfuradorId);

    if (error) return { success: false, error: error.message };

    if (parcela.servico_id) {
      revalidatePath(`/dashboard/servicos/${parcela.servico_id}`);
    }
    revalidatePath("/dashboard/receber");
    revalidatePath("/dashboard/financeiro");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── 4. editarParcela (só se pendente) ────────────────────────────────────────
export async function editarParcela(
  parcelaId: string,
  input: { descricao: string; valor: number; vencimento: string },
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parsed = parcelaInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: parcela, error: parcelaError } = await supabase
      .from("parcelas")
      .select("id, servico_id, status, asaas_cobranca_id")
      .eq("id", parcelaId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (parcelaError || !parcela) {
      return {
        success: false,
        error: parcelaError?.message ?? "Parcela não encontrada",
      };
    }
    if (parcela.status !== "pendente" && parcela.status !== "atrasado") {
      return {
        success: false,
        error: "Só é possível editar parcelas em aberto.",
      };
    }
    if (parcela.asaas_cobranca_id) {
      return {
        success: false,
        error:
          "Esta parcela já tem cobrança gerada no Asaas — cancele a cobrança antes de alterar valor/vencimento.",
      };
    }

    const { error } = await supabase
      .from("parcelas")
      .update({
        descricao: parsed.data.descricao.trim(),
        valor: parsed.data.valor,
        vencimento: parsed.data.vencimento,
      })
      .eq("id", parcelaId)
      .eq("perfurador_id", perfuradorId);

    if (error) return { success: false, error: error.message };

    if (parcela.servico_id) {
      revalidatePath(`/dashboard/servicos/${parcela.servico_id}`);
    }
    revalidatePath("/dashboard/receber");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── 5. gerarCobrancaAsaas (idempotente) ──────────────────────────────────────
export async function gerarCobrancaAsaas(parcelaId: string): Promise<{
  data: {
    pixCopiaCola: string | null;
    boletoUrl: string | null;
    linkPagamento: string | null;
    encodedImage: string | null;
  } | null;
  error: string | null;
}> {
  try {
    if (!asaasConfigured()) {
      return {
        data: null,
        error: "Integração Asaas não configurada no servidor.",
      };
    }

    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: parcela, error: parcelaError } = await supabase
      .from("parcelas")
      .select(
        "id, servico_id, cliente_id, descricao, valor, vencimento, status, asaas_cobranca_id, pix_copia_cola, boleto_url, link_pagamento",
      )
      .eq("id", parcelaId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (parcelaError || !parcela) {
      return {
        data: null,
        error: parcelaError?.message ?? "Parcela não encontrada",
      };
    }
    if (parcela.status === "pago") {
      return { data: null, error: "Parcela já está paga." };
    }
    if (parcela.status === "cancelado") {
      return { data: null, error: "Parcela cancelada." };
    }

    // Idempotência: já existe cobrança → retorna a existente
    if (parcela.asaas_cobranca_id) {
      let encodedImage: string | null = null;
      let pixCopiaCola = (parcela.pix_copia_cola as string | null) ?? null;
      if (!pixCopiaCola) {
        try {
          const qr = await getPixQrCode(parcela.asaas_cobranca_id as string);
          pixCopiaCola = qr.payload;
          encodedImage = qr.encodedImage;
        } catch {
          // segue sem QR — boleto/link ainda servem
        }
      }
      return {
        data: {
          pixCopiaCola,
          boletoUrl: (parcela.boleto_url as string | null) ?? null,
          linkPagamento: (parcela.link_pagamento as string | null) ?? null,
          encodedImage,
        },
        error: null,
      };
    }

    // Valor mínimo do Asaas (Pix/boleto)
    if ((parcela.valor as number) < 5) {
      return {
        data: null,
        error: "Valor mínimo para cobrança (Pix/boleto) no Asaas é R$ 5,00.",
      };
    }

    // Idempotência anti-cobrança-dupla: a cobrança pode já existir no Asaas
    // (se a gravação local falhou numa tentativa anterior). Reusa por
    // externalReference (= parcela_id) em vez de criar uma segunda.
    let payment: AsaasPayment | null = null;
    try {
      payment = await getPaymentByExternalReference(parcela.id as string);
    } catch {
      // sem conseguir consultar — segue e tenta criar
    }

    if (!payment) {
      if (!parcela.cliente_id) {
        return {
          data: null,
          error: "Parcela sem cliente — vincule um cliente antes de cobrar.",
        };
      }

      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .select("id, nome, email, telefone, cpf_cnpj, asaas_customer_id")
        .eq("id", parcela.cliente_id)
        .eq("perfurador_id", perfuradorId)
        .single();

      if (clienteError || !cliente) {
        return {
          data: null,
          error: clienteError?.message ?? "Cliente não encontrado",
        };
      }

      // Garante o customer no Asaas
      let asaasCustomerId =
        (cliente.asaas_customer_id as string | null) ?? null;
      if (!asaasCustomerId) {
        if (!cliente.cpf_cnpj) {
          return {
            data: null,
            error: "Cliente sem CPF/CNPJ — obrigatório para gerar cobrança.",
          };
        }
        const customer = await createCustomer({
          name: cliente.nome as string,
          cpfCnpj: cliente.cpf_cnpj as string,
          email: cliente.email as string | null,
          mobilePhone: cliente.telefone as string | null,
        });
        asaasCustomerId = customer.id;
        const { error: custUpdErr } = await supabase
          .from("clientes")
          .update({ asaas_customer_id: asaasCustomerId })
          .eq("id", cliente.id)
          .eq("perfurador_id", perfuradorId);
        if (custUpdErr) {
          return { data: null, error: custUpdErr.message };
        }
      }

      payment = await createPayment({
        customer: asaasCustomerId,
        billingType: "PIX",
        value: parcela.valor as number,
        dueDate: parcela.vencimento as string,
        description: (parcela.descricao as string | null) ?? undefined,
        externalReference: parcela.id as string,
      });
    }

    if (!payment) {
      return { data: null, error: "Não foi possível gerar a cobrança." };
    }

    let pixCopiaCola: string | null = null;
    let encodedImage: string | null = null;
    try {
      const qr = await getPixQrCode(payment.id);
      pixCopiaCola = qr.payload;
      encodedImage = qr.encodedImage;
    } catch {
      // sem QR (ex.: conta sem chave Pix) — segue com boleto/link
    }

    // Persiste os dados da cobrança; se falhar, avisa (senão arriscaria cobrar 2x
    // na próxima tentativa por não ter salvo o asaas_cobranca_id).
    const { error: saveErr } = await supabase
      .from("parcelas")
      .update({
        asaas_cobranca_id: payment.id,
        pix_copia_cola: pixCopiaCola,
        boleto_url: payment.bankSlipUrl ?? null,
        link_pagamento: payment.invoiceUrl ?? null,
      })
      .eq("id", parcelaId)
      .eq("perfurador_id", perfuradorId);
    if (saveErr) {
      return { data: null, error: saveErr.message };
    }

    if (parcela.servico_id) {
      revalidatePath(`/dashboard/servicos/${parcela.servico_id}`);
    }
    revalidatePath("/dashboard/receber");

    return {
      data: {
        pixCopiaCola,
        boletoUrl: payment.bankSlipUrl ?? null,
        linkPagamento: payment.invoiceUrl ?? null,
        encodedImage,
      },
      error: null,
    };
  } catch (err) {
    const msg =
      err instanceof AsaasError ? err.message : (err as Error).message;
    return { data: null, error: msg };
  }
}

// ── 6. getParcelasResumo (KPIs do dashboard/receber) ─────────────────────────
export type ParcelasResumo = {
  aReceber: number;
  atrasadoValor: number;
  atrasadoQtd: number;
  venceSemanaValor: number;
  venceSemanaQtd: number;
  dso: number | null;
};

export async function getParcelasResumo(): Promise<{
  resumo: ParcelasResumo | null;
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data: rows, error } = await supabase
      .from("parcelas")
      .select(
        "valor, valor_pago, status, vencimento, data_pagamento, created_at",
      )
      .eq("perfurador_id", perfuradorId);

    if (error) return { resumo: null, error: error.message };

    let aReceber = 0;
    let atrasadoValor = 0;
    let atrasadoQtd = 0;
    let venceSemanaValor = 0;
    let venceSemanaQtd = 0;

    const dsoDias: number[] = [];
    const noventaDiasAtras = new Date();
    noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);

    for (const r of rows ?? []) {
      const status = r.status as string;
      const vencimento = r.vencimento as string;

      if (status === "pendente" || status === "atrasado") {
        const { situacao, dias } = computeSituacao(status, vencimento);
        aReceber += (r.valor as number) ?? 0;
        if (situacao === "atrasada") {
          atrasadoValor += (r.valor as number) ?? 0;
          atrasadoQtd += 1;
        } else if (dias >= 0 && dias <= 7) {
          venceSemanaValor += (r.valor as number) ?? 0;
          venceSemanaQtd += 1;
        }
      }

      if (status === "pago" && r.data_pagamento && r.created_at) {
        const pago = new Date(r.data_pagamento as string);
        if (pago >= noventaDiasAtras) {
          const criado = new Date(r.created_at as string);
          const dias = Math.round(
            (pago.getTime() - criado.getTime()) / 86_400_000,
          );
          // dias < 0 = parcela retro-migrada (created_at posterior ao pagamento);
          // ignora para não sujar a média.
          if (dias >= 0) dsoDias.push(dias);
        }
      }
    }

    const dso =
      dsoDias.length > 0
        ? Number(
            (dsoDias.reduce((s, d) => s + d, 0) / dsoDias.length).toFixed(1),
          )
        : null;

    return {
      resumo: {
        aReceber,
        atrasadoValor,
        atrasadoQtd,
        venceSemanaValor,
        venceSemanaQtd,
        dso,
      },
      error: null,
    };
  } catch (err) {
    return { resumo: null, error: (err as Error).message };
  }
}

// ── 7. getParcelasFiltradas (lista da tela de contas a receber) ──────────────
export type ParcelaComCliente = ParcelaStatus & {
  cliente_nome: string | null;
  cliente_telefone: string | null;
};

export async function getParcelasFiltradas(filtros?: {
  status?: string[];
  clienteId?: string;
  servicoId?: string;
}): Promise<{ parcelas: ParcelaComCliente[]; error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    let query = supabase
      .from("parcelas")
      .select("*, cliente:clientes(nome, telefone)")
      .eq("perfurador_id", perfuradorId)
      .order("vencimento", { ascending: true });

    if (filtros?.clienteId) query = query.eq("cliente_id", filtros.clienteId);
    if (filtros?.servicoId) query = query.eq("servico_id", filtros.servicoId);
    if (filtros?.status && filtros.status.length > 0) {
      query = query.in("status", filtros.status);
    }

    const { data, error } = await query;
    if (error) return { parcelas: [], error: error.message };

    const parcelas: ParcelaComCliente[] = (data ?? []).map((row) => {
      const cliente = firstOf(
        row.cliente as
          | { nome: string; telefone: string | null }
          | { nome: string; telefone: string | null }[]
          | null,
      );
      const { situacao, dias } = computeSituacao(
        row.status as string,
        row.vencimento as string,
      );
      return {
        ...(row as unknown as Parcela),
        cliente_nome: cliente?.nome ?? null,
        cliente_telefone: cliente?.telefone ?? null,
        dias_ate_vencimento: dias,
        situacao,
      };
    });

    return { parcelas, error: null };
  } catch (err) {
    return { parcelas: [], error: (err as Error).message };
  }
}

// Lista de clientes para o seletor de cobrança avulsa (com doc + telefone).
export async function getClientesParaCobranca(): Promise<{
  clientes: {
    id: string;
    nome: string;
    telefone: string | null;
    cpf_cnpj: string | null;
  }[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, telefone, cpf_cnpj")
      .eq("perfurador_id", perfuradorId)
      .order("nome");
    if (error) return { clientes: [], error: error.message };
    return {
      clientes: (data ?? []) as {
        id: string;
        nome: string;
        telefone: string | null;
        cpf_cnpj: string | null;
      }[],
      error: null,
    };
  } catch (err) {
    return { clientes: [], error: (err as Error).message };
  }
}

// ── 8. atualizarStatusAtrasadas (cron — system-wide, sem auth por tenant) ─────
// Chamada pela rota /api/cron/atualizar-parcelas (protegida por CRON_SECRET).
export async function atualizarStatusAtrasadas(): Promise<{
  atualizadas: number;
  error: string | null;
}> {
  try {
    const supabase = createServiceClient();
    const hoje = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("parcelas")
      .update({ status: "atrasado" })
      .eq("status", "pendente")
      .lt("vencimento", hoje)
      .select("id");

    if (error) return { atualizadas: 0, error: error.message };
    return { atualizadas: (data ?? []).length, error: null };
  } catch (err) {
    return { atualizadas: 0, error: (err as Error).message };
  }
}
