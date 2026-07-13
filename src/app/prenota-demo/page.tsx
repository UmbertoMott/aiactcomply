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

export default function PrenotaDemoPage() {
  return (
    <main style={{ display: "flex", minHeight: "100vh", flexWrap: "wrap" }}>

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
