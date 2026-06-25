"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

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

export default function PricingPage() {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 900px) {
          .tiers-grid { grid-template-columns: 1fr !important; max-width: 440px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tier-card { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>
      <Nav />
      <main style={{ paddingTop: 96 }}>
        {/* Header */}
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "80px 24px 64px",
            textAlign: "center" as const,
          }}
        >
          <p
            style={{
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "1.5px",
              textTransform: "uppercase" as const,
              color: "rgba(0,0,0,0.28)",
              marginBottom: 16,
            }}
          >
            Prezzi
          </p>
          <h1
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(32px, 5vw, 54px)",
              fontWeight: 400,
              letterSpacing: "-2.5px",
              lineHeight: 1.04,
              color: "#0D1016",
              marginBottom: 20,
            }}
          >
            Conformità AI Act.<br />Dal primo obbligo all'audit.
          </h1>
          <p
            style={{
              fontSize: 15,
              fontWeight: 300,
              color: "rgba(0,0,0,0.45)",
              lineHeight: 1.75,
              maxWidth: 440,
              margin: "0 auto",
            }}
          >
            Inizia gratis, scala quando vuoi. Nessun contratto annuale obbligatorio.
          </p>
        </div>

        {/* Tiers */}
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            padding: "0 24px 80px",
          }}
        >
          <div
            className="tiers-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            {TIERS.map((tier, i) => (
              <TierCard key={tier.name} {...tier} index={i} />
            ))}
          </div>

          {/* Disclaimer */}
          <p
            style={{
              marginTop: 36,
              textAlign: "center" as const,
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 400,
              color: "rgba(0,0,0,0.30)",
              lineHeight: 1.65,
            }}
          >
            Prezzi indicativi, IVA esclusa. AIComply è uno strumento di supporto alla conformità: i contenuti generati richiedono sempre revisione umana e non costituiscono consulenza legale.
          </p>
        </div>
      </main>
    </div>
  );
}
