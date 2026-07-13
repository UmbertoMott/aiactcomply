import Link from "next/link";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

type Props = {
  theme?: "light" | "dark";
  title?: string;
  subtitle?: string;
};

/**
 * Banda CTA riutilizzabile "Prenota una demo".
 * Inserita ogni ~3 sezioni nelle pagine pubbliche. Alterna theme light/dark
 * per staccare visivamente dalle sezioni adiacenti.
 */
export default function BookDemoBanner({
  theme = "light",
  title = "Vuoi vederlo sul tuo sistema AI?",
  subtitle = "Prenota una demo di 30 minuti con l'avvocato. Nessun impegno.",
}: Props) {
  const dark = theme === "dark";

  const bg      = dark ? "#0D1016" : "#fafaf9";
  const titleC  = dark ? "#ffffff" : "#0D1016";
  const subC    = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const border  = dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)";
  const btnBg   = dark ? "#ffffff" : "#0D1016";
  const btnC    = dark ? "#0D1016" : "#ffffff";

  return (
    <section style={{
      background: bg,
      borderTop: border,
      borderBottom: border,
      padding: "clamp(40px, 6vw, 64px) 24px",
    }}>
      <div style={{
        maxWidth: 1000,
        margin: "0 auto",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "24px 40px",
      }}>
        <div style={{ maxWidth: 560 }}>
          <h2 style={{
            fontFamily: SERIF,
            fontSize: "clamp(24px, 3vw, 34px)",
            fontWeight: 400,
            letterSpacing: "-1px",
            lineHeight: 1.1,
            color: titleC,
            marginBottom: 10,
          }}>
            {title}
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: subC }}>
            {subtitle}
          </p>
        </div>

        <Link
          href="/prenota-demo"
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            fontFamily: MONO,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: btnC,
            background: btnBg,
            padding: "13px 26px",
            borderRadius: 999,
            textDecoration: "none",
            transition: "opacity 0.15s ease",
          }}
        >
          Prenota una demo
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke={btnC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
