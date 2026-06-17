// Annex VIII formal validator — PROMPT BF
// [verify against current AI Act text]

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

const REQUIRED_SECTION_A: Array<{ field: keyof EudbDraft; label: string; artRef: string }> = [
  { field: "providerName",    label: "Nome fornitore",      artRef: "Allegato VIII(A)(1)" },
  { field: "providerAddress", label: "Indirizzo fornitore", artRef: "Allegato VIII(A)(2)" },
  { field: "providerContact", label: "Contatto fornitore",  artRef: "Allegato VIII(A)(3)" },
];

const REQUIRED_SECTION_B: Array<{ field: keyof EudbDraft; label: string; artRef: string }> = [
  { field: "systemName",        label: "Nome sistema AI",        artRef: "Allegato VIII(B)(1)" },
  { field: "intendedPurpose",   label: "Scopo d'uso previsto",   artRef: "Allegato VIII(B)(3)" },
  { field: "annexIIIReference", label: "Categoria Allegato III", artRef: "Allegato VIII(B)(4)" },
];

const REQUIRED_ALLEGATI: Array<{ field: keyof EudbDraft; label: string; artRef: string }> = [
  { field: "annexIVCompleted",       label: "Documentazione tecnica (Annex IV)",  artRef: "Art. 11" },
  { field: "euDeclarationReady",     label: "Dichiarazione di conformità UE",      artRef: "Art. 47" },
  { field: "instructionsForUseReady",label: "Istruzioni d'uso",                    artRef: "Art. 13" },
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
