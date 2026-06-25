"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";

function useInView(threshold = 0.1) {
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

// ─── Video Row ────────────────────────────────────────────────────────────────

interface RowProps {
  badge: string;
  title: string;
  desc: string;
  chips?: string[];
  videoSrc: string;
  zoom?: number;
  zoomX?: number;
  playbackRate?: number;
  reverse?: boolean;
}

function VideoRow({ badge, title, desc, chips, videoSrc, zoom = 1, zoomX = 50, playbackRate = 1, reverse }: RowProps) {
  const { ref, visible } = useInView(0.1);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!visible) return;
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = playbackRate;
    v.play().catch(() => {});
  }, [visible, playbackRate]);

  const fadeUp = { opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity .6s ease, transform .6s ease" };
  const fadeUp2 = { opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity .6s .1s ease, transform .6s .1s ease" };

  const textCol = (
    <div style={{ flex: "0 0 38%", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: reverse ? 40 : 0, paddingRight: reverse ? 0 : 40, ...fadeUp }}>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.38)", letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 18, display: "block" }}>
        {badge}
      </span>
      <h3 style={{ fontFamily: SERIF, fontSize: "clamp(24px, 3.2vw, 40px)", fontWeight: 400, letterSpacing: "-1.5px", lineHeight: 1.08, color: "#0D1016", marginBottom: 16 }}>
        {title}
      </h3>
      <p style={{ fontSize: 15, fontWeight: 300, color: "rgba(0,0,0,0.48)", lineHeight: 1.75, maxWidth: 420, marginBottom: chips ? 20 : 0 }}>
        {desc}
      </p>
      {chips && (
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
          {chips.map(c => (
            <span key={c} style={{ fontFamily: MONO, fontSize: 11, padding: "5px 12px", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, color: "rgba(0,0,0,0.45)" }}>{c}</span>
          ))}
        </div>
      )}
    </div>
  );

  const videoCol = (
    <div style={{ flex: "0 0 58%", minWidth: 0, ...fadeUp2 }}>
      <div style={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.09)", overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.08)", background: "#1a1a1a" }}>
        <div style={{ background: "#f3f3f2", borderBottom: "1px solid rgba(0,0,0,0.09)", padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(0,0,0,0.15)" }} />)}
          </div>
          <div style={{ flex: 1, height: 20, borderRadius: 4, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(0,0,0,0.25)" }}>aicomply.it</span>
          </div>
        </div>
        <div style={{ aspectRatio: "16/9", overflow: "hidden" }}>
          <video ref={videoRef} src={videoSrc} muted loop playsInline preload="metadata"
            style={{ width: `${zoom*100}%`, height: `${zoom*100}%`, objectFit: "cover", display: "block", marginLeft: zoom>1 ? `-${(zoom-1)*(zoomX/100)*100}%` : "0", marginTop: zoom>1 ? `-${(zoom-1)*10}%` : "0" }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: "4%" }} className="showcase-row">
      {reverse ? <>{videoCol}{textCol}</> : <>{textCol}{videoCol}</>}
    </div>
  );
}

// ─── Step Strip (dark, 3 columns) ────────────────────────────────────────────

const STEPS = [
  { num: "01", title: "Classifica", sub: "in minuti", desc: "Quattro aree tematiche, poche domande. Il sistema AI viene classificato per livello di rischio e mappato agli articoli applicabili — Annex I, III, tutto incluso.", tags: ["Art. 5 · 6", "Annex III", "GPAI"] },
  { num: "02", title: "Documenta", sub: "automaticamente", desc: "Il dossier tecnico Annex IV si scrive da solo. FRIA e DPIA vengono pre-compilate dai dati già inseriti — nessun copia-incolla tra moduli.", tags: ["Annex IV", "Art. 11", "Art. 27"] },
  { num: "03", title: "Monitora", sub: "senza interruzioni", desc: "Post-Market sorveglia il sistema in produzione. Drift detection e alert automatici per l'autorità notificante secondo Art. 73, già configurati.", tags: ["Art. 72", "Art. 73", "Post-Market"] },
];

function StepStrip() {
  const { ref, visible } = useInView(0.15);
  return (
    <div ref={ref} style={{ background: "#0D1016", padding: "96px 48px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 56 }}>
          Come funziona
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 48 }} className="steps-grid">
          {STEPS.map((s, i) => (
            <div key={s.num}
              style={{ borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 28, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: `opacity .55s ${i*0.12}s ease, transform .55s ${i*0.12}s ease` }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em" }}>{s.num}</span>
                <h3 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 400, color: "#fff", letterSpacing: "-1px", lineHeight: 1 }}>{s.title}</h3>
                <span style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 300, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>{s.sub}</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, marginBottom: 20 }}>{s.desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                {s.tags.map(t => (
                  <span key={t} style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.25)", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3 }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Feature Highlight: Risk Register CSS mockup ──────────────────────────────

const RISKS = [
  { label: "Accesso non autorizzato ai dati personali", level: "ALTO",   art: "Art. 9" },
  { label: "Bias nel dataset di training",              level: "MEDIO",  art: "Art. 10" },
  { label: "Mancata trasparenza verso l'utente",       level: "ALTO",   art: "Art. 13" },
  { label: "Deriva del modello in produzione",         level: "BASSO",  art: "Art. 72" },
  { label: "Documentazione tecnica incompleta",        level: "MEDIO",  art: "Art. 11" },
];

function RiskMockup() {
  return (
    <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "#0a0a0a", overflow: "hidden" }}>
      <div style={{ background: "#111", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />)}
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.2)", marginLeft: 8 }}>Risk Manager — Registro Rischi</span>
      </div>
      <div style={{ padding: "4px 0" }}>
        <div style={{ padding: "8px 14px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Rischio</span>
          <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Livello</span>
          <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Norma</span>
        </div>
        {RISKS.map((r, i) => (
          <div key={i} style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", background: i === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>{r.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, padding: "2px 7px", borderRadius: 3, border: "1px solid", borderColor: r.level === "ALTO" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)", color: r.level === "ALTO" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)" }}>
              {r.level}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{r.art}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.18)" }}>5 rischi • 2 ad alto livello</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.18)", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3, cursor: "pointer" }}>+ Aggiungi rischio</span>
      </div>
    </div>
  );
}

function FeatureHighlight() {
  const { ref, visible } = useInView(0.15);
  return (
    <div ref={ref} style={{ background: "#0D1016", padding: "96px 48px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }} className="highlight-grid">
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(-24px)", transition: "opacity .6s ease, transform .6s ease" }}>
          <RiskMockup />
        </div>
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(24px)", transition: "opacity .6s .12s ease, transform .6s .12s ease" }}>
          <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 20 }}>Risk Manager · Art. 9</p>
          <h3 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 400, color: "#fff", letterSpacing: "-1.5px", lineHeight: 1.08, marginBottom: 20 }}>
            Ogni rischio ha<br />una casa.
          </h3>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 1.8, marginBottom: 28 }}>
            Il Risk Register centralizza tutti i rischi identificati nella FRIA e nella DPIA. Niente fogli Excel, niente duplicazioni — ogni rischio ha proprietario, misure di mitigazione e stato di avanzamento in un unico posto.
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {["Collegato in tempo reale con FRIA e DPIA", "Proprietario e scadenza per ogni azione", "Export firmato per audit ispettivi"].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

const STATS = [
  { value: "< 1 ora", label: "per il fascicolo tecnico Annex IV completo" },
  { value: "8",       label: "moduli connessi, zero duplicazioni di dati" },
  { value: "47+",     label: "articoli EU AI Act coperti automaticamente" },
  { value: "ago. 2026", label: "scadenza EU AI Act — i sistemi ad alto rischio devono essere conformi" },
];

function StatsRow() {
  const { ref, visible } = useInView(0.15);
  return (
    <div ref={ref} style={{ background: "#FAFAF9", padding: "80px 48px", borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 40 }} className="stats-grid">
        {STATS.map((s, i) => (
          <div key={i} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(16px)", transition: `opacity .5s ${i*0.1}s ease, transform .5s ${i*0.1}s ease` }}>
            <div style={{ fontFamily: SERIF, fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 400, color: "#0D1016", letterSpacing: "-2px", lineHeight: 1, marginBottom: 12 }}>
              {s.value}
            </div>
            <div style={{ width: 24, height: 1, background: "rgba(0,0,0,0.2)", marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.42)", lineHeight: 1.6 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROWS data ────────────────────────────────────────────────────────────────

const ROW1: Omit<RowProps, never> = {
  badge: "Triage · Art. 5 · 6 · 51",
  title: "Capisci quali obblighi ti riguardano.",
  desc: "Quattro aree tematiche, poche domande guidate, e AIComply classifica il tuo sistema — rischio inaccettabile, alto, limitato o minimo — mappandolo agli articoli e agli allegati che contano.",
  chips: ["Classificazione 4 livelli", "Mapping Art. 6 + Annex III", "Export PDF", "Storico sessioni"],
  videoSrc: "/videos/triage.mp4",
  reverse: false,
};

const ROW2: Omit<RowProps, never> = {
  badge: "Legal Assistant · 2024/1689",
  title: "Risposte con le fonti, non opinioni.",
  desc: "Fai una domanda sull'AI Act, su ISO 22989 o sulle Guidelines: il Legal Assistant cita il testo esatto, articolo per articolo, con il chunk sorgente sempre verificabile a fianco.",
  chips: ["RAG su EU AI Act", "ISO 22989 + Guidelines", "Chunk sorgente verificabile", "Badge articolo per risposta"],
  videoSrc: "/videos/legal.mp4",
  playbackRate: 1.5,
  reverse: true,
};

const ROW3: Omit<RowProps, never> = {
  badge: "Risk Manager · Art. 27",
  title: "Valutazioni d'impatto che si scrivono da sole.",
  desc: "Risk Register, FRIA e DPIA prendono forma dai dati già raccolti negli altri moduli. AIComply pre-compila le sezioni e tu validi.",
  chips: ["Risk Register", "FRIA + DPIA integrate", "Pre-compilazione automatica", "Export firmato"],
  videoSrc: "/videos/fria.mp4",
  reverse: false,
};

const ROW4: Omit<RowProps, never> = {
  badge: "Registrazione EUDB · Art. 49",
  title: "Pronto per il database UE, senza copia-incolla.",
  desc: "Mappatura dei campi Annex VIII e criteri di eleggibilità pre-compilati dal Triage, da verificare contro il testo consolidato del Regolamento.",
  chips: ["Annex VIII mapping", "Criteri eleggibilità", "Sincronizzato con Triage"],
  videoSrc: "/videos/eudb.mp4",
  reverse: true,
};

const ROW5: Omit<RowProps, never> = {
  badge: "Trust Center · Art. 13 · 50",
  title: "Dimostra la conformità in pubblico.",
  desc: "Pubblica una pagina di trasparenza verificabile: classificazione del rischio, finalità d'uso e pacchetto di conformità esportabile, confermati prima di andare online.",
  chips: ["Pagina pubblica verificabile", "Badge conformità", "Export pacchetto compliance"],
  videoSrc: "/videos/trust.mp4",
  reverse: false,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export default function VideoShowcase() {
  return (
    <section style={{ background: "#ffffff", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
      <style>{`
        @media (max-width: 768px) {
          .showcase-row { flex-direction: column !important; gap: 32px !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .highlight-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>

      {/* Header */}
      <div className="px-12 py-24" style={{ maxWidth: 960, margin: "0 auto" }}>
        <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(0,0,0,0.28)", marginBottom: 14 }}>
          Il prodotto in movimento
        </p>
        <h2 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 400, letterSpacing: "-2px", color: "#0D1016", lineHeight: 1.05 }}>
          Vedi come funziona ogni modulo.
        </h2>
      </div>

      {/* ① Triage video */}
      <div className="px-12 pb-24" style={{ maxWidth: 960, margin: "0 auto" }}>
        <VideoRow {...ROW1} />
      </div>

      {/* ② Step strip — dark */}
      <StepStrip />

      {/* ③ Legal video */}
      <div className="px-12 py-24" style={{ maxWidth: 960, margin: "0 auto" }}>
        <VideoRow {...ROW2} />
      </div>

      {/* ④ Feature highlight — Risk Register mockup */}
      <FeatureHighlight />

      {/* ⑤ FRIA/Risk video */}
      <div className="px-12 py-24" style={{ maxWidth: 960, margin: "0 auto" }}>
        <VideoRow {...ROW3} />
      </div>

      {/* ⑥ Stats row */}
      <StatsRow />

      {/* ⑦ EUDB video */}
      <div className="px-12 py-24" style={{ maxWidth: 960, margin: "0 auto" }}>
        <VideoRow {...ROW4} />
      </div>

      {/* ⑧ Trust video */}
      <div className="px-12 pb-24" style={{ maxWidth: 960, margin: "0 auto" }}>
        <VideoRow {...ROW5} />
      </div>
    </section>
  );
}
