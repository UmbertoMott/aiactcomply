"use client";

// PricingRegulaeOS.tsx
// Prezziario riformulato in chiave "assistenza professionale" (non prodotto puro),
// replicando lo stile del sito: bianco/nero, prezzi serif, etichette e CTA
// in maiuscoletto tracciato, pill nero sul piano consigliato.
// Sostituisce la sezione pricing esistente.

const C = {
  ink:       "#0b0b0c",
  sub:       "#6b6f76",
  line:      "#e6e7e9",
  lineStrong:"#0b0b0c",
  bg:        "#ffffff",
} as const;

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

type Tier = {
  eyebrow: string;
  price: string;
  priceSub?: string;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  recommended?: boolean;
};

const TIERS: Tier[] = [
  {
    eyebrow: "ESSENZIALE",
    price: "€49",
    priceSub: "/mese · canone di assistenza",
    desc: "Per iniziare a mettere in regola un sistema AI.",
    features: [
      "Assistenza su 1 sistema AI",
      "Triage, Scanner Art. 50 e Risk Register",
      "Assessment validati dall'avvocato",
      "Aggiornamenti normativi",
      "Supporto via email",
    ],
    cta: "Attiva l'assistenza",
    href: "/contatti",
  },
  {
    eyebrow: "STUDIO",
    price: "€149",
    priceSub: "/mese · canone di assistenza",
    desc: "Assistenza completa, con parere e revisione.",
    features: [
      "Tutti i moduli — Risk Register, FRIA, DPIA",
      "Assessment validati dall'avvocato",
      "Parere su richiesta",
      "Revisione documentale dell'avvocato",
      "Dossier di conformità firmato",
      "Supporto prioritario",
    ],
    cta: "Attiva l'assistenza",
    href: "/contatti",
    recommended: true,
  },
  {
    eyebrow: "SU MISURA",
    price: "Su misura",
    desc: "Per organizzazioni e gruppi multi-team.",
    features: [
      "Tutto dello Studio",
      "Più sistemi seguiti e workspace multipli",
      "Rappresentante autorizzato (Art. 22)",
      "Audit log e data residency UE",
      "Assistenza dedicata e SLA",
    ],
    cta: "Parla con l'avvocato",
    href: "/contatti",
  },
];

function Check() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 20 20" fill="none"
      style={{ flex: "0 0 16px", marginTop: 3 }}
      aria-hidden="true"
    >
      <path
        d="M5 10.5l3.2 3.2L15 7"
        stroke={C.ink} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function PricingRegulaeOS() {
  return (
    <section
      style={{ background: C.bg, color: C.ink, padding: "72px 20px", fontFamily: "inherit" }}
      aria-label="Piani di assistenza"
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: SERIF,
          fontSize: "clamp(28px, 5vw, 44px)",
          lineHeight: 1.1,
          textAlign: "center",
          margin: 0,
          letterSpacing: "-0.5px",
        }}>
          Conformità AI Act.<br />Dal primo obbligo all&rsquo;audit.
        </h2>
        <p style={{
          textAlign: "center", color: C.sub, fontSize: 16, lineHeight: 1.6,
          margin: "16px auto 0", maxWidth: 560,
        }}>
          Assistenza professionale in abbonamento. Il software è lo strumento; ogni valutazione è supervisionata e validata da un avvocato.
        </p>

        {/* Plan grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 22,
          marginTop: 48,
          alignItems: "start",
        }}>
          {TIERS.map((t) => (
            <div
              key={t.eyebrow}
              style={{
                position: "relative",
                background: C.bg,
                border: `${t.recommended ? 2 : 1}px solid ${t.recommended ? C.lineStrong : C.line}`,
                borderRadius: 16,
                padding: "28px 26px",
                boxShadow: t.recommended ? "0 20px 50px -24px rgba(0,0,0,0.35)" : "none",
              }}
            >
              {/* CONSIGLIATO pill */}
              {t.recommended && (
                <div
                  role="note"
                  aria-label="Piano consigliato"
                  style={{
                    position: "absolute", top: -13, left: "50%",
                    transform: "translateX(-50%)",
                    background: C.ink, color: "#fff",
                    fontFamily: MONO, fontSize: 11, letterSpacing: "1.5px",
                    padding: "5px 14px", borderRadius: 20,
                    whiteSpace: "nowrap",
                  }}
                >
                  CONSIGLIATO
                </div>
              )}

              {/* Eyebrow */}
              <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "2px", color: C.sub }}>
                {t.eyebrow}
              </div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14 }}>
                <span style={{
                  fontFamily: SERIF,
                  fontSize: t.price.length > 6 ? 40 : 52,
                  lineHeight: 1,
                }}>
                  {t.price}
                </span>
                {t.priceSub && (
                  <span style={{ color: C.sub, fontFamily: MONO, fontSize: 13 }}>
                    {t.priceSub}
                  </span>
                )}
              </div>

              {/* Description */}
              <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.5, margin: "14px 0 0" }}>
                {t.desc}
              </p>

              <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

              {/* Features */}
              <ul style={{
                listStyle: "none", padding: 0, margin: 0,
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                {t.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.45 }}>
                    <Check /> <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={t.href}
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: 26,
                  padding: "14px 18px",
                  borderRadius: 10,
                  fontFamily: MONO,
                  fontSize: 13,
                  letterSpacing: "1px",
                  textDecoration: "none",
                  background: t.recommended ? C.ink : C.bg,
                  color: t.recommended ? "#fff" : C.ink,
                  border: `1px solid ${C.ink}`,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.75"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
              >
                {t.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Legal note */}
        <p style={{
          textAlign: "center", color: C.sub, fontSize: 12.5, lineHeight: 1.6,
          margin: "34px auto 0", maxWidth: 720,
        }}>
          Ogni valutazione è supervisionata e validata da un avvocato iscritto all&rsquo;albo.
          Prezzi indicati oltre IVA. Nessun contratto annuale obbligatorio; puoi disdire quando vuoi.
        </p>
      </div>
    </section>
  );
}
