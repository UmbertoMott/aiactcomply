"use client";

import { AlertTriangle, Shield, Zap, Lock, CheckCircle, ArrowRight } from "lucide-react";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

const SURFACE = "#FAFAF9";
const BORDER  = "rgba(0,0,0,0.09)";
const MUTED   = "rgba(0,0,0,0.42)";
const DIM     = "rgba(0,0,0,0.28)";
const FAINT   = "rgba(0,0,0,0.10)";
// --warning from globals.css
const AMBER   = "#d97706";

interface ScannerTrustSectionProps {
  onScanRequest: () => void;
}

export default function ScannerTrustSection({ onScanRequest }: ScannerTrustSectionProps) {
  return (
    <section
      aria-label="Sanzioni Art. 50 AI Act e caratteristiche dello scanner"
      style={{ borderTop: `1px solid ${BORDER}`, background: "#ffffff", paddingBottom: 96 }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 0" }}>

        {/* ── 1. Posta in gioco ─────────────────────────────────────────── */}
        <div
          style={{
            borderRadius: 16,
            border: "1.5px solid rgba(217,119,6,0.30)",
            background: "rgba(217,119,6,0.04)",
            padding: "28px 28px 28px 36px",
            marginBottom: 40,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
              background: AMBER, borderRadius: "16px 0 0 16px",
            }}
          />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <AlertTriangle
              aria-hidden="true"
              size={22}
              style={{ color: AMBER, flexShrink: 0, marginTop: 3 }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{
                  fontFamily: SERIF,
                  fontSize: "clamp(22px, 3.5vw, 36px)",
                  fontWeight: 400,
                  color: "#0D1016",
                  letterSpacing: "-1.2px",
                  lineHeight: 1.05,
                }}>
                  Fino a €15.000.000
                </span>
                <span style={{
                  fontFamily: MONO, fontSize: 11, fontWeight: 700,
                  padding: "4px 12px", borderRadius: 20,
                  background: "rgba(217,119,6,0.12)", color: AMBER,
                  letterSpacing: "0.03em",
                }}>
                  o 3% del fatturato mondiale
                </span>
              </div>
              <div style={{
                display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14,
                fontFamily: MONO, fontSize: 11, color: DIM,
              }}>
                <span>Art. 50 + Art. 99(4)(g) — Reg. UE 2024/1689</span>
                <span style={{ color: AMBER, fontWeight: 700 }}>Deadline: 2 dicembre 2026</span>
              </div>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.72, margin: 0, maxWidth: 540 }}>
                L&rsquo;obbligo di disclosure AI riguarda ogni interfaccia conversazionale, sistema
                di raccomandazione e contenuto sintetico. Individuare subito le irregolarità è il modo
                più semplice — e gratuito — per evitarle.
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. Trust (3 card) ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ marginBottom: 40 }}>
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
            <div key={title} style={{
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              background: SURFACE,
              padding: "20px 18px",
            }}>
              <div style={{ color: "#0D1016", marginBottom: 10 }}>{icon}</div>
              <p style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "#0D1016", margin: "0 0 6px" }}>
                {title}
              </p>
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.65, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>

        {/* ── 3. Come funziona (3 step) ─────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <p style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.10em",
            textTransform: "uppercase", color: DIM, marginBottom: 20,
          }}>
            Come funziona
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{
            border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden",
          }}>
            {[
              { n: "01", label: "Incolla l'URL", sub: "Del sito con interfacce AI" },
              { n: "02", label: "Analisi dei 5 criteri", sub: "Art. 50 Reg. UE 2024/1689" },
              { n: "03", label: "Report con i fix", sub: "Gap rilevati e priorità" },
            ].map(({ n, label, sub }, i) => (
              <div key={n} style={{
                padding: "20px 18px",
                background: "#ffffff",
                borderLeft: i > 0 ? `1px solid ${BORDER}` : undefined,
              }}>
                <span style={{
                  fontFamily: MONO, fontSize: 11, fontWeight: 700,
                  color: FAINT, display: "block", marginBottom: 10, letterSpacing: "0.06em",
                }}>
                  {n}
                </span>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#0D1016", margin: "0 0 4px" }}>{label}</p>
                <p style={{ fontFamily: MONO, fontSize: 11, color: DIM, margin: 0 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. Le sanzioni (3 fasce) ──────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <p style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.10em",
            textTransform: "uppercase", color: DIM, marginBottom: 20,
          }}>
            Le sanzioni — Art. 99, Reg. UE 2024/1689
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
              <div key={amount} style={{
                borderRadius: 12,
                border: highlight ? "1.5px solid rgba(217,119,6,0.32)" : `1px solid ${BORDER}`,
                background: highlight ? "rgba(217,119,6,0.04)" : SURFACE,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}>
                <div style={{ minWidth: 150, flexShrink: 0 }}>
                  <span style={{
                    fontFamily: SERIF,
                    fontSize: highlight ? 22 : 17,
                    fontWeight: 400,
                    color: highlight ? AMBER : "#0D1016",
                    letterSpacing: "-0.6px",
                    display: "block",
                    lineHeight: 1.1,
                  }}>
                    {amount}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: highlight ? AMBER : DIM }}>
                    {pct}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{
                    fontSize: 13, color: highlight ? "#0D1016" : MUTED,
                    margin: "0 0 4px", fontWeight: highlight ? 500 : 400,
                  }}>
                    {desc}
                  </p>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{ref}</span>
                </div>
                {badge && (
                  <span style={{
                    fontFamily: MONO, fontSize: 10, fontWeight: 700,
                    padding: "4px 12px", borderRadius: 20,
                    background: AMBER, color: "#ffffff",
                    letterSpacing: "0.04em", flexShrink: 0, whiteSpace: "nowrap",
                  }}>
                    {badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. CTA finale ─────────────────────────────────────────────── */}
        <div style={{
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
          background: SURFACE,
          padding: "40px 32px",
          textAlign: "center",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            borderRadius: 20, border: `1px solid rgba(0,0,0,0.09)`,
            background: "rgba(0,0,0,0.03)", padding: "4px 14px",
            fontFamily: MONO, fontSize: 11, color: DIM, marginBottom: 20,
          }}>
            <Shield aria-hidden="true" size={11} />
            Art. 50 · Deadline: 2 dicembre 2026
          </div>

          <p style={{
            fontFamily: SERIF,
            fontSize: "clamp(20px, 2.8vw, 30px)",
            fontWeight: 400,
            color: "#0D1016",
            letterSpacing: "-0.9px",
            margin: "0 0 12px",
          }}>
            Scopri in 15 secondi se rischi una sanzione
          </p>

          <p style={{ fontSize: 13, color: MUTED, margin: "0 0 28px" }}>
            Gratuito · anonimo · nessuna registrazione
          </p>

          <button
            type="button"
            onClick={onScanRequest}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              borderRadius: 10, padding: "13px 32px",
              fontSize: 13, fontWeight: 500, fontFamily: MONO,
              background: "#0D1016", color: "#ffffff", border: "none",
              cursor: "pointer", transition: "opacity 0.18s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Analizza gratis
            <ArrowRight aria-hidden="true" size={14} />
          </button>

          <p style={{ marginTop: 16, fontFamily: MONO, fontSize: 11, color: DIM }}>
            Gratis · anonimo · nessuna registrazione
          </p>
        </div>

      </div>
    </section>
  );
}
