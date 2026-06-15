// Provider Transition — tipi, costanti e logica di business (Art. 28 AI Act)
// ✦ AI — verifica e conferma: TRANSITION_CHECKS, computeTransitionVerdict e PROVIDER_OBLIGATIONS
// sono ricostruiti dalla memoria del modello a partire da PROMPT_J. Validare contro Art. 28
// e Art. 3(23) del testo consolidato Reg. (UE) 2024/1689. [verify against current AI Act text]

export const ANSWERS_KEY = "provider_transition_answers";
export const MODS_KEY    = "provider_transition_modifications";
export const OBL_KEY     = "provider_transition_obligations";

export type TransitionAnswer = "yes" | "no" | "unsure" | null;
export type Verdict = "provider" | "risk" | "deployer" | "incomplete";

export interface ProviderTransitionCheck {
  id: string;
  question: string;
  explanation: string;
  trigger_article: string;
  is_trigger: boolean;
}

export interface ModificationRecord {
  id: string;
  date: string;
  description: string;
  type: "retraining" | "integration" | "purpose" | "maintenance" | "other";
  is_substantial: boolean | null;
  notes: string;
  assessed_by: string;
  assessed_date: string;
  source: "manual" | "logvault_auto";
}

// Extended ProviderTransitionResult — backward-compatible with storage-schema.ts
export interface ProviderTransitionResultExtended {
  verdict: Verdict;
  triggered_checks: string[];
  modification_count: number;
  substantial_modifications: number;
  earliestSubstantialModificationDate?: string;
  completedAt: string;
}

export const TRANSITION_CHECKS: ProviderTransitionCheck[] = [
  {
    id: "own_name",
    question: "Hai immesso o intendi immettere il sistema sul mercato UE sotto il tuo nome commerciale o marchio?",
    explanation: "Se il prodotto viene presentato al mercato come tuo (es. con il tuo brand sul packaging, nel contratto o nell'interfaccia) anche se sviluppato da altri, sei considerato provider.",
    trigger_article: "Art. 28(1)(a) [verify against current AI Act text]",
    is_trigger: true,
  },
  {
    id: "purpose_change",
    question: "Hai cambiato lo scopo d'uso del sistema rispetto a quello dichiarato dal provider originale nelle istruzioni operative?",
    explanation: "Se il provider ha dichiarato che il sistema serve per X (es. screening CV) e tu lo usi per Y (es. valutazione performance dipendenti), si tratta di una modifica dello scopo previsto.",
    trigger_article: "Art. 28(1)(b) + Art. 3(23) [verify against current AI Act text]",
    is_trigger: true,
  },
  {
    id: "retraining",
    question: "Hai ri-addestrato, fine-tunato o aggiornato il modello AI con nuovi dati o nuovi obiettivi?",
    explanation: "Qualsiasi retraining o fine-tuning che alteri le prestazioni o il comportamento del modello è considerato modifica sostanziale, anche se limitato a uno strato del modello.",
    trigger_article: "Art. 28(1)(b) + Art. 3(23)(a) [verify against current AI Act text]",
    is_trigger: true,
  },
  {
    id: "performance_impact",
    question: "Hai integrato il sistema con altri moduli, API o database in modo da alterarne le prestazioni o l'accuratezza complessiva?",
    explanation: "L'integrazione con sistemi esterni che modifica significativamente l'output finale (es. aggiungere un layer di decisione automatica) può configurare una modifica sostanziale.",
    trigger_article: "Art. 28(1)(b) + Art. 3(23)(b) [verify against current AI Act text]",
    is_trigger: true,
  },
  {
    id: "safety_degradation",
    question: "Hai apportato modifiche che potrebbero ridurre la conformità del sistema ai requisiti di sicurezza o accuratezza dichiarati dal provider?",
    explanation: "Disabilitare safety filter, modificare soglie di confidenza, rimuovere meccanismi di override umano: tutte modifiche che peggiorano la conformità configurano trigger Art. 28.",
    trigger_article: "Art. 28(1)(b) + Art. 3(23)(c) [verify against current AI Act text]",
    is_trigger: true,
  },
  {
    id: "ordinary_maintenance",
    question: "Le modifiche apportate rientrano nella manutenzione ordinaria (patch di sicurezza, aggiornamenti UI, correzioni bug senza impatto funzionale) come definita dal provider?",
    explanation: "La manutenzione ordinaria esplicitamente prevista nelle istruzioni del provider non configura modifica sostanziale. Ma deve essere documentata.",
    trigger_article: "Art. 3(23) — eccezione [verify against current AI Act text]",
    is_trigger: false,
  },
];

export const MOD_TYPE_LABELS: Record<ModificationRecord["type"], string> = {
  retraining:  "Ri-addestramento / Fine-tuning",
  integration: "Integrazione con sistemi esterni",
  purpose:     "Modifica scopo previsto",
  maintenance: "Manutenzione ordinaria",
  other:       "Altro",
};

export const PROVIDER_OBLIGATIONS: {
  id: string; label: string; href: string; art: string;
  source: "derived" | "manual"; unavailable?: boolean;
}[] = [
  {
    id: "docugen",
    label: "Documentazione tecnica (Annex IV)",
    art: "Art. 11 [verify against current AI Act text]",
    href: "/dashboard/tools/docugen",
    source: "derived",
  },
  {
    id: "qms",
    label: "Sistema di gestione qualità",
    art: "Art. 17 [verify against current AI Act text]",
    href: "#",
    source: "manual",
    unavailable: true,
  },
  {
    id: "conformity",
    label: "Conformity Assessment",
    art: "Art. 43 [verify against current AI Act text]",
    href: "#",
    source: "manual",
    unavailable: true,
  },
  {
    id: "declaration",
    label: "Dichiarazione di Conformità UE + Marcatura CE",
    art: "Art. 47-48 [verify against current AI Act text]",
    href: "/dashboard/tools/docugen",
    source: "derived",
  },
  {
    id: "eudb",
    label: "Registrazione EUDB",
    art: "Art. 49 [verify against current AI Act text]",
    href: "/dashboard/compliance-ops/eudb",
    source: "derived",
  },
  {
    id: "postmarket",
    label: "Piano di monitoraggio post-market",
    art: "Art. 72 [verify against current AI Act text]",
    href: "/dashboard/post-market",
    source: "derived",
  },
];

export function computeTransitionVerdict(
  checks: ProviderTransitionCheck[],
  answers: Record<string, TransitionAnswer>,
): Verdict {
  const triggeredYes    = checks.filter(c => c.is_trigger && answers[c.id] === "yes");
  const triggeredUnsure = checks.filter(c => c.is_trigger && answers[c.id] === "unsure");
  const maintenanceYes  = answers["ordinary_maintenance"] === "yes";

  if (triggeredYes.length > 0 && !maintenanceYes) return "provider";
  if (triggeredUnsure.length > 0 || (triggeredYes.length > 0 && maintenanceYes)) return "risk";
  if (Object.values(answers).some(v => v === null)) return "incomplete";
  return "deployer";
}

export function initAnswers(): Record<string, TransitionAnswer> {
  const init: Record<string, TransitionAnswer> = {};
  TRANSITION_CHECKS.forEach(c => { init[c.id] = null; });
  return init;
}

export function loadAnswers(): Record<string, TransitionAnswer> {
  try {
    if (typeof window === "undefined") return initAnswers();
    const raw = localStorage.getItem(ANSWERS_KEY);
    if (!raw) return initAnswers();
    return { ...initAnswers(), ...(JSON.parse(raw) as Record<string, TransitionAnswer>) };
  } catch { return initAnswers(); }
}

export function loadMods(): ModificationRecord[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(MODS_KEY);
    return raw ? (JSON.parse(raw) as ModificationRecord[]) : [];
  } catch { return []; }
}

export function loadObligDone(): Record<string, boolean> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(OBL_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch { return {}; }
}

export function getEarliestSubstantialDate(mods: ModificationRecord[]): string | undefined {
  const substDates = mods
    .filter(m => m.is_substantial === true)
    .map(m => m.date)
    .sort();
  return substDates[0];
}

// Reads derived obligation status from localStorage cross-module data
export function getDerivedObligationsDone(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  try {
    // docugen — annexIVCompleted
    const docu = localStorage.getItem("aicomply_docugen_record");
    if (docu) {
      const d = JSON.parse(docu) as Record<string, unknown>;
      result["docugen"] = Boolean(d.annexIVCompleted ?? d.annexiv_completed);
      result["declaration"] = Boolean(d.art50_completed ?? d.completedAt);
    }
    // eudb
    const eudb = localStorage.getItem("aicomply_eudb_result");
    if (eudb) {
      const e = JSON.parse(eudb) as Record<string, unknown>;
      result["eudb"] = Boolean(e.registration_number ?? e.eudb_registration_number);
    }
    // postmarket
    const pmm = localStorage.getItem("aicomply_pmm_plan_v1");
    if (pmm) {
      const p = JSON.parse(pmm) as Record<string, unknown>;
      result["postmarket"] = Boolean(p.inServiceDate ?? p.monitoringMethodology);
    }
  } catch { /* silent */ }
  return result;
}

export function emptyNewMod(): Omit<ModificationRecord, "id"> {
  return {
    date: new Date().toISOString().slice(0, 10),
    description: "",
    type: "other",
    is_substantial: null,
    notes: "",
    assessed_by: "",
    assessed_date: "",
    source: "manual",
  };
}
