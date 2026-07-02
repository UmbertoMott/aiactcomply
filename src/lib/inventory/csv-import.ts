// src/lib/inventory/csv-import.ts
import type { AISystem } from "./ai-system"

export interface CsvRow {
  name: string
  owner: string
  description: string
  status?: string
}

export function parseInventoryCsv(csvText: string): CsvRow[] {
  const lines = csvText.trim().split("\n")
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/["']/g, ""))

  return lines.slice(1).map(line => {
    const cells = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cells[i] ?? "" })
    return {
      name: row["name"] ?? row["nome"] ?? row["sistema"] ?? "",
      owner: row["owner"] ?? row["responsabile"] ?? row["team"] ?? "",
      description: row["description"] ?? row["descrizione"] ?? "",
      status: row["status"] ?? row["stato"] ?? "in_production",
    }
  }).filter(r => r.name.trim() !== "")
}

// Genera sistemi da righe CSV — IDs assegnati sequenzialmente al momento dell'addSystem,
// non qui, per evitare collisioni con nextSystemId() che legge da localStorage.
export function buildSystemFromRow(row: CsvRow, id: string): AISystem {
  return {
    id,
    name: row.name,
    owner: row.owner,
    description: row.description,
    status: (["planned", "in_development", "in_production", "deprecated"].includes(row.status ?? "")
      ? row.status : "in_production") as AISystem["status"],
    euNexus: true,          // default conservativo — da verificare
    role: null,
    roleBasis: "",
    tier: "unclassified",  // SEMPRE — import non classifica mai silenziosamente
    tierBasis: "",
    dualRoleFlag: false,
    obligationsAssessed: false,
    obligationsNote: "",
    nextReview: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    reviewTrigger: "on substantial modification or annually",
    completedObligations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "import",
  }
}
