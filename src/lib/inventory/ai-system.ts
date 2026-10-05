// src/lib/inventory/ai-system.ts
import type { RoleAnswers, RiskAnswers, Role } from "@/lib/obligations/engine"
import { determineRoles, assessRisk, computeObligations } from "@/lib/obligations/engine"

export type SystemRole =
  | "provider"
  | "deployer"
  | "importer"
  | "distributor"
  | "authorized_rep"
  | "product_manufacturer"

export type SystemTier =
  | "prohibited"
  | "high_risk"
  | "limited"
  | "minimal"
  | "gpai"
  | "gpai_systemic"
  | "unclassified"

export type SystemStatus =
  | "planned"
  | "in_development"
  | "in_production"
  | "deprecated"

export interface AISystem {
  id: string                      // "sys-001", "sys-002" ...
  name: string
  owner: string
  description: string
  status: SystemStatus
  euNexus: boolean
  role: SystemRole | null
  roleBasis: string               // motivazione normativa della classificazione
  tier: SystemTier
  tierBasis: string               // articolo o Annex entry + ""
  dualRoleFlag: boolean           // true se provider + deployer (Art. 25 substantial modification)
  obligationsAssessed: boolean
  obligationsNote: string
  nextReview: string              // ISO date
  reviewTrigger: string
  completedObligations: string[]  // ids degli obblighi completati in altri tool
  createdAt: string
  updatedAt: string
  source: "manual" | "ai_draft" | "import" | "clone"
  // Classificazione guidata (lib/obligations/engine.ts) — assenti nei sistemi creati prima
  roleAnswers?: RoleAnswers
  riskAnswers?: RiskAnswers
  roles?: Role[]
  assessedAt?: string
}

const INVENTORY_KEY = "aicomply_ai_inventory"

export function loadInventory(): AISystem[] {
  try {
    return JSON.parse(localStorage.getItem(INVENTORY_KEY) ?? "[]")
  } catch { return [] }
}

export function saveInventory(systems: AISystem[]): void {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(systems))
}

export function addSystem(system: AISystem): void {
  const list = loadInventory()
  list.push(system)
  saveInventory(list)
}

export function updateSystem(id: string, updates: Partial<AISystem>): void {
  const list = loadInventory().map(s =>
    s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
  )
  saveInventory(list)
}

export function deleteSystem(id: string): void {
  saveInventory(loadInventory().filter(s => s.id !== id))
}

export function nextSystemId(): string {
  const list = loadInventory()
  const max = list.reduce((acc, s) => {
    const n = parseInt(s.id.replace("sys-", ""), 10)
    return isNaN(n) ? acc : Math.max(acc, n)
  }, 0)
  return `sys-${String(max + 1).padStart(3, "0")}`
}

/** Obblighi del sistema secondo il motore (lib/obligations/engine.ts); zero se non ancora classificato */
export function computeObligationCount(system: AISystem): { total: number; done: number } {
  if (!system.roleAnswers || !system.riskAnswers) return { total: 0, done: 0 }
  const ids = computeObligations(system.roleAnswers, determineRoles(system.roleAnswers), assessRisk(system.riskAnswers), system.riskAnswers)
    .obligations.map(o => o.id)
  return { total: ids.length, done: ids.filter(id => system.completedObligations.includes(id)).length }
}
