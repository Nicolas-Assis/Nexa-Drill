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

    const createServico = async (params: {
      clienteId: string;
      orcamentoId: string;
      status: "concluido" | "andamento";
      profundidade: number;
      solo: string;
      receita: number;
      despesas: { categoria: string; descricao: string; valor: number }[];
      dataConclusao?: string;
    }) => {
      const servicoRes = await client.query(
        `INSERT INTO public.servicos
          (perfurador_id, orcamento_id, cliente_id, status, valor, profundidade_real_metros, tipo_solo_encontrado, data_inicio, data_conclusao, materiais, fotos)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE - INTERVAL '20 days', $8, '[]'::jsonb, '{}'::text[])
         RETURNING id`,
        [
          perfuradorId,
          params.orcamentoId,
          params.clienteId,
          params.status,
          params.receita,
          params.profundidade,
          params.solo,
          params.dataConclusao ?? null,
        ],
      );

      const servicoId = servicoRes.rows[0].id as string;

      await client.query(
        `INSERT INTO public.financeiro (perfurador_id, servico_id, tipo, categoria, descricao, valor, data)
         VALUES ($1, $2, 'receita', 'servico', $3, $4, CURRENT_DATE - INTERVAL '2 days')`,
        [perfuradorId, servicoId, `Receita ${params.solo}`, params.receita],
      );

      for (const d of params.despesas) {
        await client.query(
          `INSERT INTO public.financeiro (perfurador_id, servico_id, tipo, categoria, descricao, valor, data)
           VALUES ($1, $2, 'despesa', $3, $4, $5, CURRENT_DATE - INTERVAL '1 days')`,
          [perfuradorId, servicoId, d.categoria, d.descricao, d.valor],
        );
      }
    };

    const today = new Date().toISOString().slice(0, 10);

    await createServico({
      clienteId: clienteIds[0],
      orcamentoId: orcLucro,
      status: "concluido",
      profundidade: 100,
      solo: "areia",
      receita: 80000,
      dataConclusao: today,
      despesas: [
        { categoria: "combustivel", descricao: "Diesel", valor: 18000 },
        { categoria: "material", descricao: "Revestimento", valor: 14000 },
        { categoria: "equipamento", descricao: "Brocas", valor: 12000 },
        { categoria: "funcionario", descricao: "Diárias", valor: 8000 },
      ],
    });

    await createServico({
      clienteId: clienteIds[1],
      orcamentoId: orcPrejuizo,
      status: "concluido",
      profundidade: 130,
      solo: "rocha",
      receita: 90000,
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
    });

    await createServico({
      clienteId: clienteIds[2],
      orcamentoId: orcRegular,
      status: "concluido",
      profundidade: 80,
      solo: "argila",
      receita: 70000,
      dataConclusao: today,
      despesas: [
        { categoria: "combustivel", descricao: "Diesel", valor: 14000 },
        { categoria: "material", descricao: "Materiais", valor: 16000 },
        { categoria: "funcionario", descricao: "Equipe", valor: 29500 },
      ],
    });

    await createServico({
      clienteId: clienteIds[3],
      orcamentoId: orcAndamento,
      status: "andamento",
      profundidade: 60,
      solo: "misto",
      receita: 0,
      despesas: [
        { categoria: "combustivel", descricao: "Diesel inicial", valor: 6000 },
        { categoria: "material", descricao: "Tubulação", valor: 5000 },
      ],
    });

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
