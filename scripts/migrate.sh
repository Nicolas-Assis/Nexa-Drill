#!/usr/bin/env bash
# ============================================================
# NexaDrill - Script de Migrations via Supabase
# Uso:
#   npm run migration          → aplica todas as migrations pendentes
#   npm run migration:show     → lista migrations aplicadas
#   npm run migration:revert   → reverte a última migration
# ============================================================

set -euo pipefail

# Carrega variáveis do .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep 'DATABASE_URL' | xargs)
fi

DB_URL="${DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL não definida no .env.local"
  exit 1
fi

MIGRATIONS_DIR="supabase/migrations"
ACTION="${1:-apply}"

case "$ACTION" in
  apply)
    echo "🚀 Aplicando migrations..."
    for file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
      filename=$(basename "$file")
      echo "  → Executando: $filename"
      psql "$DB_URL" -f "$file" 2>&1
      echo "  ✅ $filename aplicada"
    done
    echo "🎉 Todas as migrations foram aplicadas!"
    ;;

  show)
    echo "📋 Migrations disponíveis em $MIGRATIONS_DIR/:"
    echo ""
    for file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
      filename=$(basename "$file")
      lines=$(wc -l < "$file")
      echo "  📄 $filename ($lines linhas)"
    done
    echo ""
    echo "📊 Tabelas no banco:"
    psql "$DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>&1
    ;;

  revert)
    echo "⚠️  Revertendo schema (DROP de todas as tabelas públicas)..."
    echo ""
    read -p "Tem certeza? Isso vai APAGAR todos os dados! (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      echo "Cancelado."
      exit 0
    fi
    psql "$DB_URL" <<'SQL'
      -- Remove triggers primeiro
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      DROP TRIGGER IF EXISTS perfuradores_updated_at ON public.perfuradores;
      DROP TRIGGER IF EXISTS orcamentos_updated_at ON public.orcamentos;

      -- Remove tabelas (ordem importa por causa das FKs)
      DROP TABLE IF EXISTS public.financeiro CASCADE;
      DROP TABLE IF EXISTS public.servicos CASCADE;
      DROP TABLE IF EXISTS public.orcamentos CASCADE;
      DROP TABLE IF EXISTS public.clientes CASCADE;
      DROP TABLE IF EXISTS public.perfuradores CASCADE;

      -- Remove funções
      DROP FUNCTION IF EXISTS public.handle_updated_at();
      DROP FUNCTION IF EXISTS public.generate_unique_slug(TEXT);
      DROP FUNCTION IF EXISTS public.handle_new_user();
SQL
    echo "✅ Schema revertido com sucesso."
    ;;

  *)
    echo "Uso: $0 {apply|show|revert}"
    exit 1
    ;;
esac
