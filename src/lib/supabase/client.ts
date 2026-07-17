import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and anon/publishable key env vars",
    );
  }

  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key);
}
