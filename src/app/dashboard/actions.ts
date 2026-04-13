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
    ]);

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
      error: null,
    };
  } catch (err) {
    return { ...empty, error: (err as Error).message };
  }
}
