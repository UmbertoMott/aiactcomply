import Link from "next/link";

const SERIF = "Georgia, 'Times New Roman', serif";

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

  // Pillola stile Hero: su fondo scuro → piena bianca ("Attiva l'assistenza");
  // su fondo chiaro → contornata scura ("Scopri i piani" adattato cromaticamente).
  const btnClass = dark
    ? "transition-opacity hover:opacity-85"
    : "transition-colors hover:bg-black/[0.04]";
  const btnStyle: React.CSSProperties = dark
    ? { background: "#ffffff", color: "#0D1016", border: "1.5px solid #ffffff" }
    : { background: "transparent", color: "#0D1016", border: "1.5px solid rgba(0,0,0,0.22)" };

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
          className={`flex-shrink-0 inline-flex items-center justify-center text-[14px] font-medium rounded-full px-8 py-3.5 ${btnClass}`}
          style={{ ...btnStyle, letterSpacing: "-0.2px", textDecoration: "none" }}
        >
          Prenota una demo
        </Link>
      </div>
    </section>
  );
}
