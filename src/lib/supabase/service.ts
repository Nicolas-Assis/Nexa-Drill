import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client com SERVICE_ROLE_KEY — bypassa toda RLS.
 * APENAS para uso em Server Actions / Server Components.
 * NUNCA expor no client-side.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars",
    );
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
