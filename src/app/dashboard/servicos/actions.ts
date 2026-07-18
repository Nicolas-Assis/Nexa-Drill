"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";
import { logActivity } from "@/lib/activity";
import { firstOf } from "@/lib/utils";
import type { Servico, Cliente, Orcamento } from "@/types";

export async function getServicos(): Promise<{
  servicos: (Servico & {
    cliente?: Cliente;
    orcamento?: Pick<Orcamento, "id" | "tipo_servico" | "valor_final">;
  })[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("servicos")
      .select(
        "*, cliente:clientes(id, nome, telefone, cidade, estado), orcamento:orcamentos(id, tipo_servico, valor_final)",
      )
      .eq("perfurador_id", perfuradorId)
      .order("created_at", { ascending: false });

    if (error) return { servicos: [], error: error.message };
    return {
      servicos: (data ?? []) as (Servico & {
        cliente?: Cliente;
        orcamento?: Pick<Orcamento, "id" | "tipo_servico" | "valor_final">;
      })[],
      error: null,
    };
  } catch (err) {
    return { servicos: [], error: (err as Error).message };
  }
}

export async function getServicoById(id: string): Promise<{
  servico: (Servico & { cliente?: Cliente; orcamento?: Orcamento }) | null;
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("servicos")
      .select("*, cliente:clientes(*), orcamento:orcamentos(*)")
      .eq("id", id)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (error) return { servico: null, error: error.message };
    return {
      servico: data as Servico & { cliente?: Cliente; orcamento?: Orcamento },
      error: null,
    };
  } catch (err) {
    return { servico: null, error: (err as Error).message };
  }
}

export type ServicoCreateData = {
  cliente_id: string | null;
  orcamento_id: string | null;
  valor: number | null;
  status: "andamento" | "concluido" | "cancelado";
  endereco: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  profundidade_real_metros: number | null;
  diametro_polegadas: number | null;
  tipo_solo_encontrado: string | null;
  vazao_litros_hora: number | null;
  nivel_estatico_metros: number | null;
  nivel_dinamico_metros: number | null;
  notas: string | null;
};

export async function createServico(data: ServicoCreateData): Promise<{
  servico: Servico | null;
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId, userId } = await getAuthenticatedPerfurador();

    const { data: servico, error } = await supabase
      .from("servicos")
      .insert({
        perfurador_id: perfuradorId,
        ...data,
      })
      .select()
      .single();

    if (error) return { servico: null, error: error.message };

    await logActivity({
      action: "servico.create",
      entityType: "servico",
      entityId: servico.id,
      metadata: { status: data.status, valor: data.valor },
      userId,
      perfuradorId,
    });

    return { servico: servico as Servico, error: null };
  } catch (err) {
    return { servico: null, error: (err as Error).message };
  }
}

export type ServicoUpdateData = Partial<ServicoCreateData>;

export async function updateServico(
  id: string,
  data: ServicoUpdateData,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfuradorId, userId } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("servicos")
      .update(data)
      .eq("id", id)
      .eq("perfurador_id", perfuradorId);

    if (error) return { success: false, error: error.message };

    await logActivity({
      action: "servico.update",
      entityType: "servico",
      entityId: id,
      userId,
      perfuradorId,
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Conclusão de serviço com parcelas (Fase 2) ───────────────────────────────
// Ao concluir, o serviço vira uma ou mais parcelas. Parcela "paga" (à vista ou
// sinal) gera receita no financeiro com servico_id + parcela_id. Parcela pendente
// só entra em `parcelas` — a receita só nasce quando a baixa/webhook confirmar.
const parcelaConclusaoSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição da parcela é obrigatória"),
  valor: z.number().positive("Valor da parcela deve ser maior que zero"),
  vencimento: z.string().min(1, "Vencimento é obrigatório"),
  pago: z.boolean(),
  metodo_pagamento: z
    .enum(["pix", "boleto", "cartao", "dinheiro", "transferencia", "outro"])
    .nullable()
    .optional(),
});

const concluirServicoSchema = z.object({
  dataConclusao: z.string().min(1, "Data de conclusão é obrigatória"),
  parcelas: z
    .array(parcelaConclusaoSchema)
    .min(1, "Informe ao menos uma parcela"),
});

export type ParcelaConclusaoInput = z.infer<typeof parcelaConclusaoSchema>;

export async function concluirServico(
  servicoId: string,
  input: { dataConclusao: string; parcelas: ParcelaConclusaoInput[] },
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parsed = concluirServicoSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase, perfuradorId, userId } = await getAuthenticatedPerfurador();

    // Tudo numa transação (fn_concluir_servico): valida posse, aborta se já
    // concluído (anti-retry), cria parcelas + receitas e conclui o serviço.
    const { error } = await supabase.rpc("fn_concluir_servico", {
      p_servico_id: servicoId,
      p_perfurador_id: perfuradorId,
      p_data: parsed.data.dataConclusao,
      p_parcelas: parsed.data.parcelas.map((p) => ({
        descricao: p.descricao.trim(),
        valor: p.valor,
        vencimento: p.vencimento,
        pago: p.pago,
        metodo_pagamento: p.pago ? (p.metodo_pagamento ?? "outro") : null,
      })),
    });

    if (error) {
      const msg = error.message.includes("SERVICO_JA_TEM_PARCELAS")
        ? "Este serviço já foi concluído (já possui parcelas). Confira em Contas a Receber."
        : error.message.includes("SERVICO_NAO_ENCONTRADO")
          ? "Serviço não encontrado"
          : error.message;
      return { success: false, error: msg };
    }

    await logActivity({
      action: "servico.update",
      entityType: "servico",
      entityId: servicoId,
      metadata: { concluido: true, parcelas: parsed.data.parcelas.length },
      userId,
      perfuradorId,
    });

    revalidatePath(`/dashboard/servicos/${servicoId}`);
    revalidatePath("/dashboard/receber");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// Cancelar serviço
export async function cancelarServico(
  id: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { supabase, perfuradorId, userId } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("servicos")
      .update({ status: "cancelado" })
      .eq("id", id)
      .eq("perfurador_id", perfuradorId);

    if (error) return { success: false, error: error.message };

    await logActivity({
      action: "servico.update",
      entityType: "servico",
      entityId: id,
      metadata: { status: "cancelado" },
      userId,
      perfuradorId,
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteServico(id: string): Promise<{
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId, userId } = await getAuthenticatedPerfurador();

    const { error } = await supabase
      .from("servicos")
      .delete()
      .eq("id", id)
      .eq("perfurador_id", perfuradorId);

    if (error) return { error: error.message };

    await logActivity({
      action: "servico.delete",
      entityType: "servico",
      entityId: id,
      userId,
      perfuradorId,
    });

    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function getClientesForSelect(): Promise<{
  clientes: { id: string; nome: string }[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("perfurador_id", perfuradorId)
      .order("nome");

    if (error) return { clientes: [], error: error.message };
    return {
      clientes: (data ?? []) as { id: string; nome: string }[],
      error: null,
    };
  } catch (err) {
    return { clientes: [], error: (err as Error).message };
  }
}

export async function getOrcamentosForSelect(): Promise<{
  orcamentos: { id: string; label: string }[];
  error: string | null;
}> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    const { data, error } = await supabase
      .from("orcamentos")
      .select("id, tipo_servico, cliente:clientes(nome)")
      .eq("perfurador_id", perfuradorId)
      .in("status", ["aprovado", "em_execucao"])
      .order("created_at", { ascending: false });

    if (error) return { orcamentos: [], error: error.message };

    const orcamentos = (data ?? []).map((o) => {
      const cliente = firstOf(
        o.cliente as { nome: string } | { nome: string }[] | null,
      );
      const clienteNome = cliente?.nome ?? null;
      return {
        id: o.id as string,
        label: `${clienteNome ?? "Cliente"} — ${o.tipo_servico ?? "Serviço"} (#${(o.id as string).slice(0, 6)})`,
      };
    });

    return { orcamentos, error: null };
  } catch (err) {
    return { orcamentos: [], error: (err as Error).message };
  }
}

export async function uploadServicoFoto(
  servicoId: string,
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    // Verify ownership
    const { data: servico, error: checkError } = await supabase
      .from("servicos")
      .select("id")
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (checkError || !servico)
      return { url: null, error: "Serviço não encontrado" };

    const file = formData.get("file") as File;
    if (!file) return { url: null, error: "Nenhum arquivo enviado" };

    if (file.size > 5 * 1024 * 1024) {
      return { url: null, error: "A imagem deve ter no máximo 5MB" };
    }

    const ext = file.name.split(".").pop();
    const path = `${servicoId}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from("servicos")
      .upload(path, buffer, { contentType: file.type });

    if (error) return { url: null, error: error.message };

    const { data: publicData } = supabase.storage
      .from("servicos")
      .getPublicUrl(data.path);

    return { url: publicData.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: (err as Error).message };
  }
}

export async function addServicoFoto(
  servicoId: string,
  fotoUrl: string,
): Promise<{ error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    // Get current fotos
    const { data: servico, error: fetchError } = await supabase
      .from("servicos")
      .select("fotos")
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (fetchError) return { error: fetchError.message };

    const currentFotos = (servico?.fotos as string[]) ?? [];
    const newFotos = [...currentFotos, fotoUrl];

    const { error } = await supabase
      .from("servicos")
      .update({ fotos: newFotos })
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function removeServicoFoto(
  servicoId: string,
  fotoUrl: string,
): Promise<{ error: string | null }> {
  try {
    const { supabase, perfuradorId } = await getAuthenticatedPerfurador();

    // Get current fotos
    const { data: servico, error: fetchError } = await supabase
      .from("servicos")
      .select("fotos")
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId)
      .single();

    if (fetchError) return { error: fetchError.message };

    const currentFotos = (servico?.fotos as string[]) ?? [];
    const newFotos = currentFotos.filter((f) => f !== fotoUrl);

    const { error } = await supabase
      .from("servicos")
      .update({ fotos: newFotos })
      .eq("id", servicoId)
      .eq("perfurador_id", perfuradorId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
