import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url.startsWith("http")) return null;
  return { url, key };
}

/** Service-role admin client — never expose to browser */
export function createAdminClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL        ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY       ?? "";
  if (!url || !serviceKey) throw new Error("Admin client: env vars missing");
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createClient() {
  const config = getConfig();
  if (!config) {
    throw new Error("Supabase non configurato. Imposta NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });
}
