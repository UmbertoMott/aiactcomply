// Etichette italiane per i livelli salvati in inglese nei dati (high, medium, low…).
const LEVEL_IT: Record<string, string> = {
  unacceptable: "inaccettabile", prohibited: "vietato", critical: "critico", very_high: "molto alto",
  high: "alto", medium: "medio", limited: "limitato", low: "basso", minimal: "minimo", negligible: "trascurabile",
  pass: "adeguata", review: "da rivedere", fail: "inadeguata",
};

export function levelLabel(level: string | null | undefined): string {
  if (!level) return "—";
  return LEVEL_IT[level.toLowerCase()] ?? level;
}
