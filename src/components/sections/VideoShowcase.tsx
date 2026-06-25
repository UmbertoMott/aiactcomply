"use client";

import { useEffect, useRef, useState } from "react";

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

interface RowProps {
  badge: string;
  title: string;
  desc: string;
  videoSrc: string;
  zoom?: number;
  zoomX?: number;
  reverse?: boolean;
  delay: number;
}

function VideoRow({ badge, title, desc, videoSrc, zoom = 1, zoomX = 50, reverse, delay }: RowProps) {
  const { ref, visible } = useInView(0.1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!visible) return;
    videoRef.current?.play().catch(() => {});
  }, [visible]);

  const base = `opacity .65s ${delay}s ease, transform .65s ${delay}s ease`;
  const base2 = `opacity .65s ${delay + 0.08}s ease, transform .65s ${delay + 0.08}s ease`;

  const textCol = (
    <div
      className="showcase-col"
      style={{
        flex: "1 1 0",
        minWidth: 0,
        display: "flex",
        flexDirection: "column" as const,
        justifyContent: "center",
        paddingLeft: reverse ? 56 : 0,
        paddingRight: reverse ? 0 : 56,
        transition: base,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 500,
          color: "rgba(0,0,0,0.38)",
          letterSpacing: "0.07em",
          textTransform: "uppercase" as const,
          marginBottom: 18,
          display: "block",
        }}
      >
        {badge}
      </span>
      <h3
        style={{
          fontFamily: SERIF,
          fontSize: "clamp(24px, 3.2vw, 40px)",
          fontWeight: 400,
          letterSpacing: "-1.5px",
          lineHeight: 1.08,
          color: "#0D1016",
          marginBottom: 20,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 15,
          fontWeight: 300,
          color: "rgba(0,0,0,0.48)",
          lineHeight: 1.75,
          maxWidth: 420,
        }}
      >
        {desc}
      </p>
    </div>
  );

  const videoCol = (
    <div
      className="showcase-col"
      style={{
        flex: "1 1 0",
        minWidth: 0,
        transition: base2,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
      }}
    >
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.09)",
          overflow: "hidden",
          boxShadow: "0 2px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05)",
          background: "#1a1a1a",
          aspectRatio: "16 / 9",
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          loop
          playsInline
          preload="metadata"
          style={{
            width: `${zoom * 100}%`,
            height: `${zoom * 100}%`,
            objectFit: "cover",
            display: "block",
            marginLeft: zoom > 1 ? `-${(zoom - 1) * (zoomX / 100) * 100}%` : "0",
            marginTop: zoom > 1 ? `-${(zoom - 1) * 10}%` : "0",
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      className="showcase-row"
      style={{ display: "flex", alignItems: "center" }}
    >
      {reverse ? <>{videoCol}{textCol}</> : <>{textCol}{videoCol}</>}
    </div>
  );
}

const ROWS: Omit<RowProps, "delay">[] = [
  {
    badge: "Triage · Art. 5 · 6 · 51",
    title: "Capisci quali obblighi ti riguardano.",
    desc: "Quattro aree tematiche, poche domande guidate, e AIComply classifica il tuo sistema — rischio inaccettabile, alto, limitato o minimo — mappandolo agli articoli e agli allegati che contano.",
    videoSrc: "/videos/triage.mp4",
    reverse: false,
  },
  {
    badge: "Legal Assistant · 2024/1689",
    title: "Risposte con le fonti, non opinioni.",
    desc: "Fai una domanda sull'AI Act, su ISO 22989 o sulle Guidelines: il Legal Assistant cita il testo esatto, articolo per articolo, con il chunk sorgente sempre verificabile a fianco.",
    videoSrc: "/videos/legal.mp4",
    zoom: 1.0,
    
    reverse: true,
  },
  {
    badge: "Risk Manager · Art. 27",
    title: "Valutazioni d'impatto che si scrivono da sole.",
    desc: "Risk Register, FRIA e DPIA prendono forma dai dati già raccolti negli altri moduli. AIComply pre-compila le sezioni e tu validi.",
    videoSrc: "/videos/fria.mp4",
    reverse: false,
  },
  {
    badge: "Registrazione EUDB · Art. 49",
    title: "Pronto per il database UE, senza copia-incolla.",
    desc: "Mappatura dei campi Annex VIII e criteri di eleggibilità pre-compilati dal Triage, da verificare contro il testo consolidato del Regolamento.",
    videoSrc: "/videos/eudb.mp4",
    reverse: true,
  },
  {
    badge: "Trust Center · Art. 13 · 50",
    title: "Dimostra la conformità in pubblico.",
    desc: "Pubblica una pagina di trasparenza verificabile: classificazione del rischio, finalità d'uso e pacchetto di conformità esportabile, confermati prima di andare online.",
    videoSrc: "/videos/trust.mp4",
    reverse: false,
  },
];

export default function VideoShowcase() {
  return (
    <section
      className="px-12 py-24"
      style={{ background: "#ffffff", borderTop: "1px solid rgba(0,0,0,0.07)" }}
    >
      <style>{`
        @media (max-width: 768px) {
          .showcase-row { flex-direction: column !important; gap: 32px !important; }
          .showcase-col { padding-left: 0 !important; padding-right: 0 !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .showcase-col { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto">
        <p
          style={{
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.28)",
            marginBottom: 14,
          }}
        >
          Il prodotto in movimento
        </p>
        <h2
          style={{
            fontFamily: SERIF,
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 400,
            letterSpacing: "-2px",
            color: "#0D1016",
            marginBottom: 72,
            lineHeight: 1.05,
          }}
        >
          Vedi come funziona ogni modulo.
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 96 }}>
          {ROWS.map((row, i) => (
            <VideoRow key={row.badge} {...row} delay={0} zoom={row.zoom} />
          ))}
        </div>
      </div>
    </section>
  );
}
