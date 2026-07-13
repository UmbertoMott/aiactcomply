import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Contatti — RegulaeOS",
  description: "Contatta l'Avv. Umberto Mottola per attivare l'assistenza professionale alla conformità EU AI Act.",
};

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

export default function ContattiPage() {
  return (
    <>
      <style>{`
        .contatti-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px 28px;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 14px;
          text-decoration: none;
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .contatti-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          border-color: rgba(0,0,0,0.18);
        }
      `}</style>

      <Nav />
      <main style={{ background: "#fafaf9", minHeight: "100vh" }}>
        <section style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 96px" }}>

          {/* Eyebrow */}
          <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
            Contatti
          </p>

          {/* Title */}
          <h1 style={{
            fontFamily: SERIF,
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 400,
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            color: "#0D1016",
            marginBottom: 24,
          }}>
            Attiva l&rsquo;assistenza.<br />
            <span style={{ color: "rgba(0,0,0,0.35)" }}>Parla con l&rsquo;avvocato.</span>
          </h1>

          <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(0,0,0,0.55)", marginBottom: 56, maxWidth: 560 }}>
            Per avviare il servizio di assistenza alla conformità EU AI Act, invia una mail.
            Risposta entro 24 ore lavorative. Nessun impegno iniziale.
          </p>

          {/* Contact cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 64 }}>

            {/* Email */}
            <a href="mailto:info@aicomply.eu" className="contatti-card">
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: "#0D1016",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="white" strokeWidth="1.6" />
                  <path d="M2 8l10 7 10-7" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                  Email
                </p>
                <p style={{ fontSize: 15, fontWeight: 500, color: "#0D1016", letterSpacing: "-0.2px" }}>
                  info@aicomply.eu
                </p>
              </div>
            </a>

            {/* Avvocato info */}
            <div style={{
              display: "flex", alignItems: "center", gap: 20,
              padding: "24px 28px",
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: "#fafaf9",
                border: "1px solid rgba(0,0,0,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#0D1016" strokeWidth="1.6" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#0D1016" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                  Chi risponde
                </p>
                <p style={{ fontSize: 15, fontWeight: 500, color: "#0D1016", letterSpacing: "-0.2px" }}>
                  Avv. Umberto Mottola — Foro di Napoli
                </p>
              </div>
            </div>

          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 32 }}>
            <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.35)", lineHeight: 1.65 }}>
              Il servizio è erogato dall&rsquo;Avv. Umberto Mottola nel rispetto del Codice Deontologico
              Forense (art. 35 CDF). Risposta entro 24 ore lavorative.
            </p>
          </div>

        </section>
      </main>
      <Footer />
    </>
  );
}
