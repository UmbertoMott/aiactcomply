"use client";

// src/components/compliance/ComplianceJourneyDashboard.tsx
// Dashboard widget showing AI-guided compliance journey with next steps

import { useState, useEffect, CSSProperties } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight, Zap, AlertCircle } from "lucide-react";
import { computeNextSteps, type ComplianceStep, type NextStepResult } from "@/lib/compliance-engine/next-step-advisor";
import { loadOrgProfile } from "@/lib/dossier/org-profile";

// ── Design tokens ──────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.40)",
  faint:   "rgba(0,0,0,0.18)",
  border:  "rgba(0,0,0,0.07)",
  card:    "#ffffff",
  red:     "#dc2626",   redBg:   "rgba(220,38,38,0.06)",   redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#b45309",   amberBg: "rgba(245,158,11,0.06)",  amberBdr:"rgba(245,158,11,0.2)",
  blue:    "#1d4ed8",   blueBg:  "rgba(29,78,216,0.05)",   blueBdr: "rgba(29,78,216,0.16)",
  green:   "#15803d",   greenBg: "rgba(21,128,61,0.06)",   greenBdr:"rgba(21,128,61,0.18)",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  padding: 20,
};

// ── Tier labels ────────────────────────────────────────────────────────────

const TIER_META: Record<NonNullable<NextStepResult["tier"]>, { label: string; color: string; bg: string; bdr: string }> = {
  high:         { label: "Alto Rischio",    color: T.red,   bg: T.redBg,   bdr: T.redBdr   },
  limited:      { label: "Rischio Limitato",color: T.amber, bg: T.amberBg, bdr: T.amberBdr },
  minimal:      { label: "Rischio Minimo",  color: T.green, bg: T.greenBg, bdr: T.greenBdr },
  gpai:         { label: "GPAI",            color: T.blue,  bg: T.blueBg,  bdr: T.blueBdr  },
  unclassified: { label: "Non classificato",color: T.muted, bg: "rgba(0,0,0,0.03)", bdr: T.faint },
};

const PRIORITY_DOT: Record<ComplianceStep["priority"], string> = {
  critical: T.red,
  high:     T.amber,
  medium:   T.blue,
  low:      "rgba(0,0,0,0.25)",
};

// ── Component ─────────────────────────────────────────────────────────────

export default function ComplianceJourneyDashboard() {
  const [result, setResult] = useState<NextStepResult | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const profile = loadOrgProfile();
    setResult(computeNextSteps(profile));
  }, []);

  if (!result) return null;

  const { steps, percentComplete, tier } = result;
  const tierMeta = TIER_META[tier];

  // Show first 4 pending steps, then "show all"
  const pendingSteps = steps.filter((s) => !s.done);
  const doneSteps    = steps.filter((s) => s.done);
  const visiblePending = showAll ? pendingSteps : pendingSteps.slice(0, 4);

  return (
    <div style={{ ...cardSt, marginBottom: 24 }}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Zap style={{ width: 15, height: 15, color: T.text }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
              Percorso di Conformità
            </span>
            {/* Tier badge */}
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              color: tierMeta.color, background: tierMeta.bg, border: `1px solid ${tierMeta.bdr}`,
            }}>
              {tierMeta.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {pendingSteps.length === 0
              ? "Tutti i passi completati — ottimo lavoro! 🎉"
              : `${pendingSteps.length} ${pendingSteps.length === 1 ? "azione rimanente" : "azioni rimanenti"}`}
          </p>
        </div>

        {/* Progress circle / percentage */}
        <div className="flex flex-col items-end gap-1">
          <span style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1 }}>
            {percentComplete}%
          </span>
          <span style={{ fontSize: 11, color: T.muted }}>completato</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <div style={{
          height: 4, borderRadius: 2, background: T.text,
          width: `${percentComplete}%`, transition: "width 0.5s ease",
        }} />
      </div>

      {/* Steps list */}
      {steps.length === 0 ? (
        <p style={{ fontSize: 13, color: T.muted, textAlign: "center", padding: "12px 0" }}>
          Classifica il tuo sistema AI per ricevere un piano personalizzato.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Pending steps */}
          {visiblePending.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}

          {/* Show more pending */}
          {!showAll && pendingSteps.length > 4 && (
            <button
              onClick={() => setShowAll(true)}
              style={{ fontSize: 12, color: T.blue, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
            >
              + {pendingSteps.length - 4} altri passi
            </button>
          )}

          {/* Done steps (collapsed) */}
          {doneSteps.length > 0 && (
            <details className="mt-2">
              <summary style={{ fontSize: 12, color: T.muted, cursor: "pointer", userSelect: "none", listStyle: "none" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 style={{ width: 13, height: 13, color: T.green }} />
                  {doneSteps.length === 1 ? "1 passo completato" : `${doneSteps.length} passi completati`}
                </span>
              </summary>
              <div className="mt-2 space-y-1">
                {doneSteps.map((step) => (
                  <StepRow key={step.id} step={step} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* CTA if unclassified */}
      {tier === "unclassified" && (
        <div style={{
          marginTop: 16, padding: "10px 14px", borderRadius: 8,
          background: T.amberBg, border: `1px solid ${T.amberBdr}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div className="flex items-center gap-2">
            <AlertCircle style={{ width: 14, height: 14, color: T.amber }} />
            <span style={{ fontSize: 12, color: T.amber, fontWeight: 500 }}>
              Classifica il sistema per sbloccare il piano completo
            </span>
          </div>
          <Link href="/dashboard/triage" style={{
            fontSize: 12, fontWeight: 600, color: T.amber,
            display: "flex", alignItems: "center", gap: 4, textDecoration: "none",
          }}>
            Inizia <ChevronRight style={{ width: 13, height: 13 }} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── StepRow ────────────────────────────────────────────────────────────────

function StepRow({ step }: { step: ComplianceStep }) {
  return (
    <Link
      href={step.href}
      style={{ textDecoration: "none" }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 8,
        background: step.done ? "rgba(0,0,0,0.02)" : "transparent",
        border: `1px solid ${step.done ? "transparent" : T.border}`,
        opacity: step.done ? 0.55 : 1,
        cursor: "pointer",
        transition: "background 0.1s",
      }}
        onMouseEnter={(e) => { if (!step.done) (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.03)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = step.done ? "rgba(0,0,0,0.02)" : "transparent"; }}
      >
        {/* Status icon */}
        <div style={{ flexShrink: 0 }}>
          {step.done
            ? <CheckCircle2 style={{ width: 15, height: 15, color: T.green }} />
            : <Circle style={{ width: 15, height: 15, color: T.faint }} />
          }
        </div>

        {/* Priority dot */}
        {!step.done && (
          <div style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: PRIORITY_DOT[step.priority],
          }} />
        )}

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.text, lineHeight: 1.3 }}>
            {step.title}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 1, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {step.condition ?? step.description}
          </div>
        </div>

        {/* Est. hours */}
        {step.estimatedHours && !step.done && (
          <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
            ~{step.estimatedHours}h
          </span>
        )}

        {/* Arrow */}
        {!step.done && (
          <ChevronRight style={{ width: 13, height: 13, color: T.faint, flexShrink: 0 }} />
        )}
      </div>
    </Link>
  );
}
