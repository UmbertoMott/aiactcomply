// Deontological deliverable gate.
//
// Modello "una veste sola — Avvocato": il deliverable finale (parere e documenti
// di conformità) è prestazione professionale resa dall'Avvocato nell'ambito
// dell'incarico. Il cliente NON deve poter generare e scaricare in autonomia il
// deliverable finale (art. 18 L. 247/2012 + CDF): sarebbe vendita di software.
//
// Oggi l'unico utente è l'Avvocato titolare (allowlist pre-lancio), che DEVE
// poter esportare per svolgere la prestazione. Perciò il blocco duro è
// disattivato di default e si abilita — senza toccare codice — quando esisterà
// un accesso "cliente", tramite la env pubblica NEXT_PUBLIC_DELIVERABLE_GATE=on.
//
// La cornice deontologica (output = "bozza interna di lavorazione", deliverable
// finale reso dall'Avvocato) è invece SEMPRE visibile via AIOutputLabel ed
// ExportFooter, indipendentemente da questo flag.

export function isFinalExportBlocked(): boolean {
  return process.env.NEXT_PUBLIC_DELIVERABLE_GATE === "on";
}
