// src/lib/assessment/correlation-map.ts
// Dati statici: mappa tema di rischio → riferimenti normativi WP29 + DIHR + CFR

import type { ComplianceRef } from "./assessment-schema";

export interface CorrelationTheme {
  themeId: string;
  label: string;
  isAbsolute: boolean;
  wp29: ComplianceRef[];
  dihr: ComplianceRef[];
  cfr: ComplianceRef[];
}

export const CORRELATION_MAP: CorrelationTheme[] = [
  {
    themeId: "automated_decision",
    label: "Decisione automatizzata su persone",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 22" },
      { framework: "WP29", citation: "WP248 §necessità" },
    ],
    dihr: [
      { framework: "DIHR", citation: "Step 3–4" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 8" },
      { framework: "CFR", citation: "CFR Art. 21" },
    ],
  },
  {
    themeId: "profiling_scoring",
    label: "Profilazione / scoring",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 35(3)(a)" },
      { framework: "WP29", citation: "WP248 rights_checks" },
    ],
    dihr: [
      { framework: "DIHR", citation: "Step 4" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 1" },
      { framework: "CFR", citation: "CFR Art. 21" },
    ],
  },
  {
    themeId: "special_categories",
    label: "Trattamento categorie particolari",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 9" },
      { framework: "GDPR", citation: "Art. 35(3)(b)" },
    ],
    dihr: [
      { framework: "DIHR", citation: "Step 4" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 21" },
    ],
  },
  {
    themeId: "surveillance_monitoring",
    label: "Sorveglianza / monitoraggio",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 35(3)(c)" },
    ],
    dihr: [
      { framework: "DIHR", citation: "Step 3" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 7" },
      { framework: "CFR", citation: "CFR Art. 8" },
    ],
  },
  {
    themeId: "international_transfers",
    label: "Trasferimenti internazionali",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 44–49" },
    ],
    dihr: [],
    cfr: [],
  },
  {
    themeId: "absolute_rights",
    label: "Diritti assoluti (dignità, divieto tortura)",
    isAbsolute: true,
    wp29: [],
    dihr: [
      { framework: "DIHR", citation: "§3.2" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 1" },
      { framework: "CFR", citation: "CFR Art. 4" },
    ],
  },
];

/** Dato un themeId restituisce tutti i refs (wp29 + dihr + cfr uniti). */
export function getRefsForTheme(themeId: string): ComplianceRef[] {
  const theme = CORRELATION_MAP.find(t => t.themeId === themeId);
  if (!theme) return [];
  return [...theme.wp29, ...theme.dihr, ...theme.cfr];
}

/** Dato il right_id FUNDAMENTAL_RIGHTS (es. "nondiscrimination") mappa al themeId più vicino. */
export function rightIdToThemeId(rightId: string): string {
  const map: Record<string, string> = {
    dignity: "absolute_rights",
    prohibition_torture: "absolute_rights",
    nondiscrimination: "profiling_scoring",
    data_protection: "special_categories",
    privacy: "surveillance_monitoring",
    effective_remedy: "automated_decision",
  };
  return map[rightId] ?? "automated_decision";
}
