"use client"
import React from "react"
import Link from "next/link"
import { readFromStorage, STORAGE_KEYS } from "@/lib/dossier/storage-schema"

type StorageKey = keyof typeof STORAGE_KEYS

const AXES: { key: StorageKey; label: string; full: string; href: string }[] = [
  { key: "classifier",   label: "Classif.",  full: "Classificazione",    href: "/dashboard/tools/classifier" },
  { key: "riskManager", label: "Risk",       full: "Risk Manager",        href: "/dashboard/tools/risk-manager" },
  { key: "dataAudit",   label: "Dati",       full: "Audit Dati",          href: "/dashboard/tools/data-audit" },
  { key: "transparency",label: "Traspar.",    full: "Trasparenza",         href: "/dashboard/tools/transparency" },
  { key: "oversight",   label: "Oversight",  full: "Human Oversight",     href: "/dashboard/tools/oversight" },
  { key: "resilience",  label: "Resilienza", full: "Resilienza",          href: "/dashboard/tools/resilience" },
  { key: "docugen",     label: "Docum.",     full: "Documentazione",      href: "/dashboard/tools/docugen" },
  { key: "conformity",  label: "Conformità", full: "Conformità",          href: "/dashboard/tools/conformity" },
]

function scoreFromStorage(key: StorageKey): number {
  const s = readFromStorage<Record<string, unknown>>(key)
  if (!s) return 0
  if (s.completedAt) return 100
  return 50
}

function polar(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const INDIGO = "#4f46e5"
const AMBER  = "#d97706"
const EMERALD = "#059669"
const SLATE  = "#94a3b8"

export function ComplianceRadarChart() {
  const [scores, setScores]   = React.useState<number[]>(AXES.map(() => 0))
  const [total, setTotal]     = React.useState(0)
  const [unlocked, setUnlocked] = React.useState(false)
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const s = AXES.map(ax => scoreFromStorage(ax.key))
    const avg = Math.round(s.reduce((a, b) => a + b, 0) / s.length)
    setScores(s)
    setTotal(avg)
    if (avg >= 80) { setUnlocked(true); setTimeout(() => setUnlocked(false), 4000) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accent = total >= 80 ? EMERALD : total >= 50 ? AMBER : INDIGO
  const label  = total >= 80 ? "Dossier esportabile" : total >= 50 ? "In corso" : "Incompleto"

  const S = 220; const cx = S / 2; const cy = S / 2; const maxR = S * 0.37; const n = scores.length

  const grid = [0.33, 0.66, 1].map(pct => {
    const pts = Array.from({ length: n }, (_, i) => {
      const { x, y } = polar((i / n) * 360, maxR * pct, cx, cy)
      return `${x},${y}`
    })
    return `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(" ") + " Z"
  })

  const pts = scores.map((sc, i) => polar((i / n) * 360, (sc / 100) * maxR, cx, cy))
  const dataPath = pts.length
    ? `M ${pts[0].x},${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x},${p.y}`).join(" ") + " Z"
    : ""

  const hp = hovered !== null ? pts[hovered] : null

  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "18px 20px",
      border: "1px solid rgba(0,0,0,0.07)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", margin: 0 }}>Radar Conformità</p>
          <p style={{ fontSize: 11, color: SLATE, margin: "2px 0 0" }}>EU AI Act · clicca per dettagli</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1, transition: "color 0.5s" }}>
            {total}%
          </div>
          <p style={{ fontSize: 10, color: accent, margin: "2px 0 0", fontWeight: 600 }}>{label}</p>
        </div>
      </div>

      {unlocked && (
        <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: EMERALD, fontWeight: 700, margin: 0 }}>🏆 80% — dossier esportabile sbloccato!</p>
        </div>
      )}

      {/* SVG */}
      <div style={{ display: "flex", justifyContent: "center", position: "relative", userSelect: "none" }}>
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ overflow: "visible" }}>
          {/* Grid rings */}
          {grid.map((d, i) => (
            <path key={i} d={d} fill="none"
              stroke={i === 2 ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)"}
              strokeWidth={1} />
          ))}
          {/* Spokes */}
          {Array.from({ length: n }, (_, i) => {
            const { x, y } = polar((i / n) * 360, maxR, cx, cy)
            return (
              <line key={i} x1={cx} y1={cy} x2={x} y2={y}
                stroke={hovered === i ? "rgba(79,70,229,0.22)" : "rgba(0,0,0,0.06)"}
                strokeWidth={hovered === i ? 1.5 : 1} />
            )
          })}
          {/* Data polygon */}
          {dataPath && (
            <path d={dataPath} fill={accent} fillOpacity={0.10}
              stroke={accent} strokeWidth={1.5}
              style={{ transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
          )}
          {/* Points */}
          {pts.map((pt, i) => {
            const dotCol = scores[i] === 100 ? EMERALD : scores[i] > 0 ? AMBER : "#d1d5db"
            const isH = hovered === i
            return (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r={16} fill="transparent" style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)} />
                <circle cx={pt.x} cy={pt.y} r={isH ? 6 : 3.5}
                  fill={isH ? INDIGO : dotCol}
                  stroke="#fff" strokeWidth={1.5}
                  style={{ transition: "all 0.2s ease", pointerEvents: "none" }} />
              </g>
            )
          })}
          {/* Axis labels */}
          {Array.from({ length: n }, (_, i) => {
            const lx = cx + (maxR + 18) * Math.cos((((i / n) * 360) - 90) * (Math.PI / 180))
            const ly = cy + (maxR + 18) * Math.sin((((i / n) * 360) - 90) * (Math.PI / 180))
            const isH = hovered === i
            return (
              <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                fontSize={isH ? 9.5 : 9}
                fill={isH ? INDIGO : SLATE}
                fontWeight={isH ? 700 : 500}
                fontFamily="system-ui, sans-serif"
                style={{ transition: "all 0.15s" }}>
                {AXES[i].label}
              </text>
            )
          })}
        </svg>

        {/* Tooltip */}
        {mounted && hovered !== null && hp !== null && (() => {
          const ax = AXES[hovered]
          const sc = scores[hovered]
          const statusText = sc === 100 ? "✓ Completato" : sc > 0 ? "◑ In bozza" : "○ Non avviato"
          const statusColor = sc === 100 ? "#6ee7b7" : sc > 0 ? "#fcd34d" : "#94a3b8"
          const ttLeft = Math.min(Math.max(hp.x - 70, 0), S - 140)
          const ttTop  = hp.y > cy ? hp.y - 80 : hp.y + 14
          return (
            <div style={{
              position: "absolute",
              top: ttTop,
              left: ttLeft,
              width: 140,
              background: "#1e1b4b",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 11,
              pointerEvents: "none",
              zIndex: 20,
              boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
            }}>
              <p style={{ fontWeight: 700, margin: "0 0 4px", color: "#fff" }}>{ax.full}</p>
              <p style={{ margin: "0 0 4px", color: statusColor }}>{statusText}</p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
                Clicca la legenda →
              </p>
            </div>
          )
        })()}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: "rgba(217,119,6,0.3)", zIndex: 1 }} />
          <div style={{ position: "absolute", left: "80%", top: 0, width: 1, height: "100%", background: "rgba(5,150,105,0.3)", zIndex: 1 }} />
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${total}%`,
            background: `linear-gradient(90deg, ${INDIGO} 0%, ${accent} 100%)`,
            transition: "width 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 9, color: SLATE }}>0%</span>
          <span style={{ fontSize: 9, color: AMBER }}>50% PDF</span>
          <span style={{ fontSize: 9, color: EMERALD }}>80% Dossier</span>
        </div>
      </div>

      {/* Legend — ogni item è un Link cliccabile */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 6px", marginTop: 10 }}>
        {AXES.map((ax, i) => {
          const dotCol = scores[i] === 100 ? EMERALD : scores[i] > 0 ? AMBER : "#d1d5db"
          const isH = hovered === i
          return (
            <Link
              key={ax.key}
              href={ax.href}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "2px 7px", borderRadius: 5,
                textDecoration: "none",
                background: isH ? "rgba(79,70,229,0.07)" : "transparent",
                border: isH ? "1px solid rgba(79,70,229,0.18)" : "1px solid transparent",
                transition: "all 0.15s",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotCol, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: isH ? INDIGO : SLATE, fontWeight: isH ? 600 : 400 }}>
                {ax.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
