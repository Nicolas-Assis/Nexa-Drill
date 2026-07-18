"use server";

import { getAuthenticatedPerfurador } from "@/lib/get-perfurador";

export type OrcamentoRecente = {
  id: string;
  status: string;
  valor_final: number | null;
  created_at: string;
  cliente: { nome: string } | null;
};

export type ChartDataPoint = {
  mes: string;
  receita: number;
  despesa: number;
};

export type DashboardData = {
  nomePerfurador: string;
  totalClientes: number;
  totalClientesMesAnterior: number;
  orcamentosAtivos: number;
  orcamentosAtivosMesAnterior: number;
  servicosMes: number;
  servicosMesAnterior: number;
  faturamentoMes: number;
  faturamentoMesAnterior: number;
  orcamentosRecentes: OrcamentoRecente[];
  chartData: ChartDataPoint[];
  orcamentosAguardandoAprovacao: number;
  servicosEmAndamento: number;
  margemMesValor: number;
  margemMesPercentual: number | null;
  margemMesValorAnterior: number;
  margemMesPercentualAnterior: number | null;
  pocosNoPrejuizo: {
    servico_id: string;
    margem: number;
    margem_percentual: number | null;
    custo: number;
    receita: number;
  }[];
  // Fase 8 — cobrança
  aReceberTotal: number;
  atrasadoValor: number;
  atrasadoQtd: number;
  dso: number | null;
  recebimentos30: { label: string; valor: number }[];
  error: string | null;
};

const MONTHS_PTBR = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const empty: Omit<DashboardData, "error"> = {
  nomePerfurador: "",
  totalClientes: 0,
  totalClientesMesAnterior: 0,
  orcamentosAtivos: 0,
  orcamentosAtivosMesAnterior: 0,
  servicosMes: 0,
  servicosMesAnterior: 0,
  faturamentoMes: 0,
  faturamentoMesAnterior: 0,
  orcamentosRecentes: [],
  chartData: [],
  orcamentosAguardandoAprovacao: 0,
  servicosEmAndamento: 0,
  margemMesValor: 0,
  margemMesPercentual: null,
  margemMesValorAnterior: 0,
  margemMesPercentualAnterior: null,
  pocosNoPrejuizo: [],
  aReceberTotal: 0,
  atrasadoValor: 0,
  atrasadoQtd: 0,
  dso: null,
  recebimentos30: [],
};

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const { supabase, perfurador } = await getAuthenticatedPerfurador();

    const perfuradorId = perfurador.id;
    const nomePerfurador = perfurador.nome ?? "";

    const now = new Date();
    const thisMonthStartISO = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const nextMonthStartISO = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);
    const lastMonthStartISO = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .slice(0, 10);
    const sixMonthsAgoISO = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      .toISOString()
      .slice(0, 10);
    const twoMonthsAgoStartISO = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    )
      .toISOString()
      .slice(0, 10);

    const activeStatuses = ["enviado", "aprovado", "em_execucao"];

    const [
      totalClientesRes,
      clientesMesAnteriorRes,
      orcamentosAtivosRes,
      orcamentosAtivosMesAnteriorRes,
      servicosMesRes,
      servicosMesAnteriorRes,
      faturamentoMesRes,
      faturamentoMesAnteriorRes,
      orcamentosRecentesRes,
      chartFinanceiroRes,
      orcamentosAguardandoRes,
      servicosEmAndamentoRes,
      margemRowsRes,
      parcelasRes,
    ] = await Promise.all([
      // Q1 — total clientes
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("perfurador_id", perfuradorId),

      // Q2 — clientes antes do mês atual (base de comparação)
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("perfurador_id", perfuradorId)
        .lt("created_at", thisMonthStartISO),

      // Q3 — orçamentos ativos agora
      supabase
        .from("orcamentos")
        .select("id", { count: "exact", head: true })
        .eq("perfurador_id", perfuradorId)
        .in("status", activeStatuses),

      // Q4 — orçamentos ativos criados no mês passado (comparação)
      supabase
        .from("orcamentos")
        .select("id", { count: "exact", head: true })
        .eq("perfurador_id", perfuradorId)
        .in("status", activeStatuses)
        .gte("created_at", lastMonthStartISO)
        .lt("created_at", thisMonthStartISO),

      // Q5 — serviços concluídos este mês
      supabase
        .from("servicos")
        .select("id", { count: "exact", head: true })
        .eq("perfurador_id", perfuradorId)
        .gte("data_conclusao", thisMonthStartISO),

      // Q6 — serviços concluídos no mês passado
      supabase
        .from("servicos")
        .select("id", { count: "exact", head: true })
        .eq("perfurador_id", perfuradorId)
        .gte("data_conclusao", lastMonthStartISO)
        .lt("data_conclusao", thisMonthStartISO),

      // Q7 — receita este mês
      supabase
        .from("financeiro")
        .select("valor")
        .eq("perfurador_id", perfuradorId)
        .eq("tipo", "receita")
        .gte("data", thisMonthStartISO)
        .lt("data", nextMonthStartISO),

      // Q8 — receita mês passado
      supabase
        .from("financeiro")
        .select("valor")
        .eq("perfurador_id", perfuradorId)
        .eq("tipo", "receita")
        .gte("data", lastMonthStartISO)
        .lt("data", thisMonthStartISO),

      // Q9 — 5 orçamentos mais recentes com nome do cliente
      supabase
        .from("orcamentos")
        .select("id, status, valor_final, created_at, cliente:clientes(nome)")
        .eq("perfurador_id", perfuradorId)
        .order("created_at", { ascending: false })
        .limit(5),

      // Q10 — lançamentos financeiros dos últimos 6 meses (para o gráfico)
      supabase
        .from("financeiro")
        .select("tipo, valor, data")
        .eq("perfurador_id", perfuradorId)
        .gte("data", sixMonthsAgoISO)
        .order("data", { ascending: true }),

      // Q11 — orçamentos aguardando aprovação
      supabase
        .from("orcamentos")
        .select("id", { count: "exact", head: true })
        .eq("perfurador_id", perfuradorId)
        .eq("status", "enviado"),

      // Q12 — serviços em andamento
      supabase
        .from("servicos")
        .select("id", { count: "exact", head: true })
        .eq("perfurador_id", perfuradorId)
        .is("data_conclusao", null),

      // Q13 — margem PREVISTA dos serviços concluídos (visão da tese: lucro
      // esperado por poço, independente de a parcela já ter sido paga)
      supabase
        .from("vw_margem_servico")
        .select("servico_id, margem_prevista, receita_prevista, custo")
        .eq("perfurador_id", perfuradorId)
        .in("status", ["concluido"]),

      // Q14 — parcelas (contas a receber) para os KPIs de cobrança
      supabase
        .from("parcelas")
        .select("valor, status, vencimento, data_pagamento, created_at")
        .eq("perfurador_id", perfuradorId),
    ]);

    const { data: servicosConclusaoRows } = await supabase
      .from("servicos")
      .select("id, data_conclusao")
      .eq("perfurador_id", perfuradorId)
      .eq("status", "concluido")
      .gte("data_conclusao", twoMonthsAgoStartISO)
      .lt("data_conclusao", nextMonthStartISO);

    // Somatórios de receita
    const faturamentoMes = (faturamentoMesRes.data ?? []).reduce(
      (s, r) => s + (r.valor as number),
      0,
    );
    const faturamentoMesAnterior = (
      faturamentoMesAnteriorRes.data ?? []
    ).reduce((s, r) => s + (r.valor as number), 0);

    // Dados do gráfico — agrupa por mês
    const monthMap = new Map<string, { receita: number; despesa: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthMap.set(d.toISOString().slice(0, 7), { receita: 0, despesa: 0 });
    }
    for (const row of chartFinanceiroRes.data ?? []) {
      const key = (row.data as string).slice(0, 7);
      const bucket = monthMap.get(key);
      if (bucket) {
        if (row.tipo === "receita") bucket.receita += row.valor as number;
        else bucket.despesa += row.valor as number;
      }
    }
    const chartData: ChartDataPoint[] = Array.from(monthMap.entries()).map(
      ([key, v]) => ({
        mes: MONTHS_PTBR[parseInt(key.slice(5, 7), 10) - 1],
        ...v,
      }),
    );

    const margemMap = new Map<string, { margem: number; receita: number }>();
    for (const row of margemRowsRes.data ?? []) {
      margemMap.set(row.servico_id as string, {
        margem: (row.margem_prevista as number) ?? 0,
        receita: (row.receita_prevista as number) ?? 0,
      });
    }

    const thisMonthServicoIds = new Set<string>();
    const lastMonthServicoIds = new Set<string>();

    for (const row of servicosConclusaoRows ?? []) {
      const dataConclusao = row.data_conclusao as string | null;
      if (!dataConclusao) continue;

      if (
        dataConclusao >= thisMonthStartISO &&
        dataConclusao < nextMonthStartISO
      ) {
        thisMonthServicoIds.add(row.id as string);
      } else if (
        dataConclusao >= lastMonthStartISO &&
        dataConclusao < thisMonthStartISO
      ) {
        lastMonthServicoIds.add(row.id as string);
      }
    }

    const calcMargemBucket = (ids: Set<string>) => {
      let margemTotal = 0;
      let percentualTotal = 0;
      let percentualCount = 0;

      for (const id of Array.from(ids)) {
        const row = margemMap.get(id);
        if (!row) continue;
        margemTotal += row.margem;
        if (row.receita > 0) {
          percentualTotal += (row.margem / row.receita) * 100;
          percentualCount += 1;
        }
      }

      return {
        margemValor: margemTotal,
        margemPercentual:
          percentualCount > 0
            ? Number((percentualTotal / percentualCount).toFixed(2))
            : null,
      };
    };

    const thisMonthMargem = calcMargemBucket(thisMonthServicoIds);
    const lastMonthMargem = calcMargemBucket(lastMonthServicoIds);

    const pocosNoPrejuizo = (margemRowsRes.data ?? [])
      .filter((row) => (row.margem_prevista as number) < 0)
      .sort(
        (a, b) =>
          (a.margem_prevista as number) - (b.margem_prevista as number),
      )
      .slice(0, 5)
      .map((row) => {
        const mp = (row.margem_prevista as number) ?? 0;
        const rp = (row.receita_prevista as number) ?? 0;
        return {
          servico_id: row.servico_id as string,
          margem: mp,
          margem_percentual: rp > 0 ? Number(((mp / rp) * 100).toFixed(2)) : null,
          custo: (row.custo as number) ?? 0,
          receita: rp,
        };
      });

    // ── Fase 8: KPIs de cobrança (parcelas) ─────────────────────────────────
    const hojeStr = now.toISOString().slice(0, 10);
    const em30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)
      .toISOString()
      .slice(0, 10);

    let aReceberTotal = 0;
    let atrasadoValor = 0;
    let atrasadoQtd = 0;
    const dsoDias: number[] = [];
    const semanas = [0, 0, 0, 0]; // 4 janelas de ~7 dias nos próximos 30 dias

    for (const p of parcelasRes.data ?? []) {
      const status = p.status as string;
      const valor = (p.valor as number) ?? 0;
      const vencimento = p.vencimento as string;

      if (status === "pendente" || status === "atrasado") {
        aReceberTotal += valor;
        if (vencimento < hojeStr) {
          atrasadoValor += valor;
          atrasadoQtd += 1;
        } else if (vencimento <= em30) {
          const diffDias = Math.floor(
            (new Date(`${vencimento}T00:00:00`).getTime() -
              new Date(`${hojeStr}T00:00:00`).getTime()) /
              86_400_000,
          );
          const idx = Math.min(3, Math.floor(diffDias / 7));
          semanas[idx] += valor;
        }
      }

      if (status === "pago" && p.data_pagamento && p.created_at) {
        const pago = new Date(p.data_pagamento as string);
        const noventa = new Date(now.getTime() - 90 * 86_400_000);
        if (pago >= noventa) {
          const criado = new Date(p.created_at as string);
          const dias = Math.round(
            (pago.getTime() - criado.getTime()) / 86_400_000,
          );
          // ignora parcelas retro-migradas (created_at > data_pagamento)
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

    const recebimentos30 = semanas.map((valor, i) => ({
      label: `Sem ${i + 1}`,
      valor,
    }));

    return {
      nomePerfurador,
      totalClientes: totalClientesRes.count ?? 0,
      totalClientesMesAnterior: clientesMesAnteriorRes.count ?? 0,
      orcamentosAtivos: orcamentosAtivosRes.count ?? 0,
      orcamentosAtivosMesAnterior: orcamentosAtivosMesAnteriorRes.count ?? 0,
      servicosMes: servicosMesRes.count ?? 0,
      servicosMesAnterior: servicosMesAnteriorRes.count ?? 0,
      faturamentoMes,
      faturamentoMesAnterior,
      orcamentosRecentes: (orcamentosRecentesRes.data ?? []).map((row) => ({
        id: row.id as string,
        status: row.status as string,
        valor_final: row.valor_final as number | null,
        created_at: row.created_at as string,
        cliente:
          Array.isArray(row.cliente) && row.cliente.length > 0
            ? { nome: row.cliente[0].nome as string }
            : null,
      })),
      chartData,
      orcamentosAguardandoAprovacao: orcamentosAguardandoRes.count ?? 0,
      servicosEmAndamento: servicosEmAndamentoRes.count ?? 0,
      margemMesValor: thisMonthMargem.margemValor,
      margemMesPercentual: thisMonthMargem.margemPercentual,
      margemMesValorAnterior: lastMonthMargem.margemValor,
      margemMesPercentualAnterior: lastMonthMargem.margemPercentual,
      pocosNoPrejuizo,
      aReceberTotal,
      atrasadoValor,
      atrasadoQtd,
      dso,
      recebimentos30,
      error: null,
    };
  } catch (err) {
    return { ...empty, error: (err as Error).message };
  }
}

// ── Primeiros passos (checklist de onboarding) ───────────────────────────────
export type PrimeirosPassos = {
  perfilCompleto: boolean;
  temCliente: boolean;
  temOrcamento: boolean;
  temServico: boolean;
  temCobranca: boolean;
};

export async function getPrimeirosPassos(): Promise<{
  passos: PrimeirosPassos;
  error: string | null;
}> {
  const vazio: PrimeirosPassos = {
    perfilCompleto: false,
    temCliente: false,
    temOrcamento: false,
    temServico: false,
    temCobranca: false,
  };
  try {
    const { supabase, perfurador, perfuradorId } =
      await getAuthenticatedPerfurador();

    const countAllTime = async (table: string) => {
      const { count } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("perfurador_id", perfuradorId);
      return (count ?? 0) > 0;
    };

    const [temCliente, temOrcamento, temServico, temCobranca] =
      await Promise.all([
        countAllTime("clientes"),
        countAllTime("orcamentos"),
        countAllTime("servicos"),
        countAllTime("parcelas"),
      ]);

    const p = perfurador as unknown as {
      bio: string | null;
      logo_url: string | null;
      slug: string | null;
      tipos_servico: string[] | null;
    };
    const perfilCompleto = Boolean(
      p.bio && p.logo_url && p.slug && (p.tipos_servico?.length ?? 0) > 0,
    );

    return {
      passos: { perfilCompleto, temCliente, temOrcamento, temServico, temCobranca },
      error: null,
    };
  } catch (err) {
    return { passos: vazio, error: (err as Error).message };
  }
}
