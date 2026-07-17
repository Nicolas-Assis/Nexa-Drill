#!/usr/bin/env bash
set -euo pipefail

# Sync env vars from .env.local to Vercel production
# and deploy the app.
#
# Usage:
#   DOMAIN=https://www.nexadrill.shop ROOT_DOMAIN=https://nexadrill.shop ./scripts/vercel-prod-sync.sh
#
# Optional:
#   SKIP_DEPLOY=1 ./scripts/vercel-prod-sync.sh

DOMAIN="${DOMAIN:-https://nexadrill.shop}"
ROOT_DOMAIN="${ROOT_DOMAIN:-https://www.nexadrill.shop}"
ENV_FILE="${ENV_FILE:-.env.local}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Arquivo de ambiente não encontrado: $ENV_FILE"
  exit 1
fi

extract_env() {
  local key="$1"
  local line value

  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 || true)"
  [[ -z "$line" ]] && return 1

  value="${line#*=}"
  value="${value%$'\r'}"

  if [[ "$value" =~ ^\".*\"$ ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "$value"
}

normalize_special_value() {
  local key="$1"
  local value="$2"

  case "$key" in
    ASAAS_API_KEY|ASAAS_API_KEY_SANDBOX)
      value="${value//\\\$/\$}"
      ;;
  esac

  printf '%s' "$value"
}

upsert_env() {
  local key="$1"
  local value="$2"

  npx vercel env rm "$key" production -y >/dev/null 2>&1 || true
  printf '%s\n' "$value" | npx vercel env add "$key" production >/dev/null
  echo "✅ $key"
}

echo "➡️ Verificando acesso Vercel..."
npx vercel whoami >/dev/null 2>&1 || npx vercel login

if [[ ! -d ".vercel" ]]; then
  echo "➡️ Fazendo link do projeto..."
  npx vercel link --yes
fi

echo "➡️ Carregando URLs de banco..."
DATABASE_URL="$(extract_env DATABASE_URL || true)"
DIRECT_URL="$(extract_env DIRECT_URL || true)"

if [[ -z "$DATABASE_URL" ]]; then
  echo "❌ DATABASE_URL ausente em $ENV_FILE"
  exit 1
fi

if [[ "$DATABASE_URL" == *"db."*".supabase.co"* ]]; then
  if [[ "$DIRECT_URL" == *"pooler.supabase.com"* ]]; then
    echo "ℹ️ DATABASE_URL usa db.*; trocando para pooler (DIRECT_URL) em produção."
    DATABASE_URL="$DIRECT_URL"
  else
    echo "❌ DATABASE_URL aponta para db.* e DIRECT_URL não é pooler válido."
    echo "   Copie a Connection String de Pooling no painel do Supabase e atualize o .env.local."
    exit 1
  fi
fi

if [[ "$DATABASE_URL" != *"pooler.supabase.com"* ]]; then
  echo "⚠️ DATABASE_URL não parece pooler; o recomendado na Vercel é pooler (IPv4)."
fi

upsert_env "DATABASE_URL" "$DATABASE_URL"
[[ -n "$DIRECT_URL" ]] && upsert_env "DIRECT_URL" "$DIRECT_URL"

echo "➡️ Sincronizando variáveis obrigatórias..."
required_keys=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  BETTER_AUTH_SECRET
  SMTP_HOST
  SMTP_PORT
  SMTP_SECURE
  SMTP_USER
  SMTP_PASS
  SMTP_FROM
)

for key in "${required_keys[@]}"; do
  value="$(extract_env "$key" || true)"
  if [[ -z "$value" ]]; then
    echo "❌ Variável obrigatória ausente: $key"
    exit 1
  fi

  value="$(normalize_special_value "$key" "$value")"
  upsert_env "$key" "$value"
done

echo "➡️ Sincronizando variáveis opcionais..."
optional_keys=(
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ASAAS_API_URL
  ASAAS_API_KEY
  ASAAS_API_KEY_SANDBOX
  ASAAS_WEBHOOK_TOKEN
  CRON_SECRET
  OPENROUTER_API_KEY
  LLM_MODEL
)

for key in "${optional_keys[@]}"; do
  value="$(extract_env "$key" || true)"
  if [[ -n "$value" ]]; then
    value="$(normalize_special_value "$key" "$value")"
    upsert_env "$key" "$value"
  else
    echo "ℹ️ Opcional ausente: $key"
  fi
done

echo "➡️ Aplicando overrides de produção para auth/origens..."
upsert_env "BETTER_AUTH_URL" "$DOMAIN"
upsert_env "NEXT_PUBLIC_APP_URL" "$DOMAIN"
upsert_env "BETTER_AUTH_TRUSTED_ORIGINS" "${DOMAIN},${ROOT_DOMAIN}"

if [[ "$SKIP_DEPLOY" == "1" ]]; then
  echo "⏭️ SKIP_DEPLOY=1, deploy não executado."
  exit 0
fi

echo "➡️ Fazendo deploy de produção..."
npx vercel deploy --prod --yes >/dev/null

echo "🎉 Concluído: variáveis sincronizadas e deploy feito."
echo "Dica: rode 'npx vercel env ls' para validar rapidamente."#!/usr/bin/env bash
set -euo pipefail

# Uso:
#   DOMAIN=https://www.nexadrill.shop ROOT_DOMAIN=https://nexadrill.shop ./scripts/vercel-prod-sync.sh
# Ou:
#   ./scripts/vercel-prod-sync.sh

DOMAIN="${DOMAIN:-https://www.nexadrill.shop}"
ROOT_DOMAIN="${ROOT_DOMAIN:-https://nexadrill.shop}"

if [ ! -f ".env.local" ]; then
  echo "❌ .env.local não encontrado"
  exit 1
fi

extract_env() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env.local | tail -n1 || true)"
  [ -z "$line" ] && return 1
  local val="${line#*=}"
  val="${val%$'\r'}"
  if [[ "$val" =~ ^\".*\"$ ]]; then
    val="${val:1:${#val}-2}"
  fi
  printf '%s' "$val"
}

upsert_env() {
  local key="$1"
  local value="$2"
  npx vercel env rm "$key" production -y >/dev/null 2>&1 || true
  printf '%s' "$value" | npx vercel env add "$key" production >/dev/null
  echo "✅ $key"
}

echo "➡️ Validando login/link do Vercel..."
npx vercel whoami >/dev/null 2>&1 || npx vercel login
[ -d ".vercel" ] || npx vercel link

# -------- DATABASE_URL (fix principal) --------
DB_URL="$(extract_env DATABASE_URL || true)"
DIRECT_URL="$(extract_env DIRECT_URL || true)"

if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL ausente no .env.local"
  exit 1
fi

# Se vier com db.<ref>.supabase.co (IPv6), troca para pooler
if [[ "$DB_URL" == *"db."*".supabase.co"* ]]; then
  if [[ "$DIRECT_URL" == *"pooler.supabase.com"* ]]; then
    echo "ℹ️ DATABASE_URL local usa db.*; usando DIRECT_URL (pooler) em produção."
    DB_URL="$DIRECT_URL"
  else
    echo "❌ DATABASE_URL está em db.* e DIRECT_URL não parece pooler. Corrija no Supabase e tente novamente."
    exit 1
  fi
fi

if [[ "$DB_URL" != *"pooler.supabase.com"* ]]; then
  echo "⚠️ DATABASE_URL não parece pooler. Prosseguindo, mas o ideal é usar pooler no Vercel."
fi

upsert_env "DATABASE_URL" "$DB_URL"
[ -n "$DIRECT_URL" ] && upsert_env "DIRECT_URL" "$DIRECT_URL"

# -------- Variáveis obrigatórias --------
REQUIRED_KEYS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  BETTER_AUTH_SECRET
  SMTP_HOST
  SMTP_PORT
  SMTP_SECURE
  SMTP_USER
  SMTP_PASS
  SMTP_FROM
)

for key in "${REQUIRED_KEYS[@]}"; do
  val="$(extract_env "$key" || true)"
  if [ -z "$val" ]; then
    echo "❌ Variável obrigatória ausente: $key"
    exit 1
  fi
  upsert_env "$key" "$val"
done

# -------- Variáveis opcionais --------
OPTIONAL_KEYS=(
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ASAAS_API_URL
  ASAAS_API_KEY
  ASAAS_API_KEY_SANDBOX
  ASAAS_WEBHOOK_TOKEN
  CRON_SECRET
  OPENROUTER_API_KEY
  LLM_MODEL
)

for key in "${OPTIONAL_KEYS[@]}"; do
  val="$(extract_env "$key" || true)"
  [ -n "$val" ] && upsert_env "$key" "$val" || echo "ℹ️ Opcional não encontrada: $key"
done

# -------- Overrides de produção --------
upsert_env "BETTER_AUTH_URL" "$DOMAIN"
upsert_env "NEXT_PUBLIC_APP_URL" "$DOMAIN"
upsert_env "BETTER_AUTH_TRUSTED_ORIGINS" "${DOMAIN},${ROOT_DOMAIN}"

echo "➡️ Fazendo deploy de produção..."
npx vercel deploy --prod --yes >/dev/null

echo ""
echo "🎉 Finalizado."
echo "Verificação rápida:"
echo "1) npx vercel env ls"
echo "2) garantir que DATABASE_URL está em pooler.supabase.com"
echo "3) testar login OTP no domínio de produção"
