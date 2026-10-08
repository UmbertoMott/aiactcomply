// Cambio di ruolo deployer → fornitore — tipi, costanti e logica (Art. 25 AI Act).
// Riferimenti al testo del Reg. (UE) 2024/1689: Art. 25(1)(a)-(c) (responsabilità
// lungo la catena del valore), Art. 3(23) (modifica sostanziale), Art. 43(4)
// (cambiamenti predeterminati), Art. 16 (obblighi del fornitore).

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
    question: "Hai apposto (o intendi apporre) il tuo nome o marchio su un sistema di IA ad alto rischio già immesso sul mercato o messo in servizio?",
    explanation: "Chi appone il proprio nome o marchio su un sistema ad alto rischio è considerato fornitore e assume gli obblighi dell'Art. 16, fatti salvi gli accordi contrattuali che ripartiscono diversamente gli obblighi.",
    trigger_article: "Art. 25(1)(a)",
    is_trigger: true,
  },
  {
    id: "purpose_change",
    question: "Hai modificato la finalità prevista del sistema rispetto a quella dichiarata dal fornitore originale?",
    explanation: "Se il sistema era già ad alto rischio, cambiarne la finalità prevista è una modifica sostanziale (Art. 25(1)(b), Art. 3(23)). Se non era ad alto rischio — anche se è un sistema per finalità generali — e con la nuova finalità lo diventa ai sensi dell'Art. 6, diventi fornitore (Art. 25(1)(c)).",
    trigger_article: "Art. 25(1)(b)-(c)",
    is_trigger: true,
  },
  {
    id: "retraining",
    question: "Hai ri-addestrato o fatto fine-tuning del modello in modo non previsto dalla valutazione di conformità iniziale del fornitore?",
    explanation: "Il ri-addestramento è modifica sostanziale solo se non era previsto nella valutazione di conformità iniziale e incide sulla conformità ai requisiti del Capo III, Sezione 2 (Art. 3(23)). I cambiamenti predeterminati per i sistemi che continuano ad apprendere dopo l'immissione sul mercato non lo sono (Art. 43(4)).",
    trigger_article: "Art. 25(1)(b) · Art. 3(23)",
    is_trigger: true,
  },
  {
    id: "performance_impact",
    question: "Hai integrato il sistema con altri moduli, API o basi dati in modo da alterarne prestazioni o accuratezza?",
    explanation: "Un'integrazione costituisce modifica sostanziale se non era prevista dal fornitore e incide sulla conformità ai requisiti — ad esempio accuratezza e robustezza (Art. 15) o sorveglianza umana (Art. 14).",
    trigger_article: "Art. 25(1)(b) · Art. 3(23)",
    is_trigger: true,
  },
  {
    id: "safety_degradation",
    question: "Hai disattivato o modificato misure di sicurezza, soglie o meccanismi di intervento umano previsti dal fornitore?",
    explanation: "Disattivare filtri di sicurezza, modificare soglie di confidenza o rimuovere la possibilità di intervento umano incide sulla conformità ai requisiti del Capo III, Sezione 2: è una modifica sostanziale (Art. 3(23)).",
    trigger_article: "Art. 25(1)(b) · Art. 3(23)",
    is_trigger: true,
  },
  {
    id: "ordinary_maintenance",
    question: "Le modifiche rientrano tra quelle previste e pianificate dal fornitore (patch di sicurezza, aggiornamenti dell'interfaccia, correzioni senza impatto funzionale)?",
    explanation: "Le modifiche previste nella valutazione di conformità iniziale — compresi i cambiamenti predeterminati dei sistemi che continuano ad apprendere (Art. 43(4)) — non sono modifiche sostanziali. Vanno comunque documentate.",
    trigger_article: "Art. 3(23) — esclusione",
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
    label: "Documentazione tecnica (Allegato IV)",
    art: "Art. 11",
    href: "/dashboard/tools/docugen",
    source: "derived",
  },
  {
    id: "qms",
    label: "Sistema di gestione della qualità",
    art: "Art. 17",
    href: "/dashboard/tools/qms",
    source: "manual",
  },
  {
    id: "conformity",
    label: "Valutazione della conformità",
    art: "Art. 43",
    href: "/dashboard/tools/conformity",
    source: "manual",
  },
  {
    id: "declaration",
    label: "Dichiarazione di Conformità UE + Marcatura CE",
    art: "Art. 47-48",
    href: "/dashboard/tools/docugen",
    source: "derived",
  },
  {
    id: "eudb",
    label: "Registrazione EUDB",
    art: "Art. 49",
    href: "/dashboard/compliance-ops/eudb",
    source: "derived",
  },
  {
    id: "postmarket",
    label: "Piano di monitoraggio post-market",
    art: "Art. 72",
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
