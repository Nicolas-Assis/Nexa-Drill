import { Pool } from "pg";

// Instância compartilhada para evitar múltiplas conexões em dev
const globalForDb = globalThis as unknown as { pool: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // necessário para Supabase
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}
