// Mapper: stato chat del Risk Manager → RiskRegisterDocument (sola lettura).
// Allineato al Template Risk Register Guidato Art. 9 (§0-§9 + trasversale Comunicazione).
import type { RiskDocumentation } from "@/app/actions/riskManagerChat";
import {
  VERIFY_NOTE_IT,
  type RiskRegisterDocument,
  type RiskRegisterEntry,
  type SystemIdentification,
} from "./risk-register-types";

function withVerifyNote(ref: string | undefined): string {
  if (!ref) return VERIFY_NOTE_IT;
  return ref.includes(VERIFY_NOTE_IT) ? ref : `${ref} ${VERIFY_NOTE_IT}`;
}

/** Genera fingerprint leggero del documento (non crittografico — per audit trail base) */
function simpleHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return "RR-" + h.toString(16).toUpperCase().padStart(8, "0");
}

export function buildRiskRegisterDocument(
  chatDoc: RiskDocumentation,
  classifier?: { systemName?: string; riskLevel?: string } | null
): RiskRegisterDocument {
  const idData = chatDoc.scoping?.identification ?? {};

  const tierMap: Record<string, SystemIdentification["riskTier"]> = {
    minimal: "minimal", limited: "limited", high: "high_risk",
    high_risk: "high_risk", gpai: "gpai", unacceptable: "high_risk",
  };

  const identification: SystemIdentification = {
    systemName: idData.systemName ?? chatDoc.scoping?.systemName ?? classifier?.systemName,
    providerDeployerRole: idData.providerDeployerRole,
    descriptionAndPurpose: idData.descriptionAndPurpose ?? chatDoc.scoping?.context,
    riskTier: idData.riskTier ?? (classifier?.riskLevel ? tierMap[classifier.riskLevel] ?? "unclassified" : "unclassified"),
    annexIIIArea: idData.annexIIIArea,
    applicableArticles: idData.applicableArticles ?? [],
    personalDataProcessed: idData.personalDataProcessed ?? "unspecified",
    legalBasis: idData.legalBasis,
    humanOversightRequired: idData.humanOversightRequired,
    registerOwner: idData.registerOwner,
    firstCompiledAt: undefined,
    documentVersion: "1.0",
    incorporatesGpaiModel: idData.incorporatesGpaiModel ?? "unspecified",
    vulnerableGroupsImpactAssessment: chatDoc.identification?.vulnerableGroupsImpactAssessment,
    // §0 — nuovi campi
    riskAppetite: idData.riskAppetite,
    usageContext: idData.usageContext,
    lifeCyclePhase: idData.lifeCyclePhase,
  };

  // §1/§5 — voci strutturate del catalogo rischi
  const structured = chatDoc.identification?.riskEntries ?? [];
  const freeRisks = structured.length === 0 ? (chatDoc.identification?.risks ?? []) : [];

  const risks: RiskRegisterEntry[] = [
    ...structured.map((r, i) => ({
      id: r.id ?? `R-${String(i + 1).padStart(2, "0")}`,
      category: r.category ?? "",
      description: r.description ?? "",
      art9Reference: withVerifyNote(r.art9Reference),
      likelihood: r.likelihood,
      impact: r.impact,
      mitigations: r.mitigations,
      owner: r.owner,
      status: r.status ?? "open" as const,
      nextReviewDate: r.nextReviewDate,
      source: "ai_catalog" as const,
      aiConfirmed: false,
    })),
    ...freeRisks.map((desc, i) => ({
      id: `R-${String(i + 1).padStart(2, "0")}`,
      category: "",
      description: desc,
      art9Reference: VERIFY_NOTE_IT,
      status: "open" as const,
      source: "ai_catalog" as const,
      aiConfirmed: false,
    })),
  ];

  // §2 — Stima e valutazione
  const est = chatDoc.estimation;
  const estimation = est ? {
    intendedUseCases: est.intendedUseCases ?? [],
    foreseenMisuse: est.foreseenMisuse ?? [],
    impactAssessment: est.impactAssessment,
    affectedPersonsCount: est.affectedPersonsCount,
    evaluationAgainstCriteria: est.evaluationAgainstCriteria,
  } : undefined;

  // §3 — Test e validazione
  const test = chatDoc.testing;
  const testValidation = test ? {
    testMetrics: test.testMetrics ?? [],
    thresholds: test.thresholds,
    validationOutcome: test.validationOutcome,
    worstCase: test.worstCase,
    confidenceLevel: test.confidenceLevel,
  } : undefined;

  // §4 — Trattamento del rischio e rischio residuo
  const mit = chatDoc.mitigation;
  const treatment = mit ? {
    treatmentOption: mit.treatmentOption,
    measures: mit.measures ?? [],
    residualRisk: mit.residualRisk,
    responsiblePerson: mit.responsiblePerson,
    reviewCycle: mit.reviewCycle,
  } : undefined;

  // §5 — Monitoraggio post-market (dettagli extra oltre al reviewLog)
  const mon = chatDoc.monitoring;
  const monitoringDetails = mon ? {
    monitoringFrequency: mon.monitoringFrequency,
    alertThreshold: mon.alertThreshold,
    postMarketPlan: mon.postMarketPlan,
    psiScore: mon.psiScore,
    driftDetected: mon.driftDetected,
  } : undefined;

  // §6 — gap check
  const gc = chatDoc.gap_check;
  const gapCheck = gc ? {
    coverageScore: gc.coverageScore,
    assessment: gc.assessment,
    missingAreas: (gc.missingAreas ?? [])
      .filter(a => a.area)
      .map(a => ({
        area: a.area ?? "",
        art9Requirement: withVerifyNote(a.art9Requirement),
        suggestedRiskTitle: a.suggestedRiskTitle,
        priority: a.priority ?? "raccomandato" as const,
      })),
  } : undefined;

  // §5/§7 — log di revisione
  const reviewLog = (mon?.reviewLog ?? [])
    .filter(e => e.date || e.trigger)
    .map(e => ({
      date: e.date ?? "",
      trigger: e.trigger ?? "pianificata",
      outcome: e.outcome,
      reviewer: e.reviewer,
      nextReviewDate: e.nextReviewDate,
    }));

  // §7 — Tracciabilità e mantenimento continuo
  const tr = chatDoc.traceability;
  const traceability = tr ? {
    versionsTracked: tr.versionsTracked,
    lastAuditDate: tr.lastAuditDate,
    changes: tr.changes ?? [],
    retentionPolicy: tr.retentionPolicy,
    qmsIntegration: tr.qmsIntegration,
  } : undefined;

  // §8 — Dismissione / ritiro
  const dis = chatDoc.dismissal;
  const dismissal = dis ? {
    dismissalRisks: dis.dismissalRisks,
    dataDeletion: dis.dataDeletion,
    downstreamDependencies: dis.downstreamDependencies,
    communicationToDeployers: dis.communicationToDeployers,
  } : undefined;

  // §9 — Sign-off
  const so = chatDoc.signoff?.signOff;
  const signOff = so ? {
    riskOwner:           { name: so.riskOwner?.name,           date: so.riskOwner?.date,           signed: so.riskOwner?.signed ?? false },
    complianceLegal:     { name: so.complianceLegal?.name,     date: so.complianceLegal?.date,     signed: so.complianceLegal?.signed ?? false },
    legalRepresentative: { name: so.legalRepresentative?.name, date: so.legalRepresentative?.date, signed: so.legalRepresentative?.signed ?? false },
    otherRegimesIntegration: chatDoc.signoff?.otherRegimesIntegration,
    documentHash: simpleHash(JSON.stringify({ risks, identification, gapCheck })),
  } : undefined;

  // Trasversale — Comunicazione e consultazione
  const comm = chatDoc.communication;
  const communication = comm ? {
    stakeholdersInvolved: comm.stakeholdersInvolved,
    friaLink: comm.friaLink,
    externalConsultees: comm.externalConsultees,
    consultationDocumented: comm.consultationDocumented,
  } : undefined;

  return {
    identification, risks,
    estimation, testValidation, treatment,
    monitoringDetails, gapCheck, reviewLog,
    traceability, dismissal, signOff, communication,
  };
}

export interface AnnexSection {
  title: string;
  article: string;
  fields: Record<string, unknown>;
}

export function buildAnnexSections(chatDoc: RiskDocumentation): AnnexSection[] {
  // Solo il modulo condizionale GPAI rimane come annex generico.
  // Tutti gli altri dati (estimation, testing, mitigation, traceability) ora
  // sono sezioni tipizzate nel documento principale.
  const annexes: AnnexSection[] = [];
  const push = (title: string, article: string, data?: Record<string, unknown>) => {
    if (!data) return;
    const fields = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    if (Object.keys(fields).length > 0) annexes.push({ title, article, fields });
  };
  push("GPAI e Rischio Sistemico", "Art. 51-55 [verify against current AI Act text]", chatDoc.gpai_systemic_risk as Record<string, unknown> | undefined);
  return annexes;
}

/** Indica se il modulo GPAI condizionale deve essere mostrato in UI. */
export function shouldShowGpaiModule(chatDoc: RiskDocumentation): boolean {
  const tier = chatDoc.scoping?.identification?.riskTier;
  const gpaiFlag = chatDoc.scoping?.identification?.incorporatesGpaiModel;
  return tier === "gpai" || gpaiFlag === "yes";
}
