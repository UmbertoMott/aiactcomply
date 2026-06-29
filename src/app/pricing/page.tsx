"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const CHECK = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="7" cy="7" r="7" fill="rgba(0,0,0,0.08)" />
    <path d="M4 7l2.2 2.2L10 5" stroke="#0D1016" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface TierProps {
  name: string;
  price: string;
  period?: string;
  desc: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlight?: boolean;
  index: number;
}

function TierCard({ name, price, period, desc, features, cta, ctaHref, highlight, index }: TierProps) {
  const { ref, visible } = useInView(0.1);
  const delay = index * 0.08;

  return (
    <div
      ref={ref}
      className="tier-card"
      style={{
        background: "#ffffff",
        border: highlight ? "2px solid #0D1016" : "1px solid rgba(0,0,0,0.09)",
        borderRadius: 14,
        padding: "32px 28px 28px",
        display: "flex",
        flexDirection: "column" as const,
        position: "relative" as const,
        boxShadow: highlight
          ? "0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.07)"
          : "0 1px 6px rgba(0,0,0,0.04)",
        transition: `opacity .55s ${delay}s ease, transform .55s ${delay}s ease`,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
      }}
    >
      {highlight && (
        <div
          style={{
            position: "absolute" as const,
            top: -13,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0D1016",
            color: "#fff",
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            padding: "4px 12px",
            borderRadius: 20,
          }}
        >
          Più scelto
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "rgba(0,0,0,0.40)",
            marginBottom: 10,
          }}
        >
          {name}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
          <span
            style={{
              fontFamily: SERIF,
              fontSize: 44,
              fontWeight: 300,
              letterSpacing: "-2.5px",
              color: "#0D1016",
              lineHeight: 1,
            }}
          >
            {price}
          </span>
          {period && (
            <span
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: "rgba(0,0,0,0.35)",
              }}
            >
              {period}
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            color: "rgba(0,0,0,0.48)",
            lineHeight: 1.5,
          }}
        >
          {desc}
        </p>
      </div>

      <div
        style={{
          height: 1,
          background: "rgba(0,0,0,0.07)",
          marginBottom: 20,
        }}
      />

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          marginBottom: 28,
          flex: 1,
          display: "flex",
          flexDirection: "column" as const,
          gap: 11,
        }}
      >
        {features.map((feat) => (
          <li
            key={feat}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              fontSize: 13.5,
              fontWeight: 300,
              color: "rgba(0,0,0,0.70)",
              lineHeight: 1.45,
            }}
          >
            {CHECK}
            {feat}
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        style={{
          display: "block",
          textAlign: "center" as const,
          background: highlight ? "#0D1016" : "transparent",
          color: highlight ? "#fff" : "#0D1016",
          border: highlight ? "none" : "1px solid rgba(0,0,0,0.18)",
          fontFamily: MONO,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.04em",
          padding: "13px 20px",
          borderRadius: 8,
          textDecoration: "none",
          transition: "opacity .18s ease",
        }}
      >
        {cta}
      </Link>
    </div>
  );
}

const TIERS: Omit<TierProps, "index">[] = [
  {
    name: "Starter",
    price: "€0",
    period: "/mese",
    desc: "Per chi inizia a mappare i propri sistemi AI.",
    cta: "Inizia gratis",
    ctaHref: "/register",
    features: [
      "1 sistema AI nell'inventario",
      "Triage & classificazione del rischio",
      "Scanner — 1 sorgente",
      "Legal Assistant (10 domande/mese)",
      "Trust Center base",
    ],
  },
  {
    name: "Pro",
    price: "€149",
    period: "/mese",
    desc: "Per team prodotto, legal e compliance.",
    cta: "Prova 14 giorni gratis",
    ctaHref: "/register?plan=pro",
    highlight: true,
    features: [
      "Sistemi AI illimitati",
      "Tutti i moduli — Risk Manager, FRIA, DPIA",
      "Scanner — sorgenti illimitate",
      "Legal Assistant illimitato con fonti",
      "Registrazione EUDB & Post-Market",
      "Export pacchetto di conformità",
      "5 utenti inclusi",
    ],
  },
  {
    name: "Enterprise",
    price: "Su misura",
    desc: "Per organizzazioni regolate e gruppi multi-team.",
    cta: "Parla con noi",
    ctaHref: "mailto:hello@aicomply.it",
    features: [
      "Tutto del piano Pro",
      "SSO/SAML & ruoli avanzati",
      "Workspace multipli per cliente",
      "Audit log & data residency UE",
      "Rappresentante autorizzato (Art. 22)",
      "Supporto prioritario",
    ],
  },
];

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar() {
  const { ref, visible } = useInView(0.1);
  const stats = [
    { v: "48", l: "sezioni di valutazione guidate" },
    { v: "7", l: "framework normativi integrati" },
    { v: "3%", l: "sanzione max sul fatturato globale" },
    { v: "< 1 h", l: "per completare una FRIA base" },
  ];
  return (
    <div ref={ref} style={{ borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#FAFAF9" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }} className="stats-bar">
        {stats.map((s, i) => (
          <div key={s.l} style={{
            textAlign: "center" as const, padding: "8px 16px",
            borderRight: i < 3 ? "1px solid rgba(0,0,0,0.07)" : "none",
            opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(16px)",
            transition: `opacity .55s ${i * 0.09}s ease, transform .55s ${i * 0.09}s ease`,
          }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 400, letterSpacing: "-1.5px", color: "#0D1016", lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(0,0,0,0.38)", marginTop: 6, lineHeight: 1.4 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPARE INFOGRAPHIC ───────────────────────────────────────────────────────
function CompareBlock() {
  const { ref, visible } = useInView(0.08);
  const fade = (i: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "none" : "translateY(20px)",
    transition: `opacity .6s ${i * 0.1}s ease, transform .6s ${i * 0.1}s ease`,
  });

  const before = [
    { label: "4–8 settimane", sub: "per una valutazione d'impatto completa" },
    { label: "€8.000–40.000", sub: "costo medio di consulenza legale AI" },
    { label: "Copia-incolla", sub: "da template Word senza collegamento ai dati" },
    { label: "Rischio silenzioso", sub: "senza alert su nuovi obblighi normativi" },
  ];
  const after = [
    { label: "< 1 ora", sub: "per completare FRIA + DPIA con AI" },
    { label: "€149/mese", sub: "tutto incluso, aggiornamenti compresi" },
    { label: "Pre-compilato", sub: "dai dati già inseriti nel Triage" },
    { label: "Monitoraggio live", sub: "Art. 73 e notifiche Post-Market in tempo reale" },
  ];

  return (
    <section style={{ background: "#ffffff", padding: "88px 24px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 56, ...fade(0) }}>
          <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "1.4px", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.30)", marginBottom: 14 }}>Il confronto che conta</p>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 400, letterSpacing: "-1.8px", color: "#0D1016", lineHeight: 1.1 }}>
            Prima e dopo RegulaeOS.
          </h2>
        </div>

        <div ref={ref} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, alignItems: "stretch" }} className="compare-grid">

          {/* BEFORE */}
          <div style={{ ...fade(1), background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.09)", borderRadius: "14px 0 0 14px", padding: "32px 28px" }}>
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.38)", marginBottom: 20 }}>Senza RegulaeOS</p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 20 }}>
              {before.map((b) => (
                <div key={b.label} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(0,0,0,0.22)", marginTop: 8, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 400, letterSpacing: "-0.5px", color: "#0D1016" }}>{b.label}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.48)", marginTop: 4, lineHeight: 1.55 }}>{b.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIVIDER */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px", ...fade(2) }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0D1016", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* AFTER */}
          <div style={{ ...fade(3), background: "#0D1016", border: "1px solid #0D1016", borderRadius: "0 14px 14px 0", padding: "32px 28px" }}>
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.40)", marginBottom: 20 }}>Con RegulaeOS</p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 20 }}>
              {after.map((a) => (
                <div key={a.label} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6EE7A0", marginTop: 8, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 400, letterSpacing: "-0.5px", color: "#ffffff" }}>{a.label}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 4, lineHeight: 1.55 }}>{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── TRUST SECTION ─────────────────────────────────────────────────────────────
function TrustSection() {
  const { ref, visible } = useInView(0.08);
  const pillars = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="1" y="1" width="20" height="20" rx="5" stroke="#0D1016" strokeWidth="1.4"/>
          <path d="M6 11l3.5 3.5L16 7" stroke="#0D1016" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Precisione normativa",
      desc: "Ogni risposta cita il testo esatto del Regolamento UE 2024/1689. Nessuna allucinazione: fonti sempre verificabili a fianco della risposta.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 2L4 5.5v6c0 4 3.1 7.7 7 8.5 3.9-.8 7-4.5 7-8.5v-6L11 2z" stroke="#0D1016" strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M8 11l2 2 4-4" stroke="#0D1016" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Dati in Europa",
      desc: "Infrastruttura EU-only, nessun trasferimento extra-UE. Evidence layer immutabile con hash SHA-256 su ogni documento generato.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="9" stroke="#0D1016" strokeWidth="1.4"/>
          <path d="M11 7v4l2.5 2.5" stroke="#0D1016" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: "Aggiornato in tempo reale",
      desc: "Le linee guida EDPB, i pareri ENISA e i nuovi standard EN ISO vengono incorporati automaticamente. Non userai mai un template obsoleto.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M2 17l5-5 4 4 4-6 5 7" stroke="#0D1016" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "ROI misurabile",
      desc: "Studi e team legal risparmiano in media 6 settimane per progetto. Il costo del piano Pro si recupera con la prima valutazione d'impatto.",
    },
  ];

  return (
    <section ref={ref} style={{ background: "#FAFAF9", borderTop: "1px solid rgba(0,0,0,0.07)", padding: "88px 24px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 52,
          opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(16px)",
          transition: "opacity .6s ease, transform .6s ease" }}>
          <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "1.4px", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.30)", marginBottom: 14 }}>Perché sceglierci</p>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 400, letterSpacing: "-1.8px", color: "#0D1016", lineHeight: 1.1 }}>
            Costruito per durare sotto un audit.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }} className="trust-grid">
          {pillars.map((p, i) => (
            <div key={p.title} style={{
              background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "28px 28px 26px",
              opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)",
              transition: `opacity .55s ${0.1 + i * 0.09}s ease, transform .55s ${0.1 + i * 0.09}s ease`,
            }}>
              <div style={{ marginBottom: 14 }}>{p.icon}</div>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 400, letterSpacing: "-0.5px", color: "#0D1016", marginBottom: 10 }}>{p.title}</h3>
              <p style={{ fontSize: 13.5, fontWeight: 300, color: "rgba(0,0,0,0.50)", lineHeight: 1.7 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FINAL CTA ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  const { ref, visible } = useInView(0.1);
  return (
    <section ref={ref} style={{ background: "#0D1016", padding: "96px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" as const,
        opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)",
        transition: "opacity .7s ease, transform .7s ease" }}>
        <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>
          Inizia oggi
        </p>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 4vw, 50px)", fontWeight: 400, letterSpacing: "-2px", color: "#ffffff", lineHeight: 1.07, marginBottom: 20 }}>
          Il primo fascicolo tecnico<br />è già incluso nel piano gratuito.
        </h2>
        <p style={{ fontSize: 15, fontWeight: 300, color: "rgba(255,255,255,0.42)", lineHeight: 1.8, marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
          Nessuna carta di credito. Nessun contratto. Puoi passare al piano Pro in qualsiasi momento — anche dopo aver visto i risultati.
        </p>
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12 }}>
          <Link
            href="/register"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#ffffff", color: "#0D1016",
              fontFamily: MONO, fontSize: 13, fontWeight: 600, letterSpacing: "0.04em",
              padding: "16px 36px", borderRadius: 8, textDecoration: "none",
              transition: "opacity .18s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Crea il tuo account gratuito
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="#0D1016" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>
            Oppure{" "}
            <a href="/register?plan=pro" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "underline" }}>
              inizia la prova Pro da 14 giorni
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── PAGE ──────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 900px) {
          .tiers-grid { grid-template-columns: 1fr !important; max-width: 440px !important; }
          .stats-bar { grid-template-columns: repeat(2,1fr) !important; }
          .compare-grid { grid-template-columns: 1fr !important; }
          .trust-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tier-card { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>
      <Nav />
      <main style={{ paddingTop: 96 }}>
        {/* Header */}
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px 64px", textAlign: "center" as const }}>
          <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.28)", marginBottom: 16 }}>
            Prezzi
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 400, letterSpacing: "-2.5px", lineHeight: 1.04, color: "#0D1016", marginBottom: 20 }}>
            Conformità AI Act.<br />Dal primo obbligo all&apos;audit.
          </h1>
          <p style={{ fontSize: 15, fontWeight: 300, color: "rgba(0,0,0,0.45)", lineHeight: 1.75, maxWidth: 440, margin: "0 auto" }}>
            Inizia gratis, scala quando vuoi. Nessun contratto annuale obbligatorio.
          </p>
        </div>

        {/* Tiers */}
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 80px" }}>
          <div className="tiers-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "start" }}>
            {TIERS.map((tier, i) => (
              <TierCard key={tier.name} {...tier} index={i} />
            ))}
          </div>
          <p style={{ marginTop: 36, textAlign: "center" as const, fontFamily: MONO, fontSize: 11, fontWeight: 400, color: "rgba(0,0,0,0.30)", lineHeight: 1.65 }}>
            Prezzi indicativi, IVA esclusa. RegulaeOS è uno strumento di supporto alla conformità: i contenuti generati richiedono sempre revisione umana e non costituiscono consulenza legale.
          </p>
        </div>

        {/* Stats bar */}
        <StatsBar />

        {/* Compare infographic */}
        <CompareBlock />

        {/* Trust pillars */}
        <TrustSection />

        {/* Final CTA */}
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
