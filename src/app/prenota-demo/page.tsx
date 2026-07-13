import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import DemoForm from "@/components/DemoForm";

export const metadata: Metadata = {
  title: "Prenota una demo — RegulaeOS",
  description:
    "Prenota una demo di RegulaeOS: vedi come l'avvocato, assistito dallo strumento, predispone il tuo assessment di conformità EU AI Act. Chiamata di 30 minuti.",
};

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

const TRUST = [
  "Erogato da avvocato iscritto all'Ordine di Napoli",
  "Ogni valutazione validata da un professionista",
  "Nel rispetto del Codice Deontologico Forense",
];

const FRAMEWORKS = [
  { name: "EU AI Act",   sub: "Reg. 2024/1689" },
  { name: "ISO 42001",   sub: "AI Management" },
  { name: "NIST AI RMF", sub: "v1.0" },
  { name: "GDPR",        sub: "Reg. 2016/679" },
  { name: "ISO 27001",   sub: "Info Security" },
  { name: "EDPB",        sub: "Guidelines" },
];

export default function PrenotaDemoPage() {
  return (
    <main style={{ display: "flex", minHeight: "100vh", flexWrap: "wrap" }}>
      <style>{`
        @keyframes fwFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fw-chip { animation: none !important; }
        }
      `}</style>

      {/* ── Pannello sinistro — chiaro, trust avvocato ── */}
      <section
        style={{
          flex: "1 1 440px",
          background: "#fafaf9",
          borderRight: "1px solid rgba(0,0,0,0.06)",
          padding: "40px clamp(28px, 5vw, 72px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "100vh",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <Image src="/logo.svg" alt="RegulaeOS" width={140} height={36} priority />
        </Link>

        {/* Centro: headline + descrizione */}
        <div style={{ padding: "48px 0", maxWidth: 520 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 22 }}>
            Prenota una demo
          </p>
          <h1 style={{
            fontFamily: SERIF,
            fontSize: "clamp(38px, 4.6vw, 62px)",
            fontWeight: 400,
            letterSpacing: "-2px",
            lineHeight: 1.03,
            color: "#0D1016",
            marginBottom: 24,
          }}>
            Vedi come lavora l&rsquo;avvocato con lo strumento.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(0,0,0,0.55)", maxWidth: 440 }}>
            In 30 minuti analizziamo insieme il tuo sistema AI e ti mostriamo come
            predisponiamo il primo assessment di conformità al Regolamento EU AI Act
            (2024/1689): risk assessment, FRIA, DPIA e documentazione tecnica.
          </p>

          {/* Trust list */}
          <ul style={{ listStyle: "none", padding: 0, margin: "36px 0 0", display: "flex", flexDirection: "column", gap: 14 }}>
            {TRUST.map((t) => (
              <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#0D1016", flexShrink: 0, marginTop: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span style={{ fontSize: 14, color: "rgba(0,0,0,0.62)", lineHeight: 1.45 }}>{t}</span>
              </li>
            ))}
          </ul>

          {/* Verso la conformità — framework normativi fluttuanti */}
          <div style={{ marginTop: 48 }}>
            <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Verso la conformità
            </p>
            <p style={{ fontSize: 13.5, color: "rgba(0,0,0,0.5)", lineHeight: 1.6, marginBottom: 22, maxWidth: 420 }}>
              Ti accompagniamo verso le certificazioni e i framework normativi che
              contano — mappati e presidiati passo dopo passo.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {FRAMEWORKS.map((fw, i) => (
                <div
                  key={fw.name}
                  className="fw-chip"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 14px 9px 10px",
                    background: "#ffffff",
                    border: "1px solid rgba(0,0,0,0.09)",
                    borderRadius: 10,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                    animation: `fwFloat ${3 + (i % 3) * 0.6}s ease-in-out ${i * 0.35}s infinite`,
                  }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: "#0D1016",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2.5L4 6v6c0 4.4 3.4 8.3 8 9.5 4.6-1.2 8-5.1 8-9.5V6l-8-3.5z" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                      <path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: "#0D1016", lineHeight: 1.2 }}>
                      {fw.name}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(0,0,0,0.35)", marginTop: 2 }}>
                      {fw.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fondo: firma avvocato + torna al sito */}
        <div>
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 22, marginBottom: 22 }}>
            <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
              Chi eroga il servizio
            </p>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#0D1016" }}>
              Avv. Umberto Mottola — Foro di Napoli
            </p>
          </div>
          <Link
            href="/"
            style={{ fontFamily: MONO, fontSize: 12, color: "rgba(0,0,0,0.42)", textDecoration: "none" }}
          >
            ← Torna al sito completo
          </Link>
        </div>
      </section>

      {/* ── Pannello destro — scuro, form ── */}
      <section
        style={{
          flex: "1 1 440px",
          background: "#0D1016",
          padding: "56px clamp(24px, 4vw, 56px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ width: "100%", maxWidth: 540 }}>
          <DemoForm />
          <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
            EU AI Act 2024/1689 · GDPR 2016/679 · ISO 42001
          </p>
        </div>
      </section>
    </main>
  );
}
