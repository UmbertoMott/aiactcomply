"use client";

import { useState } from "react";

const MONO  = "'DM Mono', monospace";
const GREEN = "#0B3D2E";

const COUNTRIES = [
  "Italia", "Francia", "Germania", "Spagna", "Portogallo", "Paesi Bassi",
  "Belgio", "Austria", "Irlanda", "Svizzera", "Regno Unito", "Stati Uniti",
  "Altro paese UE", "Altro",
];

const ORG_TYPES = [
  "Studio legale",
  "Impresa / Azienda",
  "Pubblica Amministrazione",
  "Sanità",
  "Istituto finanziario",
  "Startup / Scale-up",
  "Consulenza / Advisory",
  "Altro",
];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 500,
  color: "rgba(0,0,0,0.55)",
  letterSpacing: "0.02em",
  marginBottom: 7,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 14,
  color: "#0D1016",
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.14)",
  borderRadius: 9,
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function DemoForm() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    nome: "", cognome: "", email: "", azienda: "",
    ruolo: "", telefono: "", paese: "", org: "", marketing: true,
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const v = e.target.type === "checkbox"
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Richiesta demo — ${form.azienda || form.nome}`;
    const body =
`Nuova richiesta di demo RegulaeOS

Nome:              ${form.nome} ${form.cognome}
Email aziendale:   ${form.email}
Azienda:           ${form.azienda}
Ruolo:             ${form.ruolo}
Telefono:          ${form.telefono || "—"}
Paese:             ${form.paese}
Tipo organizzazione: ${form.org}
Comunicazioni marketing: ${form.marketing ? "Sì" : "No"}

—
Inviato dal form Prenota una demo (regulaeos.com/prenota-demo)`;

    window.location.href =
      `mailto:demo@regulaeos.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: "48px 40px",
        textAlign: "center",
        boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: GREEN, margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#0D1016", marginBottom: 10 }}>
          Richiesta pronta all&rsquo;invio
        </p>
        <p style={{ fontSize: 14, color: "rgba(0,0,0,0.55)", lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
          Si è aperto il tuo client di posta con la richiesta precompilata verso{" "}
          <strong style={{ color: "#0D1016" }}>demo@regulaeos.com</strong>. Completa
          l&rsquo;invio da lì: ti ricontattiamo entro 24 ore lavorative.
        </p>
        <button
          onClick={() => setSent(false)}
          style={{
            marginTop: 24, fontFamily: MONO, fontSize: 12,
            color: "rgba(0,0,0,0.45)", background: "none",
            border: "none", cursor: "pointer", textDecoration: "underline",
          }}
        >
          Modifica i dati
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: "36px 36px 32px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <Field label="Nome *">
          <input required style={inputStyle} placeholder="Nome" value={form.nome} onChange={set("nome")} />
        </Field>
        <Field label="Cognome *">
          <input required style={inputStyle} placeholder="Cognome" value={form.cognome} onChange={set("cognome")} />
        </Field>
        <Field label="Email aziendale *">
          <input required type="email" style={inputStyle} placeholder="nome@azienda.com" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Azienda *">
          <input required style={inputStyle} placeholder="Nome azienda" value={form.azienda} onChange={set("azienda")} />
        </Field>
        <Field label="Ruolo *">
          <input required style={inputStyle} placeholder="Es. DPO, Legal Counsel" value={form.ruolo} onChange={set("ruolo")} />
        </Field>
        <Field label="Telefono">
          <input type="tel" style={inputStyle} placeholder="+39 …" value={form.telefono} onChange={set("telefono")} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
        <Field label="Paese *">
          <select required style={{ ...inputStyle, appearance: "none", cursor: "pointer", color: form.paese ? "#0D1016" : "rgba(0,0,0,0.4)" }} value={form.paese} onChange={set("paese")}>
            <option value="" disabled>Seleziona…</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Tipo organizzazione *">
          <select required style={{ ...inputStyle, appearance: "none", cursor: "pointer", color: form.org ? "#0D1016" : "rgba(0,0,0,0.4)" }} value={form.org} onChange={set("org")}>
            <option value="" disabled>Seleziona…</option>
            {ORG_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 24, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={form.marketing}
          onChange={set("marketing")}
          style={{ marginTop: 2, width: 16, height: 16, accentColor: GREEN, flexShrink: 0 }}
        />
        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", lineHeight: 1.5 }}>
          Acconsento a ricevere comunicazioni su servizi ed eventi RegulaeOS. Posso
          disiscrivermi in qualsiasi momento.
        </span>
      </label>

      <button
        type="submit"
        style={{
          width: "100%",
          padding: "14px",
          fontFamily: MONO,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: "#ffffff",
          background: "#0D1016",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          transition: "opacity 0.15s ease",
        }}
      >
        Prenota una demo
      </button>

      <p style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", lineHeight: 1.55, marginTop: 16, textAlign: "center" }}>
        Trattiamo i tuoi dati secondo la{" "}
        <a href="/privacy" style={{ color: "rgba(0,0,0,0.55)", textDecoration: "underline" }}>Privacy Policy</a>.
      </p>
    </form>
  );
}
