import type { AIActDeadline } from "./deadline-types";

/**
 * Separa le scadenze in attive / archiviate.
 *
 * Questo modello dati non traccia uno stato "completed" manuale (le scadenze
 * sono derivate a runtime dagli altri moduli, non gestite come task), quindi
 * il criterio di archiviazione si basa solo sulla data: una scadenza passata
 * da più di 30 giorni viene archiviata automaticamente — incluse le scadenze
 * statiche già ampiamente superate (Art. 5 / Art. 4, febbraio-agosto 2025).
 */
export function partitionDeadlines(deadlines: AIActDeadline[]): {
  active: AIActDeadline[];
  archived: AIActDeadline[];
} {
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 3_600_000;

  return deadlines.reduce(
    (acc, d) => {
      const dueMs = new Date(d.date).getTime();
      const isExpired = dueMs < now;
      const isOld = now - dueMs > THIRTY_DAYS_MS;

      if (isExpired && isOld) {
        acc.archived.push(d);
      } else {
        acc.active.push(d);
      }
      return acc;
    },
    { active: [] as AIActDeadline[], archived: [] as AIActDeadline[] }
  );
}
