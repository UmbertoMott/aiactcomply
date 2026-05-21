// Output ID Generator — shared with audit trail (C-03)
// Format: [TYPE]-[YYYYMMDD]-[NNN]
// SSR-safe: returns "GEN-00000000-000" on server side

export type OutputType =
  | "AIA" | "RSK" | "DAT" | "DOC" | "LOG" | "TRS"
  | "OVS" | "RES" | "QMS" | "FRI" | "CNF" | "GPA"
  | "XAI" | "DOS" | "GEN";

export function generateOutputId(type: OutputType): string {
  if (typeof window === "undefined") return `${type}-00000000-000`;
  const today = new Date();
  const date = today.toISOString().slice(0, 10).replace(/-/g, "");
  const counterKey = `aicomply_output_counter_${date}`;
  const current = parseInt(localStorage.getItem(counterKey) ?? "0") + 1;
  localStorage.setItem(counterKey, String(current));
  const nn = String(current).padStart(3, "0");
  return `${type}-${date}-${nn}`;
}

/** Reads the last generated ID for a given date without incrementing */
export function peekLastOutputId(date?: string): string | null {
  if (typeof window === "undefined") return null;
  const d = date ?? new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = localStorage.getItem(`aicomply_output_counter_${d}`);
  return count ? `GEN-${d}-${count.padStart(3, "0")}` : null;
}
