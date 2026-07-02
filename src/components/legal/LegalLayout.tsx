import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";
const DARK  = "#0D1016";

interface Props {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, lastUpdated, children }: Props) {
  return (
    <>
      <Nav />
      <main style={{ background: "#ffffff", paddingBottom: 80 }}>
        {/* Hero header */}
        <div style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "64px 24px 40px",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
        }}>
          <Link
            href="/"
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: "rgba(0,0,0,0.35)",
              textDecoration: "none",
              letterSpacing: "0.06em",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 28,
            }}
          >
            ← Home
          </Link>
          <h1 style={{
            fontFamily: SERIF,
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 400,
            letterSpacing: "-1.8px",
            lineHeight: 1.08,
            color: DARK,
            marginBottom: 12,
          }}>
            {title}
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.35)", letterSpacing: "0.04em" }}>
            Ultimo aggiornamento: {lastUpdated}
          </p>
        </div>

        {/* Prose content */}
        <div
          className="legal-prose"
          style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}
        >
          {children}
        </div>
      </main>
      <Footer />

      <style>{`
        .legal-prose { color: rgba(0,0,0,0.72); font-size: 14px; line-height: 1.8; }

        .legal-prose h2 {
          font-family: ${SERIF};
          font-size: clamp(20px, 2.5vw, 26px);
          font-weight: 400;
          letter-spacing: -0.8px;
          color: ${DARK};
          margin: 40px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0,0,0,0.07);
        }
        .legal-prose h3 {
          font-family: ${SERIF};
          font-size: 17px;
          font-weight: 400;
          color: ${DARK};
          margin: 28px 0 8px;
        }
        .legal-prose p { margin: 0 0 14px; }
        .legal-prose ul, .legal-prose ol { margin: 0 0 14px; padding-left: 22px; }
        .legal-prose li { margin-bottom: 6px; }
        .legal-prose a { color: ${DARK}; text-decoration: underline; }
        .legal-prose a:hover { opacity: 0.65; }
        .legal-prose strong { font-weight: 600; color: ${DARK}; }

        /* Tabelle */
        .legal-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0 24px;
          font-size: 13px;
          overflow-x: auto;
          display: block;
        }
        .legal-prose th {
          font-family: ${MONO};
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(0,0,0,0.45);
          background: rgba(0,0,0,0.03);
          padding: 10px 14px;
          text-align: left;
          border: 1px solid rgba(0,0,0,0.08);
        }
        .legal-prose td {
          padding: 10px 14px;
          border: 1px solid rgba(0,0,0,0.08);
          vertical-align: top;
          line-height: 1.6;
        }
        .legal-prose tr:nth-child(even) td { background: rgba(0,0,0,0.015); }

        /* Code / badge */
        .legal-prose code {
          font-family: ${MONO};
          font-size: 12px;
          background: rgba(0,0,0,0.05);
          padding: 2px 6px;
          border-radius: 4px;
          color: ${DARK};
        }

        /* Sezione evidenziata */
        .legal-prose .legal-note {
          background: rgba(11,61,46,0.06);
          border-left: 3px solid #0B3D2E;
          padding: 14px 18px;
          border-radius: 0 8px 8px 0;
          margin: 20px 0;
          font-size: 13px;
        }

        @media (max-width: 640px) {
          .legal-prose { font-size: 13px; }
          .legal-prose h2 { font-size: 20px; margin-top: 32px; }
        }
      `}</style>
    </>
  );
}
