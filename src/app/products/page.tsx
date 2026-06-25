"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";

function useInView(threshold = 0.12) {
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

interface CardProps {
  badge: string;
  title: string;
  desc: string;
  videoSrc?: string;
  href?: string;
  index: number;
  highlight?: boolean;
}

function ProductCard({ badge, title, desc, videoSrc, href, index, highlight }: CardProps) {
  const { ref, visible } = useInView(0.08);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!visible) return;
    videoRef.current?.play().catch(() => {});
  }, [visible]);

  const delay = (index % 2) * 0.08;

  const card = (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="product-card"
      style={{
        background: "#ffffff",
        border: `1px solid ${hovered ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.09)"}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: `opacity .55s ${delay}s ease, transform .55s ${delay}s ease, box-shadow .22s ease, border-color .22s ease`,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
        boxShadow: hovered
          ? "0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)"
          : "0 1px 6px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column" as const,
        cursor: href ? "pointer" : "default",
      }}
    >
      {/* Video / placeholder */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          background: "#111",
          overflow: "hidden",
        }}
      >
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            preload="metadata"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform .35s ease",
              transform: hovered ? "scale(1.03)" : "scale(1)",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f5f5f5",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
              Coming soon
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px 24px" }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 500,
            color: "rgba(0,0,0,0.36)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            display: "block",
            marginBottom: 10,
          }}
        >
          {badge}
        </span>
        <h3
          style={{
            fontFamily: SERIF,
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: "-0.6px",
            color: "#0D1016",
            marginBottom: 10,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 13.5,
            fontWeight: 300,
            color: "rgba(0,0,0,0.50)",
            lineHeight: 1.65,
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );

  if (href) return <Link href={href} style={{ textDecoration: "none" }}>{card}</Link>;
  return card;
}

// "E altro ancora" card
function ComingSoonCard({ index }: { index: number }) {
  const { ref, visible } = useInView(0.08);
  const delay = (index % 2) * 0.08;

  const ITEMS = [
    { label: "Qualità Dati", art: "Art. 10" },
    { label: "LogVault", art: "Art. 12" },
    { label: "Post-Market", art: "Art. 72–73" },
    { label: "Deployer Dashboard", art: "Art. 26" },
  ];

  return (
    <div
      ref={ref}
      className="product-card"
      style={{
        background: "#FAFAF9",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 12,
        padding: "28px 28px 32px",
        display: "flex",
        flexDirection: "column" as const,
        transition: `opacity .55s ${delay}s ease, transform .55s ${delay}s ease`,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
        gridColumn: "span 2",
      }}
    >
      <p
        style={{
          fontFamily: MONO,
          fontSize: 10,
          fontWeight: 500,
          color: "rgba(0,0,0,0.32)",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          marginBottom: 14,
        }}
      >
        In arrivo
      </p>
      <h3
        style={{
          fontFamily: SERIF,
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: "-0.6px",
          color: "#0D1016",
          marginBottom: 18,
          lineHeight: 1.2,
        }}
      >
        E molto altro ancora.
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, marginBottom: 28 }}>
        {ITEMS.map((item) => (
          <span
            key={item.label}
            style={{
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 400,
              color: "rgba(0,0,0,0.55)",
              background: "rgba(0,0,0,0.05)",
              borderRadius: 4,
              padding: "4px 10px",
              letterSpacing: "0.03em",
            }}
          >
            {item.label} <span style={{ opacity: 0.5 }}>{item.art}</span>
          </span>
        ))}
      </div>
      <div>
        <Link
          href="/pricing"
          style={{
            display: "inline-block",
            background: "#0D1016",
            color: "#fff",
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            padding: "10px 22px",
            borderRadius: 6,
            textDecoration: "none",
            transition: "opacity .18s ease",
          }}
        >
          Vedi i piani →
        </Link>
      </div>
    </div>
  );
}

const CARDS: Omit<CardProps, "index">[] = [
  {
    badge: "TRIAGE · ART. 5 · 6 · 51",
    title: "Analisi rapida di conformità",
    desc: "Quattro aree tematiche per capire, in poche domande, quali obblighi si applicano al tuo sistema AI.",
    videoSrc: "/videos/triage.mp4",
    href: "/dashboard/triage",
  },
  {
    badge: "PRATICHE VIETATE · ART. 5",
    title: "Rilevamento del rischio inaccettabile",
    desc: "Identificazione biometrica in tempo reale, riconoscimento delle emozioni, social scoring: segnalati subito.",
    videoSrc: "/videos/prohibited.mp4",
    href: "/dashboard/tools/prohibited",
  },
  {
    badge: "LEGAL ASSISTANT · 2024/1689",
    title: "Risposte con fonti citate",
    desc: "Domande sull'AI Act, ISO 22989 e Guidelines, con la fonte esatta a fianco — articolo, comma e chunk sorgente.",
    videoSrc: "/videos/legal.mp4",
    href: "/dashboard/tools/legal-assistant",
  },
  {
    badge: "RISK MANAGER · ART. 9 · 27 · 35",
    title: "Risk Register, FRIA & DPIA",
    desc: "Valutazioni d'impatto pre-compilate dai dati degli altri moduli. Tu validi, AIComply documenta.",
    videoSrc: "/videos/fria.mp4",
    href: "/dashboard/risk",
  },
  {
    badge: "REGISTRAZIONE EUDB · ART. 49",
    title: "Wizard per il database UE",
    desc: "Campi Annex VIII e criteri di eleggibilità pre-compilati dal Triage, da verificare contro il testo consolidato.",
    videoSrc: "/videos/eudb.mp4",
    href: "/dashboard/tools/eudb",
  },
  {
    badge: "TRUST CENTER · ART. 13 · 50",
    title: "Pagina pubblica di conformità",
    desc: "Classificazione del rischio, finalità d'uso e pacchetto di conformità esportabile, confermati prima della pubblicazione.",
    videoSrc: "/videos/trust.mp4",
    href: "/dashboard/trust",
  },
  {
    badge: "SCANNER · ART. 6",
    title: "AI Classifier",
    desc: "Analisi automatica del codice: mappa ogni componente AI agli articoli dell'AI Act. Zero configurazione manuale.",
    href: "/scanner",
    videoSrc: "/videos/scanner.mp4",
  },
];

export default function ProductsPage() {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 768px) {
          .products-grid { grid-template-columns: 1fr !important; }
          .product-card[style*="span 2"] { grid-column: span 1 !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .product-card { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>
      <Nav />
      <main style={{ paddingTop: 96 }}>
        {/* Header */}
        <div
          className="px-12"
          style={{
            maxWidth: 720,
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
            Il prodotto
          </p>
          <h1
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 400,
              letterSpacing: "-2.5px",
              lineHeight: 1.04,
              color: "#0D1016",
              marginBottom: 24,
            }}
          >
            Ogni modulo, un obbligo coperto.
          </h1>
          <p
            style={{
              fontSize: 16,
              fontWeight: 300,
              color: "rgba(0,0,0,0.48)",
              lineHeight: 1.75,
              maxWidth: 500,
              margin: "0 auto",
            }}
          >
            AIComply copre l'intero ciclo di vita della conformità AI Act — dalla classificazione del rischio alla pubblicazione della pagina di trasparenza.
          </p>
        </div>

        {/* Grid */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 24px 80px",
          }}
        >
          <div
            className="products-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 20,
            }}
          >
            {CARDS.map((card, i) => (
              <ProductCard key={card.badge} {...card} index={i} />
            ))}
            <ComingSoonCard index={CARDS.length} />
          </div>
        </div>
      </main>
    </div>
  );
}
