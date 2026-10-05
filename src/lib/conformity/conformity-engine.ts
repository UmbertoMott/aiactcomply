import { STORAGE_KEYS, readFromStorage } from "@/lib/dossier/storage-schema";
import { loadInventory } from "@/lib/inventory/ai-system";
import { referenceSystem } from "@/lib/inventory/classifier-bridge";
import { assessRisk } from "@/lib/obligations/engine";
import type {
  ClassifierResult, RiskManagerResult, DataAuditResult,
  DocugenResult, LogvaultResult, TransparencyResult,
  OversightResult, ResilienceResult, QMSResult,
  ProhibitedCheckResult,
} from "@/lib/dossier/storage-schema";

export type AssessmentPath = "self" | "notified_body" | "undetermined";

export interface PathDetermination {
  path: AssessmentPath;
  reason: string;
  mandatoryNotifiedBody: boolean;
  applicableArticle: string;
  annexIIIPoints: number[];
}

/** Punto dell'Allegato III da una stringa ("1a", "All. III, punto 1(a)", "1. Biometria"…). */
function annexIIIPoint(annexCategory: string | null): number | null {
  if (!annexCategory) return null;
  const c = annexCategory.toLowerCase();
  const m = c.match(/punto\s*(\d)/) ?? c.match(/^\s*(\d)/);
  if (m) return Number(m[1]);
  if (c.includes("biometr")) return 1;
  return null;
}

// Art. 43 Reg. (UE) 2024/1689:
// (1) Allegato III, punto 1: Allegato VI solo se il fornitore ha applicato integralmente norme armonizzate
//     o specifiche comuni; altrimenti Allegato VII con organismo notificato.
// (2) Allegato III, punti 2-8: controllo interno (Allegato VI), senza organismo notificato.
// (3) Allegato I, sezione A: procedura prevista dalla normativa di settore.
export function determineAssessmentPath(
  annexCategory: string | null,
  riskLevel: string
): PathDetermination {
  const level = (riskLevel || "").toLowerCase();
  if (!level || level === "minimal" || level === "limited" || level === "transparency") {
    return {
      path: "self",
      reason: "Per i sistemi non ad alto rischio non è prevista una valutazione della conformità ai sensi dell'Art. 43. Restano, se applicabili, gli obblighi di trasparenza dell'Art. 50.",
      mandatoryNotifiedBody: false,
      applicableArticle: "Art. 50",
      annexIIIPoints: [],
    };
  }
  if (level === "prohibited") {
    return {
      path: "undetermined",
      reason: "Il sistema rientra in una pratica vietata (Art. 5): non può essere immesso sul mercato, messo in servizio o usato, quindi non c'è valutazione della conformità da fare.",
      mandatoryNotifiedBody: false,
      applicableArticle: "Art. 5",
      annexIIIPoints: [],
    };
  }
  if (level.includes("annex_i") && !level.includes("annex_iii")) {
    return {
      path: "notified_body",
      reason: "Il sistema è un prodotto (o componente di sicurezza) dell'Allegato I, sezione A: segui la procedura di valutazione della normativa di settore, che include i requisiti del capo III, sezione 2 (Art. 43(3)). L'organismo notificato è quello previsto da quella normativa.",
      mandatoryNotifiedBody: false,
      applicableArticle: "Art. 43(3)",
      annexIIIPoints: [],
    };
  }
  const point = annexIIIPoint(annexCategory);
  if (point === 1) {
    return {
      path: "notified_body",
      reason: "Biometria (Allegato III, punto 1): puoi usare il controllo interno (Allegato VI) solo se hai applicato integralmente norme armonizzate o specifiche comuni; altrimenti serve l'organismo notificato (Allegato VII). Finché le norme armonizzate non sono pubblicate, considera l'organismo notificato (Art. 43(1)).",
      mandatoryNotifiedBody: true,
      applicableArticle: "Art. 43(1)",
      annexIIIPoints: [1],
    };
  }
  return {
    path: "self",
    reason: "Per i sistemi dell'Allegato III, punti 2-8, si applica il controllo interno (Allegato VI): nessun organismo notificato (Art. 43(2)).",
    mandatoryNotifiedBody: false,
    applicableArticle: "Art. 43(2)",
    annexIIIPoints: point ? [point] : [],
  };
}

export interface ConformityRequirement {
  id: string;
  article: string;
  title: string;
  description: string;
  verificationQuestion: string;
  linkedToolKey: keyof typeof STORAGE_KEYS | null;
  linkedToolHref: string | null;
  evidenceExtractor: (data: ConformityEvidence) => EvidenceStatus;
}

export interface EvidenceStatus {
  found: boolean;
  summary: string;
  completedAt?: string;
  autoVerified: boolean;
}

export interface ConformityEvidence {
  prohibited?: ProhibitedCheckResult | null;
  classifier?: ClassifierResult | null;
  riskManager?: RiskManagerResult | null;
  dataAudit?: DataAuditResult | null;
  docugen?: DocugenResult | null;
  logvault?: LogvaultResult | null;
  transparency?: TransparencyResult | null;
  oversight?: OversightResult | null;
  resilience?: ResilienceResult | null;
  qms?: QMSResult | null;
  art5?: "clear" | "prohibited" | null;
  annexIVFilled?: string[];
  qmsLettersDone?: string[];
}

// Controlli minimi sul CONTENUTO (non sulla sola presenza di un salvataggio).
// Non sostituiscono il giudizio di chi firma la dichiarazione: indicano cosa manca.

const TRANSPARENCY_REQUIRED = ["a", "b_i", "b_ii", "b_iii", "c", "d", "e"] as const; // Art. 13(3), voci non "se del caso"
const ANNEX_IV_REQUIRED = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s9"] as const;  // il punto 8 è la copia della dichiarazione
const QMS_LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"] as const;

const missing = (all: readonly string[], have: readonly string[]) => all.filter((x) => !have.includes(x));

export const CONFORMITY_REQUIREMENTS: ConformityRequirement[] = [
  {
    id: "req-art5",
    article: "Art. 5",
    title: "Assenza di pratiche vietate",
    description: "Il sistema non rientra in nessuna delle pratiche vietate dall'Art. 5.",
    verificationQuestion: "Il sistema è stato valutato nell'inventario e non risulta alcuna pratica vietata?",
    linkedToolKey: null,
    linkedToolHref: "/dashboard/tools/inventory",
    evidenceExtractor: (e) => ({
      found: e.art5 === "clear",
      autoVerified: e.art5 === "clear",
      summary: e.art5 === "clear" ? "✓ Valutazione del sistema: nessuna pratica vietata"
        : e.art5 === "prohibited" ? "✗ Il sistema rientra in una pratica vietata: non può essere immesso sul mercato"
        : "Sistema non ancora valutato nell'inventario (Passo 3)",
    }),
  },
  {
    id: "req-art9",
    article: "Art. 9",
    title: "Sistema di gestione dei rischi",
    description: "Rischi noti e prevedibili identificati, stimati e trattati, con rischio residuo accettabile (Art. 9(2) e 9(5)).",
    verificationQuestion: "Ogni rischio registrato ha una misura di trattamento e un rischio residuo accettabile?",
    linkedToolKey: "riskManager",
    linkedToolHref: "/dashboard/tools/risk-manager",
    evidenceExtractor: (e) => {
      const risks = e.riskManager?.risks ?? [];
      const noMeasure = risks.filter((r) => !r.mitigation?.trim()).length;
      const unacceptable = risks.filter((r) => r.residualRisk === "unacceptable").length;
      const ok = risks.length > 0 && noMeasure === 0 && unacceptable === 0;
      return {
        found: ok, autoVerified: ok,
        summary: !e.riskManager ? "Registro dei rischi non compilato"
          : risks.length === 0 ? "Nessun rischio registrato: il registro è vuoto"
          : ok ? `✓ ${risks.length} rischi, tutti con misura e rischio residuo accettabile`
          : `${risks.length} rischi: ${noMeasure} senza misura, ${unacceptable} con rischio residuo non accettabile`,
        completedAt: e.riskManager?.completedAt,
      };
    },
  },
  {
    id: "req-art10",
    article: "Art. 10",
    title: "Dati e governance dei dati",
    description: "I dataset di addestramento, convalida e prova sono documentati e verificati per qualità ed eventuali distorsioni (Art. 10(2)-(3)).",
    verificationQuestion: "Almeno un dataset è stato analizzato e l'esito complessivo non è negativo?",
    linkedToolKey: "dataAudit",
    linkedToolHref: "/dashboard/tools/data-audit",
    evidenceExtractor: (e) => {
      const ds = e.dataAudit?.datasets ?? [];
      const ok = ds.length > 0 && e.dataAudit?.overallQuality !== "fail";
      return {
        found: ok, autoVerified: ok,
        summary: !e.dataAudit ? "Qualità dei dati non analizzata"
          : ds.length === 0 ? "Nessun dataset analizzato"
          : ok ? `✓ ${ds.length} dataset analizzati — esito: ${e.dataAudit.overallQuality === "pass" ? "positivo" : "da rivedere"}`
          : `✗ ${ds.length} dataset analizzati — esito negativo (distorsioni o qualità insufficiente)`,
        completedAt: e.dataAudit?.completedAt,
      };
    },
  },
  {
    id: "req-art11",
    article: "Art. 11 + Allegato IV",
    title: "Documentazione tecnica",
    description: "La documentazione tecnica copre i punti dell'Allegato IV.",
    verificationQuestion: "I punti 1-7 e 9 dell'Allegato IV sono compilati?",
    linkedToolKey: null,
    linkedToolHref: "/dashboard/tools/docugen",
    evidenceExtractor: (e) => {
      const miss = missing(ANNEX_IV_REQUIRED, e.annexIVFilled ?? []);
      const ok = miss.length === 0;
      return {
        found: ok, autoVerified: ok,
        summary: ok ? "✓ Punti 1-7 e 9 dell'Allegato IV compilati"
          : `Punti dell'Allegato IV ancora vuoti: ${miss.map((x) => x.slice(1)).join(", ")}`,
      };
    },
  },
  {
    id: "req-art12",
    article: "Art. 12 + Art. 19",
    title: "Registrazione automatica degli eventi",
    description: "Il sistema registra automaticamente gli eventi (Art. 12) e i log sono conservati per almeno 6 mesi (Art. 19(1)).",
    verificationQuestion: "La registrazione è confermata e la conservazione è di almeno 6 mesi?",
    linkedToolKey: "logvault",
    linkedToolHref: "/dashboard/tools/logvault",
    evidenceExtractor: (e) => {
      const lv = e.logvault;
      const ok = !!lv && lv.loggingEnabled && lv.retentionDays >= 180;
      return {
        found: ok, autoVerified: ok,
        summary: !lv ? "Registro dei log non compilato"
          : !lv.loggingEnabled ? "Capacità di registrazione non confermata"
          : lv.retentionDays < 180 ? `Conservazione indicata inferiore a 6 mesi (${lv.retentionDays} giorni)`
          : `✓ Registrazione confermata — conservazione ${lv.retentionDays} giorni`,
        completedAt: lv?.completedAt,
      };
    },
  },
  {
    id: "req-art13",
    article: "Art. 13",
    title: "Istruzioni per l'uso",
    description: "Le istruzioni per l'uso contengono le informazioni dell'Art. 13(3).",
    verificationQuestion: "Le voci obbligatorie dell'Art. 13(3) sono compilate?",
    linkedToolKey: "transparency",
    linkedToolHref: "/dashboard/tools/transparency",
    evidenceExtractor: (e) => {
      const ins = e.transparency?.instructions ?? {};
      const have = Object.keys(ins).filter((k) => (ins[k] ?? "").trim().length > 0);
      const miss = missing(TRANSPARENCY_REQUIRED, have);
      const ok = !!e.transparency && miss.length === 0;
      return {
        found: ok, autoVerified: ok,
        summary: !e.transparency ? "Istruzioni per l'uso non compilate"
          : ok ? "✓ Voci obbligatorie dell'Art. 13(3) compilate"
          : `Voci dell'Art. 13(3) mancanti: ${miss.map((k) => `(${k.replace("_", ")(")})`).join(", ")}`,
        completedAt: e.transparency?.completedAt,
      };
    },
  },
  {
    id: "req-art14",
    article: "Art. 14",
    title: "Sorveglianza umana",
    description: "Misure di sorveglianza che consentono di capire, interpretare, non usare o ignorare l'output e interrompere il sistema (Art. 14(4)).",
    verificationQuestion: "I requisiti dell'Art. 14(4) sono attuati, inclusa la possibilità di arresto?",
    linkedToolKey: "oversight",
    linkedToolHref: "/dashboard/tools/oversight",
    evidenceExtractor: (e) => {
      const ov = e.oversight;
      const n = ov?.humanInterventionPoints.length ?? 0;
      const ok = !!ov && ov.stopCapability && n >= 5;
      return {
        found: ok, autoVerified: ok,
        summary: !ov ? "Sorveglianza umana non compilata"
          : ok ? "✓ Requisiti Art. 14(4)(a)-(e) attuati"
          : `${n}/5 requisiti dell'Art. 14(4) attuati${ov.stopCapability ? "" : "; arresto (lettera e) non attuato"}`,
        completedAt: ov?.completedAt,
      };
    },
  },
  {
    id: "req-art15",
    article: "Art. 15",
    title: "Accuratezza, robustezza e cibersicurezza",
    description: "Livelli di accuratezza dichiarati, robustezza provata e misure di cibersicurezza (Art. 15(1)-(5)).",
    verificationQuestion: "L'accuratezza raggiunge la soglia dichiarata, la robustezza è provata e ci sono misure di cibersicurezza?",
    linkedToolKey: "resilience",
    linkedToolHref: "/dashboard/tools/resilience",
    evidenceExtractor: (e) => {
      const r = e.resilience;
      const meetsThreshold = !!r && (r.accuracyThreshold === undefined || r.accuracyMetric >= r.accuracyThreshold);
      const ok = !!r && r.robustnessTested && r.accuracyMetric > 0 && meetsThreshold && r.cybersecurityMeasures.length > 0;
      const gaps = r ? [
        !r.robustnessTested && "robustezza non provata",
        !(r.accuracyMetric > 0) && "accuratezza non misurata",
        r.accuracyMetric > 0 && !meetsThreshold && `accuratezza ${r.accuracyMetric}% sotto la soglia ${r.accuracyThreshold}%`,
        r.cybersecurityMeasures.length === 0 && "nessuna misura di cibersicurezza",
      ].filter(Boolean) : [];
      return {
        found: ok, autoVerified: ok,
        summary: !r ? "Prove di robustezza non eseguite"
          : ok ? `✓ Accuratezza ${r.accuracyMetric}%, robustezza provata, ${r.cybersecurityMeasures.length} misure di cibersicurezza`
          : `Da completare: ${gaps.join("; ")}`,
        completedAt: r?.completedAt,
      };
    },
  },
  {
    id: "req-art17",
    article: "Art. 17",
    title: "Sistema di gestione della qualità",
    description: "Il sistema di gestione della qualità copre gli aspetti dell'Art. 17(1)(a)-(m), in modo proporzionato alle dimensioni del fornitore (Art. 17(2)).",
    verificationQuestion: "Tutte le lettere (a)-(m) dell'Art. 17(1) sono segnate come completate?",
    linkedToolKey: "qms",
    linkedToolHref: "/dashboard/tools/qms",
    evidenceExtractor: (e) => {
      const miss = missing(QMS_LETTERS, e.qmsLettersDone ?? []);
      const ok = miss.length === 0;
      return {
        found: ok, autoVerified: ok,
        summary: ok ? "✓ Lettere (a)-(m) dell'Art. 17(1) completate"
          : `Lettere dell'Art. 17(1) da completare: ${miss.join(", ")}`,
        completedAt: e.qms?.completedAt,
      };
    },
  },
];

/** Punti dell'Allegato IV con testo (stato DocuGen). */
function readAnnexIVFilled(): string[] {
  try {
    const raw = localStorage.getItem("docugen_state");
    const content = raw ? (JSON.parse(raw) as { content?: Record<string, string> }).content ?? {} : {};
    return Object.keys(content).filter((k) => (content[k] ?? "").trim().length > 0);
  } catch { return []; }
}

/** Lettere dell'Art. 17(1) segnate come completate nel QMS. */
function readQmsLettersDone(): string[] {
  try {
    const raw = localStorage.getItem("qms_sections");
    const sections = raw ? (JSON.parse(raw) as { art?: string; completed?: boolean; content?: string }[]) : [];
    return sections
      .filter((s) => s.completed && (s.content ?? "").trim().length > 0)
      .map((s) => s.art?.match(/17\(1\)\(([a-m])\)/)?.[1])
      .filter((x): x is string => !!x);
  } catch { return []; }
}

/** Art. 5 dal sistema valutato nell'inventario. */
function readArt5(): "clear" | "prohibited" | null {
  const sys = referenceSystem(loadInventory());
  if (!sys?.riskAnswers) return null;
  return assessRisk(sys.riskAnswers).prohibited.length > 0 ? "prohibited" : "clear";
}

export function loadAllEvidence(): ConformityEvidence {
  return {
    prohibited: readFromStorage<ProhibitedCheckResult>("prohibited"),
    classifier: readFromStorage<ClassifierResult>("classifier"),
    riskManager: readFromStorage<RiskManagerResult>("riskManager"),
    dataAudit: readFromStorage<DataAuditResult>("dataAudit"),
    docugen: readFromStorage<DocugenResult>("docugen"),
    logvault: readFromStorage<LogvaultResult>("logvault"),
    transparency: readFromStorage<TransparencyResult>("transparency"),
    oversight: readFromStorage<OversightResult>("oversight"),
    resilience: readFromStorage<ResilienceResult>("resilience"),
    qms: readFromStorage<QMSResult>("qms"),
    ...(typeof window !== "undefined"
      ? { art5: readArt5(), annexIVFilled: readAnnexIVFilled(), qmsLettersDone: readQmsLettersDone() }
      : {}),
  };
}

export interface AssessmentResult {
  requirementId: string;
  evidenceStatus: EvidenceStatus;
  manualOverride: boolean;
  manualNote: string;
}

export function calculateConformityScore(results: AssessmentResult[]): {
  score: number;
  passed: number;
  failed: number;
  total: number;
  readyForDeclaration: boolean;
} {
  const total = results.length;
  const passed = results.filter((r) => r.evidenceStatus.found || r.manualOverride).length;
  const failed = total - passed;
  const score = Math.round((passed / total) * 100);
  return { score, passed, failed, total, readyForDeclaration: score === 100 };
}

export function generateDeclarationOfConformity(
  evidence: ConformityEvidence,
  assessmentResults: AssessmentResult[],
  companyName: string,
  companyAddress: string,
  signatoryName: string,
  signatoryRole: string,
  path?: PathDetermination | null
): string {
  const today = new Date();
  const docId = `DCU-${today.getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const systemName = evidence.docugen?.systemName || evidence.classifier?.systemName || "[nome del sistema]";
  const procedure = path?.applicableArticle === "Art. 43(3)"
    ? "Procedura della normativa di settore (Art. 43(3))"
    : path?.mandatoryNotifiedBody
      ? "Allegato VII — valutazione del sistema di gestione della qualità e della documentazione tecnica con organismo notificato (Art. 43(1))"
      : "Allegato VI — controllo interno (Art. 43(2))";
  const nbLine = path?.mandatoryNotifiedBody || path?.applicableArticle === "Art. 43(3)"
    ? "   Organismo notificato: [nome] — numero di identificazione: [XXXX]\n   Procedura seguita: " + procedure + "\n   Certificato n.: [XXX] del [data]"
    : "   Non applicabile — " + procedure;

  return `DICHIARAZIONE DI CONFORMITÀ UE
Art. 47 e Allegato V — Regolamento (UE) 2024/1689
Documento n. ${docId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SISTEMA DI IA (nome, tipo e riferimento univoco)
   Nome: ${systemName}
   Tipo / versione: [indicare]
   Riferimento che consente l'identificazione e la tracciabilità: [indicare]

2. FORNITORE (o rappresentante autorizzato)
   Nome: ${companyName || "[ragione sociale]"}
   Indirizzo: ${companyAddress || "[indirizzo]"}

3. La presente dichiarazione di conformità UE è rilasciata sotto la responsabilità
   esclusiva del fornitore.

4. Il sistema di IA descritto al punto 1 è conforme al Regolamento (UE) 2024/1689
   e, se del caso, alla seguente altra normativa dell'Unione: [indicare o "nessuna"].

5. Se il sistema tratta dati personali: il sistema è conforme al Regolamento (UE) 2016/679
   e, se del caso, al Regolamento (UE) 2018/1725 e alla Direttiva (UE) 2016/680. [eliminare se non applicabile]

6. Norme armonizzate o specifiche comuni applicate: [indicare o "nessuna"]

7. Organismo notificato e procedura di valutazione della conformità:
${nbLine}

8. Luogo e data di rilascio: _____________, ${today.toLocaleDateString("it-IT")}
   Nome e funzione del firmatario: ${signatoryName || "[nome]"}, ${signatoryRole || "[funzione]"}
   Per conto di: ${companyName || "[ragione sociale]"}
   Firma: _________________________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nota interna (non fa parte della dichiarazione) — requisiti del capo III, sezione 2, verificati:
${assessmentResults.map((r) => {
  const req = CONFORMITY_REQUIREMENTS.find((cr) => cr.id === r.requirementId);
  const status = (r.evidenceStatus.found || r.manualOverride) ? "✓" : "✗";
  return `   ${status} ${req?.article} — ${req?.title}`;
}).join("\n")}
La dichiarazione va conservata per 10 anni dall'immissione sul mercato o dalla messa in servizio (Art. 47(1)).
ID documento: ${docId}`;
}

export const CONFORMITY_STORAGE_KEY = "aicomply_conformity_assessment";

export interface ConformitySnapshot {
  path: AssessmentPath;
  score: number;
  results: AssessmentResult[];
  declarationGenerated: boolean;
  ceMarkingApplied: boolean;
  registeredInDatabase: boolean;
  completedAt: string;
}

export function saveConformitySnapshot(s: ConformitySnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFORMITY_STORAGE_KEY, JSON.stringify(s));
}

export function loadConformitySnapshot(): ConformitySnapshot | null {
  try {
    if (typeof window === "undefined") return null;
    return JSON.parse(localStorage.getItem(CONFORMITY_STORAGE_KEY) || "null");
  } catch { return null; }
}
