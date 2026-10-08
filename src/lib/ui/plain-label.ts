// Testi visibili in linguaggio semplice: toglie i codici interni del template
// (es. "1A —", "§0 —", "WP248 §1") dalle etichette mostrate nella guida.
// Il documento generato e il PDF continuano a usare le etichette complete.

/** "1A — Contesto deployment" → "Contesto deployment"; "§0 — Scoping" → "Scoping" */
export function plainLabel(label: string): string {
  return label.replace(/^\s*(?:§\s*\d+[A-Za-z]?|\d+[A-Z]?|[A-D])\s*[—–-]\s+/, "").trim();
}

/** Tiene solo i riferimenti normativi: "WP248 §1 / Cons. 71 GDPR" → "Cons. 71 GDPR"; "Art. 9(1) · §0" → "Art. 9(1)" */
export function plainRef(ref: string): string {
  return ref
    .split(/\s+(?:\/|\+|·)\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !/^WP\s?248\b/i.test(part) && !/^§\s*\d/.test(part))
    .join(" · ");
}
