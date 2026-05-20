// Dossier Engine — aggregates all tool results into a unified compliance dossier

import { readFromStorage } from "./storage-schema";
import type {
  DossierData, ClassifierResult, RiskManagerResult, DataAuditResult,
  DocugenResult, LogvaultResult, TransparencyResult,
  OversightResult, ResilienceResult, QMSResult, ProhibitedCheckResult,
  FRIAResult, ConformityResult, GPAIResult, XAIResult,
} from "./storage-schema";

export interface DossierSection {
  id: string;
  article: string;
  title: string;
  href: string;
  status: "complete" | "partial" | "missing";
  completedAt?: string;
}

export function aggregateDossier(): DossierData {
  const onboarding = readFromStorage<{ systemName?: string; companyName?: string }>("onboarding");

  return {
    meta: {
      companyName: onboarding?.companyName ?? "Azienda non specificata",
      systemName:  onboarding?.systemName  ?? "Sistema AI",
      generatedAt: new Date().toISOString(),
      generatedBy: "AIComply Platform v1.0",
      version:     "1.0",
    },
    prohibited:   readFromStorage<ProhibitedCheckResult>("prohibited")  ?? undefined,
    classifier:   readFromStorage<ClassifierResult>("classifier")        ?? undefined,
    riskManager:  readFromStorage<RiskManagerResult>("riskManager")      ?? undefined,
    dataAudit:    readFromStorage<DataAuditResult>("dataAudit")          ?? undefined,
    docugen:      readFromStorage<DocugenResult>("docugen")              ?? undefined,
    logvault:     readFromStorage<LogvaultResult>("logvault")            ?? undefined,
    transparency: readFromStorage<TransparencyResult>("transparency")    ?? undefined,
    oversight:    readFromStorage<OversightResult>("oversight")          ?? undefined,
    resilience:   readFromStorage<ResilienceResult>("resilience")        ?? undefined,
    qms:          readFromStorage<QMSResult>("qms")                      ?? undefined,
    gpai:         readFromStorage<GPAIResult>("gpai")                    ?? undefined,
    conformity:   readFromStorage<ConformityResult>("conformity")        ?? undefined,
    fria:         readFromStorage<FRIAResult>("fria")                    ?? undefined,
    xai:          readFromStorage<XAIResult>("xai")                      ?? undefined,
  };
}

export function getDossierSections(data: DossierData): DossierSection[] {
  return [
    {
      id: "prohibited",
      article: "Art. 5",
      title: "Verifica Pratiche Vietate",
      href: "/dashboard/tools/prohibited",
      status: data.prohibited ? "complete" : "missing",
      completedAt: data.prohibited?.completedAt,
    },
    {
      id: "classifier",
      article: "Art. 6",
      title: "Classificazione del Sistema AI",
      href: "/dashboard/tools/classifier",
      status: data.classifier ? "complete" : "missing",
      completedAt: data.classifier?.completedAt,
    },
    {
      id: "riskManager",
      article: "Art. 9",
      title: "Gestione del Rischio",
      href: "/dashboard/tools/risk-manager",
      status: data.riskManager
        ? (data.riskManager.risks.length > 0 ? "complete" : "partial")
        : "missing",
      completedAt: data.riskManager?.completedAt,
    },
    {
      id: "dataAudit",
      article: "Art. 10",
      title: "Audit Dataset e Governance Dati",
      href: "/dashboard/tools/data-audit",
      status: data.dataAudit ? "complete" : "missing",
      completedAt: data.dataAudit?.completedAt,
    },
    {
      id: "docugen",
      article: "Art. 11",
      title: "Documentazione Tecnica (Allegato IV)",
      href: "/dashboard/tools/docugen",
      status: data.docugen ? "complete" : "missing",
      completedAt: data.docugen?.completedAt,
    },
    {
      id: "logvault",
      article: "Art. 12",
      title: "Registrazione Automatica Log",
      href: "/dashboard/tools/logvault",
      status: data.logvault ? "complete" : "missing",
      completedAt: data.logvault?.completedAt,
    },
    {
      id: "transparency",
      article: "Art. 13",
      title: "Trasparenza e Informativa Utenti",
      href: "/dashboard/tools/transparency",
      status: data.transparency ? "complete" : "missing",
      completedAt: data.transparency?.completedAt,
    },
    {
      id: "oversight",
      article: "Art. 14",
      title: "Sorveglianza Umana",
      href: "/dashboard/tools/oversight",
      status: data.oversight ? "complete" : "missing",
      completedAt: data.oversight?.completedAt,
    },
    {
      id: "resilience",
      article: "Art. 15",
      title: "Accuratezza, Robustezza e Cybersecurity",
      href: "/dashboard/tools/resilience",
      status: data.resilience ? "complete" : "missing",
      completedAt: data.resilience?.completedAt,
    },
    {
      id: "qms",
      article: "Art. 17",
      title: "Sistema di Gestione della Qualità",
      href: "/dashboard/tools/qms",
      status: data.qms ? "complete" : "missing",
      completedAt: data.qms?.completedAt,
    },
    {
      id: "conformity",
      article: "Art. 43",
      title: "Valutazione della Conformità",
      href: "/dashboard/tools/conformity",
      status: data.conformity ? "complete" : "missing",
      completedAt: data.conformity?.completedAt,
    },
    {
      id: "fria",
      article: "Art. 49",
      title: "Registrazione EU AI Database (FRIA)",
      href: "/dashboard/tools/fria",
      status: data.fria
        ? (data.fria.approvedAt ? "complete" : "partial")
        : "missing",
      completedAt: data.fria?.approvedAt ?? data.fria?.completedAt,
    },
    {
      id: "gpai",
      article: "Art. 51-55",
      title: "GPAI — Modelli Fondazionali",
      href: "/dashboard/modules/gpai",
      status: data.gpai
        ? (data.gpai.obligationsCompleted > 0 ? "complete" : "partial")
        : "missing",
      completedAt: data.gpai?.completedAt,
    },
    {
      id: "xai",
      article: "Art. 13+",
      title: "XAI — Spiegabilità e Bias",
      href: "/dashboard/modules/xai",
      status: data.xai ? "complete" : "missing",
      completedAt: data.xai?.completedAt,
    },
  ];
}

export function getCompletionPercentage(sections: DossierSection[]): number {
  const done = sections.filter((s) => s.status === "complete").length;
  return Math.round((done / sections.length) * 100);
}

export function getCompletedCount(sections: DossierSection[]): number {
  return sections.filter((s) => s.status === "complete").length;
}
