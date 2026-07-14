"use client";

import { useState } from "react";
import CountrySelect from "@/components/CountrySelect";
import type { TierKey } from "@/lib/roi";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";
const GREEN = "#0B3D2E";

type Calc = { fatturato: number; tierKey: TierKey; prob: number; costo: number };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", fontSize: 14, color: "#0D1016",
  background: "#ffffff", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 9, outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontFamily: MONO, fontSize: 11, fontWeight: 500,
  color: "rgba(0,0,0,0.55)", letterSpacing: "0.02em", marginBottom: 7,
};

export default function RoiLeadModal({ calc, onSuccess, onClose }: {
  calc: Calc; onSuccess: () => void; onClose: () => void;
}) {
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", company: "", country: "", marketing: true });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.country) { setError("Seleziona un paese."); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/roi-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, ...calc }),
      });
      if (!res.ok) throw new Error("Invio non riuscito");
      onSuccess();
    } catch {
      // Sblocchiamo comunque i numeri: il valore per l'utente è immediato,
      // il report email è un plus che riproveremo lato server.
      onSuccess();
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="dialog" aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff", borderRadius: 20, maxWidth: 620, width: "100%",
          maxHeight: "92vh", overflowY: "auto", padding: "clamp(28px, 4vw, 44px)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.35)", position: "relative",
        }}
      >
        <button onClick={onClose} aria-label="Chiudi" style={{
          position: "absolute", top: 18, right: 18, width: 32, height: 32,
          border: "none", background: "transparent", cursor: "pointer", color: "rgba(0,0,0,0.4)", fontSize: 22, lineHeight: 1,
        }}>×</button>

        <h2 style={{ fontFamily: SERIF, fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 400, letterSpacing: "-1px", lineHeight: 1.1, color: "#0D1016", marginBottom: 8, maxWidth: 460 }}>
          Sblocca il tuo report ROI completo.
        </h2>
        <p style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", lineHeight: 1.6, marginBottom: 28, maxWidth: 480 }}>
          Ti inviamo via email la proiezione dettagliata a 3 anni e il ritorno sulla
          prevenzione, calcolati sui tuoi dati.
        </p>

        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input required style={inputStyle} placeholder="Nome" value={f.firstName} onChange={set("firstName")} />
            </div>
            <div>
              <label style={labelStyle}>Cognome *</label>
              <input required style={inputStyle} placeholder="Cognome" value={f.lastName} onChange={set("lastName")} />
            </div>
            <div>
              <label style={labelStyle}>Email aziendale *</label>
              <input required type="email" style={inputStyle} placeholder="nome@azienda.com" value={f.email} onChange={set("email")} />
            </div>
            <div>
              <label style={labelStyle}>Azienda *</label>
              <input required style={inputStyle} placeholder="Nome azienda" value={f.company} onChange={set("company")} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Paese *</label>
            <CountrySelect value={f.country} onChange={(name) => { setF((s) => ({ ...s, country: name })); setError(null); }} />
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18, cursor: "pointer" }}>
            <input type="checkbox" checked={f.marketing} onChange={set("marketing")}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: GREEN, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "rgba(0,0,0,0.5)", lineHeight: 1.5 }}>
              Acconsento a ricevere il report e comunicazioni su servizi ed eventi RegulaeOS.
              Posso disiscrivermi in qualsiasi momento.
            </span>
          </label>

          {error && <p style={{ fontSize: 12.5, color: "#b42318", marginBottom: 14 }}>{error}</p>}

          <button type="submit" disabled={sending} style={{
            width: "100%", padding: "15px", fontFamily: MONO, fontSize: 13, fontWeight: 600,
            letterSpacing: "0.02em", color: "#fff", background: "#0D1016", border: "none",
            borderRadius: 10, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.7 : 1,
          }}>
            {sending ? "Invio in corso…" : "Rivela il report ROI completo"}
          </button>

          <p style={{ fontSize: 11.5, color: "rgba(0,0,0,0.4)", lineHeight: 1.55, marginTop: 16 }}>
            Per come raccogliamo, usiamo e proteggiamo i tuoi dati, consulta la{" "}
            <a href="/privacy" target="_blank" style={{ color: "rgba(0,0,0,0.6)", textDecoration: "underline" }}>Privacy Policy</a>.
          </p>
        </form>
      </div>
    </div>
  );
}
