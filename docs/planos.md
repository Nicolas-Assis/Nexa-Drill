# Nexa Drill — Fase 1: Margem por Job

**Objetivo:** entregar "quanto lucrei em cada poço" com qualidade de demo, para ligar amanhã pros clientes com a frase _"meu sistema te mostra quanto tu lucrou em cada poço, incluindo custo por metro perfurado"_.

**Prazo:** hoje/esta noite (~6-8h).

**Escopo (ENTRA):** vincular despesa a serviço · tela de margem no detalhe · custo e margem por metro · card de margem no dashboard + bloco de prejuízo · mini-relatório · seed de demo.

**Fora de escopo (Fase 2+):** parcelas/contas a receber · bot WhatsApp · IA de foto/áudio · benchmark anônimo · gráficos novos.

---

## Instruções para a IA no VS Code

- Leia esta seção antes de começar. Trabalhe pelas fases na ordem apresentada. Cada fase tem critério de aceite objetivo — só avance quando estiver validado.
- Antes de escrever qualquer coisa: abra `src/types/index.ts`, `src/lib/get-perfurador.ts`, `src/lib/constants.ts` e a última migration em `supabase/migrations/` para confirmar convenções de nome de coluna, tipos e helpers já existentes. Reutilize esses helpers, não crie paralelos.
- Toda action nova é `"use server"`, obrigatoriamente passa por `getAuthenticatedPerfurador()` e filtra tudo por `perfurador_id`. Não use service-role sem esse filtro.
- Cada action nova precisa de teste manual (ou automatizado) simulando um perfurador B tentando ler/escrever dado do perfurador A. Se passar, o isolamento está errado — corrija antes de seguir.
- Padrão de UI: componentes próprios já existentes, Tailwind, `sonner` para toasts, `react-hook-form` + `zod` para formulários. Mobile-first sempre — bottom-sheet no celular, modal/side-panel no desktop.
- Ao terminar cada fase, faça commit claro (`feat(margem): ...`, `fix(financeiro): ...`) e rode o build antes de seguir.
- Peça confirmação humana antes de rodar migration em ambiente com dados reais.

---

## Fase 0 — Preparação e segurança (30-45 min)

**O que fazer**

1. Verificar a colisão de prefixo `004` em `supabase/migrations/` apontada no relatório. Renomear para eliminar duplicidade antes de criar a `005`.
2. Adicionar rate-limit na action pública `enviarSolicitacaoOrcamento` (formulário do perfil público): máximo 5 requisições por hora por IP. Solução simples — tabela `public_requests` com IP + timestamp, ou biblioteca em memória. Sem overengineering.
3. Criar smoke test de isolamento em `scripts/test-isolation.ts`: dois perfuradores, o B tenta ler serviço/orçamento/financeiro do A e deve receber erro/vazio em todas as tentativas. Reusar nas próximas fases.

**Critério de aceite**

- Migrations rodam sem colisão.
- Formulário público bloqueia a 6ª requisição do mesmo IP em 1h.
- Script de isolamento passa nas actions existentes.

---

## Fase 1 — Modelo de dados (45 min)

**O que fazer**

1. Criar migration `005_margem_por_job.sql` contendo:
   - Índice em `financeiro(servico_id)` para performance.
   - Colunas opcionais em `servicos`: `custo_previsto` (numeric, virá do orçamento no futuro) e `valor_recebido` (numeric, redundância de leitura rápida).
   - View `vw_margem_servico` que agrega, por serviço: receita (soma de receitas com aquele `servico_id`), custo (soma de despesas com aquele `servico_id`), margem, margem percentual, custo por metro (custo dividido pela profundidade real) e margem por metro. **A view precisa expor `perfurador_id`** para que as queries filtrem por tenant.
2. Antes de rodar: confirmar os nomes exatos de coluna (`tipo`, `valor`, `profundidade_real` etc.) em `src/types/index.ts` e nas migrations anteriores. Ajustar a view aos nomes reais.
3. Atualizar `src/types/index.ts` com o tipo `MargemServico` espelhando a view.

**Critério de aceite**

- Query na view filtrada por `perfurador_id` de teste retorna dados coerentes para um serviço com receita e despesa vinculadas.
- Divisão por zero na profundidade não quebra a view (retorna NULL nesses campos, não erro).
- Tipo `MargemServico` compila no TypeScript strict.

---

## Fase 2 — Fix de integração existente (30 min) — CRÍTICO

**O que fazer**
Auditar o fluxo atual de conclusão de serviço (o que hoje cria automaticamente lançamento de receita no financeiro). Garantir que essa receita **nasce com `servico_id` preenchido**. Se não estiver, corrigir.

Fazer o mesmo com qualquer criação automática de receita/despesa: sempre que houver vínculo lógico com um serviço, o `servico_id` precisa ser gravado.

**Critério de aceite**

- Concluir serviço de teste com valor recebido gera linha em `financeiro` com `servico_id` correto.
- Contagem de receitas dos últimos 1 dia sem `servico_id` retorna 0 após o fix.

**Por que é crítico:** sem esse fix, a view calcula margem com custo mas sem receita, e a demo mostra tudo no prejuízo.

---

## Fase 3 — Server actions de margem (1h30)

**O que fazer**
Criar `src/app/dashboard/servicos/actions-margem.ts` com quatro actions. Todas com `getAuthenticatedPerfurador()` no topo e filtro por `perfurador_id` em toda query.

1. **`getMargemServico(servicoId)`** — retorna a linha da view para aquele serviço + lista das despesas vinculadas (para a tabela detalhada). Se o serviço não pertence ao perfurador logado, retornar erro.
2. **`addDespesaServico(input)`** — quick-add de despesa já vinculada a um serviço. Campos: `servicoId`, `valor`, `categoria`, `descricao` (opcional), `data` (default: hoje). Insere em `financeiro` com `servico_id` preenchido. Chamar revalidate da tela do serviço.
3. **`vincularDespesaServico(financeiroId, servicoId | null)`** — associar/desassociar lançamento existente a um serviço.
4. **`getMargemResumo()`** — agregados para o dashboard: margem média do mês atual, lista de jobs no prejuízo (margem negativa), custo por metro médio, agregado por tipo de solo (margem % média e nº de jobs).

**Critério de aceite**

- Cada action valida input com `zod`.
- Script de isolamento da Fase 0 passa nas 4 actions novas — perfurador B nunca consegue ler/escrever dado do A.
- Chamar `getMargemServico` de um serviço com receita e despesas conhecidas retorna os valores matematicamente corretos.

---

## Fase 4 — UI: Card "Resultado do Poço" (2h30) — a peça central da demo

**O que fazer**
Criar `src/components/servicos/margem-card.tsx` e integrar na página de detalhe do serviço.

**Estrutura visual do card:**

- Título "Resultado do Poço".
- Linha de receita (valor total).
- Linha de custo (valor total) com link "ver detalhe" que expande a lista de despesas vinculadas.
- Separador.
- Linha de **MARGEM em destaque** (R$ e %), com bolinha de cor: verde ≥ 25%, amarelo 10-25%, vermelho < 10%. Adicionar as constantes de cor em `src/lib/constants.ts`.
- Duas métricas secundárias lado a lado: custo por metro (com profundidade ao lado, ex: "R$ 523/m em 100m") e margem por metro.
- Botão de ação: **"+ Lançar despesa deste poço"** — no mobile abre bottom-sheet, no desktop modal lateral. Formulário mínimo: valor → categoria (chips das categorias existentes) → salvar. 3 toques no total. Após salvar, o card atualiza em tempo real.

**Tabela de despesas vinculadas (quando "ver detalhe" está expandido):**
Colunas: data, categoria, descrição, valor, ações (editar / desvincular). Reutilizar componentes de tabela já existentes no financeiro.

**Critério de aceite**

- Card renderiza corretamente em 3 cenários: serviço lucrativo (verde), no prejuízo (vermelho), sem despesa lançada ainda (mostra "sem custos registrados", não quebra).
- No mobile, cabe na largura do celular sem scroll horizontal.
- Adicionar despesa pelo botão atualiza os valores imediatamente, sem reload manual.
- "Ver detalhe" abre/fecha suavemente.

---

## Fase 5 — UI: campo "Vincular a serviço" no financeiro (45 min)

**O que fazer**
No formulário de criação/edição de lançamento em `src/components/financeiro/`, adicionar campo select opcional "Vincular a serviço".

**Regras do select:**

- Listar serviços do perfurador logado, com **"em andamento" primeiro**, depois "concluídos" ordenados por data desc.
- Formato de cada opção: `[Cliente] - [tipo de serviço / endereço] - [Status]`.
- Default inteligente: se existe exatamente 1 serviço em andamento, pré-selecionar.
- Opção "Nenhum" no topo para não vincular.
- Ao editar lançamento já vinculado, mostrar o vínculo atual selecionado.

**Critério de aceite**

- Criar despesa com vínculo faz o valor aparecer no card do serviço correspondente.
- Editar despesa mudando o vínculo remove do serviço antigo e adiciona no novo.
- Formulário funciona igual desktop e mobile.

---

## Fase 6 — UI: Dashboard atualizado (1h)

**O que fazer**

1. Substituir um dos 4 KPIs atuais (ou adicionar como 5º, o que ficar melhor visualmente) por **"Margem do mês"** — R$ e % com comparação vs. mês anterior, mesmo padrão dos outros KPIs.
2. Adicionar dentro de "Próximas Ações" (ou como bloco novo) a seção **"⚠ Poços no prejuízo"** — lista de até 5 jobs com margem negativa, cada um clicável levando ao detalhe do serviço. Se não houver, mensagem positiva ("Nenhum poço no prejuízo este mês 🎯").
3. Ambos usam a action `getMargemResumo` — chamar em paralelo com as outras queries do dashboard, não em série.

**Critério de aceite**

- Dashboard carrega em tempo similar ao atual (sem regressão perceptível).
- KPI responde a mudanças de dados (adicionar despesa em serviço concluído do mês reduz a margem exibida ao recarregar).
- Bloco de prejuízo destaca visualmente (cor de alerta) sem poluir o resto da tela.

---

## Fase 7 — Mini-relatório de margem (45 min)

**O que fazer**
Nova rota: `dashboard/relatorios/margem` (criar pasta `relatorios` se não existir; deixa preparada pra outros relatórios no futuro).

Página com tabela: serviço (link para detalhe), cliente, tipo de solo, profundidade, receita, custo, margem R$, margem %, custo por metro. Ordenável por qualquer coluna. Filtros no topo: período (mês/3m/6m/ano/todo) e tipo de solo (multi-select).

Adicionar item "Relatórios" no menu lateral (sidebar/drawer).

**Critério de aceite**

- Tabela ordena e filtra sem reload.
- Cabe no mobile (transformar em cards empilhados abaixo de determinada largura, seguindo o padrão da tela de clientes).
- Link "Ver todos" no bloco de prejuízo do dashboard leva pra cá com filtro pré-aplicado.

---

## Fase 8 — Seed de demo (30 min) — indispensável

**O que fazer**
Script `scripts/seed-demo.ts` que cria um perfurador fictício com dados realistas para a demo:

- Perfurador: "Perfurações Água Boa" (ou nome plausível), slug definido, logo genérica opcional.
- 5 clientes.
- **3 serviços concluídos:**
  - Um lucrativo: 100m, solo arenoso, receita R$ 80.000, despesas somando ~R$ 52.000 (diesel, brocas, diárias, revestimento), margem ~R$ 28.000 (35%).
  - Um no prejuízo: 130m, solo rochoso, receita R$ 90.000, despesas ~R$ 98.000 (broca extra por causa do solo, mais diesel, mais dias de equipe). Margem negativa.
  - Um regular: 80m, solo argiloso, margem ~15%.
- 1 serviço em andamento com algumas despesas já lançadas.
- 2 orçamentos em aberto (rascunho e enviado).

Login desse perfurador de teste anotado em README dentro de `scripts/`.

**Critério de aceite**

- Rodar o script em ambiente limpo popula tudo em menos de 10s.
- Ao logar no perfurador de demo: dashboard mostra KPI de margem, bloco "1 poço no prejuízo", card de resultado funcional em cada um dos 3 serviços concluídos, mini-relatório com as linhas.
- Rodar isolation test — nenhum dado do perfurador de demo aparece para outros perfuradores.

---

## Ordem cronológica e priorização

| Ordem | Fase                            | Tempo     |
| ----- | ------------------------------- | --------- |
| 1     | Fase 0 — Preparação e segurança | 30-45 min |
| 2     | Fase 1 — Modelo de dados        | 45 min    |
| 3     | Fase 2 — Fix de integração      | 30 min    |
| 4     | Fase 3 — Server actions         | 1h30      |
| 5     | Fase 4 — Card Resultado do Poço | 2h30      |
| 6     | Fase 5 — Vincular no financeiro | 45 min    |
| 7     | Fase 6 — Dashboard atualizado   | 1h        |
| 8     | Fase 7 — Mini-relatório         | 45 min    |
| 9     | Fase 8 — Seed de demo           | 30 min    |

**Se o tempo apertar, cortar nesta ordem:** Fase 7 (relatório) primeiro · depois Fase 6 pra só o KPI, sem bloco de prejuízo. **Nunca cortar Fase 2, Fase 4 ou Fase 8** — são o coração da demo.

---

## Checklist final antes de dormir

- [ ] Migration 005 rodou em produção sem erro.
- [ ] Concluir serviço novo cria receita com `servico_id`.
- [ ] Perfurador de demo logado mostra tudo funcionando.
- [ ] Script de isolamento passa nas actions novas.
- [ ] Build sem erros.
- [ ] Deploy feito (se houver staging/prod).
- [ ] Screenshot dos 3 cenários do card (verde/vermelho/vazio) salvo — backup caso a demo caia.

---

## Roteiro da ligação de amanhã (5-10 ligações)

**Abertura — descoberta, não venda:**
"Fulano, é o Nicolas da Torneadora. Rapidinho: tô desenvolvendo um sistema pra perfurador e queria tua opinião de quem tá no campo. Me diz uma coisa — no último poço que tu fechou, tu sabe dizer quanto sobrou de lucro de verdade, contando diesel, broca, diária?"

**As 3 perguntas de ouro (anotar as respostas literalmente):**

1. Como tu controla hoje? (caderno / planilha / cabeça / nada)
2. Já teve poço que tu descobriu depois que deu prejuízo? Quanto foi?
3. Quanto tempo demora pra sair um orçamento teu hoje?

**Se a dor aparecer → oferta:**
"Montei um sistema que te dá isso: cada poço com receita, custo e lucro, custo por metro perfurado, e orçamento em PDF profissional que o cliente aprova pelo WhatsApp. Tô abrindo pra 5 perfuradores fundadores: **R$ 147/mês travado pra sempre** (vai custar R$ 297+ depois), eu mesmo configuro tudo pra ti e cadastro teus primeiros poços junto contigo. Topa que eu te mostre em 10 minutos essa semana?"

**Metas do dia:** 5-8 ligações · 3 demos agendadas · 1-2 fundadores pagando.

**Critério de morte da tese:** se em 8 conversas ninguém travar/reagir à pergunta do lucro por poço, o problema não é o código — é a tese, e a gente reavalia antes de escrever mais uma linha.

---

## Depois da Fase 1

**Fase 2:** parcelas + Pix (Asaas) + régua de cobrança WhatsApp → destrava "receba mais rápido".
**Fase 3:** foto da nota → IA lança despesa no job · áudio → orçamento rascunho. Produto vira indispensável no campo.
**Fase 4:** benchmark anônimo de custo/metro por tipo de solo — fosso de dados que nenhum concorrente consegue copiar.

A decisão entre Fase 2 e Fase 3 depende das respostas de amanhã: dor for calote/demora → Fase 2 primeiro. Dor for tempo/agilidade → Fase 3 primeiro.
