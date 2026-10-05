// Ponte tra l'inventario e il vecchio risultato del Classifier ("aicomply_classifier_result").
// Il Classifier è stato ritirato: la classificazione si fa nell'inventario con il motore degli
// obblighi. Molti tool leggono ancora il vecchio risultato, che ora viene ricavato dal sistema
// attivo classificato nell'inventario, così esiste una sola fonte.

import { loadInventory, addSystem, nextSystemId, type AISystem, type SystemTier } from "./ai-system";
import { determineRoles, assessRisk, computeObligations, isHighRisk, legacyRole } from "@/lib/obligations/engine";
import { writeToStorage, readFromStorage, type ClassifierResult } from "@/lib/dossier/storage-schema";

const ACTIVE_SYSTEM_KEY = "aicomply_active_system_id";
const MIGRATED_KEY = "aicomply_classifier_migrated";

export function isAssessed(s: AISystem): boolean {
  return !!s.roleAnswers && !!s.riskAnswers;
}

/** Risultato in formato Classifier per un sistema classificato nell'inventario */
export function classifierResultFor(s: AISystem): ClassifierResult | null {
  if (!s.roleAnswers || !s.riskAnswers) return null;
  const roleResult = determineRoles(s.roleAnswers);
  const risk = assessRisk(s.riskAnswers);
  const { roles, obligations } = computeObligations(s.roleAnswers, roleResult, risk, s.riskAnswers);
  const riskLevel: ClassifierResult["riskLevel"] =
    risk.category === "prohibited" ? "unacceptable"
    : isHighRisk(risk.category) ? "high"
    : risk.art50.length > 0 ? "limited"
    : "minimal";
  return {
    systemName: s.name,
    systemDescription: s.description,
    riskLevel,
    annexIII: risk.category === "high_risk_annex_iii",
    annexI: risk.category === "high_risk_annex_i",
    applicableArticles: [...new Set(obligations.map((o) => o.article))],
    completedAt: s.assessedAt ?? s.updatedAt,
    role: legacyRole(roles) ?? undefined,
    isGPAI: risk.gpai,
  };
}

/** Sistema classificato da usare come riferimento: quello attivo, altrimenti il primo classificato */
export function referenceSystem(inventory: AISystem[] = loadInventory()): AISystem | null {
  const assessed = inventory.filter(isAssessed);
  if (assessed.length === 0) return null;
  let activeId: string | null = null;
  try { activeId = localStorage.getItem(ACTIVE_SYSTEM_KEY); } catch { /* storage non disponibile */ }
  return assessed.find((s) => s.id === activeId) ?? assessed[0];
}

/** Aggiorna il risultato in formato Classifier a partire dall'inventario */
export function syncClassifierFromInventory(): void {
  if (typeof window === "undefined") return;
  const sys = referenceSystem();
  const result = sys ? classifierResultFor(sys) : null;
  if (result) writeToStorage<ClassifierResult>("classifier", result);
}

const RISK_TO_TIER: Record<ClassifierResult["riskLevel"], SystemTier> = {
  unacceptable: "prohibited", high: "high_risk", limited: "limited", minimal: "minimal",
};

/**
 * Una sola volta: un risultato salvato dal vecchio Classifier diventa un sistema dell'inventario,
 * da completare con la classificazione guidata.
 */
export function migrateLegacyClassifier(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATED_KEY) === "true") return;
    localStorage.setItem(MIGRATED_KEY, "true");
    const old = readFromStorage<ClassifierResult>("classifier");
    const inventory = loadInventory();
    if (!old?.systemName || inventory.length > 0) return;
    const now = new Date().toISOString();
    const role = old.role === "provider" || old.role === "fornitore" ? "provider"
      : old.role === "deployer" || old.role === "dispiegatore" || old.role === "deployer/utilizzatore" ? "deployer" : null;
    addSystem({
      id: nextSystemId(), name: old.systemName, owner: "", description: old.systemDescription ?? "",
      status: "in_production", euNexus: true, role, roleBasis: "",
      tier: RISK_TO_TIER[old.riskLevel] ?? "unclassified", tierBasis: "Importato dal vecchio Classifier: da confermare con la classificazione guidata.",
      dualRoleFlag: false, obligationsAssessed: false, obligationsNote: "",
      nextReview: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      reviewTrigger: "on substantial modification or annually",
      completedObligations: [], createdAt: now, updatedAt: now, source: "import",
    });
  } catch { /* dati non leggibili: nessuna migrazione */ }
}
