# NexaDrill

Sistema SaaS para gestão de perfuradores de poços artesianos: do orçamento ao recebimento, com foco em controle financeiro, margem por serviço e cobrança profissional.

## Visão Geral

O NexaDrill centraliza a operação comercial e financeira do perfurador em uma única plataforma:

- Gestão de clientes, orçamentos e serviços
- Conclusão de serviço com recebimento à vista, parcelado ou com sinal
- Contas a receber com cobrança Pix/boleto via Asaas
- Dashboard com KPIs operacionais e financeiros (incluindo DSO)
- Controle de margem prevista x margem realizada por poço

## Principais Funcionalidades

### Operação comercial

- Cadastro completo de clientes com validação de CPF/CNPJ
- Criação e acompanhamento de orçamentos
- Gestão do ciclo de vida do serviço (andamento, conclusão, cancelamento)

### Cobrança e recebimento

- Parcelamento por serviço com baixa manual e por webhook
- Geração de cobrança com idempotência (evita duplicidade)
- QR Pix, copia-e-cola, link de pagamento e boleto
- Envio manual de cobrança no WhatsApp

### Inteligência financeira

- Dashboard com receitas, despesas e evolução mensal
- Indicadores de contas a receber (total, atrasado, DSO)
- Margem por serviço com visão prevista e realizada

## Stack Técnica

- Next.js 14 (App Router) + React + TypeScript
- Supabase/Postgres para persistência
- better-auth para autenticação (OTP por e-mail)
- Tailwind CSS para interface
- Asaas para cobrança e webhook de pagamento

## Estrutura do Projeto

```text
src/
	app/                  # Rotas e páginas (dashboard, APIs, auth)
	components/           # Componentes de UI e domínio
	lib/                  # Helpers, validações, integrações (Asaas/Auth)
	types/                # Tipos TypeScript do domínio
supabase/migrations/    # Evolução do schema SQL
scripts/                # Seeds e testes utilitários
docs/                   # Planos e documentação interna
```

## Como Rodar Localmente

### 1) Pré-requisitos

- Node.js 18+
- Banco Postgres/Supabase configurado
- SMTP configurado para envio de OTP

### 2) Instalação

```bash
npm install
```

### 3) Variáveis de ambiente

Crie o arquivo `.env.local` com base em `.env.example`:

```bash
cp .env.example .env.local
```

Preencha os grupos principais:

- Banco/Supabase (`DATABASE_URL`, `SUPABASE_*`)
- Auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
- SMTP (`SMTP_*`)
- Asaas (`ASAAS_API_URL`, `ASAAS_API_KEY*`, `ASAAS_WEBHOOK_TOKEN`)
- Cron (`CRON_SECRET`)

### 4) Aplicar migrations

```bash
npm run migration
```

### 5) Executar o projeto

```bash
npm run dev
```

Aplicação disponível em `http://localhost:3000`.

## Scripts Úteis

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` — build de produção
- `npm run start` — inicia app em produção
- `npm run lint` — linting
- `npm run migration` — aplica migrations SQL
- `npm run migration:show` — exibe estado das migrations
- `npm run migration:revert` — reverte migration mais recente
- `npm run test:isolation` — smoke test de isolamento multi-tenant
- `npm run seed:demo` — popula dados de demonstração

## Demo Seed

Ao executar `npm run seed:demo`, o sistema cria/atualiza um ambiente de demonstração:

- E-mail: `demo@aguaboa.com`
- Nome: `Perfurações Água Boa`
- Slug público: `perfuracoes-agua-boa-demo`

> O login usa OTP por e-mail. Garanta SMTP válido para autenticar no usuário demo.

## Qualidade e Segurança

- Isolamento multi-tenant validado por teste automatizado
- Endpoints críticos de cobrança com idempotência
- Regras de integridade no banco (índices únicos e funções transacionais)

## Deploy

Deploy recomendado na Vercel.

Checklist mínimo de produção:

- Definir variáveis de ambiente de produção
- Configurar webhook Asaas para `/api/webhooks/asaas`
- Configurar cron para `/api/cron/atualizar-parcelas`
- Rodar build e validações antes de publicar

## Roadmap

- UX avançada de régua de cobrança
- Relatórios financeiros mais analíticos
- Evolução de automações comerciais

## Licença

Projeto privado de uso interno/comercial.
