import { createBrowserClient } from "@supabase/ssr";

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url.startsWith("http")) return null;
  return { url, key };
}

export function createClient() {
  const config = getConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.key);
}
