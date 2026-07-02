// Web Worker — calcolo bias matematico reale da CSV
// Gira in thread separato, non blocca la UI.
// Riceve la matrice dati, restituisce SOLO metriche aggregate (mai dati grezzi).

export interface BiasWorkerInput {
  rows: Array<Record<string, string | number>>
  targetColumn: string       // colonna con la label/predizione
  protectedColumn: string    // colonna demografica sensibile (es. "genere")
  positiveLabel: string      // valore che rappresenta l'outcome positivo (es. "1", "hired")
  trueColumn?: string        // opzionale: colonna ground truth per calcolare TPR
}

export interface BiasGroupStat {
  label: string
  count: number
  positiveRate: number
  truePositiveRate: number | null
  falsePositiveRate: number | null
}

export interface BiasWorkerOutput {
  demographicParityDifference: number  // |P(Y=1|A=0) - P(Y=1|A=1)|
  equalizedOddsDifference: number      // max |TPR_i - TPR_j| tra gruppi
  disparateImpactRatio: number         // min(rate) / max(rate) — <0.8 = flag 4/5ths rule
  groups: BiasGroupStat[]
  flagged: boolean     // true se DPD > 0.1
  flaggedDI: boolean   // true se DI < 0.8
  datasetSize: number
  missingValues: number
  computedAt: string
}

self.addEventListener("message", (e: MessageEvent) => {
  if (e.data.type !== "analyze") return

  const { rows, targetColumn, protectedColumn, positiveLabel, trueColumn } =
    e.data.payload as BiasWorkerInput

  // ── Raggruppa per valore della colonna protetta ─────────────────────────────
  type GroupData = {
    total: number
    positive: number
    truePositive: number   // TP (predicted=pos AND true=pos)
    falsePositive: number  // FP (predicted=pos AND true=neg)
    actualPositive: number // totale ground truth positivi
  }

  const groups = new Map<string, GroupData>()
  let missingValues = 0

  for (const row of rows) {
    const group = String(row[protectedColumn] ?? "")
    if (!group) { missingValues++; continue }

    const predicted  = String(row[targetColumn] ?? "")
    const trueLabel  = trueColumn ? String(row[trueColumn] ?? "") : null
    const isPositive = predicted === positiveLabel
    const isTruePos  = trueLabel === positiveLabel

    if (!groups.has(group)) {
      groups.set(group, { total: 0, positive: 0, truePositive: 0, falsePositive: 0, actualPositive: 0 })
    }
    const g = groups.get(group)!
    g.total++
    if (isPositive) g.positive++
    if (trueLabel !== null) {
      if (isTruePos) g.actualPositive++
      if (isPositive && isTruePos) g.truePositive++
      if (isPositive && !isTruePos) g.falsePositive++
    }
  }

  const groupStats: BiasGroupStat[] = Array.from(groups.entries()).map(([label, data]) => {
    const positiveRate = data.total > 0 ? data.positive / data.total : 0
    const truePositiveRate = (trueColumn && data.actualPositive > 0)
      ? data.truePositive / data.actualPositive
      : null
    const falsePositiveRate = (trueColumn && (data.total - data.actualPositive) > 0)
      ? data.falsePositive / (data.total - data.actualPositive)
      : null

    return { label, count: data.total, positiveRate, truePositiveRate, falsePositiveRate }
  })

  // ── Demographic Parity Difference ──────────────────────────────────────────
  const rates    = groupStats.map(g => g.positiveRate)
  const maxRate  = Math.max(...rates)
  const minRate  = Math.min(...rates)
  const dpd      = rates.length >= 2 ? maxRate - minRate : 0

  // ── Equalized Odds Difference (se ground truth disponibile) ────────────────
  const tprRates  = groupStats.map(g => g.truePositiveRate).filter((r): r is number => r !== null)
  const eod       = tprRates.length >= 2
    ? Math.abs(Math.max(...tprRates) - Math.min(...tprRates))
    : 0

  // ── Disparate Impact Ratio (4/5ths rule) ───────────────────────────────────
  const dir = rates.length >= 2 && maxRate > 0 ? minRate / maxRate : 1.0

  const result: BiasWorkerOutput = {
    demographicParityDifference: Math.round(dpd * 1000) / 1000,
    equalizedOddsDifference:     Math.round(eod * 1000) / 1000,
    disparateImpactRatio:        Math.round(dir * 1000) / 1000,
    groups: groupStats,
    flagged:    dpd > 0.1,
    flaggedDI:  dir < 0.8,
    datasetSize: rows.length,
    missingValues,
    computedAt: new Date().toISOString(),
  }

  self.postMessage({ type: "result", payload: result })
})
