"use client";
// Viewer del documento DPIA — sola lettura.
// Traduce DPIAResult nello scheletro Art. 35(7) in tempo reale.
// Regola: le sezioni senza dati NON vengono mostrate.
import React from "react";
import type { DPIAResult } from "@/lib/dossier/storage-schema";
import { computeDpiaProgress, type DpiaStepProgress } from "@/lib/dpia/dpia-progress";
import { ART_35_7_ELEMENTS, DPIA_TEMPLATE_META } from "@/lib/dpia/dpia-template";

// ─── Design tokens (aligned with DPIA tool) ──────────────────────────────────
const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.28)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#f8f8f7",
  red:      "#dc2626",   redBg:   "rgba(220,38,38,0.06)",   redBdr:   "rgba(220,38,38,0.18)",
  amber:    "#d97706",   amberBg: "rgba(202,138,4,0.06)",   amberBdr: "rgba(202,138,4,0.2)",
  green:    "#16a34a",   greenBg: "rgba(22,163,74,0.06)",   greenBdr: "rgba(22,163,74,0.2)",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = T.green }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.4s ease" }} />
    </div>
  );
}

function SectionTitle({ num, label, legalRef, pct: percent }: { num: number; label: string; legalRef: string; pct: number }) {
  const color = percent >= 80 ? T.green : percent >= 40 ? T.amber : T.red;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>
          {num}. {label}
        </h4>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>{percent}%</span>
      </div>
      <p style={{ fontSize: 10, color: T.faint, margin: "0 0 4px" }}>{legalRef}</p>
      <ProgressBar pct={percent} color={color} />
    </div>
  );
}

function FieldRow({ label, value, filled, required }: { label: string; value: string; filled: boolean; required: boolean }) {
  if (!filled && !required) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "7px 10px", borderRadius: 6,
      background: filled ? T.card : "rgba(220,38,38,0.03)",
      border: `1px solid ${filled ? T.border : "rgba(220,38,38,0.12)"}`,
      marginBottom: 4,
    }}>
      <span style={{ fontSize: 12, flexShrink: 0, color: filled ? T.green : T.red, fontWeight: 700, minWidth: 14 }}>
        {filled ? "✓" : "—"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: T.muted, margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
        <p style={{ fontSize: 11, color: filled ? T.text : T.faint, margin: 0, lineHeight: 1.5, wordBreak: "break-word" }}>
          {filled ? value : required ? "— obbligatorio —" : "— non compilato —"}
        </p>
      </div>
    </div>
  );
}

function StepSection({ s }: { s: DpiaStepProgress }) {
  const anyFilled = s.fields.some(f => f.filled);
  const hasRequired = s.fields.some(f => f.required && !f.filled);
  if (!anyFilled && !hasRequired) return null;

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 12,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      <SectionTitle num={s.step} label={s.label} legalRef={s.legalRef} pct={s.percent} />
      <p style={{ fontSize: 11, color: T.muted, margin: "0 0 10px", lineHeight: 1.5 }}>{s.detail}</p>
      <div>
        {s.fields.map((f, i) => (
          <FieldRow key={i} label={f.label} value={f.value} filled={f.filled} required={f.required} />
        ))}
      </div>
    </div>
  );
}

// ─── Art. 35(7) Coverage Panel ───────────────────────────────────────────────

function Art35CoveragePanel({ coverage, art36 }: { coverage: ReturnType<typeof computeDpiaProgress>["art35Coverage"]; art36: boolean }) {
  const colorFor = (v: "covered" | "partial" | "missing") =>
    v === "covered" ? T.green : v === "partial" ? T.amber : T.red;
  const bgFor = (v: "covered" | "partial" | "missing") =>
    v === "covered" ? T.greenBg : v === "partial" ? T.amberBg : T.redBg;
  const bdrFor = (v: "covered" | "partial" | "missing") =>
    v === "covered" ? T.greenBdr : v === "partial" ? T.amberBdr : T.redBdr;
  const iconFor = (v: "covered" | "partial" | "missing") =>
    v === "covered" ? "✓" : v === "partial" ? "△" : "✕";
  const labelFor = (v: "covered" | "partial" | "missing") =>
    v === "covered" ? "Coperto" : v === "partial" ? "Parziale" : "Mancante";

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: "0 0 10px" }}>
        Copertura elementi obbligatori Art. 35(7)
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {ART_35_7_ELEMENTS.map(el => {
          const v = coverage[el.id as keyof typeof coverage];
          return (
            <div key={el.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
              borderRadius: 6, background: bgFor(v), border: `1px solid ${bdrFor(v)}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: colorFor(v), minWidth: 16, flexShrink: 0 }}>{iconFor(v)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.text, background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 3, marginRight: 6 }}>{el.ref}</span>
                <span style={{ fontSize: 11, color: T.text }}>{el.label}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: colorFor(v), flexShrink: 0 }}>{labelFor(v)}</span>
            </div>
          );
        })}
      </div>
      {art36 && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: T.redBg, border: `1px solid ${T.redBdr}` }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.red, margin: 0 }}>
            ⚠ Art. 36 — Consultazione preventiva dell'autorità di controllo richiesta
          </p>
          <p style={{ fontSize: 10, color: T.red, margin: "3px 0 0", opacity: 0.8 }}>
            Il rischio residuo è elevato. Prima di procedere è necessaria la consultazione del Garante. [verifica contro il testo vigente del GDPR/WP248]
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Overall Progress Header ─────────────────────────────────────────────────

function ProgressHeader({ pct: percent, blockingGaps }: { pct: number; blockingGaps: string[] }) {
  const color = percent >= 80 ? T.green : percent >= 40 ? T.amber : T.red;
  const label = percent >= 80 ? "Avanzato" : percent >= 40 ? "In corso" : "Iniziale";
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>{DPIA_TEMPLATE_META.title}</p>
          <p style={{ fontSize: 10, color: T.faint, margin: "2px 0 0" }}>
            {DPIA_TEMPLATE_META.legalBasis} · {DPIA_TEMPLATE_META.methodology}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color }}>{percent}%</span>
          <p style={{ fontSize: 10, color, margin: "0", fontWeight: 600 }}>{label}</p>
        </div>
      </div>
      <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      {blockingGaps.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {blockingGaps.map((gap, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: T.red, flexShrink: 0 }}>✕</span>
              <p style={{ fontSize: 11, color: T.red, margin: 0 }}>{gap}</p>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 9, color: T.faint, margin: "10px 0 0", lineHeight: 1.4 }}>
        {DPIA_TEMPLATE_META.disclaimer}
      </p>
    </div>
  );
}

// ─── Main viewer ─────────────────────────────────────────────────────────────

export interface DPIATemplateViewerProps {
  doc: DPIAResult;
}

export function DPIATemplateViewer({ doc }: DPIATemplateViewerProps) {
  const progress = computeDpiaProgress(doc);

  return (
    <div style={{ fontFamily: "var(--font-inter, system-ui)" }}>
      <ProgressHeader pct={progress.overallPercent} blockingGaps={progress.blockingGaps} />
      <Art35CoveragePanel coverage={progress.art35Coverage} art36={progress.art36Required} />
      {progress.steps.map(s => (
        <StepSection key={s.key} s={s} />
      ))}
    </div>
  );
}
