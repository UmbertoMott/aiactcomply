"use client";

import { AlertTriangle, Shield, Zap, Lock, CheckCircle, ArrowRight } from "lucide-react";

// --warning token from globals.css
const AMBER = "#d97706";

interface ScannerTrustSectionProps {
  onScanRequest: () => void;
}

export default function ScannerTrustSection({ onScanRequest }: ScannerTrustSectionProps) {
  return (
    <section
      aria-label="Sanzioni Art. 50 AI Act e caratteristiche dello scanner"
      className="relative z-10 max-w-3xl mx-auto px-4 pb-24 pt-16"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >

      {/* ── 1. Posta in gioco ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-8 relative overflow-hidden"
        style={{
          background: "rgba(217,119,6,0.07)",
          border: "1.5px solid rgba(217,119,6,0.28)",
          paddingLeft: 28,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
            background: AMBER, borderRadius: "16px 0 0 16px",
          }}
        />
        <div className="flex items-start gap-4">
          <AlertTriangle aria-hidden="true" size={22} style={{ color: AMBER, flexShrink: 0, marginTop: 3 }} />
          <div>
            <div className="flex items-baseline gap-3 flex-wrap mb-2">
              <span style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 400, color: "#ffffff", letterSpacing: "-1px", lineHeight: 1.05 }}>
                Fino a €15.000.000
              </span>
              <span
                className="text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ background: "rgba(217,119,6,0.18)", color: AMBER, letterSpacing: "0.03em" }}
              >
                o 3% del fatturato mondiale
              </span>
            </div>
            <div className="flex gap-4 flex-wrap mb-3 text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span>Art. 50 + Art. 99(4)(g) — Reg. UE 2024/1689</span>
              <span style={{ color: AMBER, fontWeight: 700 }}>Deadline: 2 dicembre 2026</span>
            </div>
            <p className="text-[13px] leading-relaxed max-w-lg" style={{ color: "rgba(255,255,255,0.45)" }}>
              L&rsquo;obbligo di disclosure AI riguarda ogni interfaccia conversazionale, sistema di
              raccomandazione e contenuto sintetico. Individuare subito le irregolarità è il modo
              più semplice — e gratuito — per evitarle.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Trust (3 card) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          {
            icon: <CheckCircle aria-hidden="true" size={18} />,
            title: "Basato sul testo ufficiale",
            body: "5 criteri dell'Art. 50, Reg. UE 2024/1689 — nessuna interpretazione soggettiva.",
          },
          {
            icon: <Lock aria-hidden="true" size={18} />,
            title: "100% anonimo",
            body: "Nessuna registrazione. Nessun dato salvato. Solo l'URL viene analizzato.",
          },
          {
            icon: <Zap aria-hidden="true" size={18} />,
            title: "Pronto in 15 secondi",
            body: "Risultato immediato con gap rilevati e profilo di rischio sanzionatorio.",
          },
        ].map(({ icon, title, body }) => (
          <div
            key={title}
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-white mb-2.5">{icon}</div>
            <p className="text-[12px] font-semibold text-white mb-1.5">{title}</p>
            <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{body}</p>
          </div>
        ))}
      </div>

      {/* ── 3. Come funziona (3 step) ─────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
          Come funziona
        </p>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {[
            { n: "01", label: "Incolla l'URL", sub: "Del sito con interfacce AI" },
            { n: "02", label: "Analisi dei 5 criteri", sub: "Art. 50 Reg. UE 2024/1689" },
            { n: "03", label: "Report con i fix", sub: "Gap rilevati e priorità" },
          ].map(({ n, label, sub }, i) => (
            <div
              key={n}
              className="p-5"
              style={{
                background: "rgba(255,255,255,0.025)",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.07)" : undefined,
              }}
            >
              <span className="block text-[11px] font-bold mb-2.5 font-mono" style={{ color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em" }}>
                {n}
              </span>
              <p className="text-[13px] font-medium text-white mb-1">{label}</p>
              <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Le sanzioni (3 fasce) ──────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
          Le sanzioni — Art. 99, Reg. UE 2024/1689
        </p>
        <div className="flex flex-col gap-2">
          {([
            {
              amount: "€7.500.000",
              pct: "1% del fatturato mondiale",
              desc: "Informazioni errate o incomplete fornite alle autorità di vigilanza",
              ref: "Art. 99(5)",
              highlight: false,
              badge: null,
            },
            {
              amount: "€15.000.000",
              pct: "3% del fatturato mondiale",
              desc: "Violazione degli obblighi di trasparenza e disclosure AI",
              ref: "Art. 99(4)(g) — Art. 50",
              highlight: true,
              badge: "Riguarda te",
            },
            {
              amount: "€35.000.000",
              pct: "7% del fatturato mondiale",
              desc: "Pratiche di IA vietate o sistemi GPAI non conformi",
              ref: "Art. 99(3) — Art. 5",
              highlight: false,
              badge: null,
            },
          ] as const).map(({ amount, pct, desc, ref, highlight, badge }) => (
            <div
              key={amount}
              className="rounded-xl p-4 flex items-center gap-5 flex-wrap"
              style={{
                background: highlight ? "rgba(217,119,6,0.07)" : "rgba(255,255,255,0.03)",
                border: highlight
                  ? "1.5px solid rgba(217,119,6,0.30)"
                  : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex-shrink-0" style={{ minWidth: 145 }}>
                <span style={{
                  fontSize: highlight ? 20 : 17,
                  fontWeight: 400,
                  color: highlight ? AMBER : "rgba(255,255,255,0.75)",
                  letterSpacing: "-0.5px",
                  display: "block",
                  lineHeight: 1.1,
                }}>
                  {amount}
                </span>
                <span className="text-[10px] font-mono" style={{ color: highlight ? AMBER : "rgba(255,255,255,0.3)" }}>
                  {pct}
                </span>
              </div>
              <div className="flex-1" style={{ minWidth: 160 }}>
                <p
                  className="text-[13px] mb-1"
                  style={{ color: highlight ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)", fontWeight: highlight ? 500 : 400 }}
                >
                  {desc}
                </p>
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{ref}</span>
              </div>
              {badge && (
                <span
                  className="text-[10px] font-bold px-3 py-1 rounded-full flex-shrink-0 whitespace-nowrap"
                  style={{ background: AMBER, color: "#ffffff", letterSpacing: "0.04em" }}
                >
                  {badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. CTA finale ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
      >
        <div
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1 text-[11px] mb-5"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <Shield aria-hidden="true" size={11} />
          Art. 50 · Deadline: 2 dicembre 2026
        </div>

        <p style={{ fontSize: "clamp(20px, 2.8vw, 28px)", fontWeight: 400, color: "#ffffff", letterSpacing: "-0.9px", marginBottom: 10 }}>
          Scopri in 15 secondi se rischi una sanzione
        </p>
        <p className="text-[13px] mb-7" style={{ color: "rgba(255,255,255,0.4)" }}>
          Gratuito · anonimo · nessuna registrazione
        </p>

        <button
          type="button"
          onClick={onScanRequest}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-[13px] font-medium transition-all duration-200"
          style={{ background: "#ffffff", color: "#0C1B33" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#e5e7eb")}
          onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}
        >
          Analizza gratis
          <ArrowRight aria-hidden="true" size={14} />
        </button>

        <p className="mt-4 text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          Gratis · anonimo · nessuna registrazione
        </p>
      </div>

    </section>
  );
}
