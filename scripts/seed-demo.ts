import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");

  for (const line of content.split("\n")) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
    if (m) {
      return m[1].trim().replace(/^['\"]|['\"]$/g, "");
    }
  }

  throw new Error("DATABASE_URL não encontrada no ambiente/.env.local");
}

async function main() {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  const userEmail = "demo@aguaboa.com";
  const userId = "demo_perfurador_aguaboa";
  const slug = "perfuracoes-agua-boa-demo";

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO "user" (id, name, email, "emailVerified")
       VALUES ($1, $2, $3, true)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`,
      [userId, "Perfurações Água Boa", userEmail],
    );

    const perfuradorRes = await client.query(
      `INSERT INTO public.perfuradores
        (auth_id, nome, telefone, email, slug, nome_empresa, cidade, estado, bio)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (auth_id)
       DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email, slug = EXCLUDED.slug
       RETURNING id`,
      [
        userId,
        "Perfurações Água Boa",
        "(51) 99999-0000",
        userEmail,
        slug,
        "Perfurações Água Boa",
        "Pelotas",
        "RS",
        "Equipe demo para apresentação comercial",
      ],
    );

    const perfuradorId = perfuradorRes.rows[0].id as string;

    await client.query(
      `DELETE FROM public.financeiro WHERE perfurador_id = $1`,
      [perfuradorId],
    );
    await client.query(`DELETE FROM public.parcelas WHERE perfurador_id = $1`, [
      perfuradorId,
    ]);
    await client.query(`DELETE FROM public.servicos WHERE perfurador_id = $1`, [
      perfuradorId,
    ]);
    await client.query(
      `DELETE FROM public.orcamentos WHERE perfurador_id = $1`,
      [perfuradorId],
    );
    await client.query(`DELETE FROM public.clientes WHERE perfurador_id = $1`, [
      perfuradorId,
    ]);

    const clientes = [
      {
        nome: "Fazenda São José",
        telefone: "(51) 99911-1101",
        cidade: "Canguçu",
        estado: "RS",
      },
      {
        nome: "Sítio Recanto Verde",
        telefone: "(51) 99922-2202",
        cidade: "Morro Redondo",
        estado: "RS",
      },
      {
        nome: "Agropecuária Santa Clara",
        telefone: "(51) 99933-3303",
        cidade: "Pelotas",
        estado: "RS",
      },
      {
        nome: "Estância Horizonte",
        telefone: "(51) 99944-4404",
        cidade: "Capão do Leão",
        estado: "RS",
      },
      {
        nome: "Chácara Boa Esperança",
        telefone: "(51) 99955-5505",
        cidade: "Arroio do Padre",
        estado: "RS",
      },
    ];

    const clienteIds: string[] = [];
    for (const c of clientes) {
      const res = await client.query(
        `INSERT INTO public.clientes (perfurador_id, nome, telefone, cidade, estado)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [perfuradorId, c.nome, c.telefone, c.cidade, c.estado],
      );
      clienteIds.push(res.rows[0].id as string);
    }

    const createOrcamento = async (
      clienteId: string,
      status: string,
      tipoServico: string,
      tipoSolo: string,
      valorFinal: number,
    ) => {
      const res = await client.query(
        `INSERT INTO public.orcamentos
          (perfurador_id, cliente_id, status, tipo_servico, tipo_solo, itens, valor_total, desconto, valor_final, validade_dias)
         VALUES
          ($1, $2, $3, $4, $5, $6::jsonb, $7, 0, $8, 15)
         RETURNING id`,
        [
          perfuradorId,
          clienteId,
          status,
          tipoServico,
          tipoSolo,
          JSON.stringify([
            {
              descricao: "Perfuração de poço artesiano",
              qtd: 1,
              unidade: "serviço",
              valor_unit: valorFinal,
            },
          ]),
          valorFinal,
          valorFinal,
        ],
      );
      return res.rows[0].id as string;
    };

    const orcLucro = await createOrcamento(
      clienteIds[0],
      "concluido",
      "perfuracao",
      "areia",
      80000,
    );
    const orcPrejuizo = await createOrcamento(
      clienteIds[1],
      "concluido",
      "perfuracao",
      "rocha",
      90000,
    );
    const orcRegular = await createOrcamento(
      clienteIds[2],
      "concluido",
      "perfuracao",
      "argila",
      70000,
    );
    const orcAndamento = await createOrcamento(
      clienteIds[3],
      "em_execucao",
      "perfuracao",
      "misto",
      65000,
    );

    await createOrcamento(
      clienteIds[4],
      "rascunho",
      "perfuracao",
      "areia",
      75000,
    );
    await createOrcamento(
      clienteIds[4],
      "enviado",
      "perfuracao",
      "misto",
      82000,
    );

    const baseDate = new Date();
    const addDays = (n: number) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    type ParcelaSeed = {
      descricao: string;
      valor: number;
      diasVenc: number; // negativo = vencida
      pago: boolean;
      diasPago?: number; // dias atrás em que foi paga
    };

    const createServico = async (params: {
      clienteId: string;
      orcamentoId: string;
      status: "concluido" | "andamento";
      profundidade: number;
      solo: string;
      despesas: { categoria: string; descricao: string; valor: number }[];
      parcelas?: ParcelaSeed[];
      dataConclusao?: string;
    }) => {
      const parcelas = params.parcelas ?? [];
      const total = parcelas.reduce((s, p) => s + p.valor, 0);
      const recebido = parcelas
        .filter((p) => p.pago)
        .reduce((s, p) => s + p.valor, 0);

      const servicoRes = await client.query(
        `INSERT INTO public.servicos
          (perfurador_id, orcamento_id, cliente_id, status, valor, valor_recebido, profundidade_real_metros, tipo_solo_encontrado, data_inicio, data_conclusao, materiais, fotos)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE - INTERVAL '20 days', $9, '[]'::jsonb, '{}'::text[])
         RETURNING id`,
        [
          perfuradorId,
          params.orcamentoId,
          params.clienteId,
          params.status,
          total,
          recebido,
          params.profundidade,
          params.solo,
          params.dataConclusao ?? null,
        ],
      );

      const servicoId = servicoRes.rows[0].id as string;

      for (const d of params.despesas) {
        await client.query(
          `INSERT INTO public.financeiro (perfurador_id, servico_id, tipo, categoria, descricao, valor, data)
           VALUES ($1, $2, 'despesa', $3, $4, $5, CURRENT_DATE - INTERVAL '1 days')`,
          [perfuradorId, servicoId, d.categoria, d.descricao, d.valor],
        );
      }

      for (let i = 0; i < parcelas.length; i++) {
        const p = parcelas[i];
        const status = p.pago
          ? "pago"
          : p.diasVenc < 0
            ? "atrasado"
            : "pendente";
        const dataPagamento = p.pago ? addDays(-(p.diasPago ?? 2)) : null;

        const parcelaRes = await client.query(
          `INSERT INTO public.parcelas
            (perfurador_id, servico_id, cliente_id, descricao, valor, vencimento, status, metodo_pagamento, data_pagamento, valor_pago, numero_parcela, total_parcelas)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id`,
          [
            perfuradorId,
            servicoId,
            params.clienteId,
            p.descricao,
            p.valor,
            addDays(p.diasVenc),
            status,
            p.pago ? "pix" : null,
            dataPagamento,
            p.pago ? p.valor : null,
            i + 1,
            parcelas.length,
          ],
        );

        if (p.pago) {
          await client.query(
            `INSERT INTO public.financeiro (perfurador_id, servico_id, parcela_id, tipo, categoria, descricao, valor, data)
             VALUES ($1, $2, $3, 'receita', 'servico', $4, $5, $6)`,
            [
              perfuradorId,
              servicoId,
              parcelaRes.rows[0].id as string,
              p.descricao,
              p.valor,
              dataPagamento,
            ],
          );
        }
      }
    };

    const today = new Date().toISOString().slice(0, 10);

    // Lucrativo — 100% recebido (2 parcelas pagas)
    await createServico({
      clienteId: clienteIds[0],
      orcamentoId: orcLucro,
      status: "concluido",
      profundidade: 100,
      solo: "areia",
      dataConclusao: today,
      despesas: [
        { categoria: "combustivel", descricao: "Diesel", valor: 18000 },
        { categoria: "material", descricao: "Revestimento", valor: 14000 },
        { categoria: "equipamento", descricao: "Brocas", valor: 12000 },
        { categoria: "funcionario", descricao: "Diárias", valor: 8000 },
      ],
      parcelas: [
        { descricao: "1/2 - Sinal", valor: 40000, diasVenc: -30, pago: true, diasPago: 28 },
        { descricao: "2/2 - Final", valor: 40000, diasVenc: -5, pago: true, diasPago: 3 },
      ],
    });

    // Prejuízo — parcialmente recebido (1 paga, 2 atrasadas, 1 a vencer)
    await createServico({
      clienteId: clienteIds[1],
      orcamentoId: orcPrejuizo,
      status: "concluido",
      profundidade: 130,
      solo: "rocha",
      dataConclusao: today,
      despesas: [
        { categoria: "equipamento", descricao: "Broca extra", valor: 36000 },
        { categoria: "combustivel", descricao: "Diesel extra", valor: 26000 },
        {
          categoria: "funcionario",
          descricao: "Equipe adicional",
          valor: 22000,
        },
        { categoria: "material", descricao: "Revestimento", valor: 14000 },
      ],
      parcelas: [
        { descricao: "1/4 - Sinal", valor: 22500, diasVenc: -40, pago: true, diasPago: 38 },
        { descricao: "2/4 - Mobilização", valor: 22500, diasVenc: -15, pago: false },
        { descricao: "3/4 - Perfuração", valor: 22500, diasVenc: -3, pago: false },
        { descricao: "4/4 - Final", valor: 22500, diasVenc: 25, pago: false },
      ],
    });

    // Regular — todo pendente (2 parcelas a vencer)
    await createServico({
      clienteId: clienteIds[2],
      orcamentoId: orcRegular,
      status: "concluido",
      profundidade: 80,
      solo: "argila",
      dataConclusao: today,
      despesas: [
        { categoria: "combustivel", descricao: "Diesel", valor: 14000 },
        { categoria: "material", descricao: "Materiais", valor: 16000 },
        { categoria: "funcionario", descricao: "Equipe", valor: 29500 },
      ],
      parcelas: [
        { descricao: "1/2 - Entrada", valor: 35000, diasVenc: 12, pago: false },
        { descricao: "2/2 - Final", valor: 35000, diasVenc: 42, pago: false },
      ],
    });

    // Em andamento — só despesas, sem parcelas ainda
    await createServico({
      clienteId: clienteIds[3],
      orcamentoId: orcAndamento,
      status: "andamento",
      profundidade: 60,
      solo: "misto",
      despesas: [
        { categoria: "combustivel", descricao: "Diesel inicial", valor: 6000 },
        { categoria: "material", descricao: "Tubulação", valor: 5000 },
      ],
    });

    // Cobranças avulsas atrasadas (sem serviço) — alimentam o alerta do dashboard
    const avulsasAtrasadas = [
      { clienteId: clienteIds[4], descricao: "Visita técnica", valor: 1200, diasVenc: -8 },
      { clienteId: clienteIds[3], descricao: "Troca de bomba", valor: 3500, diasVenc: -20 },
      { clienteId: clienteIds[2], descricao: "Material adicional", valor: 900, diasVenc: -2 },
    ];
    for (const a of avulsasAtrasadas) {
      await client.query(
        `INSERT INTO public.parcelas
          (perfurador_id, servico_id, cliente_id, descricao, valor, vencimento, status)
         VALUES ($1, NULL, $2, $3, $4, $5, 'atrasado')`,
        [perfuradorId, a.clienteId, a.descricao, a.valor, addDays(a.diasVenc)],
      );
    }

    await client.query("COMMIT");

    console.log("✅ Seed demo concluído");
    console.log(`- Email demo: ${userEmail}`);
    console.log(`- user.id: ${userId}`);
    console.log(`- slug público: ${slug}`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Erro no seed demo:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
