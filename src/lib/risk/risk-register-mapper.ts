// Mapper: stato chat del Risk Manager → RiskRegisterDocument (sola lettura).
// Non salva nulla: traduce i dati estratti dalla conversazione nella struttura
// canonica del template Registro_Rischi_Template_AI_Act_Art9.docx.
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
  };

  // Sezione 5 — voci strutturate; fallback dai rischi liberi (solo descrizione)
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

  // Sezione 6 — gap check
  const gc = chatDoc.final?.gapCheck;
  const gapCheck = gc
    ? {
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
      }
    : undefined;

  // Sezione 7 — log di revisione
  const reviewLog = (chatDoc.governance?.reviewLog ?? [])
    .filter(e => e.date || e.trigger)
    .map(e => ({
      date: e.date ?? "",
      trigger: e.trigger ?? "pianificata",
      outcome: e.outcome,
      reviewer: e.reviewer,
      nextReviewDate: e.nextReviewDate,
    }));

  // Sezione 8 — sign-off
  const so = chatDoc.final?.signOff;
  const signOff = so
    ? {
        riskOwner:           { name: so.riskOwner?.name,           date: so.riskOwner?.date,           signed: so.riskOwner?.signed ?? false },
        complianceLegal:     { name: so.complianceLegal?.name,     date: so.complianceLegal?.date,     signed: so.complianceLegal?.signed ?? false },
        legalRepresentative: { name: so.legalRepresentative?.name, date: so.legalRepresentative?.date, signed: so.legalRepresentative?.signed ?? false },
      }
    : undefined;

  return { identification, risks, gapCheck, reviewLog, signOff };
}

// Allegati tecnici: fasi della chat non coperte dal template del registro,
// mostrate in coda al documento solo se compilate (regola n. 1).
export interface AnnexSection {
  title: string;
  article: string;
  fields: Record<string, unknown>;
}

export function buildAnnexSections(chatDoc: RiskDocumentation): AnnexSection[] {
  const annexes: AnnexSection[] = [];
  const push = (title: string, article: string, data?: Record<string, unknown>) => {
    if (!data) return;
    const fields = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    if (Object.keys(fields).length > 0) annexes.push({ title, article, fields });
  };
  push("Analisi quantitativa (Monte Carlo)", "ENISA Guidelines", chatDoc.montecarlo as Record<string, unknown> | undefined);
  push("Audit bitemporale", "Art. 12, 17", chatDoc.bitemporal as Record<string, unknown> | undefined);
  push("Drift detection", "Art. 72", chatDoc.drift as Record<string, unknown> | undefined);
  push("GPAI e rischio sistemico", "Art. 51-55", chatDoc.gpai as Record<string, unknown> | undefined);
  return annexes;
}
