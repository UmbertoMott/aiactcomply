"use client";

// Elementi grafici comuni ai tool: stesso carattere, testo nero, nessun riquadro.
// Le sezioni sono separate da una linea sottile; le scelte sono pillole nere/bianche.

import React, { type CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, Circle, ShieldCheck } from "lucide-react";

export const INK = "#0D1016";
export const LINE = "rgba(0,0,0,0.08)";
export const OK = "#15803d";
export const WARN = "#b45309";

export const fieldStyle: CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${LINE}`,
  fontSize: 13, color: INK, background: "#fff", outline: "none", fontFamily: "inherit",
};

/** Titolo pagina, sottotitolo e (facoltativa) nota di garanzia */
export function ToolHeader({ title, subtitle, note }: { title: string; subtitle?: string; note?: string }) {
  return (
    <header style={{ marginBottom: 20, color: INK }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 13, margin: "6px 0 0", lineHeight: 1.5 }}>{subtitle}</p>}
      {note && (
        <p style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.5, margin: "12px 0 0" }}>
          <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{note}</span>
        </p>
      )}
    </header>
  );
}

/** Pulsante di scelta a pillola (una opzione attiva) */
export function Choice({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      style={{
        padding: "6px 14px", borderRadius: 999, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        border: `1px solid ${active ? INK : LINE}`, background: active ? INK : "#fff", color: active ? "#fff" : INK,
      }}
    >
      {children}
    </button>
  );
}

export function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 13, color: INK, lineHeight: 1.5 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ marginTop: 3, accentColor: INK }} />
      <span>{label}</span>
    </label>
  );
}

/** Nota di una riga; `warn` la mostra in ambra con icona */
export function Note({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <p style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.5, margin: 0, color: warn ? WARN : INK }}>
      {warn && <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />}
      <span>{children}</span>
    </p>
  );
}

/** Icona di stato del passo: cerchio vuoto o spunta verde */
export function StepIcon({ done }: { done: boolean }) {
  return done ? <CheckCircle2 size={18} color={OK} /> : <Circle size={18} color={INK} strokeWidth={1.5} />;
}

/** Passo numerato separato da una linea sottile */
export function Step({ n, title, refText, done, children, right }: {
  n?: number; title: React.ReactNode; refText?: string; done: boolean; children?: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", gap: 14, padding: "20px 0", borderTop: `1px solid ${LINE}`, color: INK }}>
      <div style={{ flexShrink: 0, paddingTop: 1 }}><StepIcon done={done} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <h2 style={{ flex: 1, fontSize: 15, fontWeight: 600, margin: 0 }}>
            {n !== undefined && <span style={{ marginRight: 6 }}>{n}.</span>}{title}
            {refText && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8 }}>{refText}</span>}
          </h2>
          {right}
        </div>
        {children && <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
      </div>
    </section>
  );
}

/** Pulsante principale (nero) */
export function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "9px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 500, fontFamily: "inherit",
        background: disabled ? "rgba(0,0,0,0.08)" : INK, color: disabled ? INK : "#fff", cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/** Pulsante secondario (contorno) */
export function SecondaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "7px 14px", borderRadius: 8, border: `1px solid ${LINE}`, background: "#fff", color: INK,
        fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
