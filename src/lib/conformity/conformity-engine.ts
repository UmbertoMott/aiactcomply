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

export function determineAssessmentPath(
  annexCategory: string | null,
  riskLevel: string
): PathDetermination {
  if (!riskLevel || riskLevel === "Minimal" || riskLevel === "Limited" || riskLevel === "minimal" || riskLevel === "limited") {
    return {
      path: "self",
      reason: "Sistemi a rischio limitato o minimo non richiedono valutazione formale ex Art. 43. Applicabili solo obblighi di trasparenza (Art. 50).",
      mandatoryNotifiedBody: false,
      applicableArticle: "Art. 50",
      annexIIIPoints: [],
    };
  }
  if (annexCategory?.includes("1.") || annexCategory?.toLowerCase().includes("biometr")) {
    return {
      path: "notified_body",
      reason: "I sistemi di identificazione biometrica remota in spazi pubblici (Allegato III punto 1) richiedono valutazione di conformità da parte di un organismo notificato ai sensi dell'Art. 43.1.",
      mandatoryNotifiedBody: true,
      applicableArticle: "Art. 43.1",
      annexIIIPoints: [1],
    };
  }
  if (annexCategory?.includes("6.") || annexCategory?.toLowerCase().includes("law enforcement") || annexCategory?.toLowerCase().includes("contrasto")) {
    return {
      path: "notified_body",
      reason: "I sistemi usati da autorità di contrasto (Allegato III punto 6) richiedono valutazione da organismo notificato ai sensi dell'Art. 43.1.",
      mandatoryNotifiedBody: true,
      applicableArticle: "Art. 43.1",
      annexIIIPoints: [6],
    };
  }
  if (annexCategory?.includes("7.") || annexCategory?.toLowerCase().includes("migrazione") || annexCategory?.toLowerCase().includes("frontiera")) {
    return {
      path: "notified_body",
      reason: "I sistemi per migrazione e controllo delle frontiere (Allegato III punto 7) richiedono valutazione da organismo notificato.",
      mandatoryNotifiedBody: true,
      applicableArticle: "Art. 43.1",
      annexIIIPoints: [7],
    };
  }
  return {
    path: "self",
    reason: "Il tuo sistema rientra nell'Allegato III ma non nelle categorie che richiedono organismo notificato. Puoi procedere con l'auto-valutazione ai sensi dell'Art. 43.2.",
    mandatoryNotifiedBody: false,
    applicableArticle: "Art. 43.2",
    annexIIIPoints: [],
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
    linkedToolHref: "/dashboard/tools/prohibited",
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
    description: "È stato implementato e documentato un sistema iterativo di gestione dei rischi per l'intero ciclo di vita del sistema AI.",
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
    description: "Sono predisposte misure che consentono alle persone fisiche di sorvegliare efficacemente il sistema AI durante il suo utilizzo.",
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
    description: "Il provider ha implementato un sistema di gestione della qualità che copre tutti gli aspetti del ciclo di vita del sistema AI.",
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
  signatoryRole: string
): string {
  const today = new Date();
  const docId = `DCU-${today.getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const systemName = evidence.docugen?.systemName || evidence.classifier?.systemName || "Sistema AI";
  const provider = evidence.docugen?.provider || companyName;

  return `DICHIARAZIONE DI CONFORMITÀ UE
Allegato V — Regolamento UE 2024/1689 (AI Act)
Documento n. ${docId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SISTEMA AI
   Nome: ${systemName}
   Provider/Fornitore: ${provider}
   Versione: ${evidence.docugen?.systemName ? "v1.0" : "N/D"}
   Descrizione: ${evidence.docugen?.purpose || "[Inserire descrizione]"}

2. PROVIDER/PRODUTTORE
   Ragione sociale: ${companyName}
   Indirizzo: ${companyAddress}
   Rappresentante UE (se applicabile): [Inserire se non stabilito in UE]

3. OGGETTO DELLA DICHIARAZIONE
   La presente dichiarazione di conformità è rilasciata sotto la responsabilità
   esclusiva del produttore sopra indicato.

   Il sistema AI descritto al punto 1 è conforme al Regolamento UE 2024/1689
   (Intelligenza Artificiale — AI Act) e in particolare agli articoli:
   Art. 5 (assenza pratiche vietate), Art. 9 (gestione rischi),
   Art. 10 (dati e governance), Art. 11 (documentazione tecnica),
   Art. 12 (registrazione), Art. 13 (trasparenza), Art. 14 (sorveglianza umana),
   Art. 15 (accuratezza e robustezza), Art. 17 (sistema qualità).

4. PROCEDURE DI VALUTAZIONE DELLA CONFORMITÀ APPLICATE
   Procedura: Auto-valutazione ai sensi dell'Art. 43.2
   Allegato applicabile: Allegato VI — Controllo interno
   ${assessmentResults.every((r) => r.evidenceStatus.autoVerified)
     ? "Verifica effettuata tramite piattaforma AIComply con evidenze documentali."
     : "Verifica effettuata con combinazione di tool automatizzati e verifica manuale."}

5. RIFERIMENTI A NORME ARMONIZZATE E SPECIFICHE COMUNI
   [Inserire riferimenti alle norme EN/ISO applicate, es. ISO/IEC 42001:2023]

6. ORGANISMO NOTIFICATO (se applicabile)
   ☐ Non applicabile — auto-valutazione Art. 43.2
   ☐ Organismo notificato: [Nome] — N. identificativo: [XXXX]
      Certificato n.: [XXX] del [data]

7. INFORMAZIONI COMPLEMENTARI
   Data di prima immissione sul mercato/messa in servizio: [data]
   Periodo di conservazione: 10 anni dalla data di immissione (Art. 18)

   Requisiti verificati:
${assessmentResults.map((r) => {
  const req = CONFORMITY_REQUIREMENTS.find((cr) => cr.id === r.requirementId);
  const status = (r.evidenceStatus.found || r.manualOverride) ? "✓" : "✗";
  return `   ${status} ${req?.article} — ${req?.title}`;
}).join("\n")}

8. FIRMA
   Luogo e data: _____________, ${today.toLocaleDateString("it-IT")}

   Nome: ${signatoryName}
   Ruolo: ${signatoryRole}

   Firma: _________________________________

   Timbro aziendale: [  ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Documento generato da AIComply Platform — aicomply.eu
Rif. normativo: Reg. UE 2024/1689, Art. 47 + Allegato V
ID documento: ${docId}
Data generazione: ${today.toISOString()}`;
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
