"use client";

import { useState } from "react";
import Nav from "@/components/Nav";

// ─── Tier data ────────────────────────────────────────────────────────────────

const TIERS = [
  {
    id: "free",
    name: "Scanner",
    price: "0",
    period: "",
    description: "Per capire dove sei adesso",
    cta: "Inizia gratis",
    ctaHref: "/scanner",
    ctaStyle: "ghost" as const,
    badge: null,
    features: [
      "Scanner Art. 50 pubblico",
      "5 criteri di conformità analizzati",
      "Score 0–100 con dettaglio per criterio",
      "Profilo radar di conformità",
      "Nessuna registrazione richiesta",
    ],
    locked: [
      "Piano di remediation",
      "Snippet di implementazione",
      "Registro di Implementazione",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "49",
    period: "/mese",
    description: "Art. 50 compliance in 24 ore",
    cta: "Richiedi accesso anticipato",
    ctaHref: "/waitlist?plan=starter",
    ctaStyle: "primary" as const,
    badge: "Più scelto",
    features: [
      "Tutto di Scanner, più:",
      "Piano di remediation completo",
      "Snippet HTML / React / WordPress",
      "Wizard di installazione guidata",
      "Registro di Implementazione Art. 50",
      "Re-scan automatico post-installazione",
      "1 sistema AI registrato",
      "Notifiche scadenza (90/30/7 giorni)",
    ],
    locked: [
      "Scansione multi-sistema",
      "AI Classifier (Art. 6)",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "199",
    period: "/mese",
    description: "Per chi sviluppa sistemi AI",
    cta: "Richiedi accesso anticipato",
    ctaHref: "/waitlist?plan=professional",
    ctaStyle: "ghost" as const,
    badge: null,
    features: [
      "Tutto di Starter, più:",
      "5 sistemi AI registrati",
      "AI Classifier — mapping codice → rischio",
      "Exemption dossier Art. 6(3)",
      "Scansione repository GitHub",
      "Conformity record esportabile",
      "Legal Assistant RAG (EU AI Act)",
      "Supporto via email prioritario",
    ],
    locked: [],
  },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Come funziona l'accesso anticipato?",
    a: "Lasci nome, email e azienda — nessuna carta di credito. Ti contatteremo entro 24 ore per attivare l'accesso. I primi iscritti ottengono il prezzo bloccato a vita.",
  },
  {
    q: "Lo scanner gratuito è davvero anonimo?",
    a: "Sì. Non raccogliamo email, IP o dati identificativi durante la scansione. Il risultato non viene salvato sul nostro server.",
  },
  {
    q: "Il Registro di Implementazione vale come prova legale?",
    a: "Il Registro documenta che hai installato i componenti di disclosure in una data specifica. È una prova di due diligence utile in caso di ispezione. La conformità all'Art. 50 rimane responsabilità del titolare del sistema AI — AI Comply non rilascia attestazioni di conformità legale.",
  },
  {
    q: "Posso cancellare in qualsiasi momento?",
    a: "Sì. Nessun vincolo, nessuna penale. Il piano si interrompe alla fine del periodo fatturato.",
  },
];

// ─── FAQ accordion ────────────────────────────────────────────────────────────

function FaqList() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      {FAQS.map((faq, i) => (
        <div key={i} className="py-5">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between text-left gap-4"
          >
            <span className="text-[15px] font-medium text-white">{faq.q}</span>
            <svg
              className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
              style={{
                color: "rgba(255,255,255,0.4)",
                transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tier card ────────────────────────────────────────────────────────────────

type Tier = (typeof TIERS)[number];

function TierCard({ tier, annual }: { tier: Tier; annual: boolean }) {
  const isStarter = tier.id === "starter";

  const annualMonthlyPrice = tier.id === "starter" ? "41" : "166";
  const annualYearlyPrice  = tier.id === "starter" ? "490" : "1.990";

  const displayPrice =
    tier.price === "0"
      ? null
      : annual
      ? annualMonthlyPrice
      : tier.price;

  const ctaHref =
    tier.ctaHref + (annual && tier.price !== "0" ? "&billing=annual" : "");

  return (
    <div
      className="flex flex-col rounded-2xl p-8"
      style={
        isStarter
          ? {
              border: "2px solid rgba(59,130,246,0.7)",
              background: "#0a1628",
              boxShadow: "0 0 40px rgba(59,130,246,0.12)",
            }
          : {
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
            }
      }
    >
      {/* Badge */}
      {tier.badge && (
        <span
          className="self-start mb-4 text-xs font-semibold px-3 py-1 rounded-full text-white"
          style={{ background: "#2563eb" }}
        >
          {tier.badge}
        </span>
      )}

      {/* Name + description */}
      <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
      <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
        {tier.description}
      </p>

      {/* Price */}
      <div className="mt-6 flex items-baseline gap-1">
        {displayPrice === null ? (
          <span className="text-4xl font-bold text-white">Gratis</span>
        ) : (
          <>
            <span className="text-4xl font-bold text-white">€{displayPrice}</span>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              /mese
            </span>
          </>
        )}
      </div>
      {annual && tier.price !== "0" && (
        <p className="mt-1 text-xs" style={{ color: "#60a5fa" }}>
          €{annualYearlyPrice}/anno — risparmi 2 mesi
        </p>
      )}

      {/* CTA */}
      <a
        href={ctaHref}
        className={`mt-8 block text-center py-3 rounded-xl text-sm font-semibold transition-all ${
          tier.ctaStyle === "primary"
            ? "text-white"
            : "text-white"
        }`}
        style={
          tier.ctaStyle === "primary"
            ? { background: "#2563eb" }
            : {
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
              }
        }
        onMouseEnter={e => {
          if (tier.ctaStyle === "primary") {
            (e.currentTarget as HTMLAnchorElement).style.background = "#3b82f6";
          } else {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)";
          }
        }}
        onMouseLeave={e => {
          if (tier.ctaStyle === "primary") {
            (e.currentTarget as HTMLAnchorElement).style.background = "#2563eb";
          } else {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
          }
        }}
      >
        {tier.cta}
      </a>

      {/* Divider */}
      <div
        className="my-8"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      />

      {/* Features */}
      <ul className="space-y-3 flex-1">
        {tier.features.map(f => (
          <li key={f} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            <svg
              className="h-4 w-4 mt-0.5 flex-shrink-0"
              style={{ color: "#4ade80" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
        {tier.locked.map(f => (
          <li key={f} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
            <svg
              className="h-4 w-4 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <Nav />
      <main style={{ background: "#0D1016", minHeight: "100vh" }}>

        {/* ── Hero ── */}
        <section className="pt-24 pb-16 text-center px-4">
          {/* Grid overlay */}
          <div
            className="pointer-events-none fixed inset-0 -z-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />

          <span
            className="relative inline-block text-xs uppercase tracking-widest font-semibold"
            style={{ color: "#60a5fa", letterSpacing: "2px" }}
          >
            Prezzi
          </span>

          <h1
            className="relative mt-4 text-4xl md:text-5xl font-bold text-white"
            style={{ letterSpacing: "-1.5px", lineHeight: 1.08 }}
          >
            Compliance AI.<br />
            <span style={{ color: "rgba(255,255,255,0.28)" }}>Senza sorprese.</span>
          </h1>

          <p
            className="relative mt-4 text-[15px] max-w-xl mx-auto"
            style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}
          >
            Inizia con lo scanner gratuito. Entra in lista per accedere ai piani completi
            e bloccare il prezzo da fondatore.
          </p>

          {/* Annual / monthly toggle */}
          <div
            className="relative mt-10 inline-flex items-center rounded-full p-1 gap-1"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <button
              onClick={() => setAnnual(false)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: !annual ? "#ffffff" : "transparent",
                color: !annual ? "#0D1016" : "rgba(255,255,255,0.5)",
              }}
            >
              Mensile
            </button>
            <button
              onClick={() => setAnnual(true)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: annual ? "#ffffff" : "transparent",
                color: annual ? "#0D1016" : "rgba(255,255,255,0.5)",
              }}
            >
              Annuale
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: annual ? "#16a34a" : "rgba(20,83,45,0.5)",
                  color: annual ? "#ffffff" : "#4ade80",
                }}
              >
                -17%
              </span>
            </button>
          </div>
        </section>

        {/* ── Tier grid ── */}
        <section className="relative max-w-5xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {TIERS.map(tier => (
              <TierCard key={tier.id} tier={tier} annual={annual} />
            ))}
          </div>
        </section>

        {/* ── Enterprise band ── */}
        <section
          className="py-16 px-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <h3
              className="text-2xl font-semibold text-white"
              style={{ letterSpacing: "-0.5px" }}
            >
              Studi legali e grandi aziende
            </h3>
            <p
              className="mt-3 text-sm max-w-lg mx-auto"
              style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}
            >
              White-label, workspace clienti illimitati, API access, SLA 99.9%,
              onboarding dedicato. Prezzi su misura per il tuo volume.
            </p>
            <a
              href="mailto:sales@aicomply.eu"
              className="mt-8 inline-block px-8 py-3 rounded-xl text-white text-sm font-medium transition-colors"
              style={{
                border: "1px solid rgba(255,255,255,0.2)",
              }}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)")
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")
              }
            >
              Parla con noi →
            </a>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-2xl mx-auto px-4 pb-24">
          <h3
            className="text-xl font-semibold text-white mb-8 text-center"
            style={{ letterSpacing: "-0.4px" }}
          >
            Domande frequenti
          </h3>
          <FaqList />
        </section>

      </main>
    </>
  );
}
