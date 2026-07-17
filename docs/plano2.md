# Nexa Drill — Fase 2: Receber de Verdade

**Objetivo:** entregar a segunda metade da promessa da tese — _"receba mais rápido"_. Hoje o sistema trata cada serviço como se o dinheiro caísse todo de uma vez, no dia da conclusão. Na vida real de perfuração tem sinal, tem parcela por etapa (mobilização/perfuração/instalação), tem cliente que atrasa e tem calote. Esta fase resolve isso e adiciona cobrança automática via WhatsApp com Pix.

**Prazo:** sprint de 5-7 dias úteis (~25-35h de trabalho).

**Pré-requisito:** Fase 1 (margem por job) em produção e ao menos 2 clientes pagantes usando de verdade. Se ninguém pagou ainda, PARE e volte pra descoberta — Fase 2 sem validação da 1 é construir no escuro.

**Escopo (ENTRA):**

- Modelo de parcelas / contas a receber vinculadas ao serviço.
- Registro de recebimento (baixa manual e conciliação por Pix).
- Integração com gateway de pagamento (Asaas) para gerar Pix copia-e-cola e boleto por parcela.
- Régua de cobrança automática via WhatsApp em datas configuráveis.
- KPIs de recebimento: a receber, atrasado, DSO (dias médios de recebimento).
- Ajuste da promessa "margem por job" — passar a distinguir _previsto_ (do orçamento) de _recebido_ (do financeiro).

**Fora de escopo (Fase 3+):**

- IA (foto de nota, áudio de orçamento).
- Antecipação de recebíveis (fintech de verdade — exige regulatório).
- Split de pagamento, marketplace, gorjeta.
- App nativo — segue web responsivo.

---

## Instruções para a IA no VS Code

- Leia esta seção antes de começar. Fases numeradas, executar em ordem, parar no critério de aceite de cada uma para validação humana.
- Antes de escrever qualquer coisa, abrir: `src/types/index.ts`, `src/lib/get-perfurador.ts`, `src/lib/constants.ts`, migration mais recente e as actions criadas na Fase 1. Reutilizar padrões existentes.
- Toda action nova: `"use server"` + `getAuthenticatedPerfurador()` + filtro por `perfurador_id`. Sem exceção.
- Isolation test da Fase 0 do plano anterior precisa ser reaproveitado e estendido para as novas actions desta fase.
- Segredos (API key do Asaas, número de WhatsApp de envio) vão em `.env`. Nunca hardcoded, nunca no repositório.
- Toda chamada a serviço externo (Asaas, Evolution/WhatsApp) precisa ter: timeout, tratamento de erro que não derruba a UI, e log persistido em tabela `webhook_logs` (criar nesta fase). Falha silenciosa mata a confiança do cliente.
- Padrão de UI mantido da Fase 1: mobile-first, bottom-sheet no celular, `sonner` para toasts, `react-hook-form` + `zod` para forms.
- Ao terminar cada fase, commit claro e build limpo antes de seguir.

---

## Fase 0 — Decisões e credenciais (2h)

**O que fazer**

1. Escolher gateway de pagamento definitivamente. Recomendação: **Asaas** (API simples, Pix + boleto + cartão, sem custo fixo mensal, taxa por transação, PJ e PF, bom suporte a webhook). Alternativas: Pagar.me, Efí (antigo Gerencianet), Mercado Pago. Não escolher Stripe pra este mercado — cliente brasileiro paga por Pix.
2. Criar conta sandbox do Asaas. Anotar API key, URL do webhook e formato do payload de confirmação de pagamento. Ler a documentação oficial das rotas de cliente, cobrança única e webhook.
3. Escolher provedor de WhatsApp para envio de cobrança. Recomendação: **Evolution API self-hosted** (Nicolas já tem experiência conforme memória) ou API oficial da Meta (Cloud API) se quiser mais estabilidade. Definir número de envio e criar instância/sessão.
4. Definir política de cobrança padrão que virá pré-configurada: lembrete 3 dias antes do vencimento → aviso no dia → cobrança 3 dias após vencimento → cobrança 7 dias após → cobrança 15 dias após (parar aqui, resto vai pra decisão humana). O perfurador poderá editar depois.
5. Documentar tudo em `docs/integracoes.md`: quem é o gateway, quais rotas usar, formato de webhook, número de WhatsApp, política default.

**Critério de aceite**

- Conta sandbox do Asaas ativa, com API key anotada em `.env.local`.
- Sessão WhatsApp de envio ativa e testada com uma mensagem manual para o próprio Nicolas.
- Documento `docs/integracoes.md` criado.

---

## Fase 1 — Modelo de dados (1h)

**O que fazer**
Criar migration `006_contas_a_receber.sql` com:

1. **Tabela `parcelas`** (nova) — representa uma cobrança de um serviço:
   - `id` (uuid, pk)
   - `perfurador_id` (uuid, fk, obrigatório pro isolamento)
   - `servico_id` (uuid, fk)
   - `cliente_id` (uuid, fk — redundância pra consulta rápida)
   - `descricao` (text) — ex: "Sinal", "Perfuração concluída", "Instalação da bomba"
   - `valor` (numeric)
   - `vencimento` (date)
   - `status` (enum: `pendente`, `pago`, `atrasado`, `cancelado`)
   - `metodo_pagamento` (enum nullable: `pix`, `boleto`, `dinheiro`, `transferencia`, `outro`)
   - `data_pagamento` (date, nullable)
   - `valor_pago` (numeric, nullable — pode divergir do valor por juros/desconto)
   - `asaas_cobranca_id` (text, nullable) — ID retornado pelo Asaas
   - `pix_copia_cola` (text, nullable) — string do QR Code
   - `boleto_url` (text, nullable)
   - `link_pagamento` (text, nullable) — URL do Asaas para o cliente pagar
   - `numero_parcela` / `total_parcelas` (int, nullable) — pra 2/5, 3/5 etc.
   - `created_at`, `updated_at`

2. **Tabela `regua_cobranca`** (nova) — política de cobrança do perfurador:
   - `perfurador_id` (uuid, pk)
   - `eventos` (jsonb) — array de `{ dias: -3, tipo: 'lembrete', mensagem: '...' }`, onde `dias` negativo = antes do vencimento, positivo = depois.
   - `ativo` (boolean, default true)
   - `updated_at`

3. **Tabela `mensagens_cobranca`** (nova) — log do que foi enviado:
   - `id`, `perfurador_id`, `parcela_id`, `tipo` (lembrete/aviso/cobranca), `canal` (whatsapp/email), `mensagem` (text), `status` (enviado/falha), `erro` (text nullable), `enviado_em` (timestamp), `resposta_cliente` (text nullable, pra respostas capturadas)

4. **Tabela `webhook_logs`** (nova, útil pra tudo daqui pra frente) — recebe todo payload de webhook (Asaas, WhatsApp, etc.) com timestamp, origem, payload cru e resultado do processamento. Retenção 90 dias.

5. **Alterar `financeiro`**: adicionar coluna nullable `parcela_id` (uuid, fk) — quando um recebimento vem de baixa de parcela, aponta pra ela. Não remover `servico_id` (redundância intencional).

6. **View `vw_parcelas_status`** — retorna parcelas com `dias_ate_vencimento` (calculado) e `situacao` derivada (a vencer/vence hoje/atrasada X dias). Facilita queries do dashboard.

**Critério de aceite**

- Migration roda sem erro.
- Índices em `parcelas(perfurador_id, status, vencimento)` e `parcelas(asaas_cobranca_id)` criados.
- Isolation test estendido: perfurador B não vê parcelas do A em nenhuma consulta.

---

## Fase 2 — Ajuste na conclusão de serviço + criação de parcelas (2h)

**O que fazer**
Hoje concluir um serviço cria automaticamente uma linha de receita no financeiro. Isso vai mudar de comportamento.

**Novo comportamento:**
Ao concluir serviço, o perfurador escolhe entre 3 modos:

1. **Recebido à vista** — mantém comportamento atual, cria receita direto no financeiro com `servico_id`. Uma parcela `pago` criada retroativamente pra manter consistência.
2. **Parcelado** — abre modal para configurar parcelas: nº de parcelas, valores (podem ser desiguais), datas de vencimento, descrição de cada uma. Ao salvar, cria as N linhas em `parcelas` com status `pendente`. Nenhuma receita entra no financeiro ainda.
3. **Já parcelado com sinal recebido** — combinação: parcela 1 já paga (cria receita agora), parcelas 2..N pendentes.

O componente de configuração de parcelas precisa ter:

- Botão "Dividir em X parcelas iguais" (2, 3, 4, 5, 6 — atalhos).
- Botão "Personalizar" que libera edição livre.
- Validação: soma das parcelas = valor total do serviço.
- Sugestão de datas com intervalo de 30 dias entre elas.
- Descrição sugerida por tipo comum: Sinal / Mobilização / Perfuração / Instalação / Final.

**Retrocompatibilidade:** para serviços já concluídos antes desta fase, criar migration de dados que gera uma parcela `pago` para cada receita existente que tenha `servico_id`. Sem essa etapa, os relatórios antigos quebram.

**Critério de aceite**

- Concluir serviço abre o modal de escolha entre os 3 modos.
- Modo parcelado cria N linhas em `parcelas`, todas com `pendente`, e nenhuma receita nova em `financeiro`.
- Modo à vista mantém comportamento antigo (receita + parcela `pago` retroativa).
- Serviços concluídos antes da fase têm parcela `pago` gerada pela migration de dados.
- Isolation test passa.

---

## Fase 3 — Server actions de parcelas (2h)

**O que fazer**
Criar `src/app/dashboard/servicos/actions-parcelas.ts` com:

1. **`criarParcelas(servicoId, input[])`** — usada pela Fase 2 e permite recriar/reconfigurar.
2. **`baixarParcelaManual(parcelaId, input)`** — dá baixa manual: método, data pagamento, valor pago. Cria receita em `financeiro` com `servico_id` E `parcela_id`. Atualiza status da parcela para `pago`.
3. **`cancelarParcela(parcelaId, motivo)`** — status `cancelado`, não gera receita.
4. **`editarParcela(parcelaId, input)`** — permitido só se `status = pendente`.
5. **`gerarCobrancaAsaas(parcelaId)`** — chama API do Asaas: cria cliente lá se não existir, cria cobrança única, guarda `asaas_cobranca_id`, `pix_copia_cola`, `boleto_url`, `link_pagamento` na parcela. Idempotente — se já existe cobrança, retorna a existente.
6. **`getParcelasResumo()`** — dashboard: total a receber, atrasado, vence esta semana, DSO médio.
7. **`getParcelasFiltradas(filtros)`** — lista paginada para a tela de contas a receber.
8. **Cron job diário `atualizarStatusAtrasadas()`** — muda `pendente` para `atrasado` quando `vencimento < hoje`. Rodar via Vercel Cron ou Supabase Scheduled Function.

**Critério de aceite**

- Todas as actions passam pelo isolation test.
- Baixa manual cria linha em `financeiro` com ambas as FKs (`servico_id` + `parcela_id`) e atualiza `vw_margem_servico` corretamente.
- `gerarCobrancaAsaas` é idempotente: chamar 3x na mesma parcela não cria 3 cobranças no Asaas.
- Cron atualiza status na virada da meia-noite (testado com data manipulada).

---

## Fase 4 — Webhook do Asaas (2h)

**O que fazer**
Criar rota pública `POST /api/webhooks/asaas` que recebe eventos de pagamento do gateway.

Eventos a tratar (nome exato deles conferir na doc do Asaas):

- `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` — pagamento confirmado. Buscar parcela pelo `asaas_cobranca_id`, dar baixa: status `pago`, `data_pagamento`, `valor_pago`, `metodo_pagamento = pix` (ou o que veio). Criar receita em `financeiro` com `servico_id` + `parcela_id`.
- `PAYMENT_OVERDUE` — atrasou. Já é tratado pelo cron, mas registrar log.
- `PAYMENT_REFUNDED` / `PAYMENT_DELETED` — reverter: status `cancelado`, remover receita do financeiro (ou marcar como estorno).

**Cuidados críticos:**

- Validar assinatura/token do webhook (Asaas envia um header de autenticação — não pode aceitar payload de qualquer origem).
- Idempotência: guardar `event_id` do Asaas em `webhook_logs`. Se já processado, retornar 200 sem reprocessar.
- Sempre responder 200 rápido, processar em background se necessário (nem sempre é possível em serverless — se for síncrono, garantir < 10s).
- Log TODO payload em `webhook_logs` antes de processar. Se algo der errado, tu tem o rastro.

**Critério de aceite**

- Simular payload no sandbox do Asaas → parcela vira `pago`, receita entra em `financeiro`, `vw_margem_servico` reflete.
- Reprocessar mesmo evento não duplica receita.
- Webhook com assinatura errada é rejeitado com 401.

---

## Fase 5 — Tela "Contas a Receber" (3h)

**O que fazer**
Nova rota: `dashboard/receber`.

**Estrutura da página:**

**KPIs no topo (4 cards):**

- A receber (total pendente + atrasado)
- Atrasado (valor + qtd parcelas)
- Vence esta semana (valor + qtd)
- DSO — dias médios de recebimento (últimos 90 dias)

**Filtros:**
Status (multi), cliente (autocomplete), período de vencimento, serviço.

**Lista/tabela:**
Colunas: vencimento, cliente, serviço (link), descrição da parcela (ex: "2/4 - Perfuração"), valor, status (badge colorido), ações (baixar / cobrar / editar / cancelar).

**Padrão visual:**

- Linha vermelha suave para atrasadas.
- Linha amarela para "vence hoje/amanhã".
- Mobile: cards empilhados com as mesmas infos.

**Ações principais (por parcela):**

- **Baixar** — abre bottom-sheet: método (chips), data (default hoje), valor (default = valor da parcela).
- **Cobrar** — abre modal com 3 opções:
  1. Gerar Pix (chama `gerarCobrancaAsaas`, mostra QR Code + copia-e-cola).
  2. Enviar cobrança WhatsApp agora (usa a mensagem da régua, gera Pix se ainda não tiver).
  3. Copiar link de pagamento.
- **Editar** / **Cancelar** — conforme regras da Fase 3.

**Critério de aceite**

- KPIs corretos comparados a queries manuais no banco.
- Filtros funcionam sem reload de página.
- Gerar Pix mostra QR Code (biblioteca `qrcode.react` ou similar) + botão de copiar.
- Baixa manual atualiza a lista imediatamente.
- Isolation test passa.

---

## Fase 6 — Régua de cobrança e envio via WhatsApp (4h)

**O que fazer**

1. **Tela de configuração da régua** em `dashboard/perfil/regua-cobranca`:
   - Lista de eventos (dias relativos ao vencimento + tipo + mensagem template).
   - Ativar/desativar régua toda.
   - Cada evento pode ser habilitado individualmente.
   - Preview: "no dia D-3, cliente Fulano receberá: [renderiza mensagem]".
   - Variáveis disponíveis no template: `{cliente_nome}`, `{valor}`, `{vencimento}`, `{descricao_parcela}`, `{link_pagamento}`, `{pix_copia_cola}`, `{empresa_nome}`, `{empresa_telefone}`.

2. **Templates default sugeridos** (o perfurador pode editar):
   - D-3: "Oi {cliente_nome}, tudo bem? Lembrando que sua parcela de {descricao_parcela} no valor de {valor} vence dia {vencimento}. Segue o Pix pra facilitar: {pix_copia_cola}. Qualquer dúvida me chama! — {empresa_nome}"
   - D0: "Oi {cliente_nome}, hoje vence sua parcela de {valor} referente a {descricao_parcela}. Se já pagou, pode desconsiderar. Pix: {pix_copia_cola}"
   - D+3: "Oi {cliente_nome}, sua parcela de {valor} venceu há 3 dias. Consegue acertar hoje? Pix: {pix_copia_cola} — {empresa_nome}"
   - D+7: mais firme, sem ser agressivo.
   - D+15: última mensagem automática.

3. **Cron diário `dispararReguaCobranca()`** — para cada perfurador com régua ativa, para cada parcela pendente/atrasada, verifica se hoje corresponde a um evento configurado e ainda não enviado. Se sim: renderiza template, gera Pix se ainda não tiver, envia via Evolution API, grava em `mensagens_cobranca`.

4. **Envio manual "Cobrar agora"** — reutiliza o mesmo motor de envio, mas usa a mensagem do próximo evento pendente.

**Cuidados:**

- Enviar entre 8h e 18h horário do perfurador (não cobrar cliente às 3h da manhã).
- Não enviar aos domingos como default (configurável).
- Se envio falhar, tentar novamente depois de 1h, máximo 3 tentativas.
- Sempre logar em `mensagens_cobranca`, sucesso ou falha.

**Critério de aceite**

- Régua default criada automaticamente ao cadastrar perfurador novo.
- Editar template e salvar reflete no preview.
- Simular data com parcela vencendo em D-3 e rodar cron manualmente → mensagem chega no WhatsApp de teste.
- Envio falho é registrado com erro e reagendado.
- Cliente que respondeu (Evolution API capta resposta) tem `resposta_cliente` preenchido — na Fase 3+ isso vira ponto pra IA analisar sentimento, agora só registra.

---

## Fase 7 — Ajustes no Card "Resultado do Poço" e na tela de detalhe (1h30)

**O que fazer**
Voltar no card criado na Fase 1 e adicionar:

1. **Nova linha entre receita e custo:** "**Recebido / A receber**" — mostra "R$ 45.000 recebido / R$ 35.000 a receber" com barra de progresso visual. Se tudo recebido, some a barra e mostra só "✓ Totalmente recebido".
2. **Métrica nova:** "**Dias para receber tudo**" — se todo pago, mostra "recebido em X dias". Se ainda pendente, mostra data prevista da última parcela.
3. **Aba/seção nova no detalhe do serviço:** "**Parcelas**" — lista as parcelas daquele serviço com status, botões de ação (baixar/cobrar), e permite adicionar parcela avulsa (ex: cobrança extra de material adicional).

**Critério de aceite**

- Card mostra estado misto (parcialmente recebido) corretamente.
- Seção de parcelas na tela do serviço permite operar sem sair da página.
- Baixa de parcela pelo card ou pela seção atualiza margem no mesmo momento.

---

## Fase 8 — Dashboard: KPIs de cobrança (1h)

**O que fazer**
Adicionar ao dashboard existente:

1. **Bloco novo "💰 A receber"** — número grande com total pendente + atrasado + link "ver todas" pra tela `dashboard/receber`.
2. **Alerta topo** (só aparece se tiver): "⚠ Você tem X parcelas atrasadas somando R$ Y" — clicável.
3. **KPI novo (5º/6º):** "DSO" — dias médios de recebimento nos últimos 90 dias, com comparação vs. 90 dias anteriores.
4. **Bloco "Recebimentos previstos - próximos 30 dias"** — mini-gráfico de barras (semanas), reaproveita o recharts que já é usado.

**Critério de aceite**

- Alerta topo só aparece se tiver atrasado (esconde se não).
- KPI de DSO responde a baixas novas.
- Nada quebra o layout atual em mobile.

---

## Fase 9 — Ajustes na view de margem (30 min)

**O que fazer**
Atualizar `vw_margem_servico` (criada na Fase 1 do plano anterior) para distinguir:

- `receita_recebida` — soma de receitas em `financeiro` com `servico_id` E `parcela_id` preenchidos (dinheiro que entrou de verdade).
- `receita_prevista` — soma do valor das parcelas do serviço (recebido + a receber).
- `margem_recebida` — receita_recebida - custo.
- `margem_prevista` — receita_prevista - custo.

Atualizar `MargemServico` no TypeScript. Atualizar componentes que usam a view (card, dashboard, relatório) pra mostrar as duas visões — default mostra prevista, toggle mostra realizada.

**Critério de aceite**

- Serviço com 2 parcelas pagas de 4 mostra: receita_recebida = 50%, receita_prevista = 100%.
- Toggle no card alterna entre as duas visões.

---

## Fase 10 — Seed de demo atualizado (30 min)

**O que fazer**
Estender o seed da Fase 1:

- Adicionar parcelas aos 3 serviços concluídos: um todo pago, um parcialmente pago (1 parcela paga, 2 pendentes, 1 atrasada), um todo pendente.
- 5 parcelas atrasadas em serviços diversos, para mostrar o alerta do dashboard.
- Régua de cobrança default ativa no perfurador de demo.
- 1 mensagem de cobrança enviada com sucesso (para mostrar na tela histórica).

**Critério de aceite**

- Ao logar no demo: KPIs de cobrança mostram dado realista, alerta de atrasadas aparece no topo, tela de contas a receber tem dado nas 3 cores (verde/amarelo/vermelho).

---

## Ordem cronológica e priorização

| Ordem | Fase                                     | Tempo  |
| ----- | ---------------------------------------- | ------ |
| 1     | Fase 0 — Decisões e credenciais          | 2h     |
| 2     | Fase 1 — Modelo de dados                 | 1h     |
| 3     | Fase 2 — Conclusão de serviço + parcelas | 2h     |
| 4     | Fase 3 — Server actions                  | 2h     |
| 5     | Fase 4 — Webhook Asaas                   | 2h     |
| 6     | Fase 5 — Tela Contas a Receber           | 3h     |
| 7     | Fase 6 — Régua + WhatsApp                | 4h     |
| 8     | Fase 7 — Ajustes no card                 | 1h30   |
| 9     | Fase 8 — Dashboard                       | 1h     |
| 10    | Fase 9 — View de margem                  | 30 min |
| 11    | Fase 10 — Seed atualizado                | 30 min |

**Total estimado:** 19h30 de trabalho concentrado. Distribuído em 5-7 dias corridos incluindo teste com cliente real.

**Se apertar, cortar nesta ordem:** Fase 8 (KPIs adicionais) → dashboard fica com só o alerta · Fase 7 (progresso no card) → mostra só recebido total, sem barra. **Nunca cortar Fases 2, 4 ou 6** — parcelas, webhook e régua são o coração da entrega.

---

## Riscos específicos desta fase

1. **Webhook do Asaas não idempotente** — duplicar receita destrói a confiança. O log em `webhook_logs` + checagem de `event_id` é obrigatório, não opcional.
2. **WhatsApp bloqueado** — enviar muita mensagem de um número novo derruba a sessão. Começar com volume baixo, respeitar horário, e ter um plano B (email + link do Asaas) se o WhatsApp cair.
3. **Cliente do perfurador reclamar de cobrança automática** — a régua precisa ser conservadora no default. Nunca falar "vamos negativar" ou algo agressivo automaticamente. Isso o perfurador escreve à mão se quiser.
4. **Taxa do Asaas em Pix** — próxima de zero, mas confere. Se cobrar percentual, o perfurador precisa saber pra precificar. Documentar em `docs/integracoes.md`.
5. **LGPD** — envio automático pra cliente precisa de base legal (execução de contrato serve). Adicionar no rodapé de cada mensagem uma linha tipo "esta mensagem se refere ao contrato #XYZ com {empresa_nome}. Para não receber mais, responda SAIR."

---

## Checklist antes de liberar para clientes reais

- [ ] Todas migrations rodadas em produção.
- [ ] Chaves de Asaas em modo produção (não sandbox), API key rotacionada.
- [ ] Webhook do Asaas apontando pra URL de produção e validado com assinatura.
- [ ] Cron diário `atualizarStatusAtrasadas` + `dispararReguaCobranca` agendados e testados.
- [ ] Sessão WhatsApp estável — envio de teste passou.
- [ ] Isolation test passa em todas actions novas.
- [ ] Build limpo.
- [ ] Testado o ciclo completo com dinheiro de verdade: gerar Pix → pagar → webhook → baixa → receita → margem. Faz com R$ 1 pra ti mesmo.
- [ ] Seed de demo atualizado e um perfurador fictício disponível pra novas ligações.

---

## Argumento novo pra ligação (após Fase 2 pronta)

Além do argumento da Fase 1 (margem por poço), agora tu tem:

_"Além de te mostrar o lucro de cada poço, o sistema faz a cobrança pra ti. Cliente parcela em 4 vezes, sistema gera o Pix, manda no WhatsApp dele 3 dias antes de cada vencimento, e quando ele paga, o dinheiro entra automático no teu financeiro. Tu não precisa lembrar de cobrar ninguém — e a inadimplência cai."_

Se o cliente reagiu forte na pergunta _"tu já teve calote?"_ na primeira rodada, esta fase é o que fecha ele.

---

## Depois da Fase 2

**Fase 3:** IA no WhatsApp — foto de nota de diesel vira despesa lançada no job automaticamente, áudio vira orçamento em rascunho. Aqui o produto vira indispensável no campo.

**Fase 4:** benchmark anônimo — "teu custo/metro em solo rochoso está 20% acima da média da base". Só possível com 20+ perfuradores usando; começa a ser fosso de dados de verdade.

**Fase 5 (fintech real, exige capital):** antecipação de recebíveis. Perfurador tem R$ 50k a receber em 90 dias? Sistema oferece adiantar por R$ 47k na hora, via parceiro regulado. Spread compartilhado. Só entrar aqui depois de 200+ clientes pagantes e sócio/rodada.
