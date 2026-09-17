"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FileText, Download, RefreshCw, CheckCircle, AlertTriangle,
  Info, Zap, Building2, Shield, Users,
} from "lucide-react";
import {
  readFromStorage,
  type ClassifierResult,
  type RiskManagerResult,
  type DataAuditResult,
  type DocugenResult,
  type LogvaultResult,
  type TransparencyResult,
  type OversightResult,
  type ResilienceResult,
  type QMSResult,
  type ConformityResult,
  type FRIAResult,
  type DPIAResult,
  type L132Result,
  type GPAIResult,
  type XAIResult,
} from "@/lib/dossier/storage-schema";
import { useT } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

// ─── Types ────────────────────────────────────────────────────────────────────

type AnswerStatus = "auto" | "partial" | "manual";

interface QAnswer {
  questionId: string;
  answer: string;
  status: AnswerStatus;
  source: string;
  editable: boolean;
}

interface QQuestion {
  id: string;
  text: string;
  category: string;
  mapFn: (d: DossierSnapshot) => { answer: string; status: AnswerStatus; source: string };
}

interface QTemplate {
  id: string;
  label: string;
  description: string;
  useCase: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  questions: QQuestion[];
}

interface DossierSnapshot {
  classifier:   ClassifierResult   | null;
  riskManager:  RiskManagerResult  | null;
  dataAudit:    DataAuditResult    | null;
  docugen:      DocugenResult      | null;
  logvault:     LogvaultResult     | null;
  transparency: TransparencyResult | null;
  oversight:    OversightResult    | null;
  resilience:   ResilienceResult   | null;
  qms:          QMSResult          | null;
  conformity:   ConformityResult   | null;
  fria:         FRIAResult         | null;
  dpia:         DPIAResult         | null;
  l132:         L132Result         | null;
  gpai:         GPAIResult         | null;
  xai:          XAIResult          | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT");
  } catch {
    return iso;
  }
}

function manual(source: string): { answer: string; status: AnswerStatus; source: string } {
  return { answer: "", status: "manual", source };
}

// ─── Shared question builders ─────────────────────────────────────────────────

function buildQCommon(t: TFn): QQuestion[] {
  return [
  {
    id: "q1",
    text: t("q1_text"),
    category: t("cat_classification"),
    mapFn: ({ classifier }) => {
      if (!classifier?.riskLevel) return manual("Completare AI Classifier nel dossier");
      const riskMap: Record<string, string> = {
        unacceptable: "Non accettabile (Art. 5 — vietato)",
        high: "Alto rischio (Allegato III)",
        limited: "Rischio limitato (Art. 50)",
        minimal: "Rischio minimo",
      };
      return {
        answer: `${riskMap[classifier.riskLevel] ?? classifier.riskLevel} — valutato il ${formatDate(classifier.completedAt)}`,
        status: "auto",
        source: "AI Classifier · Dossier",
      };
    },
  },
  {
    id: "q2",
    text: t("q2_text"),
    category: t("cat_classification"),
    mapFn: ({ classifier }) => {
      if (!classifier) return manual("Completare AI Classifier");
      return {
        answer: classifier.annexIII
          ? "Sì — rientra nell'Allegato III"
          : "No — non rientra nell'Allegato III",
        status: "auto",
        source: "AI Classifier · Dossier",
      };
    },
  },
  {
    id: "q3",
    text: t("q3_text"),
    category: t("cat_riskMgmt"),
    mapFn: ({ riskManager }) => {
      if (!riskManager) return manual("Completare Risk Manager nel dossier");
      const overall: Record<string, string> = { low: "basso", medium: "medio", high: "alto", critical: "critico" };
      return {
        answer: `Sì — Risk assessment completato il ${formatDate(riskManager.completedAt)}. ${riskManager.risks.length} rischi identificati. Livello di rischio residuo complessivo: ${overall[riskManager.overallRiskLevel] ?? riskManager.overallRiskLevel}.`,
        status: "auto",
        source: "Drift Detection · Dossier",
      };
    },
  },
  {
    id: "q4",
    text: t("q4_text"),
    category: t("cat_riskMgmt"),
    mapFn: ({ riskManager }) => {
      if (!riskManager) return manual("Completare Risk Manager");
      if (riskManager.risks.length > 0) {
        const top3 = riskManager.risks.slice(0, 3);
        return {
          answer: top3.map((r) => `• ${r.title}: ${r.mitigation}`).join("\n"),
          status: "auto",
          source: "Drift Detection · Dossier",
        };
      }
      return {
        answer: "Nessun rischio significativo identificato nel risk assessment.",
        status: "partial",
        source: "Drift Detection · Dossier (dati parziali)",
      };
    },
  },
  {
    id: "q5",
    text: t("q5_text"),
    category: t("cat_dataGov"),
    mapFn: ({ dataAudit, dpia }) => {
      if (!dataAudit) return manual("Completare Data Audit");
      const hasPersonal = dataAudit.datasets.some((d) => d.personalData);
      const quality: Record<string, string> = { pass: "superato", review: "in revisione", fail: "non superato" };
      const qualityStr = quality[dataAudit.overallQuality] ?? dataAudit.overallQuality;
      const dpiaStr = dpia
        ? `DPIA completata il ${formatDate(dpia.conclusion.completedAt)}.`
        : "DPIA in corso.";
      const answer = hasPersonal
        ? `Sì — il sistema elabora dati personali. Quality check: ${qualityStr}. ${dpiaStr}`
        : `No — il sistema non elabora dati personali ai sensi del GDPR. Quality check: ${qualityStr}.`;
      const status: AnswerStatus =
        dataAudit.overallQuality === "pass" && (dpia != null || !hasPersonal) ? "auto" : "partial";
      return { answer, status, source: "Data Audit + DPIA · Dossier" };
    },
  },
  {
    id: "q6",
    text: t("q6_text"),
    category: t("cat_auditLog"),
    mapFn: ({ logvault }) => {
      if (!logvault) return manual("Completare LogVault");
      const events = logvault.loggedEvents.join(", ");
      const answer = logvault.loggingEnabled
        ? `Sì — logging attivo. Retention: ${logvault.retentionDays} giorni. Eventi registrati: ${events}. Storage: ${logvault.storageLocation}.`
        : "Logging configurato ma non attivo al momento della valutazione.";
      return {
        answer,
        status: logvault.loggingEnabled ? "auto" : "partial",
        source: "LogVault · Dossier",
      };
    },
  },
  {
    id: "q7",
    text: t("q7_text"),
    category: t("cat_humanOversight"),
    mapFn: ({ oversight }) => {
      if (!oversight) return manual("Completare Oversight");
      const persons = oversight.responsiblePersons.join(", ");
      return {
        answer: `Meccanismo di oversight: ${oversight.oversightMechanism}. Interrupt/stop capability: ${oversight.stopCapability ? "Sì" : "No"}. Responsabili: ${persons || "da definire"}.`,
        status: oversight.stopCapability ? "auto" : "partial",
        source: "Oversight · Dossier",
      };
    },
  },
  {
    id: "q8",
    text: t("q8_text"),
    category: t("cat_humanOversight"),
    mapFn: ({ oversight }) => {
      if (!oversight) return manual("Completare Oversight");
      if (oversight.humanInterventionPoints.length > 0) {
        return {
          answer: oversight.humanInterventionPoints.map((p) => `• ${p}`).join("\n"),
          status: "auto",
          source: "Oversight · Dossier",
        };
      }
      return {
        answer: "Punti di intervento umano non ancora documentati formalmente.",
        status: "partial",
        source: "Oversight · Dossier (da completare)",
      };
    },
  },
  {
    id: "q9",
    text: t("q9_text"),
    category: t("cat_security"),
    mapFn: ({ resilience }) => {
      if (!resilience) return manual("Completare Resilience");
      const measures = resilience.cybersecurityMeasures.join(", ");
      return {
        answer: `Accuratezza: ${resilience.accuracyMetric}%. Robustezza testata: ${resilience.robustnessTested ? "Sì" : "No"}. Misure cybersecurity: ${measures || "da documentare"}. Fallback: ${resilience.fallbackProcedure || "da definire"}.`,
        status: resilience.robustnessTested ? "auto" : "partial",
        source: "Resilience · Dossier",
      };
    },
  },
  {
    id: "q10",
    text: t("q10_text"),
    category: t("cat_transparency"),
    mapFn: ({ transparency }) => {
      if (!transparency) return manual("Completare Transparency");
      const info = transparency.informationProvided.join(", ");
      const answer = transparency.userInformedOfAI
        ? `Sì — gli utenti sono informati. Modalità: ${info}. Contatto: ${transparency.contactPoint || "da definire"}. Lingue: ${transparency.languagesAvailable.join(", ") || "da definire"}.`
        : "Informativa utenti non ancora implementata. In fase di configurazione.";
      return {
        answer,
        status: transparency.userInformedOfAI ? "auto" : "partial",
        source: "Transparency · Dossier",
      };
    },
  },
  {
    id: "q11",
    text: t("q11_text"),
    category: t("cat_quality"),
    mapFn: ({ qms }) => {
      if (!qms) return manual("Completare QMS");
      const certs = qms.certifications.length > 0 ? ` Certificazioni: ${qms.certifications.join(", ")}.` : "";
      const base = qms.qmsDocumentRef
        ? `QMS documentato: ${qms.qmsDocumentRef}. `
        : "QMS in fase di formalizzazione. ";
      return {
        answer: `${base}Ciclo di revisione: ${qms.internalReviewCycle || "da definire"}. Responsabile: ${qms.responsibleManager || "da definire"}.${certs}`,
        status: qms.qmsDocumentRef ? "auto" : "partial",
        source: "QMS Builder · Dossier",
      };
    },
  },
  {
    id: "q12",
    text: t("q12_text"),
    category: t("cat_euConformity"),
    mapFn: ({ conformity }) => {
      if (!conformity) return manual("Completare Conformity Assessment");
      const answer = conformity.declarationGenerated
        ? `Sì — Dichiarazione di Conformità UE emessa. Score: ${conformity.score}% (${conformity.passed}/${conformity.total} requisiti). ${conformity.registrationRef ? `Registro EUDB: ${conformity.registrationRef}.` : "Registrazione EUDB in corso."}`
        : `Dichiarazione di Conformità non ancora emessa. Completamento al ${conformity.score}%.`;
      return {
        answer,
        status: conformity.declarationGenerated ? "auto" : "partial",
        source: "Conformity Assessment · Dossier",
      };
    },
  },
  {
    id: "q13",
    text: t("q13_text"),
    category: t("cat_fundRights"),
    mapFn: ({ fria }) => {
      if (!fria) return manual("Completare FRIA (Art. 27 AI Act)");
      return {
        answer: `Sì — FRIA completata il ${formatDate(fria.completedAt)}. Sistema: ${fria.systemName}. Livello di rischio diritti: ${fria.overallRisk || "da definire"}. ${fria.approvedBy ? `Approvata da: ${fria.approvedBy}.` : "Approvazione formale in corso."}`,
        status: fria.approvedBy ? "auto" : "partial",
        source: "FRIA · Dossier",
      };
    },
  },
  {
    id: "q14",
    text: t("q14_text"),
    category: t("cat_gdpr"),
    mapFn: ({ dpia }) => {
      if (!dpia) return manual("Completare DPIA (GDPR Art. 35)");
      const conclusionMap: Record<string, string> = {
        yes: "Conforme",
        conditional: "Condizionalmente conforme",
        no: "Non conforme",
      };
      return {
        answer: `Sì — DPIA completata il ${formatDate(dpia.conclusion.completedAt)}. Sistema: ${dpia.description.system_name}. Conclusione: ${conclusionMap[dpia.conclusion.compliant] ?? dpia.conclusion.compliant}.`,
        status: "auto",
        source: "DPIA · Dossier",
      };
    },
  },
  {
    id: "q15",
    text: t("q15_text"),
    category: t("cat_itLaw"),
    mapFn: ({ l132 }) => {
      if (!l132) return manual("Completare L.132/2025 Assessment");
      const statusMap: Record<string, string> = {
        conforme: "Conforme",
        parzialmente_conforme: "Parzialmente conforme",
        non_conforme: "Non conforme",
        non_applicabile: "Non applicabile (sistema non operante in Italia)",
      };
      const hrNote = l132.requiresHRNotice
        ? " Il sistema è usato in contesti HR: obblighi informativi applicabili."
        : "";
      const dfNote = l132.isDeepfakeRisk
        ? " Sistema con rischio deepfake: misure Art. 612-quater c.p. verificate."
        : "";
      return {
        answer: `${statusMap[l132.overallStatus] ?? l132.overallStatus} — valutazione del ${formatDate(l132.completedAt)}.${hrNote}${dfNote}`,
        status: l132.overallStatus === "conforme" ? "auto" : "partial",
        source: "L.132/2025 · Dossier",
      };
    },
  },
  ];
}

// ─── Template 1 — Generic ────────────────────────────────────────────────────

function buildTemplates(t: TFn): QTemplate[] {
  const Q_COMMON = buildQCommon(t);
  const TEMPLATE_GENERIC: QTemplate = {
    id: "generic_ai_procurement",
    label: t("tpl_generic_label"),
    description: t("tpl_generic_desc"),
    useCase: t("tpl_generic_useCase"),
    icon: FileText,
    questions: Q_COMMON,
  };

// ─── Template 2 — Financial ───────────────────────────────────────────────────

function buildQFinancialExtra(t: TFn): QQuestion[] {
  return [
  {
    id: "q16",
    text: t("fin_q16_text"),
    category: t("cat_dora"),
    mapFn: () => manual("Verifica con team Legal/IT"),
  },
  {
    id: "q17",
    text: t("fin_q17_text"),
    category: t("cat_dora"),
    mapFn: ({ resilience }) => {
      if (!resilience?.robustnessTested) return manual("Completare test sicurezza");
      const measures = resilience.cybersecurityMeasures.join(", ");
      const dateStr = resilience.lastTestedAt ? formatDate(resilience.lastTestedAt) : "data non specificata";
      return {
        answer: `Test di robustezza e sicurezza condotti il ${dateStr}. Misure implementate: ${measures || "da documentare"}. TLPT specifico secondo DORA: da verificare con team sicurezza.`,
        status: "partial",
        source: "Resilience · Dossier (TLPT richiede verifica separata)",
      };
    },
  },
  {
    id: "q18",
    text: t("fin_q18_text"),
    category: t("cat_aiModels"),
    mapFn: ({ gpai }) => {
      if (!gpai) {
        return {
          answer: "Il sistema non utilizza modelli GPAI ai sensi dell'Art. 51 AI Act, oppure la valutazione non è ancora stata condotta.",
          status: "partial",
          source: "GPAI Module non completato",
        };
      }
      return {
        answer: `Sì — Ruolo: ${gpai.role ?? "—"}. Provider upstream: ${gpai.gpai_providers_used ?? 0}. Art.53 score: ${gpai.art53_score ?? 0}%. Obblighi completati: ${gpai.obligationsCompleted}.`,
        status: gpai.obligationsCompleted > 0 ? "auto" : "partial",
        source: "GPAI Module · Dossier",
      };
    },
  },
  {
    id: "q19",
    text: t("fin_q19_text"),
    category: t("cat_explainability"),
    mapFn: ({ xai }) => {
      if (!xai) return manual("Completare XAI Center");
      return {
        answer: `Sì — modulo XAI completato il ${formatDate(xai.completedAt)}. Documentazione disponibile nel dossier tecnico.`,
        status: "auto",
        source: "XAI Center · Dossier",
      };
    },
  },
  ];
}

  const TEMPLATE_FINANCIAL: QTemplate = {
    id: "financial_sector",
    label: t("tpl_financial_label"),
    description: t("tpl_financial_desc"),
    useCase: t("tpl_financial_useCase"),
    icon: Building2,
    questions: [...Q_COMMON, ...buildQFinancialExtra(t)],
  };

// ─── Template 3 — Public Sector ──────────────────────────────────────────────

function buildQPaExtra(t: TFn): QQuestion[] {
  return [
  {
    id: "q16",
    text: t("pa_q16_text"),
    category: t("cat_pa"),
    mapFn: ({ fria }) => {
      if (!fria) return manual("Completare FRIA (Art. 27 AI Act)");
      return {
        answer: `Sì — FRIA completata il ${formatDate(fria.completedAt)}. Sistema: ${fria.systemName}. Livello di rischio diritti: ${fria.overallRisk || "da definire"}. ${fria.approvedBy ? `Approvata da: ${fria.approvedBy}.` : "Approvazione formale in corso."} L'Art. 27 impone FRIA obbligatoria per tutti i deployer del settore pubblico.`,
        status: fria.approvedBy ? "auto" : "partial",
        source: "FRIA · Dossier",
      };
    },
  },
  {
    id: "q17",
    text: t("pa_q17_text"),
    category: t("cat_pa"),
    mapFn: ({ transparency }) => {
      if (!transparency?.userInformedOfAI) return manual("Completare Transparency + verifica CAD");
      return {
        answer: "Sì — misure di trasparenza implementate. L'algoritmo è documentato e gli esiti spiegabili. Informativa utenti attiva.",
        status: "partial",
        source: "Transparency · Dossier (CAD compliance richiede verifica legale separata)",
      };
    },
  },
  {
    id: "q18",
    text: t("pa_q18_text"),
    category: t("cat_pa"),
    mapFn: ({ oversight }) => {
      if (!oversight) return manual("Completare Oversight");
      const persons = oversight.responsiblePersons.join(", ");
      return {
        answer: `Meccanismo di oversight: ${oversight.oversightMechanism}. Interrupt/stop capability: ${oversight.stopCapability ? "Sì" : "No"}. Responsabili: ${persons || "da definire"}. Requisito obbligatorio per decisioni amministrative automatizzate.`,
        status: oversight.stopCapability ? "auto" : "partial",
        source: "Oversight · Dossier",
      };
    },
  },
  {
    id: "q19",
    text: t("pa_q19_text"),
    category: t("cat_pa"),
    mapFn: ({ docugen }) => {
      if (!docugen) return manual("Completare DocuGen AI");
      return {
        answer: `Documentazione tecnica disponibile: sistema ${docugen.systemName}, scopo: ${docugen.purpose}. Limitazioni documentate: ${docugen.limitations || "da completare"}. Documentazione algoritmica completa disponibile su richiesta.`,
        status: "partial",
        source: "DocuGen AI · Dossier (accesso codice sorgente da concordare)",
      };
    },
  },
  ];
}

  const TEMPLATE_PA: QTemplate = {
    id: "public_sector",
    label: t("tpl_pa_label"),
    description: t("tpl_pa_desc"),
    useCase: t("tpl_pa_useCase"),
    icon: Shield,
    questions: [...Q_COMMON, ...buildQPaExtra(t)],
  };
  return [TEMPLATE_GENERIC, TEMPLATE_FINANCIAL, TEMPLATE_PA];
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: "12px",
};

const STATUS_META: Record<AnswerStatus, { labelKey: string; bg: string; color: string; border: string }> = {
  auto: {
    labelKey: "st_auto",
    bg: "rgba(22,163,74,0.08)",
    color: "#15803d",
    border: "rgba(22,163,74,0.2)",
  },
  partial: {
    labelKey: "st_partial",
    bg: "rgba(202,138,4,0.08)",
    color: "#92400e",
    border: "rgba(202,138,4,0.2)",
  },
  manual: {
    labelKey: "st_manual",
    bg: "rgba(220,38,38,0.08)",
    color: "#dc2626",
    border: "rgba(220,38,38,0.15)",
  },
};

const DOSSIER_KEYS = [
  "classifier", "riskManager", "dataAudit", "logvault",
  "transparency", "oversight", "resilience", "qms",
  "conformity", "fria", "dpia", "l132",
] as const;

// ─── Draft persistence key ────────────────────────────────────────────────────

function draftKey(templateId: string) {
  return `aicomply_questionnaire_draft_${templateId}`;
}

// ─── Download ─────────────────────────────────────────────────────────────────

function buildTxt(template: QTemplate, answers: QAnswer[], systemName: string): string {
  const date = new Date().toLocaleDateString("it-IT");

  // Group questions by category
  const cats: string[] = [];
  const grouped: Record<string, Array<{ q: QQuestion; a: QAnswer }>> = {};
  template.questions.forEach((q) => {
    if (!grouped[q.category]) {
      grouped[q.category] = [];
      cats.push(q.category);
    }
    const a = answers.find((a) => a.questionId === q.id);
    if (a) grouped[q.category].push({ q, a });
  });

  const lines: string[] = [
    "═══════════════════════════════════════════════════════════",
    `  QUESTIONARIO CONFORMITÀ AI — ${template.label.toUpperCase()}`,
    `  Generato da AIComply · ${date}`,
    "═══════════════════════════════════════════════════════════",
    "",
    `  Fornitore: ${systemName || "da inserire"}`,
    "",
  ];

  cats.forEach((cat) => {
    lines.push(`── ${cat.toUpperCase()} ──────────────────────────────────────────`);
    lines.push("");
    grouped[cat].forEach(({ q, a }, qi) => {
      const num = template.questions.findIndex((tq) => tq.id === q.id) + 1;
      lines.push(`  ${num}. ${q.text}`);
      lines.push("");
      lines.push(`  Risposta: ${a.answer || "RISPOSTA MANUALE RICHIESTA"}`);
      lines.push(`  Fonte dati: ${a.source}`);
      lines.push("");
      if (qi < grouped[cat].length - 1) lines.push("");
    });
  });

  lines.push(
    "── NOTE ──────────────────────────────────────────────────",
    "  Questo documento è stato generato automaticamente da AIComply sulla base",
    "  del dossier di conformità EU AI Act. Le risposte contrassegnate \"Manuale\"",
    "  richiedono integrazione da parte del team legale/tecnico prima dell'invio.",
    "",
    "  Riferimenti normativi: Reg. UE 2024/1689 (AI Act), GDPR 2016/679,",
    "  L.132/2025, DORA 2022/2554 (ove applicabile)",
    "═══════════════════════════════════════════════════════════"
  );

  return lines.join("\n");
}

function downloadTxt(template: QTemplate, answers: QAnswer[], systemName: string) {
  const text = buildTxt(template, answers, systemName);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `questionario-ai-${template.id}-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuestionnairePage() {
  const t = useT("toolQuestionnaire");
  const TEMPLATES = buildTemplates(t);
  const [snapshot, setSnapshot] = useState<DossierSnapshot | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<QTemplate | null>(null);
  const [answers, setAnswers] = useState<QAnswer[]>([]);
  const [generated, setGenerated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function loadSnapshot(): DossierSnapshot {
    return {
      classifier:   readFromStorage<ClassifierResult>("classifier"),
      riskManager:  readFromStorage<RiskManagerResult>("riskManager"),
      dataAudit:    readFromStorage<DataAuditResult>("dataAudit"),
      docugen:      readFromStorage<DocugenResult>("docugen"),
      logvault:     readFromStorage<LogvaultResult>("logvault"),
      transparency: readFromStorage<TransparencyResult>("transparency"),
      oversight:    readFromStorage<OversightResult>("oversight"),
      resilience:   readFromStorage<ResilienceResult>("resilience"),
      qms:          readFromStorage<QMSResult>("qms"),
      conformity:   readFromStorage<ConformityResult>("conformity"),
      fria:         readFromStorage<FRIAResult>("fria"),
      dpia:         readFromStorage<DPIAResult>("dpia"),
      l132:         readFromStorage<L132Result>("l132"),
      gpai:         readFromStorage<GPAIResult>("gpai"),
      xai:          readFromStorage<XAIResult>("xai"),
    };
  }

  // Lazy-load snapshot on first interaction
  function ensureSnapshot(): DossierSnapshot {
    if (snapshot) return snapshot;
    const s = loadSnapshot();
    setSnapshot(s);
    return s;
  }

  function refreshSnapshot() {
    const s = loadSnapshot();
    setSnapshot(s);
    showToast(t("toast_dossierUpdated"));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // Completed dossier keys count (for progress bar)
  const snap = snapshot ?? loadSnapshot();
  const completedCount = DOSSIER_KEYS.filter((k) => snap[k] != null).length;
  const completedPct = Math.round((completedCount / DOSSIER_KEYS.length) * 100);

  function handleGenerate() {
    if (!selectedTemplate) return;
    const s = ensureSnapshot();

    // Build answers from mapFn
    const fresh: QAnswer[] = selectedTemplate.questions.map((q) => {
      const mapped = q.mapFn(s);
      return {
        questionId: q.id,
        answer: mapped.answer,
        status: mapped.status,
        source: mapped.source,
        editable: true,
      };
    });

    // Merge with saved draft (localStorage overrides auto-answers for edited questions)
    const rawDraft = typeof window !== "undefined"
      ? localStorage.getItem(draftKey(selectedTemplate.id))
      : null;
    const draft: Record<string, string> = rawDraft ? JSON.parse(rawDraft) : {};

    const merged = fresh.map((a) =>
      draft[a.questionId] !== undefined
        ? { ...a, answer: draft[a.questionId], status: "partial" as AnswerStatus }
        : a
    );

    setAnswers(merged);
    setGenerated(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => {
      const next = prev.map((a) =>
        a.questionId === questionId ? { ...a, answer: value, status: "partial" as AnswerStatus } : a
      );
      // Persist draft
      if (selectedTemplate && typeof window !== "undefined") {
        const draft: Record<string, string> = {};
        next.forEach((a) => { draft[a.questionId] = a.answer; });
        localStorage.setItem(draftKey(selectedTemplate.id), JSON.stringify(draft));
      }
      return next;
    });
  }, [selectedTemplate]);

  function handleResetDraft() {
    if (!selectedTemplate) return;
    if (typeof window !== "undefined") {
      localStorage.removeItem(draftKey(selectedTemplate.id));
    }
    handleGenerate();
    showToast(t("toast_draftReset"));
  }

  const autoCount = answers.filter((a) => a.status === "auto").length;
  const partialCount = answers.filter((a) => a.status === "partial").length;
  const manualCount = answers.filter((a) => a.status === "manual").length;

  const systemName = snap.classifier?.systemName
    ?? snap.docugen?.systemName
    ?? snap.fria?.systemName
    ?? "";

  const barColor =
    completedCount >= 8 ? "#15803d" : completedCount >= 4 ? "#d97706" : "#dc2626";

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(59,130,246,0.07)" }}
          >
            <FileText className="h-5 w-5" style={{ color: "#2563eb" }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-semibold" style={{ color: "#0D1016" }}>
                {t("title")}
              </h1>
              <span
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(22,163,74,0.09)", color: "#15803d", border: "1px solid rgba(22,163,74,0.2)" }}
              >
                <Zap className="h-3 w-3" /> {t("autoFillBadge")}
              </span>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
              {t("subtitle")}
            </p>
          </div>
          <button
            onClick={refreshSnapshot}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.55)" }}
            title={t("reloadDossier")}
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t("reloadDossier")}
          </button>
        </div>
      </div>

      {/* ── Dossier status banner ───────────────────────────────────────────── */}
      <div className="mb-5 p-4 rounded-xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
            {t("dossierWord")} <span style={{ color: barColor }}>{completedCount}/12</span> {t("sectionsCompleted")}
          </p>
          <Link
            href="/dashboard/dossier"
            className="text-[11px] font-medium"
            style={{ color: "#2563eb" }}
          >
            {t("completeDossier")}
          </Link>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${completedPct}%`, background: barColor }}
          />
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: "rgba(0,0,0,0.4)" }}>
          {t("autoFillAvailPre")} ~{completedPct}% {t("autoFillAvailPost")}
        </p>
      </div>

      {/* ── Template selection ──────────────────────────────────────────────── */}
      <div className="mb-5">
        <p className="text-[12px] font-semibold mb-3" style={{ color: "#0D1016" }}>
          {t("selectType")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            const isSelected = selectedTemplate?.id === tpl.id;
            return (
              <button
                key={tpl.id}
                onClick={() => { setSelectedTemplate(tpl); setGenerated(false); }}
                className="text-left p-4 rounded-xl transition-all"
                style={{
                  background: isSelected ? "rgba(59,130,246,0.05)" : "#fff",
                  border: isSelected
                    ? "2px solid rgba(59,130,246,0.6)"
                    : "1px solid rgba(0,0,0,0.08)",
                  boxShadow: isSelected ? "0 0 0 3px rgba(59,130,246,0.08)" : "none",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: isSelected ? "rgba(59,130,246,0.12)" : "rgba(0,0,0,0.05)" }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: isSelected ? "#2563eb" : "#0D1016" }} />
                  </div>
                  <p className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>
                    {tpl.label}
                  </p>
                </div>
                <p className="text-[11px] mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {tpl.description}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>
                    {tpl.useCase}
                  </p>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.45)" }}
                  >
                    {tpl.questions.length} {t("questionsWord")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Generate button ─────────────────────────────────────────────────── */}
      <button
        onClick={handleGenerate}
        disabled={!selectedTemplate}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold mb-6 transition-all disabled:opacity-40"
        style={{ background: "#0D1016", color: "#fff" }}
      >
        <Zap className="h-4 w-4" />
        {generated ? t("regenerate") : t("generate")}
      </button>

      {/* ── Questions list ──────────────────────────────────────────────────── */}
      {generated && selectedTemplate && (
        <div className="space-y-3">
          {selectedTemplate.questions.map((q, idx) => {
            const answer = answers.find((a) => a.questionId === q.id);
            if (!answer) return null;
            const sm = STATUS_META[answer.status];
            const rows = Math.max(2, Math.ceil(answer.answer.length / 80));
            return (
              <div key={q.id} style={card} className="overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-start gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}
                >
                  <span
                    className="text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(0,0,0,0.06)", color: "#0D1016" }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium leading-snug" style={{ color: "#0D1016" }}>
                      {q.text}
                    </p>
                    <span
                      className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.45)" }}
                    >
                      {q.category}
                    </span>
                  </div>
                </div>
                {/* Body */}
                <div className="px-4 py-3">
                  <textarea
                    value={answer.answer}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    rows={rows}
                    placeholder={t("manualAnswerPh")}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      color: "#0D1016",
                      background: answer.status === "manual" ? "rgba(220,38,38,0.02)" : "#fafaf9",
                      resize: "vertical",
                      outline: "none",
                      lineHeight: "1.5",
                    }}
                  />
                </div>
                {/* Footer */}
                <div className="flex items-center gap-2 px-4 pb-3">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}
                  >
                    {t(sm.labelKey)}
                  </span>
                  <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>
                    {answer.source}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div ref={bottomRef} />

      {/* ── Sticky summary bar ──────────────────────────────────────────────── */}
      {generated && selectedTemplate && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 px-6 py-3 flex-wrap"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(0,0,0,0.07)",
            boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
          }}
        >
          {/* Stats */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-[11px] font-medium" style={{ color: "#15803d" }}>
              {autoCount} {t("autoWord")}
            </span>
            <span className="text-[11px] font-medium" style={{ color: "#92400e" }}>
              {partialCount} {t("partialWord")}
            </span>
            {manualCount > 0 && (
              <span className="text-[11px] font-medium" style={{ color: "#dc2626" }}>
                {manualCount} {t("manualWord")}
              </span>
            )}
            {manualCount === 0 && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "#15803d" }}>
                <CheckCircle className="h-3.5 w-3.5" /> {t("completeWord")}
              </span>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDraft}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: "rgba(220,38,38,0.07)",
                color: "#dc2626",
                border: "1px solid rgba(220,38,38,0.15)",
              }}
            >
              {t("resetDraft")}
            </button>
            <button
              onClick={() => downloadTxt(selectedTemplate, answers, systemName)}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all"
              style={{ background: "#0D1016", color: "#fff" }}
            >
              <Download className="h-3.5 w-3.5" /> {t("downloadTxt")}
            </button>
          </div>
        </div>
      )}

      {/* Info callout (only before generation) */}
      {!generated && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}
        >
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#2563eb" }} />
          <div>
            <p className="text-[12px] font-medium mb-0.5" style={{ color: "#1e40af" }}>
              {t("howItWorksTitle")}
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}
              dangerouslySetInnerHTML={{ __html: t("howItWorksBody") }} />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-16 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-lg z-50"
          style={{ background: "#0D1016", color: "#fff", whiteSpace: "nowrap" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
