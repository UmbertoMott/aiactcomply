// Normative config — Art. 73 Reg. (UE) 2024/1689
// Termini reattivi: deadlineDays = min delle categorie selezionate

export interface IncidentCategory {
  id: string;
  label: string;
  articleRef: string;
  deadlineDays: number;
  deadlineArtRef: string;
}

// Incidente grave: Art. 3(49), lettere a)-d). Termini: Art. 73(2) 15 giorni; 73(3) 2 giorni per
// infrazione diffusa (Art. 3(61)) o incidente della lettera b); 73(4) 10 giorni in caso di decesso.
export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  {
    id: "death",
    label: "Decesso di una persona",
    articleRef: "Art. 3(49)(a)",
    deadlineDays: 10,
    deadlineArtRef: "Art. 73(4)",
  },
  {
    id: "serious_health",
    label: "Gravi danni alla salute di una persona",
    articleRef: "Art. 3(49)(a)",
    deadlineDays: 15,
    deadlineArtRef: "Art. 73(2)",
  },
  {
    id: "critical_infra",
    label: "Perturbazione grave e irreversibile della gestione o del funzionamento di infrastrutture critiche",
    articleRef: "Art. 3(49)(b)",
    deadlineDays: 2,
    deadlineArtRef: "Art. 73(3)",
  },
  {
    id: "widespread",
    label: "Infrazione diffusa (più Stati membri)",
    articleRef: "Art. 3(61)",
    deadlineDays: 2,
    deadlineArtRef: "Art. 73(3)",
  },
  {
    id: "fundamental_rights",
    label: "Violazione degli obblighi del diritto dell'Unione a tutela dei diritti fondamentali",
    articleRef: "Art. 3(49)(c)",
    deadlineDays: 15,
    deadlineArtRef: "Art. 73(2)",
  },
  {
    id: "property_env",
    label: "Gravi danni alle cose o all'ambiente",
    articleRef: "Art. 3(49)(d)",
    deadlineDays: 15,
    deadlineArtRef: "Art. 73(2)",
  },
];

export interface DeadlineResult {
  days: number;
  artRef: string;
}

export function computeDeadline(selectedIds: string[]): DeadlineResult | null {
  const selected = INCIDENT_CATEGORIES.filter(c => selectedIds.includes(c.id));
  if (selected.length === 0) return null;
  const min = selected.reduce((prev, cur) => cur.deadlineDays < prev.deadlineDays ? cur : prev);
  return { days: min.deadlineDays, artRef: min.deadlineArtRef };
}
