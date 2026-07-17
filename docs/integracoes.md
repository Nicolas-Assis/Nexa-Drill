# Integrações — Nexa Drill

Documento de referência das integrações externas do sistema. Atualize aqui sempre
que mudar rota, credencial ou política. **Nenhum segredo neste arquivo** — só nomes
de variáveis e formatos. Valores reais vão em `.env.local` (git-ignored).

---

## Gateway de pagamento: Asaas

**Escolha:** Asaas. Motivos: API REST simples, Pix + boleto + cartão no mesmo fluxo,
sem mensalidade fixa (taxa por transação), atende PJ e PF, webhook confiável e
**notificação nativa de cobrança (e-mail / SMS / WhatsApp)** — por isso **não usamos
Evolution API** nesta fase. Quem lembra o cliente de pagar é o próprio Asaas.

### Ambientes e base URL

| Ambiente  | Base URL (confirmar no painel Asaas → Integrações → API) |
| --------- | -------------------------------------------------------- |
| Sandbox   | `https://api-sandbox.asaas.com/v3`                       |
| Produção  | `https://api.asaas.com/v3`                               |

> A base URL de sandbox já variou entre versões do Asaas. **Confirme a URL exata no
> painel da sua conta** antes de codar a Fase 3. Guardamos a URL em `ASAAS_API_URL`
> pra trocar sandbox↔produção só mudando o `.env`, sem tocar no código.

### Autenticação

Header em toda requisição:

```
access_token: <ASAAS_API_KEY>
Content-Type: application/json
```

### Variáveis de ambiente (ver `.env.example`)

| Variável              | Descrição                                                              |
| --------------------- | ---------------------------------------------------------------------- |
| `ASAAS_API_KEY`       | API key da conta (sandbox agora, produção no go-live). Segredo.        |
| `ASAAS_API_URL`       | Base URL do ambiente (sandbox ou produção).                           |
| `ASAAS_WEBHOOK_TOKEN` | Token que **nós definimos** no painel; o Asaas devolve em todo webhook para validarmos a origem. Segredo. |

### Rotas que vamos usar (Fase 3+)

| Ação                          | Método / rota                        | Observação |
| ----------------------------- | ------------------------------------ | ---------- |
| Criar/achar cliente           | `POST /customers`                    | Guardar o `id` do cliente Asaas no nosso `clientes` (coluna futura `asaas_customer_id`, adicionar quando a Fase 3 chegar). Campos: `name`, `cpfCnpj`, `email`, `mobilePhone`. |
| Criar cobrança                | `POST /payments`                     | `customer`, `billingType`, `value`, `dueDate`, `description`, `externalReference` = nosso `parcela_id`. |
| Pegar Pix copia-e-cola/QR     | `GET /payments/{id}/pixQrCode`       | Retorna `encodedImage` (base64 do QR) e `payload` (copia-e-cola). |
| Consultar cobrança            | `GET /payments/{id}`                 | Reconciliação / idempotência. |

**`billingType`:** `PIX`, `BOLETO`, `CREDIT_CARD` ou `UNDEFINED` (deixa o cliente
escolher no link do Asaas). Para "gerar Pix na hora" usar `PIX`.

`externalReference` é o elo entre a cobrança do Asaas e a nossa `parcela` — sempre
mandar o `parcela_id` nele. No webhook, casamos pelo `asaas_cobranca_id` (id do
payment) e, como reforço, pelo `externalReference`.

### Notificações de cobrança (a "régua", feita pelo Asaas)

O Asaas envia lembretes automáticos ao cliente por **e-mail, SMS e WhatsApp** de
acordo com a configuração de notificações da conta. **Isso substitui o motor próprio
de WhatsApp** do plano original.

Configurar no painel do Asaas (Configurações → Notificações):

- Canais ativos: e-mail + SMS + WhatsApp (habilitar WhatsApp exige a conta com o
  recurso liberado — conferir no plano da conta).
- Política default sugerida (o perfurador ajusta depois):
  - **D-3** — lembrete antes do vencimento
  - **D0** — aviso no dia
  - **D+3** — cobrança após vencimento
  - **D+7** — cobrança mais firme
  - **D+15** — última cobrança automática (o resto é decisão humana)

Para controlar por cobrança, o `POST /payments` aceita ajustes de notificação; o
default da conta cobre a maioria dos casos. Não precisamos de tabela `regua_cobranca`
nem de cron de envio — o Asaas cuida disso.

### Webhook de pagamento (Fase 4)

Rota nossa: `POST /api/webhooks/asaas`. Cadastrar essa URL no painel do Asaas.

Eventos a tratar (confirmar nomes exatos na doc):

- `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → dar baixa na parcela (`pago`), gravar
  `data_pagamento`, `valor_pago`, `metodo_pagamento`; criar receita em `financeiro`
  com `servico_id` **e** `parcela_id`.
- `PAYMENT_OVERDUE` → já tratado pelo cron de status; só registrar log.
- `PAYMENT_REFUNDED` / `PAYMENT_DELETED` → estornar (parcela `cancelado`, remover/
  marcar a receita).

**Regras críticas (não são opcionais):**

1. **Validar origem** — o Asaas envia o token no header **`asaas-access-token`**
   (gerado no painel em Webhooks → botão "Gerar Token"). Comparar com
   `ASAAS_WEBHOOK_TOKEN`; diferente → `401`.
2. **Idempotência** — todo payload vai pra `webhook_logs` com o `event_id` do Asaas.
   Se o `event_id` já existe, responder `200` sem reprocessar (o índice único em
   `webhook_logs(origem, event_id)` garante isso no banco).
3. **Responder rápido** — `200` em < 10s (serverless). Logar antes de processar.

### Taxas

Conferir no painel (varia por plano/negociação). Pix costuma ser taxa baixa/fixa,
boleto fixo por emissão, cartão percentual. **Documentar os valores reais aqui**
quando a conta estiver ativa — o perfurador precisa saber pra precificar.

| Método | Taxa (preencher com o real da conta) |
| ------ | ------------------------------------ |
| Pix    | _a confirmar_                        |
| Boleto | _a confirmar_                        |
| Cartão | _a confirmar_                        |

### LGPD

Envio automático ao cliente tem base legal na execução do contrato. O rodapé das
mensagens (configurável no Asaas) deve identificar a empresa e o contrato. Nunca usar
linguagem agressiva/ameaça de negativação em envio automático — isso o perfurador
escreve à mão se quiser.

---

## Checklist da Fase 0 (o que depende de você)

- [ ] Criar conta **sandbox** do Asaas.
- [ ] Copiar a **API key** de sandbox para `ASAAS_API_KEY` no `.env.local`.
- [ ] Confirmar a **base URL** de sandbox no painel e pôr em `ASAAS_API_URL`.
- [ ] No painel (Webhooks): clicar **"Gerar Token"**, copiar o token para
      `ASAAS_WEBHOOK_TOKEN` no `.env.local`, e apontar a **URL do Webhook** para
      `https://nexadrill.shop/api/webhooks/asaas` (caminho completo, não a raiz `/`).
- [ ] Ativar canais de notificação (e-mail/SMS/WhatsApp) e ajustar a régua default.
- [ ] Preencher a tabela de **taxas** acima com os valores reais da conta.
- [ ] Definir `CRON_SECRET` no `.env.local` e agendar `GET /api/cron/atualizar-parcelas`
      (Vercel Cron, 1x/dia) com header `Authorization: Bearer <CRON_SECRET>`.
- [ ] Aplicar as migrations **011** (retrocompat de parcelas) e **012** (cliente Asaas).

## Estado da implementação (Fases 2–4)

- **Fase 2** — conclusão de serviço vira parcelas (à vista / parcelado / com sinal).
- **Fase 3** — `src/lib/asaas.ts` (cliente HTTP) + `actions-parcelas.ts` (criar, baixar,
  cancelar, editar, `gerarCobrancaAsaas`, resumo, listagem) + cron de atrasadas.
- **Fase 4** — `POST /api/webhooks/asaas`: valida token, é idempotente
  (`webhook_logs`), dá baixa e lança a receita no `PAYMENT_CONFIRMED/RECEIVED`.
- **Falta UI** (Fase 5): tela `dashboard/receber` que consome essas actions. O backend
  já está pronto; a cobrança/baixa só ainda não têm botão.

> Teste do ciclo real (sandbox): concluir serviço parcelado → `gerarCobrancaAsaas`
> → pagar o Pix de teste → webhook cai em `/api/webhooks/asaas` → parcela vira `pago`
> e a receita entra no financeiro. Exige a app publicada (URL do webhook acessível).
