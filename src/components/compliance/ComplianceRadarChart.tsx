"use client"
import React from "react"
import { readFromStorage, STORAGE_KEYS } from "@/lib/dossier/storage-schema"

type StorageKey = keyof typeof STORAGE_KEYS

const RADAR_AXES = [
  { key: "classifier",    label: "Classif." },
  { key: "riskManager",  label: "Risk" },
  { key: "dataAudit",    label: "Data" },
  { key: "transparency", label: "Traspar." },
  { key: "oversight",    label: "Oversight" },
  { key: "resilience",   label: "Resilienza" },
  { key: "docugen",      label: "Docum." },
  { key: "conformity",   label: "Conformità" },
]

function scoreFromStorage(key: string): number {
  const stored = readFromStorage<any>(key as StorageKey)
  if (!stored) return 0
  if (stored.completedAt) return 100
  return 50 // draft/parziale
}

// ── SVG Radar (no external deps) ─────────────────────────────────────────────

function polarToXY(angle: number, radius: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180)
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

interface RadarProps {
  scores: number[]   // 0-100 per ogni asse
  size?: number
}

function RadarSvg({ scores, size = 200 }: RadarProps) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.4
  const n    = scores.length

  // Griglia concentrica (3 livelli: 33%, 66%, 100%)
  const gridLevels = [0.33, 0.66, 1]
  const gridLines  = gridLevels.map(pct => {
    const pts = Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * 360
      const { x, y } = polarToXY(angle, maxR * pct, cx, cy)
      return `${x},${y}`
    }).join(" ")
    return `M ${pts.split(" ")[0]} ` +
      pts.split(" ").slice(1).map(p => `L ${p}`).join(" ") + " Z"
  })

  // Assi radiali
  const axes = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 360
    const outer = polarToXY(angle, maxR, cx, cy)
    return { x: outer.x, y: outer.y, angle }
  })

  // Poligono dati
  const dataPoints = scores.map((score, i) => {
    const angle = (i / n) * 360
    const r = (score / 100) * maxR
    const { x, y } = polarToXY(angle, r, cx, cy)
    return `${x},${y}`
  })
  const dataPath = dataPoints.length
    ? `M ${dataPoints[0]} ` + dataPoints.slice(1).map(p => `L ${p}`).join(" ") + " Z"
    : ""

  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const color = avgScore >= 80 ? "#16a34a" : avgScore >= 50 ? "#d97706" : "#dc2626"

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridLines.map((d, i) => (
        <path key={i} d={d} fill="none"
          stroke={i === gridLines.length - 1 ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.06)"}
          strokeWidth={1} />
      ))}
      {/* Axes */}
      {axes.map((ax, i) => (
        <line key={i} x1={cx} y1={cy} x2={ax.x} y2={ax.y}
          stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
      ))}
      {/* Data polygon */}
      {dataPath && (
        <>
          <path d={dataPath} fill={color} fillOpacity={0.15}
            stroke={color} strokeWidth={2}
            style={{ transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
          {scores.map((score, i) => {
            const angle = (i / n) * 360
            const r = (score / 100) * maxR
            const { x, y } = polarToXY(angle, r, cx, cy)
            return (
              <circle key={i} cx={x} cy={y} r={3.5}
                fill={color} stroke="white" strokeWidth={1.5}
                style={{ transition: "all 0.6s ease" }} />
            )
          })}
        </>
      )}
      {/* Labels */}
      {axes.map((ax, i) => {
        const label = RADAR_AXES[i].label
        const lx = cx + (maxR + 14) * Math.cos((((i / n) * 360) - 90) * (Math.PI / 180))
        const ly = cy + (maxR + 14) * Math.sin((((i / n) * 360) - 90) * (Math.PI / 180))
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9} fill="#6b7280" fontWeight={500}
            fontFamily="system-ui, sans-serif">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────

export function ComplianceRadarChart() {
  const [scores, setScores]         = React.useState<number[]>(RADAR_AXES.map(() => 0))
  const [totalScore, setTotalScore] = React.useState(0)
  const [prevScore, setPrevScore]   = React.useState(0)
  const [justUnlocked, setJustUnlocked] = React.useState(false)

  React.useEffect(() => {
    const newScores = RADAR_AXES.map(ax => scoreFromStorage(ax.key))
    const avg = Math.round(newScores.reduce((s, d) => s + d, 0) / newScores.length)

    setScores(newScores)
    setPrevScore(totalScore)
    setTotalScore(avg)

    if (avg > prevScore && avg >= 80 && prevScore < 80) {
      setJustUnlocked(true)
      // Audio unlock 3 note
      try {
        const ctx = new AudioContext()
        const play = (freq: number, start: number) => {
          const osc  = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
          gain.gain.setValueAtTime(0.08, ctx.currentTime + start)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.4)
          osc.start(ctx.currentTime + start)
          osc.stop(ctx.currentTime + start + 0.4)
        }
        play(440, 0); play(554, 0.12); play(659, 0.24)
      } catch { /* safari/firefox may block AudioContext without user gesture */ }
      setTimeout(() => setJustUnlocked(false), 4000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scoreColor = totalScore >= 80 ? "#16a34a" : totalScore >= 50 ? "#d97706" : "#dc2626"
  const scoreLabel = totalScore >= 80 ? "Dossier esportabile" : totalScore >= 50 ? "In corso" : "Incompleto"

  return (
    <div style={{
      background: "white", borderRadius: 14, padding: "18px 20px",
      border: "1px solid rgba(0,0,0,0.08)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0 }}>
            Radar Conformità
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
            EU AI Act — copertura tool
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor, lineHeight: 1,
            transition: "color 0.5s ease" }}>
            {totalScore}%
          </div>
          <p style={{ fontSize: 10, color: scoreColor, margin: "2px 0 0", fontWeight: 600 }}>
            {scoreLabel}
          </p>
        </div>
      </div>

      {/* Banner sblocco */}
      {justUnlocked && (
        <div style={{
          marginBottom: 10, padding: "8px 12px", borderRadius: 8,
          background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)",
          textAlign: "center"
        }}>
          <p style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, margin: 0 }}>
            🏆 80% raggiunto — dossier esportabile sbloccato!
          </p>
        </div>
      )}

      {/* Radar SVG */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <RadarSvg scores={scores} size={220} />
      </div>

      {/* Progress bar con milestone */}
      <div style={{ marginTop: 10 }}>
        <div style={{ height: 6, borderRadius: 3, background: "#f3f4f6", overflow: "hidden", position: "relative" }}>
          {/* Milestone markers */}
          <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%",
            background: "rgba(217,119,6,0.3)", zIndex: 1 }} />
          <div style={{ position: "absolute", left: "80%", top: 0, width: 1, height: "100%",
            background: "rgba(22,163,74,0.3)", zIndex: 1 }} />
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${totalScore}%`,
            background: scoreColor,
            transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 9, color: "#9ca3af" }}>0%</span>
          <span style={{ fontSize: 9, color: "#d97706" }}>50% PDF</span>
          <span style={{ fontSize: 9, color: "#16a34a" }}>80% Dossier</span>
        </div>
      </div>

      {/* Legenda assi */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginTop: 10 }}>
        {RADAR_AXES.map((ax, i) => (
          <div key={ax.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: scores[i] === 100 ? "#16a34a" : scores[i] > 0 ? "#d97706" : "#e5e7eb"
            }} />
            <span style={{ fontSize: 10, color: "#9ca3af" }}>{ax.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
