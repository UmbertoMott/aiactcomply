// Dossier Engine — aggregates all tool results into a unified compliance dossier

import { readFromStorage } from "./storage-schema";
import type {
  DossierData, ClassifierResult, RiskManagerResult, DataAuditResult,
  DocugenResult, LogvaultResult, TransparencyResult,
  OversightResult, ResilienceResult, QMSResult, ProhibitedCheckResult,
  FRIAResult, ConformityResult, GPAIResult, XAIResult,
  DPIAResult, DeployerCheckResult, L132Result, EUDBResult, AuthRepResult, ProviderTransitionResult,
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
    fria:             readFromStorage<FRIAResult>("fria")                              ?? undefined,
    xai:              readFromStorage<XAIResult>("xai")                               ?? undefined,
    dpia:             readFromStorage<DPIAResult>("dpia")                             ?? undefined,
    deployer:         readFromStorage<DeployerCheckResult>("deployer")                ?? undefined,
    l132:             readFromStorage<L132Result>("l132")                             ?? undefined,
    eudb:             readFromStorage<EUDBResult>("eudb")                             ?? undefined,
    authorizedRep:    readFromStorage<AuthRepResult>("authorizedRep")                 ?? undefined,
    providerTransition: readFromStorage<ProviderTransitionResult>("providerTransition") ?? undefined,
    art50: readFromStorage<{ systemsCount: number; completedAt: string }>("art50") ?? undefined,
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
      article: "Art. 27",
      title: "FRIA — Valutazione Impatto Diritti Fondamentali",
      href: "/dashboard/tools/fria",
      status: data.fria
        ? (data.fria.approvedBy ? "complete" : "partial")
        : "missing",
      completedAt: data.fria?.completedAt,
    },
    {
      id: "gpai",
      article: "Art. 51-55",
      title: "GPAI — Modelli Fondazionali",
      href: "/dashboard/tools/gpai",
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
    {
      id: "dpia",
      article: "Art. 35 GDPR",
      title: "DPIA — Valutazione d'Impatto Privacy",
      href: "/dashboard/tools/dpia",
      status: data.dpia ? (data.dpia.conclusion?.completedAt ? "complete" : "partial") : "missing",
      completedAt: data.dpia?.conclusion?.completedAt,
    },
    {
      id: "deployer",
      article: "Art. 26",
      title: "Deployer Obligations",
      href: "/dashboard/tools/deployer",
      status: data.deployer ? "complete" : "missing",
      completedAt: data.deployer?.completedAt,
    },
    {
      id: "l132",
      article: "L. 132/2025",
      title: "L. 132/2025 — Adempimenti italiani",
      href: "/dashboard/tools/l132",
      status: data.l132 ? "complete" : "missing",
      completedAt: data.l132?.completedAt,
    },
    {
      id: "eudb",
      article: "Art. 49",
      title: "EUDB Registration",
      href: "/dashboard/tools/eudb",
      status: data.eudb ? "complete" : "missing",
      completedAt: data.eudb?.completedAt,
    },
    {
      id: "authorizedRep",
      article: "Art. 22",
      title: "Authorized Representative",
      href: "/dashboard/tools/authorized-rep",
      status: data.authorizedRep ? "complete" : "missing",
      completedAt: data.authorizedRep?.completedAt,
    },
    {
      id: "providerTransition",
      article: "Art. 28",
      title: "Provider Transition Check",
      href: "/dashboard/tools/provider-transition",
      status: data.providerTransition ? (data.providerTransition.verdict === "deployer" ? "complete" : "partial") : "missing",
      completedAt: data.providerTransition?.completedAt,
    },
    {
      id: "art50",
      article: "Art. 50",
      title: "Trasparenza Sistemi Limited/Minimal (Art. 50)",
      href: "/dashboard/tools/art50-kit",
      status: data.art50 ? "complete" : "missing",
      completedAt: data.art50?.completedAt,
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
