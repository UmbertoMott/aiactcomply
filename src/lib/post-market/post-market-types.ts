// Post-Market Monitoring types — PROMPT AQ (Art. 72 AI Act)
// ✦ AI — verifica e conferma: struttura obblighi Art. 72(1)-(6) ricostruita
// dalla memoria del modello — validare contro testo consolidato Reg. (UE) 2024/1689.

export type DataCollectionFrequency = "continuous" | "monthly" | "quarterly" | "annual";

export interface AnnexIIILawEnforcementItem {
  id: string;
  label: string;
  reference: string;
  completed: boolean;
  notes?: string;
}

export interface LogVaultMetricsSnapshot {
  periodStart: string;
  periodEnd: string;
  totalEvents: number;
  errorRate?: number;
  anomalyCount?: number;
  lastImportDate?: string;
  hasRealData: boolean;
}

export interface FlaggedAnomaly {
  metric: string;
  description: string;
  riskRegisterRef?: string;
  severity: "high" | "medium" | "low";
}

export interface PostMarketMonitoringPlan {
  systemId: string;
  pmmSystemDescription: string;
  monitoringMethodology: string;
  dataCollectionFrequency: DataCollectionFrequency;
  inServiceDate?: string;        // ISO date — sync con DocuGen Annex IV §9
  nextReportDueDate?: string;    // calcolato: inServiceDate + frequenza — esposto a deadline-aggregator
  linkedRiskRegisterId?: string;
  annex3LawEnforcementChecklist?: AnnexIIILawEnforcementItem[];
  deployerFeedbackSummary?: string;
  isAnnex3LawEnforcement?: boolean;
  aiConfirmed: boolean;
  updatedAt?: string;
}

export interface PostMarketReport {
  id: string;
  systemId: string;
  periodStart: string;
  periodEnd: string;
  metricsSnapshot: LogVaultMetricsSnapshot;
  narrative: string;
  flaggedAnomalies: FlaggedAnomaly[];
  deployerFeedbackSummary?: string;
  aiConfirmed: boolean;
  createdAt: string;
}

const PMM_PLAN_KEY = "aicomply_pmm_plan_v1";
const PMM_REPORTS_KEY = "aicomply_pmm_reports_v1";

export function loadPMMPlan(): PostMarketMonitoringPlan {
  const empty: PostMarketMonitoringPlan = {
    systemId: "default",
    pmmSystemDescription: "",
    monitoringMethodology: "",
    dataCollectionFrequency: "quarterly",
    aiConfirmed: false,
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(PMM_PLAN_KEY);
    return raw ? JSON.parse(raw) : empty;
  } catch { return empty; }
}

export function savePMMPlan(plan: PostMarketMonitoringPlan): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PMM_PLAN_KEY, JSON.stringify({ ...plan, updatedAt: new Date().toISOString() }));
  // Sync inServiceDate to DocuGen Annex IV field if set
  if (plan.inServiceDate) {
    try {
      const docuKey = "aicomply_docugen_record";
      const docuRaw = localStorage.getItem(docuKey);
      if (docuRaw) {
        const docu = JSON.parse(docuRaw);
        if (!docu.inServiceDate) {
          localStorage.setItem(docuKey, JSON.stringify({ ...docu, inServiceDate: plan.inServiceDate }));
        }
      }
    } catch { /* silent — sync best-effort */ }
  }
}

export function loadPMMReports(): PostMarketReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PMM_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePMMReports(reports: PostMarketReport[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PMM_REPORTS_KEY, JSON.stringify(reports));
}

// Annex III law enforcement checklist items
// ✦ AI — verifica e conferma: numerazione punti Annex III da verificare sul testo consolidato
export const ANNEX3_LAW_ENFORCEMENT_CHECKLIST: AnnexIIILawEnforcementItem[] = [
  {
    id: "le_1",
    label: "Valutazione impatto specifico su diritti fondamentali delle persone sottoposte a misure di polizia",
    reference: "Annex III pt. 1(a) [verify against current AI Act text]",
    completed: false,
  },
  {
    id: "le_2",
    label: "Documentazione delle salvaguardie procedurali specifiche per sistemi biometrici in contesti di law enforcement",
    reference: "Annex III pt. 6 [verify against current AI Act text]",
    completed: false,
  },
  {
    id: "le_3",
    label: "Revisione periodica dell'impatto su gruppi vulnerabili (minori, rifugiati) per sistemi migrazione/asilo",
    reference: "Annex III pt. 7 [verify against current AI Act text]",
    completed: false,
  },
  {
    id: "le_4",
    label: "Notifica all'autorità di sorveglianza del mercato competente per casi di rischio sistemico",
    reference: "Art. 72(3) + Annex III [verify against current AI Act text]",
    completed: false,
  },
];

// Compute next report due date from inServiceDate + frequency
export function computeNextReportDue(inServiceDate: string, frequency: DataCollectionFrequency): string {
  const base = new Date(inServiceDate);
  const monthsMap: Record<DataCollectionFrequency, number> = {
    continuous: 1, monthly: 1, quarterly: 3, annual: 12,
  };
  base.setMonth(base.getMonth() + monthsMap[frequency]);
  return base.toISOString().slice(0, 10);
}
