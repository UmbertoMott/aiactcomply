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
  /** "not_applicable" = il tool non è obbligatorio per questo sistema (tier/ruolo) — semanticamente diverso da "missing" */
  status: "complete" | "partial" | "missing" | "not_applicable";
  completedAt?: string;
  notApplicableReason?: string;
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
  // Determina il tier e il ruolo dal risultato del classifier
  const tier = data.classifier?.riskLevel?.toLowerCase() ?? null;
  const role = data.classifier?.role?.toLowerCase() ?? null;

  const isHighRisk = tier === "high" || tier === "unacceptable";
  const isLimitedRisk = tier === "limited";
  const isMinimalRisk = tier === "minimal";
  const isProvider = role === "provider" || role === "fornitore";
  const isDeployer = role === "deployer" || role === "dispiegatore" || role === "deployer/utilizzatore";
  const isGpai = data.classifier?.isGPAI === true || data.gpai !== undefined;

  // Helper: restituisce "not_applicable" con motivazione se la condizione è false
  function na(reason: string): Pick<DossierSection, "status" | "notApplicableReason"> {
    return { status: "not_applicable", notApplicableReason: reason };
  }

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
    // Art. 9 — obbligatorio solo per high-risk
    {
      id: "riskManager",
      article: "Art. 9",
      title: "Gestione del Rischio",
      href: "/dashboard/tools/risk-manager",
      ...(isHighRisk || tier === null
        ? {
            status: data.riskManager
              ? (data.riskManager.risks.length > 0 ? "complete" : "partial")
              : "missing",
            completedAt: data.riskManager?.completedAt,
          }
        : na("Non obbligatorio per sistemi non high-risk (Art. 9 si applica ai sistemi ad alto rischio Allegato III/I)")),
    },
    // Art. 10 — obbligatorio per high-risk (training data governance)
    {
      id: "dataAudit",
      article: "Art. 10",
      title: "Audit Dataset e Governance Dati",
      href: "/dashboard/tools/data-audit",
      ...(isHighRisk || tier === null
        ? { status: data.dataAudit ? "complete" : "missing", completedAt: data.dataAudit?.completedAt }
        : na("Art. 10 (governance dati di addestramento) si applica solo a sistemi high-risk")),
    },
    // Art. 11 / Allegato IV — solo high-risk, solo provider
    {
      id: "docugen",
      article: "Art. 11",
      title: "Documentazione Tecnica (Allegato IV)",
      href: "/dashboard/tools/docugen",
      ...(isHighRisk && (isProvider || tier === null)
        ? { status: data.docugen ? "complete" : "missing", completedAt: data.docugen?.completedAt }
        : isHighRisk && isDeployer
          ? na("Allegato IV è responsabilità del provider, non del deployer (Art. 11)")
          : na("Allegato IV obbligatorio solo per sistemi high-risk (Art. 11)")),
    },
    // Art. 12 — log obbligatori per high-risk
    {
      id: "logvault",
      article: "Art. 12",
      title: "Registrazione Automatica Log",
      href: "/dashboard/tools/logvault",
      ...(isHighRisk || tier === null
        ? { status: data.logvault ? "complete" : "missing", completedAt: data.logvault?.completedAt }
        : na("Registrazione log automatica (Art. 12) obbligatoria solo per sistemi high-risk")),
    },
    // Art. 13 — trasparenza verso deployer, solo high-risk
    // Art. 50 — trasparenza verso utenti finali, limited/minimal-risk
    {
      id: "transparency",
      article: isHighRisk ? "Art. 13" : "Art. 13",
      title: "Trasparenza e Informativa — Art. 13 (High Risk)",
      href: "/dashboard/tools/transparency",
      ...(isHighRisk || tier === null
        ? { status: data.transparency ? "complete" : "missing", completedAt: data.transparency?.completedAt }
        : na("Art. 13 (trasparenza verso il deployer) si applica solo a sistemi high-risk — per limited-risk vedi Art. 50 Kit")),
    },
    // Art. 14 — sorveglianza umana, solo high-risk
    {
      id: "oversight",
      article: "Art. 14",
      title: "Sorveglianza Umana",
      href: "/dashboard/tools/oversight",
      ...(isHighRisk || tier === null
        ? { status: data.oversight ? "complete" : "missing", completedAt: data.oversight?.completedAt }
        : na("Sorveglianza umana obbligatoria (Art. 14) solo per sistemi high-risk")),
    },
    // Art. 15 — robustezza/cybersecurity, solo high-risk
    {
      id: "resilience",
      article: "Art. 15",
      title: "Accuratezza, Robustezza e Cybersecurity",
      href: "/dashboard/tools/resilience",
      ...(isHighRisk || tier === null
        ? { status: data.resilience ? "complete" : "missing", completedAt: data.resilience?.completedAt }
        : na("Requisiti di accuratezza e robustezza (Art. 15) obbligatori solo per sistemi high-risk")),
    },
    // Art. 17 — QMS, solo provider high-risk
    {
      id: "qms",
      article: "Art. 17",
      title: "Sistema di Gestione della Qualità",
      href: "/dashboard/tools/qms",
      ...(isHighRisk && (isProvider || tier === null)
        ? { status: data.qms ? "complete" : "missing", completedAt: data.qms?.completedAt }
        : isHighRisk && isDeployer
          ? na("QMS (Art. 17) è responsabilità del provider; il deployer applica Art. 26")
          : na("QMS obbligatorio solo per provider di sistemi high-risk (Art. 17)")),
    },
    // Art. 43 — conformity assessment, solo high-risk
    {
      id: "conformity",
      article: "Art. 43",
      title: "Valutazione della Conformità",
      href: "/dashboard/tools/conformity",
      ...(isHighRisk || tier === null
        ? { status: data.conformity ? "complete" : "missing", completedAt: data.conformity?.completedAt }
        : na("Valutazione di conformità (Art. 43) obbligatoria solo per sistemi high-risk")),
    },
    // Art. 27 — FRIA, deployer high-risk che usa il sistema in ambito pubblico/diritti fondamentali
    {
      id: "fria",
      article: "Art. 27",
      title: "FRIA — Valutazione Impatto Diritti Fondamentali",
      href: "/dashboard/tools/fria",
      ...(isHighRisk || tier === null
        ? {
            status: data.fria
              ? (data.fria.approvedBy ? "complete" : "partial")
              : "missing",
            completedAt: data.fria?.completedAt,
          }
        : na("FRIA (Art. 27) obbligatoria per deployer di sistemi high-risk in ambito pubblico")),
    },
    // Art. 51-55 — GPAI: differenzia obblighi provider GPAI vs downstream deployer
    {
      id: "gpai",
      article: "Art. 51-55",
      title: (() => {
        const gpaiRole = data.gpai?.role;
        if (gpaiRole === "gpai_provider_systemic") return "GPAI Provider — Rischio Sistemico (Art. 55)";
        if (gpaiRole === "gpai_provider_standard") return "GPAI Provider — Obblighi Standard (Art. 53)";
        if (gpaiRole === "downstream_high_risk") return "GPAI Downstream — Sistema High-Risk";
        if (gpaiRole === "downstream_standard") return "GPAI Downstream — Uso Standard";
        return "GPAI — Modelli di Uso Generale";
      })(),
      href: "/dashboard/tools/gpai",
      ...(isGpai || tier === null
        ? {
            status: data.gpai
              ? (data.gpai.obligationsCompleted > 0 ? "complete" : "partial")
              : "missing",
            completedAt: data.gpai?.completedAt,
          }
        : na("Modulo GPAI (Art. 51-55) applicabile solo a provider/integratori di modelli di uso generale")),
    },
    // XAI — applicabile a high-risk (spiegabilità è parte dei requisiti Art. 13+14)
    {
      id: "xai",
      article: "Art. 13+",
      title: "XAI — Spiegabilità e Bias",
      href: "/dashboard/modules/xai",
      ...(isHighRisk || tier === null
        ? { status: data.xai ? "complete" : "missing", completedAt: data.xai?.completedAt }
        : na("Spiegabilità (XAI) rilevante principalmente per sistemi high-risk (Art. 13-14)")),
    },
    // DPIA — dipende da trattamento dati personali, non dal tier AI (ma high-risk quasi sempre richiede DPIA)
    {
      id: "dpia",
      article: "Art. 35 GDPR",
      title: "DPIA — Valutazione d'Impatto Privacy",
      href: "/dashboard/tools/dpia",
      status: data.dpia ? (data.dpia.conclusion?.completedAt ? "complete" : "partial") : "missing",
      completedAt: data.dpia?.conclusion?.completedAt,
    },
    // Art. 26 — obblighi deployer, solo se ruolo è deployer
    {
      id: "deployer",
      article: "Art. 26",
      title: "Deployer Obligations",
      href: "/dashboard/tools/deployer",
      ...(isDeployer || tier === null || !isProvider
        ? { status: data.deployer ? "complete" : "missing", completedAt: data.deployer?.completedAt }
        : na("Art. 26 si applica ai deployer; i provider hanno obblighi distinti (Art. 9-17)")),
    },
    // L.132/2025 — operatività in Italia (trigger: sistema opera/è accessibile in Italia)
    {
      id: "l132",
      article: "L. 132/2025",
      title: "L. 132/2025 — Adempimenti italiani",
      href: "/dashboard/tools/l132",
      ...(data.l132?.deployedInItaly === false
        ? na("L.132/2025 si applica solo a sistemi che operano o sono accessibili in Italia")
        : { status: data.l132 ? "complete" : "missing", completedAt: data.l132?.completedAt }),
    },
    // Art. 49 — registrazione EUDB, solo provider high-risk
    {
      id: "eudb",
      article: "Art. 49",
      title: "EUDB Registration",
      href: "/dashboard/tools/eudb",
      ...(isHighRisk && (isProvider || tier === null)
        ? { status: data.eudb ? "complete" : "missing", completedAt: data.eudb?.completedAt }
        : isDeployer
          ? na("Registrazione EUDB (Art. 49) è a carico del provider, non del deployer")
          : na("Registrazione EUDB obbligatoria solo per provider di sistemi high-risk (Art. 49)")),
    },
    // Art. 22 — Authorized Representative, solo provider non-EU
    {
      id: "authorizedRep",
      article: "Art. 22",
      title: "Authorized Representative",
      href: "/dashboard/tools/authorized-rep",
      status: data.authorizedRep ? "complete" : "missing",
      completedAt: data.authorizedRep?.completedAt,
    },
    // Art. 28 — Provider Transition, rilevante per deployer che diventano provider
    {
      id: "providerTransition",
      article: "Art. 28",
      title: "Provider Transition Check",
      href: "/dashboard/tools/provider-transition",
      status: data.providerTransition
        ? (data.providerTransition.verdict === "deployer" ? "complete" : "partial")
        : "missing",
      completedAt: data.providerTransition?.completedAt,
    },
    // Art. 50 — trasparenza verso utenti finali: chatbot, deepfake, AI-generated content (limited/minimal risk)
    {
      id: "art50",
      article: "Art. 50",
      title: "Trasparenza verso Utenti Finali (Art. 50)",
      href: "/dashboard/tools/art50-kit",
      ...(isLimitedRisk || isMinimalRisk || tier === null
        ? { status: data.art50 ? "complete" : "missing", completedAt: data.art50?.completedAt }
        : na("Art. 50 (trasparenza verso utenti finali per chatbot/AI-generated) si applica a sistemi limited/minimal-risk — i sistemi high-risk usano Art. 13")),
    },
  ];
}

export function getCompletionPercentage(sections: DossierSection[]): number {
  const applicable = sections.filter((s) => s.status !== "not_applicable");
  if (applicable.length === 0) return 0;
  const done = applicable.filter((s) => s.status === "complete").length;
  return Math.round((done / applicable.length) * 100);
}

export function getCompletedCount(sections: DossierSection[]): number {
  return sections.filter((s) => s.status === "complete").length;
}

export function getApplicableCount(sections: DossierSection[]): number {
  return sections.filter((s) => s.status !== "not_applicable").length;
}
