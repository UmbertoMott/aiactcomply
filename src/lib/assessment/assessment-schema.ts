// src/lib/assessment/assessment-schema.ts

import type {
  ClassifierResult,
  DPIAResult,
  RiskManagerResult,
} from "@/lib/dossier/storage-schema";
import type { FRIADocument } from "@/lib/simulation/fria-engine";

/** Nucleo condiviso — unica fonte di verità, seeded dal Classifier. */
export interface AssessmentShared {
  systemName: string;
  organization: string;
  riskLevel: ClassifierResult["riskLevel"];
  annexIII: boolean;
  role?: ClassifierResult["role"];
  isGPAI?: boolean;
  purpose: string;
  legalBasis: string;
  processesPersonalData: boolean;
  personalDataCategories: string[];
  specialCategories: string[];
  dataSubjects: string[];
}

/** Riferimento normativo per la tabella di correlazione. */
export interface ComplianceRef {
  framework: "WP29" | "DIHR" | "AI_ACT" | "GDPR" | "CFR";
  citation: string;
}

/** Rischio correlato — ponte tra DPIAThreat, FRIARightImpact e risk-register. */
export interface CorrelatedRisk {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  sourceView: "dpia" | "fria" | "both" | "manual";
  sourceRefId?: string;
  refs: ComplianceRef[];
  mitigation?: {
    text: string;
    appliedToRegister: boolean;
    registerRiskId?: string;
  };
}

/** Root: DPIA e FRIA come due viste di un unico oggetto. */
export interface Assessment {
  id: string;
  scopeId: string;
  shared: AssessmentShared;
  dpia: DPIAResult;
  fria: FRIADocument;
  correlatedRisks: CorrelatedRisk[];
  meta: {
    createdAt: string;
    updatedAt: string;
    version: number;
  };
}
