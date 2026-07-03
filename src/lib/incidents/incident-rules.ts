// Normative config — Art. 73 Reg. (UE) 2024/1689
// Termini reattivi: deadlineDays = min delle categorie selezionate

export interface IncidentCategory {
  id: string;
  label: string;
  articleRef: string;
  deadlineDays: number;
  deadlineArtRef: string;
}

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  {
    id: "death",
    label: "Morte di una persona",
    articleRef: "Art. 3(49)(d)",
    deadlineDays: 10,
    deadlineArtRef: "Art. 73(4)",
  },
  {
    id: "serious_health",
    label: "Danno grave e irreversibile alla salute",
    articleRef: "Art. 3(49)(a)",
    deadlineDays: 15,
    deadlineArtRef: "Art. 73(2)",
  },
  {
    id: "critical_infra",
    label: "Danno grave a infrastrutture critiche",
    articleRef: "Art. 73(3)",
    deadlineDays: 2,
    deadlineArtRef: "Art. 73(3)",
  },
  {
    id: "fundamental_rights",
    label: "Violazione grave dei diritti fondamentali",
    articleRef: "Art. 3(49)(b)",
    deadlineDays: 15,
    deadlineArtRef: "Art. 73(2)",
  },
  {
    id: "property_env",
    label: "Danno grave a proprietà o ambiente",
    articleRef: "Art. 3(49)(c)",
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
