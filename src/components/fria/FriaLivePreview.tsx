"use client";
import React, { useState } from "react";
import { FRIA_GUIDED_SECTIONS, FRIA_SUBPOINTS, FRIA_TEMPLATE_META } from "@/lib/fria/fria-template";
import type { FriaGuidedDoc } from "@/lib/fria/fria-guided-types";

const DOC = {
  bg:        "#ffffff",
  pageBg:    "#f5f4f0",
  text:      "#1a1a1a",
  muted:     "rgba(0,0,0,0.38)",
  border:    "rgba(0,0,0,0.10)",
  headerBg:  "#0D1016",
  headerFg:  "#ffffff",
  sectionBg: "#f0eeea",
  labelFg:   "rgba(0,0,0,0.50)",
  empty:     "rgba(0,0,0,0.18)",
  emptyBg:   "rgba(0,0,0,0.03)",
  green:     "#23403a",
  greenBg:   "rgba(35,64,58,0.07)",
  greenBdr:  "rgba(35,64,58,0.18)",
  amber:     "#b45309",
  amberBg:   "rgba(180,83,9,0.06)",
  amberBdr:  "rgba(180,83,9,0.18)",
} as const;

const SANS = "var(--font-inter, system-ui, sans-serif)";

function doneValue(doc: FriaGuidedDoc, id: string): string | null {
  const a = doc.answers[id];
  if (!a) return null;
  if (a.status === "done" && (a.source === "manual" || a.aiConfirmed)) return a.value || null;
  return null;
}

function Placeholder({ label }: { label: string }) {
  return (
    <span style={{ color: DOC.empty, fontStyle: "italic", fontSize: 11 }}>
      [{label} — da compilare]
    </span>
  );
}

function Field({ label, value, placeholder, ref: refText }: { label: string; value: string | null; placeholder: string; ref?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div data-noedit="true" style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: DOC.labelFg, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
          {label}
        </p>
        {refText && (
          <p style={{ fontSize: 8, color: DOC.muted, margin: 0 }}>{refText}</p>
        )}
      </div>
      {value
        ? <p style={{ fontSize: 12, color: DOC.text, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value}</p>
        : <Placeholder label={placeholder} />
      }
    </div>
  );
}

function SectionHeader({ id, title, legalRef }: { id: string; title: string; legalRef: string }) {
  return (
    <div id={id} data-noedit="true" style={{
      background: DOC.headerBg, padding: "8px 14px", margin: "20px 0 10px",
      borderRadius: 4,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: DOC.headerFg, margin: 0, fontFamily: SANS }}>{title}</p>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", margin: 0, fontFamily: SANS }}>{legalRef}</p>
      </div>
    </div>
  );
}

interface FriaLivePreviewProps {
  doc: FriaGuidedDoc;
  activeSection?: string | null;
}

export function FriaLivePreview({ doc }: FriaLivePreviewProps) {
  const [showAvvertenza, setShowAvvertenza] = useState(true);

  return (
    <div style={{
      background: DOC.bg, borderRadius: 8, padding: "28px 32px",
      border: "1px solid rgba(0,0,0,0.08)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: 13, color: DOC.text, lineHeight: 1.7,
    }}>
      {/* Intestazione documento */}
      <div data-noedit="true" style={{ marginBottom: 20, paddingBottom: 14, borderBottom: `2px solid ${DOC.headerBg}` }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: DOC.muted, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: SANS }}>
          {FRIA_TEMPLATE_META.legalBasis}
        </p>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: DOC.text, margin: "0 0 6px", fontFamily: SANS }}>
          {FRIA_TEMPLATE_META.title}
        </h1>
        <p style={{ fontSize: 10, color: DOC.muted, margin: 0, fontFamily: SANS }}>
          Metodologia: {FRIA_TEMPLATE_META.methodology} · Versione {FRIA_TEMPLATE_META.version}
        </p>
      </div>

      {/* Avvertenza */}
      {showAvvertenza && (
        <div data-noedit="true" style={{
          position: "relative",
          background: DOC.amberBg, border: `1px solid ${DOC.amberBdr}`,
          borderRadius: 5, padding: "8px 12px 8px 12px", marginBottom: 18,
        }}>
          <p style={{ fontSize: 10, color: DOC.amber, margin: 0, fontFamily: SANS, lineHeight: 1.5, paddingRight: 20 }}>
            <strong>Avvertenza:</strong> {FRIA_TEMPLATE_META.disclaimer}
          </p>
          <button
            onClick={() => setShowAvvertenza(false)}
            style={{
              position: "absolute", top: 5, right: 7,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 14, lineHeight: 1, color: DOC.amber, opacity: 0.7, padding: "1px 3px",
            }}
            title="Chiudi avvertenza"
          >
            ×
          </button>
        </div>
      )}

      {/* Sezioni */}
      {FRIA_GUIDED_SECTIONS.map(sec => {
        const subPoints = FRIA_SUBPOINTS.filter(sp => sp.sectionKey === sec.key);
        return (
          <div key={sec.key}>
            <SectionHeader id={sec.anchor} title={sec.label} legalRef={sec.legalRef} />
            {subPoints.map(sp => (
              <Field
                key={sp.id}
                label={sp.label}
                value={doneValue(doc, sp.id)}
                placeholder={sp.label}
                ref={sp.ref}
              />
            ))}
          </div>
        );
      })}

      {/* Footer */}
      <div data-noedit="true" style={{
        marginTop: 28, paddingTop: 14, borderTop: `1px solid ${DOC.border}`,
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
        fontFamily: SANS,
      }}>
        {[
          { label: "Deployer / Responsabile", value: "" },
          { label: "Referente diritti fondamentali", value: "" },
          { label: "Data", value: "" },
        ].map(f => (
          <div key={f.label}>
            <p style={{ fontSize: 9, fontWeight: 700, color: DOC.labelFg, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>
              {f.label}
            </p>
            <div style={{ borderBottom: `1px solid ${DOC.border}`, height: 24 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
