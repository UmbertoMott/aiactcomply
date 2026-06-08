// src/lib/db/client.ts
// Supabase server client per Server Actions e API Routes
// NON usare nel browser — solo server-side

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client autenticato con i cookie di sessione dell'utente.
 * Rispetta le RLS policy di Supabase.
 */
export async function getDbClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // In Server Components i cookies sono read-only, ignora
          }
        },
      },
    }
  );
}

/**
 * Client admin con service role key.
 * Bypassa RLS — usare solo per operazioni pubbliche (es. Trust Center URL).
 * MAI esporre al browser.
 */
export async function getDbAdminClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
