// src/lib/assessment/assessment-helpers.ts
"use client";

import { readFromStorage, writeToStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult, DPIAResult, RiskManagerResult } from "@/lib/dossier/storage-schema";
import { createEmptyFRIA } from "@/lib/simulation/fria-engine";
import type { FRIADocument } from "@/lib/simulation/fria-engine";
import type { Assessment, AssessmentShared, CorrelatedRisk } from "./assessment-schema";
import { getRefsForTheme, rightIdToThemeId } from "./correlation-map";

// ── Factory privata ────────────────────────────────────────────────────────────

function emptyShared(): AssessmentShared {
  return {
    systemName: "",
    organization: "",
    riskLevel: "minimal",
    annexIII: false,
    role: undefined,
    isGPAI: false,
    purpose: "",
    legalBasis: "",
    processesPersonalData: false,
    personalDataCategories: [],
    specialCategories: [],
    dataSubjects: [],
  };
}

function emptyDPIA(): DPIAResult {
  return {
    screening: {
      criteria: [],
      criteria_met_count: 0,
      dpia_required: "uncertain",
      justification_if_no_dpia: "",
    },
    description: {
      system_name: "", organization_name: "", controller_name: "",
      dpo_name: "", dpo_consulted: "", dpo_opinion: "",
      processor_involved: "", processor_name: "",
      processing_purposes: "", personal_data_categories: "",
      special_categories: "", data_subjects_categories: "",
      recipients: "", retention_period: "", assets: [],
      codes_of_conduct: "", certifications: "",
      data_subjects_opinions: "", data_subjects_opinions_justification: "",
      data_subjects_opinions_details: "",
    },
    proportionality: {
      necessity_justification: "", proportionality_checks: [],
      rights_checks: [], processor_clauses_art28: "",
      international_transfers: "", international_transfers_safeguards: "",
    },
    risks: { threats: [], overall_risk_before: "" },
    measures: {
      technical_measures: "", organizational_measures: "",
      overall_risk_after: "", prior_consultation_required: false,
      prior_consultation_authority: "", prior_consultation_date: "",
      review_schedule: "", review_trigger: "",
    },
    conclusion: {
      compliant: "", conditions: "", summary: "",
      next_review_date: "", completedAt: "",
    },
  };
}

function createEmptyAssessment(scopeId: string): Assessment {
  const now = new Date().toISOString();
  return {
    id: `ASS-${Date.now()}`,
    scopeId,
    shared: emptyShared(),
    dpia: emptyDPIA(),
    fria: createEmptyFRIA(),
    correlatedRisks: [],
    meta: { createdAt: now, updatedAt: now, version: 1 },
  };
}

// ── Accesso ────────────────────────────────────────────────────────────────────

export function getAssessment(): Assessment {
  const existing = readFromStorage<Assessment>("assessment");
  if (existing) return existing;
  const scopeId = typeof window !== "undefined"
    ? (localStorage.getItem("aicomply_active_project_id") ?? "legacy")
    : "ssr";
  return createEmptyAssessment(scopeId);
}

function saveAssessment(a: Assessment): void {
  writeToStorage<Assessment>("assessment", {
    ...a,
    meta: { ...a.meta, updatedAt: new Date().toISOString(), version: a.meta.version + 1 },
  });
}

// ── Seed da Classifier ─────────────────────────────────────────────────────────

export function seedAssessmentFromClassifier(c: ClassifierResult): void {
  const a = getAssessment();
  a.shared = {
    ...a.shared,
    systemName:   c.systemName,
    riskLevel:    c.riskLevel,
    annexIII:     c.annexIII,
    role:         c.role,
    isGPAI:       c.isGPAI ?? false,
  };
  saveAssessment(a);
}

// ── Patch shared ───────────────────────────────────────────────────────────────

export function patchShared(fields: Partial<AssessmentShared>): void {
  const a = getAssessment();
  a.shared = { ...a.shared, ...fields };
  saveAssessment(a);
}

// ── Patch DPIA vista ───────────────────────────────────────────────────────────

export function patchDPIA(updater: (prev: DPIAResult) => DPIAResult): void {
  const a = getAssessment();
  a.dpia = updater(a.dpia);
  saveAssessment(a);
}

// ── Patch FRIA vista ───────────────────────────────────────────────────────────

export function patchFRIA(updater: (prev: FRIADocument) => FRIADocument): void {
  const a = getAssessment();
  a.fria = updater(a.fria);
  saveAssessment(a);
}

// ── Migrazione FRIA legacy ─────────────────────────────────────────────────────

const FRIA_LEGACY_KEY = "aicomply_fria_document";

export function migrateLegacyFRIA(): void {
  if (typeof window === "undefined") return;
  const rawLegacy = localStorage.getItem(FRIA_LEGACY_KEY);
  if (!rawLegacy) return;

  const a = getAssessment();
  const isDefault = a.fria.context.legal_basis === "" && a.fria.scenarios.length === 0;
  if (!isDefault) return;

  try {
    const legacyDoc = JSON.parse(rawLegacy) as FRIADocument;
    a.fria = legacyDoc;
    if (!a.shared.systemName && legacyDoc.system_name) {
      a.shared.systemName = legacyDoc.system_name;
      a.shared.organization = legacyDoc.organization;
    }
    saveAssessment(a);
    localStorage.setItem(`${FRIA_LEGACY_KEY}_migrated`, rawLegacy);
    localStorage.removeItem(FRIA_LEGACY_KEY);
  } catch {
    // parse error — non toccare nulla
  }
}

// ── Rischi correlati ──────────────────────────────────────────────────────────

export function addCorrelatedRisk(
  fields: Pick<CorrelatedRisk, "description" | "severity" | "sourceView" | "sourceRefId"> & {
    themeId?: string;
  }
): string {
  const a = getAssessment();
  const existingIdx = fields.sourceRefId
    ? a.correlatedRisks.findIndex(r => r.sourceRefId === fields.sourceRefId)
    : -1;

  const refs = fields.themeId ? getRefsForTheme(fields.themeId) : [];
  const id = existingIdx >= 0 ? a.correlatedRisks[existingIdx].id : `CR-${Date.now()}`;

  const risk: CorrelatedRisk = {
    id,
    description: fields.description,
    severity: fields.severity,
    sourceView: fields.sourceView,
    sourceRefId: fields.sourceRefId,
    refs,
  };

  if (existingIdx >= 0) {
    a.correlatedRisks[existingIdx] = risk;
  } else {
    a.correlatedRisks.push(risk);
  }
  saveAssessment(a);
  return id;
}

export function syncCorrelatedRisksFromDPIA(): void {
  const a = getAssessment();
  for (const threat of a.dpia.risks.threats) {
    const severity: CorrelatedRisk["severity"] =
      threat.risk_level === "high" ? "high" :
      threat.risk_level === "medium" ? "medium" : "low";
    addCorrelatedRisk({
      description: threat.description || threat.source,
      severity,
      sourceView: "dpia",
      sourceRefId: threat.id,
      themeId: "profiling_scoring",
    });
  }
}

export function syncCorrelatedRisksFromFRIA(): void {
  const a = getAssessment();
  for (const scenario of a.fria.scenarios) {
    for (const impact of scenario.right_impacts) {
      const priority = impact.likelihood.computed_priority;
      const severity: CorrelatedRisk["severity"] =
        priority === "critical" ? "critical" :
        priority === "high" ? "high" :
        priority === "medium" ? "medium" : "low";
      addCorrelatedRisk({
        description: `[${scenario.title}] Impatto su ${impact.right_id}`,
        severity,
        sourceView: "fria",
        sourceRefId: `${scenario.id}::${impact.right_id}`,
        themeId: rightIdToThemeId(impact.right_id),
      });
    }
  }
}

// ── Applica mitigazione al risk-register ──────────────────────────────────────

export function applyMitigationToRegister(correlatedRiskId: string, mitigationText: string): void {
  const a = getAssessment();
  const crIdx = a.correlatedRisks.findIndex(r => r.id === correlatedRiskId);
  if (crIdx < 0) return;
  const cr = a.correlatedRisks[crIdx];
  if (cr.mitigation?.appliedToRegister) return; // idempotente

  const rm = readFromStorage<RiskManagerResult>("riskManager") ?? {
    risks: [],
    overallRiskLevel: "medium" as const,
    completedAt: new Date().toISOString(),
  };

  const newRiskId = `RM-ASS-${Date.now()}`;
  rm.risks.push({
    id: newRiskId,
    title: cr.description.slice(0, 80),
    likelihood: (cr.severity === "critical" || cr.severity === "high") ? "high" : "medium",
    impact: cr.severity === "critical" ? "high" : cr.severity === "high" ? "high" : "medium",
    mitigation: mitigationText,
    residualRisk: "review",
  });
  writeToStorage<RiskManagerResult>("riskManager", rm);

  a.correlatedRisks[crIdx] = {
    ...cr,
    mitigation: { text: mitigationText, appliedToRegister: true, registerRiskId: newRiskId },
  };
  saveAssessment(a);
}
