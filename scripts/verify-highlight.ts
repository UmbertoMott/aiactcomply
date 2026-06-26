// One-off verification for the Legal Assistant highlight logic. Run: npx tsx scripts/verify-highlight.ts
import { buildHighlightModel, findSalientRanges, tokenizeQuery } from "../src/lib/legal/highlight";

let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  const ok = cond ? "PASS" : "FAIL";
  if (!cond) failed++;
  console.log(`  [${ok}] ${name}${cond ? "" : "  →  " + JSON.stringify(detail)}`);
}

function salientText(text: string): string[] {
  return findSalientRanges(text).map((r) => text.slice(r.start, r.end));
}

console.log("Tier 1 — legal salience");
const t1 =
  "Le sanzioni amministrative possono raggiungere € 35.000.000 o, se superiore, il 7% del fatturato mondiale totale annuo. Il fornitore deve garantire la conformità entro il 2 dicembre 2026. È vietato immettere sul mercato tali sistemi ai sensi dell'articolo 5.";
const s1 = salientText(t1);
console.log("    →", JSON.stringify(s1));
check("cattura importo €", s1.some((x) => x.includes("35.000.000")), s1);
check("cattura percentuale + coda fatturato", s1.some((x) => x.startsWith("7%")), s1);
check("cattura data scadenza", s1.some((x) => /2 dicembre 2026/.test(x)), s1);
check("cattura obbligo 'deve'", s1.some((x) => x.toLowerCase() === "deve"), s1);
check("cattura divieto 'È vietato'", s1.some((x) => /vietato/i.test(x)), s1);
check("cattura riferimento 'articolo 5'", s1.some((x) => /articolo 5/i.test(x)), s1);

console.log("\nTier 1 — niente split dentro i numeri");
check(
  "35.000.000 resta un solo token salient",
  s1.filter((x) => x.includes("35.000.000")).length === 1,
  s1
);

console.log("\nTier 2 — rilevanza sulla domanda");
const query =
  "Quali sanzioni amministrative sono previste per le pratiche vietate di intelligenza artificiale?";
console.log("    stems:", JSON.stringify(tokenizeQuery(query)));
const model = buildHighlightModel(t1, query);
const relevantSentences = model
  .map((s, i) => ({ i, relevant: s.relevant, text: s.segments.map((g) => g.text).join("") }))
  .filter((s) => s.relevant);
console.log("    relevant:", JSON.stringify(relevantSentences.map((r) => r.text.trim())));
check("almeno una frase rilevante", relevantSentences.length >= 1, relevantSentences);
check(
  "la frase delle sanzioni è marcata rilevante",
  relevantSentences.some((r) => /sanzioni/i.test(r.text)),
  relevantSentences
);
check("non evidenzia TUTTE le frasi (≤2)", relevantSentences.length <= 2, relevantSentences);

console.log("\nIntegrità — la concatenazione ricostruisce il testo originale");
const reconstructed = model.map((s) => s.segments.map((g) => g.text).join("")).join("");
check("ricostruzione identica", reconstructed === t1, {
  origLen: t1.length,
  rebuiltLen: reconstructed.length,
});

console.log("\nEdge cases");
check("testo vuoto → modello vuoto", buildHighlightModel("", query).length === 0);
const noQuery = buildHighlightModel(t1, "");
check("senza domanda → nessun Tier 2", noQuery.every((s) => !s.relevant));
check("senza domanda → Tier 1 ancora attivo", noQuery.some((s) => s.segments.some((g) => g.salient)));

console.log(failed === 0 ? "\n✅ TUTTI I CHECK PASSATI" : `\n❌ ${failed} CHECK FALLITI`);
process.exit(failed === 0 ? 0 : 1);
