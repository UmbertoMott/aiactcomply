// Annex VIII formal validator — PROMPT BF
//

import type { EudbDraft } from "@/types/eudb";

export interface ValidationError {
  field: keyof EudbDraft;
  section: "A" | "B" | "allegati";
  message: string;
  artRef: string;
}

export interface ValidationWarning {
  field: keyof EudbDraft;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Riferimenti: Allegato VIII, sezione A (fornitori, Art. 49(1)) del Reg. (UE) 2024/1689.
// Le chiavi interne "A" / "B" indicano i gruppi del form (fornitore / sistema), non le sezioni
// dell'Allegato VIII.
const REQUIRED_SECTION_A: Array<{ field: keyof EudbDraft; label: string; artRef: string }> = [
  { field: "providerName",    label: "Nome fornitore",      artRef: "Allegato VIII, sez. A, punto 1" },
  { field: "providerAddress", label: "Indirizzo fornitore", artRef: "Allegato VIII, sez. A, punto 1" },
  { field: "providerContact", label: "Contatto fornitore",  artRef: "Allegato VIII, sez. A, punto 1" },
];

const REQUIRED_SECTION_B: Array<{ field: keyof EudbDraft; label: string; artRef: string }> = [
  { field: "systemName",        label: "Denominazione commerciale del sistema di IA", artRef: "Allegato VIII, sez. A, punto 4" },
  { field: "intendedPurpose",   label: "Finalità prevista",   artRef: "Allegato VIII, sez. A, punto 5" },
  // Non è un punto dell'Allegato VIII: serve a stabilire l'obbligo di registrazione (Art. 49(1), Allegato III)
  { field: "annexIIIReference", label: "Caso d'uso dell'Allegato III", artRef: "Art. 49(1) · Allegato III" },
];

const REQUIRED_ALLEGATI: Array<{ field: keyof EudbDraft; label: string; artRef: string }> = [
  { field: "annexIVCompleted",       label: "Documentazione tecnica (Allegato IV)", artRef: "Art. 11" },
  { field: "euDeclarationReady",     label: "Dichiarazione di conformità UE",      artRef: "Art. 47 · Allegato VIII, sez. A, punto 11" },
  { field: "instructionsForUseReady",label: "Istruzioni per l'uso",                artRef: "Art. 13 · Allegato VIII, sez. A, punto 12" },
];

export function validateEudbDraft(draft: EudbDraft): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const { field, label, artRef } of REQUIRED_SECTION_A) {
    if (!draft[field]) {
      errors.push({ field, section: "A", message: `${label} obbligatorio`, artRef });
    }
  }

  for (const { field, label, artRef } of REQUIRED_SECTION_B) {
    if (!draft[field]) {
      errors.push({ field, section: "B", message: `${label} obbligatorio`, artRef });
    }
  }

  for (const { field, label, artRef } of REQUIRED_ALLEGATI) {
    if (!draft[field]) {
      errors.push({
        field,
        section: "allegati",
        message: `${label} non completato — necessario prima della registrazione`,
        artRef,
      });
    }
  }

  if (!draft.systemVersion) {
    warnings.push({
      field: "systemVersion",
      message: "Versione sistema non specificata — consigliata per tracciabilità",
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function countErrorsBySection(result: ValidationResult) {
  return {
    sectionA: result.errors.filter(e => e.section === "A").length,
    sectionB: result.errors.filter(e => e.section === "B").length,
    allegati: result.errors.filter(e => e.section === "allegati").length,
  };
}
