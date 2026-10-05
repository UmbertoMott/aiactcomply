import { STORAGE_KEYS, readFromStorage } from "@/lib/dossier/storage-schema";
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
}

export const CONFORMITY_REQUIREMENTS: ConformityRequirement[] = [
  {
    id: "req-art5",
    article: "Art. 5",
    title: "Assenza di pratiche vietate",
    description: "Il sistema non implementa nessuna delle pratiche vietate dall'Art. 5.",
    verificationQuestion: "Hai verificato che il sistema non rientra in nessuna pratica vietata (manipolazione, social scoring, biometrica vietata, ecc.)?",
    linkedToolKey: "prohibited",
    linkedToolHref: "/dashboard/triage",
    evidenceExtractor: (e) => ({
      found: !!e.prohibited,
      autoVerified: !!e.prohibited,
      summary: e.prohibited
        ? e.prohibited.verdict === "clear"
          ? "✓ Verifica Art. 5 completata — nessuna pratica vietata rilevata"
          : `⚠️ Verifica Art. 5 completata — verdict: ${e.prohibited.verdict}`
        : "Tool Art. 5 Checker non completato",
      completedAt: e.prohibited?.completedAt,
    }),
  },
  {
    id: "req-art9",
    article: "Art. 9",
    title: "Sistema di gestione dei rischi",
    description: "È stato implementato e documentato un sistema iterativo di gestione dei rischi per l'intero ciclo di vita del sistema di IA.",
    verificationQuestion: "Il Risk Manager è stato completato e i rischi residui sono a livello accettabile?",
    linkedToolKey: "riskManager",
    linkedToolHref: "/dashboard/tools/risk-manager",
    evidenceExtractor: (e) => ({
      found: !!e.riskManager,
      autoVerified: !!e.riskManager,
      summary: e.riskManager
        ? `✓ Risk Manager completato — livello complessivo: ${e.riskManager.overallRiskLevel}`
        : "Risk Manager non completato — obbligatorio per Art. 9",
      completedAt: e.riskManager?.completedAt,
    }),
  },
  {
    id: "req-art10",
    article: "Art. 10",
    title: "Governance dati e dataset",
    description: "I dataset usati per training, validazione e test soddisfano i requisiti di qualità, sono documentati e privi di bias significativi.",
    verificationQuestion: "Il Data Audit è stato completato con esito positivo (qualità: pass)?",
    linkedToolKey: "dataAudit",
    linkedToolHref: "/dashboard/tools/data-audit",
    evidenceExtractor: (e) => ({
      found: !!e.dataAudit,
      autoVerified: !!e.dataAudit,
      summary: e.dataAudit
        ? `✓ Data Audit completato — qualità: ${e.dataAudit.overallQuality}`
        : "Data Audit non completato — obbligatorio per Art. 10",
      completedAt: e.dataAudit?.completedAt,
    }),
  },
  {
    id: "req-art11",
    article: "Art. 11 + Allegato IV",
    title: "Documentazione tecnica",
    description: "La documentazione tecnica conforme all'Allegato IV è stata redatta e viene mantenuta aggiornata.",
    verificationQuestion: "DocuGen AI è stato completato e la documentazione tecnica è pronta?",
    linkedToolKey: "docugen",
    linkedToolHref: "/dashboard/tools/docugen",
    evidenceExtractor: (e) => ({
      found: !!e.docugen,
      autoVerified: !!e.docugen,
      summary: e.docugen
        ? `✓ Documentazione tecnica generata per: ${e.docugen.systemName}`
        : "DocuGen non completato — documentazione tecnica obbligatoria",
      completedAt: e.docugen?.completedAt,
    }),
  },
  {
    id: "req-art12",
    article: "Art. 12",
    title: "Registrazione automatica log",
    description: "Il sistema è configurato per registrare automaticamente eventi rilevanti durante il suo funzionamento.",
    verificationQuestion: "LogVault è configurato con retention adeguata e logging degli eventi critici?",
    linkedToolKey: "logvault",
    linkedToolHref: "/dashboard/tools/logvault",
    evidenceExtractor: (e) => ({
      found: !!e.logvault,
      autoVerified: !!e.logvault,
      summary: e.logvault
        ? e.logvault.loggingEnabled
          ? `✓ Logging abilitato — retention: ${e.logvault.retentionDays} giorni`
          : "⚠️ LogVault configurato ma logging disabilitato"
        : "LogVault non completato — logging obbligatorio",
      completedAt: e.logvault?.completedAt,
    }),
  },
  {
    id: "req-art13",
    article: "Art. 13",
    title: "Trasparenza verso gli utenti",
    description: "Il sistema è sufficientemente trasparente da consentire agli utenti di interpretare i risultati e usarlo in modo appropriato.",
    verificationQuestion: "Le informative di trasparenza verso gli utenti sono state predisposte?",
    linkedToolKey: "transparency",
    linkedToolHref: "/dashboard/tools/transparency",
    evidenceExtractor: (e) => ({
      found: !!e.transparency,
      autoVerified: !!e.transparency,
      summary: e.transparency
        ? `✓ Trasparenza configurata — lingue: ${e.transparency.languagesAvailable?.join(", ") || "N/D"}`
        : "Tool Trasparenza non completato",
      completedAt: e.transparency?.completedAt,
    }),
  },
  {
    id: "req-art14",
    article: "Art. 14",
    title: "Sorveglianza umana",
    description: "Sono predisposte misure che consentono alle persone fisiche di sorvegliare efficacemente il sistema di IA durante il suo utilizzo.",
    verificationQuestion: "Il meccanismo di oversight umano e la capacità di intervento/stop sono documentati?",
    linkedToolKey: "oversight",
    linkedToolHref: "/dashboard/tools/oversight",
    evidenceExtractor: (e) => ({
      found: !!e.oversight,
      autoVerified: !!e.oversight,
      summary: e.oversight
        ? `✓ Oversight configurato — stop capability: ${e.oversight.stopCapability ? "sì" : "no"}`
        : "Tool Oversight non completato — obbligatorio per Art. 14",
      completedAt: e.oversight?.completedAt,
    }),
  },
  {
    id: "req-art15",
    article: "Art. 15",
    title: "Accuratezza, robustezza e cybersecurity",
    description: "Il sistema è sufficientemente accurato, robusto e sicuro rispetto alla destinazione d'uso.",
    verificationQuestion: "Il Red Teaming (Resilience) è stato completato con punteggio difesa accettabile?",
    linkedToolKey: "resilience",
    linkedToolHref: "/dashboard/tools/resilience",
    evidenceExtractor: (e) => ({
      found: !!e.resilience,
      autoVerified: !!e.resilience,
      summary: e.resilience
        ? `✓ Resilience testata — accuratezza: ${e.resilience.accuracyMetric}%`
        : "Tool Resilience non completato — obbligatorio per Art. 15",
      completedAt: e.resilience?.completedAt,
    }),
  },
  {
    id: "req-art17",
    article: "Art. 17",
    title: "Sistema di gestione della qualità",
    description: "Il provider ha implementato un sistema di gestione della qualità che copre tutti gli aspetti del ciclo di vita del sistema di IA.",
    verificationQuestion: "Il QMS Builder è stato completato con almeno le sezioni obbligatorie?",
    linkedToolKey: "qms",
    linkedToolHref: "/dashboard/tools/qms",
    evidenceExtractor: (e) => ({
      found: !!e.qms,
      autoVerified: !!e.qms,
      summary: e.qms
        ? `✓ QMS documentato — ref: ${e.qms.qmsDocumentRef}`
        : "QMS Builder non completato — obbligatorio per Art. 17",
      completedAt: e.qms?.completedAt,
    }),
  },
];

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
