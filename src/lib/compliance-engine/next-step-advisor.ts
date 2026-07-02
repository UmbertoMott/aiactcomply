// src/lib/compliance-engine/next-step-advisor.ts
// Compliance engine: given OrgProfile + current dossier state, returns prioritized next steps

import type { OrgProfile, ClassifierResult } from "@/lib/dossier/storage-schema";
import { readFromStorage } from "@/lib/dossier/storage-schema";

export type StepPriority = "critical" | "high" | "medium" | "low";

export interface ComplianceStep {
  id: string;
  priority: StepPriority;
  title: string;
  description: string;
  href: string;
  estimatedHours?: number;
  done: boolean;
  condition?: string;   // explains why this step is relevant for this org
}

export interface NextStepResult {
  steps: ComplianceStep[];
  percentComplete: number;
  tier: "high" | "limited" | "minimal" | "gpai" | "unclassified";
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isDone(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) !== null;
}

// ── Core engine ────────────────────────────────────────────────────────────

export function computeNextSteps(
  orgProfile: OrgProfile,
  classifier?: ClassifierResult | null,
): NextStepResult {
  // Re-read classifier from storage if not passed
  const clf = classifier ?? (typeof window !== "undefined"
    ? readFromStorage<ClassifierResult>("classifier")
    : null);

  const tier = resolveTier(clf, orgProfile);
  const steps: ComplianceStep[] = buildSteps(tier, orgProfile);

  const done = steps.filter((s) => s.done).length;
  const percentComplete = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;

  return { steps, percentComplete, tier };
}

function resolveTier(
  clf: ClassifierResult | null | undefined,
  orgProfile: OrgProfile,
): NextStepResult["tier"] {
  if (orgProfile.gpaiDetected) return "gpai";
  if (!clf) return "unclassified";
  const lvl = clf.riskLevel.toLowerCase();
  if (lvl === "high" || lvl === "unacceptable") return "high";
  if (lvl === "limited") return "limited";
  return "minimal";
}

function buildSteps(
  tier: NextStepResult["tier"],
  orgProfile: OrgProfile,
): ComplianceStep[] {
  const steps: ComplianceStep[] = [];

  // Step 0 — always: classify the system
  steps.push({
    id: "classify",
    priority: "critical",
    title: "Classifica il sistema AI",
    description: "Determina il livello di rischio del tuo sistema secondo l'EU AI Act (Art. 6 + Annex III).",
    href: "/dashboard/triage",
    estimatedHours: 1,
    done: isDone("aicomply_classifier_result"),
  });

  if (tier === "unclassified") return steps;

  // GPAI path
  if (tier === "gpai") {
    steps.push({
      id: "gpai_assessment",
      priority: "critical",
      title: "GPAI Assessment (Art. 53–55)",
      description: "Valuta gli obblighi specifici per i modelli di uso generale: trasparenza, test, documentazione.",
      href: "/dashboard/risk/gpai-assessment",
      estimatedHours: 4,
      done: isDone("aicomply_gpai_result"),
      condition: "GPAI rilevato in fase di classificazione",
    });
    steps.push({
      id: "docugen",
      priority: "high",
      title: "Documentazione tecnica (Art. 11)",
      description: "Genera la documentazione obbligatoria per il tuo modello GPAI.",
      href: "/dashboard/tools/docugen",
      estimatedHours: 3,
      done: isDone("aicomply_docugen_result"),
    });
    return steps;
  }

  // High-risk path
  if (tier === "high") {
    steps.push({
      id: "risk_manager",
      priority: "critical",
      title: "Risk Management System (Art. 9)",
      description: "Identifica e mitiga i rischi del sistema ad alto rischio prima della messa in servizio.",
      href: "/dashboard/risk/risk-manager",
      estimatedHours: 3,
      done: isDone("aicomply_risk_manager_result"),
    });
    steps.push({
      id: "docugen",
      priority: "critical",
      title: "Documentazione tecnica (Art. 11)",
      description: "Genera la documentazione tecnica obbligatoria per sistemi ad alto rischio.",
      href: "/dashboard/tools/docugen",
      estimatedHours: 4,
      done: isDone("aicomply_docugen_result"),
    });
    steps.push({
      id: "data_audit",
      priority: "high",
      title: "Data Governance Audit (Art. 10)",
      description: "Verifica qualità e bias dei dataset di training, testing e validazione.",
      href: "/dashboard/tools/data-audit",
      estimatedHours: 3,
      done: isDone("aicomply_data_audit_result"),
    });
    steps.push({
      id: "logvault",
      priority: "high",
      title: "Log & Audit Trail (Art. 12)",
      description: "Configura la registrazione automatica degli eventi per garantire tracciabilità.",
      href: "/dashboard/tools/logvault",
      estimatedHours: 2,
      done: isDone("aicomply_logvault_result"),
    });
    steps.push({
      id: "oversight",
      priority: "high",
      title: "Human Oversight (Art. 14)",
      description: "Definisci i meccanismi di supervisione umana e i punti di intervento.",
      href: "/dashboard/tools/docugen",
      estimatedHours: 2,
      done: isDone("aicomply_oversight_result"),
    });
    steps.push({
      id: "resilience",
      priority: "high",
      title: "Accuracy & Resilience (Art. 15)",
      description: "Documenta metriche di accuratezza, robustezza e misure di cybersecurity.",
      href: "/dashboard/tools/docugen",
      estimatedHours: 2,
      done: isDone("aicomply_resilience_result"),
    });
    steps.push({
      id: "conformity",
      priority: "medium",
      title: "Conformity Assessment (Art. 43)",
      description: "Completa la valutazione di conformità e la dichiarazione di conformità UE.",
      href: "/dashboard/compliance/conformity",
      estimatedHours: 3,
      done: isDone("aicomply_conformity_assessment"),
    });
    steps.push({
      id: "qms",
      priority: "medium",
      title: "Quality Management System (Art. 17)",
      description: "Istituisci e documenta il sistema di gestione qualità.",
      href: "/dashboard/compliance/qms",
      estimatedHours: 3,
      done: isDone("aicomply_qms_result"),
    });
  }

  // Limited-risk path
  if (tier === "limited") {
    steps.push({
      id: "transparency",
      priority: "high",
      title: "Obblighi di Trasparenza (Art. 50)",
      description: "Informa gli utenti che stanno interagendo con un sistema AI.",
      href: "/dashboard/compliance/transparency",
      estimatedHours: 1,
      done: isDone("aicomply_transparency_result"),
    });
  }

  // Minimal path — DPIA as good practice
  if (tier === "minimal") {
    steps.push({
      id: "dpia",
      priority: "medium",
      title: "DPIA (consigliato)",
      description: "Anche per sistemi a rischio minimo, una DPIA GDPR è buona pratica se tratti dati personali.",
      href: "/dashboard/compliance/dpia",
      estimatedHours: 2,
      done: isDone("aicomply_dpia_result"),
      condition: "Consigliato per sistemi che trattano dati personali",
    });
  }

  // PA Italy flag → L.132 + FRIA
  if (orgProfile.paItaly && tier === "high") {
    steps.push({
      id: "l132",
      priority: "high",
      title: "L.132/2024 — Check PA Italia",
      description: "Verifica la conformità al decreto italiano sull'AI per la pubblica amministrazione.",
      href: "/dashboard/compliance/l132",
      estimatedHours: 2,
      done: isDone("aicomply_l132_result"),
      condition: "Attivato: organizzazione PA Italia",
    });
    steps.push({
      id: "fria",
      priority: "medium",
      title: "Fundamental Rights Impact Assessment (Art. 27)",
      description: "Obbligatorio per deployer pubblici di sistemi ad alto rischio.",
      href: "/dashboard/compliance/fria",
      estimatedHours: 3,
      done: isDone("aicomply_fria_result"),
      condition: "Obbligatorio per PA (deployer pubblico)",
    });
  }

  // NIST flag
  if (orgProfile.nistEnabled) {
    steps.push({
      id: "nist",
      priority: "low",
      title: "NIST AI RMF Mapping",
      description: "Mappa i controlli EU AI Act al NIST AI Risk Management Framework.",
      href: "/dashboard/compliance/nist",
      estimatedHours: 2,
      done: false, // NIST mapping tool not yet in dossier engine
      condition: "NIST AI RMF abilitato nelle impostazioni",
    });
  }

  // DPIA for high-risk (GDPR intersection)
  if (tier === "high") {
    steps.push({
      id: "dpia",
      priority: "medium",
      title: "DPIA GDPR (Art. 35 GDPR)",
      description: "Sistemi AI ad alto rischio che trattano dati personali richiedono DPIA.",
      href: "/dashboard/compliance/dpia",
      estimatedHours: 3,
      done: isDone("aicomply_dpia_result"),
      condition: "Consigliato per sistemi ad alto rischio con dati personali",
    });
  }

  return steps;
}
