// Server-side output ID generator — C-03 authoritative singleton
// Uses PostgreSQL sequence via Supabase for multi-instance safety.
// Shares format [TIPO]-[YYYYMMDD]-[NNN] with C-04 client-side generator.
// This server version is the canonical source for all persisted audit records.

import type { OutputType } from "@/lib/disclosure/output-id";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Generates a server-side output ID using the PostgreSQL sequence.
 * Falls back to a timestamp-based ID if Supabase is unavailable.
 * MUST be called BEFORE insertAuditRecord so the ID is known upfront.
 */
export async function generateServerOutputId(
  type: OutputType,
  supabase: { rpc: (fn: string, args: Record<string, string>) => Promise<{ data: string | null; error: unknown }> }
): Promise<string> {
  const date = todayDate();

  try {
    const { data, error } = await supabase.rpc("next_output_id_counter", {
      p_type: type,
      p_date: date,
    });
    if (error || !data) throw new Error("sequence rpc failed");
    return data as string;
  } catch {
    // Fallback: timestamp-based ID (not sequential but unique)
    const ts = Date.now().toString().slice(-6);
    return `${type}-${date}-${ts}`;
  }
}
