/**
 * Smoke test de isolamento multi-tenant (Fase 0).
 *
 * Objetivo: garantir que o padrão de acesso a dados das server actions
 * — filtrar SEMPRE por `perfurador_id` — de fato isola os perfuradores.
 * O perfurador B nunca deve conseguir ler serviço / orçamento / financeiro
 * (nem a view de margem) do perfurador A.
 *
 * Como funciona:
 *   1. Abre UMA transação e faz ROLLBACK no final — não persiste nada.
 *      Seguro de rodar inclusive contra o banco remoto.
 *   2. Usa dois perfuradores reais já existentes (A e B).
 *   3. Cria dados temporários para A e tenta acessá-los como B.
 *   4. Reprova (exit 1) se qualquer acesso cruzado vazar dado.
 *
 * Uso:
 *   npm run test:isolation
 *   (ou: npx tsx scripts/test-isolation.ts)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

// ── Carrega DATABASE_URL do .env.local (sem depender de dotenv) ──────────────
function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // ignora — cai no erro abaixo
  }
  throw new Error("DATABASE_URL não encontrada (env ou .env.local)");
}

// ── Helpers de asserção ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(label: string, ok: boolean) {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

async function tableExists(client: Client, name: string): Promise<boolean> {
  const { rows } = await client.query("SELECT to_regclass($1) AS reg", [name]);
  return rows[0]?.reg != null;
}

async function main() {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  try {
    await client.query("BEGIN");

    // 1) Precisa de 2 perfuradores para simular tenants distintos
    const { rows: existingPerfs } = await client.query(
      "SELECT id FROM public.perfuradores ORDER BY created_at ASC LIMIT 2",
    );

    const perfs = [...existingPerfs] as { id: string }[];

    if (perfs.length < 2) {
      const missing = 2 - perfs.length;

      for (let i = 0; i < missing; i++) {
        const suffix = `${Date.now()}_${i}`;
        const userId = `isolation_user_${suffix}`;
        const email = `isolation_${suffix}@example.com`;
        const slug = `isolation-${suffix}`;

        await client.query(
          `INSERT INTO "user" (id, name, email, "emailVerified")
           VALUES ($1, $2, $3, true)
           ON CONFLICT (id) DO NOTHING`,
          [userId, `Isolation ${i + 1}`, email],
        );

        const { rows: insertedPerfs } = await client.query(
          `INSERT INTO public.perfuradores
            (auth_id, nome, telefone, email, slug, nome_empresa)
           VALUES
            ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (auth_id)
           DO UPDATE SET nome = EXCLUDED.nome
           RETURNING id`,
          [
            userId,
            `Isolation ${i + 1}`,
            `(00) 00000-000${i}`,
            email,
            slug,
            `Isolation ${i + 1}`,
          ],
        );

        perfs.push({ id: insertedPerfs[0].id as string });
      }

      console.log(
        "ℹ️  Menos de 2 perfuradores no banco: criados tenants temporários para o teste.",
      );
    }

    const A = perfs[0].id as string;
    const B = perfs[1].id as string;
    console.log(`\n🔒 Teste de isolamento  (A=${A}  B=${B})\n`);

    // 2) Cria dados temporários pertencentes a A (rollback no final)
    const { rows: sRows } = await client.query(
      `INSERT INTO public.servicos (perfurador_id, status, profundidade_real_metros, valor)
       VALUES ($1, 'concluido', 100, 50000) RETURNING id`,
      [A],
    );
    const servicoA = sRows[0].id as string;

    const { rows: oRows } = await client.query(
      `INSERT INTO public.orcamentos (perfurador_id, status) VALUES ($1, 'rascunho') RETURNING id`,
      [A],
    );
    const orcamentoA = oRows[0].id as string;

    const { rows: fRows } = await client.query(
      `INSERT INTO public.financeiro (perfurador_id, servico_id, tipo, categoria, valor, data)
       VALUES ($1, $2, 'receita', 'servico', 50000, CURRENT_DATE) RETURNING id`,
      [A, servicoA],
    );
    const financeiroA = fRows[0].id as string;
    // uma despesa vinculada, para a view de margem produzir linha
    await client.query(
      `INSERT INTO public.financeiro (perfurador_id, servico_id, tipo, categoria, valor, data)
       VALUES ($1, $2, 'despesa', 'material', 20000, CURRENT_DATE)`,
      [A, servicoA],
    );

    // uma parcela pertencente a A (Fase 2), se a tabela já existir
    let parcelaA: string | null = null;
    if (await tableExists(client, "public.parcelas")) {
      const { rows: pRows } = await client.query(
        `INSERT INTO public.parcelas
           (perfurador_id, servico_id, descricao, valor, vencimento, status)
         VALUES ($1, $2, 'Sinal', 30000, CURRENT_DATE + INTERVAL '30 days', 'pendente')
         RETURNING id`,
        [A, servicoA],
      );
      parcelaA = pRows[0].id as string;
    }

    // ── Caso: servicos ──────────────────────────────────────────────────────
    const listaServicosB = await client.query(
      "SELECT id FROM public.servicos WHERE perfurador_id = $1",
      [B],
    );
    check(
      "servicos: listagem de B não contém serviço de A",
      !listaServicosB.rows.some((r) => r.id === servicoA),
    );
    const ownServicoB = await client.query(
      "SELECT id FROM public.servicos WHERE id = $1 AND perfurador_id = $2",
      [servicoA, B],
    );
    check(
      "servicos: buscar serviço de A com perfurador_id de B retorna vazio",
      ownServicoB.rowCount === 0,
    );
    const ownServicoA = await client.query(
      "SELECT id FROM public.servicos WHERE id = $1 AND perfurador_id = $2",
      [servicoA, A],
    );
    check(
      "servicos: controle positivo — A acessa o próprio serviço",
      ownServicoA.rowCount === 1,
    );

    // ── Caso: orcamentos ─────────────────────────────────────────────────────
    const listaOrcB = await client.query(
      "SELECT id FROM public.orcamentos WHERE perfurador_id = $1",
      [B],
    );
    check(
      "orcamentos: listagem de B não contém orçamento de A",
      !listaOrcB.rows.some((r) => r.id === orcamentoA),
    );
    const ownOrcB = await client.query(
      "SELECT id FROM public.orcamentos WHERE id = $1 AND perfurador_id = $2",
      [orcamentoA, B],
    );
    check(
      "orcamentos: buscar orçamento de A com perfurador_id de B retorna vazio",
      ownOrcB.rowCount === 0,
    );

    // ── Caso: financeiro ─────────────────────────────────────────────────────
    const listaFinB = await client.query(
      "SELECT id FROM public.financeiro WHERE perfurador_id = $1",
      [B],
    );
    check(
      "financeiro: listagem de B não contém lançamento de A",
      !listaFinB.rows.some((r) => r.id === financeiroA),
    );
    const ownFinB = await client.query(
      "SELECT id FROM public.financeiro WHERE id = $1 AND perfurador_id = $2",
      [financeiroA, B],
    );
    check(
      "financeiro: buscar lançamento de A com perfurador_id de B retorna vazio",
      ownFinB.rowCount === 0,
    );

    // ── Caso: parcelas / contas a receber (Fase 2), se já existir ─────────────
    if (parcelaA) {
      const listaParcelasB = await client.query(
        "SELECT id FROM public.parcelas WHERE perfurador_id = $1",
        [B],
      );
      check(
        "parcelas: listagem de B não contém parcela de A",
        !listaParcelasB.rows.some((r) => r.id === parcelaA),
      );
      const ownParcelaB = await client.query(
        "SELECT id FROM public.parcelas WHERE id = $1 AND perfurador_id = $2",
        [parcelaA, B],
      );
      check(
        "parcelas: buscar parcela de A com perfurador_id de B retorna vazio",
        ownParcelaB.rowCount === 0,
      );
      const ownParcelaA = await client.query(
        "SELECT id FROM public.parcelas WHERE id = $1 AND perfurador_id = $2",
        [parcelaA, A],
      );
      check(
        "parcelas: controle positivo — A acessa a própria parcela",
        ownParcelaA.rowCount === 1,
      );

      if (await tableExists(client, "public.vw_parcelas_status")) {
        const viewParcelaB = await client.query(
          "SELECT id FROM public.vw_parcelas_status WHERE id = $1 AND perfurador_id = $2",
          [parcelaA, B],
        );
        check(
          "vw_parcelas_status: parcela de A não vaza para B",
          viewParcelaB.rowCount === 0,
        );
      }
    } else {
      console.log(
        "  ⏭️  public.parcelas ainda não existe (migration 010 não aplicada) — pulado",
      );
    }

    // ── Caso: view de margem (Fase 1), se já existir ─────────────────────────
    if (await tableExists(client, "public.vw_margem_servico")) {
      const viewB = await client.query(
        "SELECT servico_id FROM public.vw_margem_servico WHERE servico_id = $1 AND perfurador_id = $2",
        [servicoA, B],
      );
      check(
        "vw_margem_servico: margem do serviço de A não vaza para B",
        viewB.rowCount === 0,
      );
      const viewA = await client.query(
        "SELECT servico_id FROM public.vw_margem_servico WHERE servico_id = $1 AND perfurador_id = $2",
        [servicoA, A],
      );
      check(
        "vw_margem_servico: controle positivo — A vê a margem do próprio serviço",
        viewA.rowCount === 1,
      );
    } else {
      console.log(
        "  ⏭️  vw_margem_servico ainda não existe (migration da Fase 1 não aplicada) — pulado",
      );
    }

    // Nada é persistido
    await client.query("ROLLBACK");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("\n💥 Erro inesperado durante o teste:", err);
    await client.end();
    process.exit(1);
  }

  await client.end();

  console.log(`\n📊 Resultado: ${passed} ok, ${failed} falha(s)\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
