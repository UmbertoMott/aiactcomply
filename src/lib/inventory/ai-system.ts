// src/lib/inventory/ai-system.ts

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
  roleBasis: string               // sempre con "[verify against current AI Act text]"
  tier: SystemTier
  tierBasis: string               // articolo o Annex entry + "[verify]"
  dualRoleFlag: boolean           // true se provider + deployer (Art. 25 substantial modification)
  obligationsAssessed: boolean
  obligationsNote: string
  nextReview: string              // ISO date
  reviewTrigger: string
  completedObligations: string[]  // ids degli obblighi completati in altri tool
  createdAt: string
  updatedAt: string
  source: "manual" | "ai_draft" | "import" | "clone"
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

export function computeObligationCount(system: AISystem): { total: number; done: number } {
  const totals: Record<SystemTier, number> = {
    prohibited: 0, high_risk: 10, limited: 3,
    minimal: 0, gpai: 6, gpai_systemic: 8, unclassified: 0
  }
  const total = totals[system.tier] ?? 0
  const done = system.completedObligations.length
  return { total, done }
}
