"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

// ─── Scrollspy TOC ────────────────────────────────────────────────────────────
const TOC_ITEMS = [
  { id: "mod-triage",   label: "Triage" },
  { id: "mod-legal",    label: "Legal AI" },
  { id: "mod-risk",     label: "Risk Manager" },
  { id: "mod-eudb",     label: "EUDB" },
  { id: "mod-trust",    label: "Trust Center" },
  { id: "mod-scanner",  label: "Scanner" },
];

function StickyTOC() {
  const [active, setActive] = useState("mod-triage");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320);
      for (let i = TOC_ITEMS.length - 1; i >= 0; i--) {
        const el = document.getElementById(TOC_ITEMS[i].id);
        if (el && el.getBoundingClientRect().top < 160) {
          setActive(TOC_ITEMS[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{
      position: "fixed", top: 57, left: 0, right: 0, zIndex: 40,
      background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(0,0,0,0.07)",
      transition: "opacity .3s ease, transform .3s ease",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(-8px)",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        display: "flex", alignItems: "center", gap: 0,
        padding: "0 24px",
        overflowX: "auto",
      }}>
        {TOC_ITEMS.map((item, i) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 500,
              letterSpacing: "0.04em", padding: "14px 20px",
              color: active === item.id ? "#0D1016" : "rgba(0,0,0,0.30)",
              borderBottom: active === item.id ? "2px solid #0D1016" : "2px solid transparent",
              textDecoration: "none", whiteSpace: "nowrap",
              transition: "color .2s ease, border-color .2s ease",
            }}
          >
            <span style={{ color: "rgba(0,0,0,0.20)", marginRight: 6 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Module section ────────────────────────────────────────────────────────────
interface ModuleProps {
  id: string;
  num: string;
  badge: string;
  title: string;
  desc: string;
  capabilities: string[];
  videoSrc: string;
  videoScale?: number;
  videoPosition?: string;
  zoomX?: number;
  reverse?: boolean;
}

function ModuleSection({
  id, num, badge, title, desc, capabilities,
  videoSrc, videoScale = 1, videoPosition = "center center", zoomX = 50, reverse,
}: ModuleProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const textRef    = useRef<HTMLDivElement>(null);
  const videoBoxRef = useRef<HTMLDivElement>(null);

  const textInView  = useInView(textRef,    { once: true, margin: "-80px" });
  const videoInView = useInView(videoBoxRef, { once: true, margin: "-60px" });

  useEffect(() => {
    if (!videoInView) return;
    videoRef.current?.play().catch(() => {});
  }, [videoInView]);

  return (
    <section
      id={id}
      ref={sectionRef}
      style={{
        borderTop: "1px solid rgba(0,0,0,0.07)",
        padding: "80px 24px 96px",
        position: "relative", overflow: "hidden",
        scrollMarginTop: 96,
      }}
    >
      {/* Giant chapter number — typographic watermark */}
      <div aria-hidden="true" style={{
        position: "absolute",
        top: -20,
        [reverse ? "right" : "left"]: -12,
        fontFamily: SERIF,
        fontSize: "clamp(120px, 16vw, 200px)",
        fontWeight: 300,
        lineHeight: 1,
        color: "rgba(0,0,0,0.04)",
        userSelect: "none",
        pointerEvents: "none",
        letterSpacing: "-8px",
      }}>
        {num}
      </div>

      <div style={{
        maxWidth: 1100, margin: "0 auto",
        display: "flex",
        flexDirection: reverse ? "row-reverse" : "row",
        alignItems: "center",
        gap: "clamp(40px, 6vw, 88px)",
      }}
        className="module-flex"
      >
        {/* ── Text column ── */}
        <div ref={textRef} style={{ flex: "0 0 38%", minWidth: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={textInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{
                fontFamily: MONO, fontSize: 10, fontWeight: 600,
                letterSpacing: "0.12em", color: "rgba(0,0,0,0.28)",
              }}>
                {num}
              </span>
              <span style={{ width: 20, height: 1, background: "rgba(0,0,0,0.15)" }} />
              <span style={{
                fontFamily: MONO, fontSize: 10, fontWeight: 500,
                letterSpacing: "0.07em", textTransform: "uppercase",
                color: "rgba(0,0,0,0.36)",
              }}>
                {badge}
              </span>
            </div>

            <h2 style={{
              fontFamily: SERIF,
              fontSize: "clamp(26px, 3vw, 38px)",
              fontWeight: 400, letterSpacing: "-1.5px",
              lineHeight: 1.1, color: "#0D1016", marginBottom: 20,
            }}>
              {title}
            </h2>

            <p style={{
              fontSize: 15, fontWeight: 300,
              color: "rgba(0,0,0,0.50)", lineHeight: 1.78,
              marginBottom: 28,
            }}>
              {desc}
            </p>

            {/* Capability tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {capabilities.map((cap) => (
                <span key={cap} style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 500,
                  color: "rgba(0,0,0,0.40)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 4, padding: "4px 10px",
                  letterSpacing: "0.04em",
                }}>
                  {cap}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Video column ── */}
        <div ref={videoBoxRef} style={{ flex: "1 1 0", minWidth: 0 }}>
          <motion.div
            initial={{ opacity: 0, clipPath: "inset(0 100% 0 0 round 14px)" }}
            animate={videoInView
              ? { opacity: 1, clipPath: "inset(0 0% 0 0 round 14px)" }
              : {}}
            transition={{ duration: 0.80, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Device frame */}
            <div style={{
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.09)",
              overflow: "hidden",
              background: "#111",
              boxShadow: "0 8px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.07)",
            }}>
              {/* Browser chrome bar */}
              <div style={{
                background: "#f3f3f2",
                borderBottom: "1px solid rgba(0,0,0,0.09)",
                padding: "9px 14px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {["#E5534B","#DCA228","#57A64E"].map((c, i) => (
                    <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(0,0,0,0.15)" }} />
                  ))}
                </div>
                <div style={{
                  flex: 1, height: 20, borderRadius: 4,
                  background: "rgba(0,0,0,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(0,0,0,0.25)" }}>
                    aicomply.it
                  </span>
                </div>
              </div>
              {/* Video */}
              <div style={{ aspectRatio: "16/9", overflow: "hidden", background: "#1a1a1a", position: "relative" }}>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  muted loop playsInline preload="metadata"
                  style={{
                    width: `${videoScale * 100}%`,
                    height: `${videoScale * 100}%`,
                    objectFit: "cover",
                    display: "block",
                    marginLeft: videoScale > 1 ? `-${(videoScale - 1) * (zoomX / 100) * 100}%` : "0",
                    marginTop: videoScale > 1 ? `-${(videoScale - 1) * 10}%` : "0",
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Conversion Block ─────────────────────────────────────────────────────────

interface Metric { val: string; label: string; note?: string; }

interface ConversionData {
  metrics: [Metric, Metric, Metric];
  before: string;
  after:  string;
  articles: string[];
  ctaLabel: string;
  ctaHref?: string;
}

function ConversionBlock({ data }: { data: ConversionData }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div
      ref={ref}
      style={{
        background: "#F7F7F6",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        padding: "40px 24px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 1100, margin: "0 auto" }}
      >
        {/* ── Top row: 3 metrics + articles + CTA ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
          gap: "0",
          alignItems: "stretch",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.09)",
          background: "#ffffff",
          overflow: "hidden",
        }} className="conv-grid">
          {/* Metric cells */}
          {data.metrics.map((m, i) => (
            <div
              key={i}
              style={{
                padding: "22px 24px",
                borderRight: "1px solid rgba(0,0,0,0.07)",
              }}
            >
              <div style={{
                fontFamily: SERIF,
                fontSize: "clamp(28px, 3vw, 36px)",
                fontWeight: 400,
                letterSpacing: "-1.5px",
                color: "#0D1016",
                lineHeight: 1,
                marginBottom: 6,
              }}>
                {m.val}
              </div>
              <div style={{
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(0,0,0,0.45)",
                lineHeight: 1.4,
                marginBottom: m.note ? 4 : 0,
              }}>
                {m.label}
              </div>
              {m.note && (
                <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(0,0,0,0.28)", lineHeight: 1.3 }}>
                  {m.note}
                </div>
              )}
            </div>
          ))}

          {/* Articles covered */}
          <div style={{
            padding: "22px 24px",
            borderRight: "1px solid rgba(0,0,0,0.07)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
            minWidth: 140,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.28)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              Copre
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {data.articles.map(a => (
                <span key={a} style={{
                  fontFamily: MONO, fontSize: 10,
                  color: "#0B3D2E",
                  background: "rgba(11,61,46,0.07)",
                  border: "1px solid rgba(11,61,46,0.15)",
                  borderRadius: 4, padding: "2px 7px",
                  whiteSpace: "nowrap",
                }}>
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{
            padding: "22px 28px",
            display: "flex",
            alignItems: "center",
            background: "#0D1016",
          }}>
            <Link
              href={data.ctaHref ?? "/register"}
              style={{
                fontFamily: MONO, fontSize: 12, fontWeight: 500,
                color: "#ffffff",
                textDecoration: "none",
                whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              {data.ctaLabel}
              <span style={{ fontSize: 14, lineHeight: 1 }}>→</span>
            </Link>
          </div>
        </div>

        {/* ── Before / After strip ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          marginTop: 12,
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.08)",
          overflow: "hidden",
        }} className="conv-contrast">
          {/* Before */}
          <div style={{
            padding: "16px 22px",
            background: "rgba(0,0,0,0.02)",
            borderRight: "1px solid rgba(0,0,0,0.07)",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 600,
              color: "rgba(0,0,0,0.25)",
              background: "rgba(0,0,0,0.06)",
              padding: "2px 8px", borderRadius: 4, flexShrink: 0, marginTop: 1,
            }}>
              SENZA
            </span>
            <span style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", lineHeight: 1.6, textDecoration: "line-through", textDecorationColor: "rgba(0,0,0,0.18)" }}>
              {data.before}
            </span>
          </div>
          {/* After */}
          <div style={{
            padding: "16px 22px",
            background: "#ffffff",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 600,
              color: "#0B3D2E",
              background: "rgba(11,61,46,0.08)",
              padding: "2px 8px", borderRadius: 4, flexShrink: 0, marginTop: 1,
            }}>
              CON
            </span>
            <span style={{ fontSize: 13, color: "rgba(0,0,0,0.68)", lineHeight: 1.6 }}>
              {data.after}
            </span>
          </div>
        </div>
      </motion.div>

      <style>{`
        @media (max-width: 860px) {
          .conv-grid { grid-template-columns: 1fr 1fr !important; }
          .conv-contrast { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .conv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Conversion data per module ────────────────────────────────────────────────

const CONVERSION: Record<string, ConversionData> = {
  "mod-triage": {
    metrics: [
      { val: "4 min",  label: "tempo medio di classificazione", note: "vs 3–6 sett. con consulenza" },
      { val: "47+",    label: "articoli mappati in automatico" },
      { val: "€30M",   label: "sanzione max evitabile", note: "Art. 5 — sistemi vietati" },
    ],
    before: "3–6 settimane di analisi legale esterna, costo €3.000–€12.000 per parere, nessuna certezza sul risultato.",
    after:  "Classificazione in 4 minuti, mapping completo agli allegati dell'AI Act, export PDF firmato pronto per l'audit.",
    articles: ["Art. 5", "Art. 6", "Art. 51", "Annex III"],
    ctaLabel: "Prova il Triage gratis",
  },
  "mod-legal": {
    metrics: [
      { val: "8",      label: "fonti normative indicizzate", note: "EU AI Act, ISO 22989, EDPB…" },
      { val: "< 3s",   label: "risposta con citazione precisa" },
      { val: "100%",   label: "risposte con chunk sorgente", note: "nessuna risposta senza fonte" },
    ],
    before: "Ora di consulenza legale a €250–€350, testo normativo non verificabile, rischio di interpretazioni non aggiornate.",
    after:  "Risposta istantanea con numero di articolo esatto e chunk verificabile. Nessuna allucinazione senza fonte.",
    articles: ["EU AI Act", "ISO 22989", "EDPB GL", "Cons. 47"],
    ctaLabel: "Prova il Legal Assistant",
  },
  "mod-risk": {
    metrics: [
      { val: "3-in-1",  label: "FRIA + DPIA + Risk Register unificati" },
      { val: "70%",     label: "sezioni pre-compilate dall'AI", note: "tu validi, non scrivi da zero" },
      { val: "SHA-256", label: "export firmato con hash", note: "immodificabile per audit" },
    ],
    before: "40+ ore di lavoro manuale per FRIA, DPIA e Risk Register separati, dati duplicati, nessuna firma digitale.",
    after:  "Un unico workspace: FRIA, DPIA e Risk Register si alimentano a vicenda. Export firmato in 1 clic.",
    articles: ["Art. 9", "Art. 27", "Art. 35", "WP29"],
    ctaLabel: "Avvia il Risk Manager",
  },
  "mod-eudb": {
    metrics: [
      { val: "Aug 2026", label: "scadenza obbligatoria EUDB", note: "sanzione fino al 3% fatturato" },
      { val: "Annex VIII", label: "campi pre-mappati dal Triage" },
      { val: "0",         label: "copia-incolla necessari", note: "dati sincronizzati dal Triage" },
    ],
    before: "Form EU lungo e complesso, dati da inserire a mano, rischio di errori nei campi obbligatori, deadline che si avvicina.",
    after:  "Campi Annex VIII già compilati dai dati del Triage. Verifica, firma e invia. Deadline rispettata senza stress.",
    articles: ["Art. 49", "Annex VIII", "Art. 6", "Rec. 85"],
    ctaLabel: "Registra il tuo sistema",
  },
  "mod-trust": {
    metrics: [
      { val: "< 5 min", label: "per pubblicare la pagina", note: "da zero a live" },
      { val: "URL",     label: "pubblica verificabile da chiunque" },
      { val: "Badge",   label: "embeddabile su sito e app", note: "con link alla pagina" },
    ],
    before: "Nessuna prova pubblica di conformità, clienti e partner non hanno modo di verificare il rispetto dell'AI Act.",
    after:  "Pagina pubblica con classificazione, articoli coperti e pacchetto compliance scaricabile. Fiducia misurabile.",
    articles: ["Art. 13", "Art. 50", "Art. 27", "Rec. 66"],
    ctaLabel: "Crea il tuo Trust Center",
  },
};

// ─── Scanner banner ───────────────────────────────────────────────────────────
function ScannerBanner() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!inView) return;
    videoRef.current?.play().catch(() => {});
  }, [inView]);

  return (
    <section id="mod-scanner" style={{
      borderTop: "1px solid rgba(0,0,0,0.07)",
      padding: "80px 24px",
      scrollMarginTop: 96,
    }}>
      <div ref={ref} style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "#0D1016", borderRadius: 16,
            padding: "40px 48px",
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 32,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.30)", letterSpacing: "0.12em" }}>06</span>
              <span style={{ width: 20, height: 1, background: "rgba(255,255,255,0.15)" }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                SCANNER · ART. 6
              </span>
            </div>
            <h2 style={{
              fontFamily: SERIF, fontSize: "clamp(22px, 2.5vw, 32px)",
              fontWeight: 400, letterSpacing: "-1px", color: "#ffffff",
              marginBottom: 12, lineHeight: 1.15,
            }}>
              Analisi automatica del codice.<br />Zero configurazione.
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 1.65, maxWidth: 440 }}>
              AST analysis in tempo reale: ogni componente AI mappato agli articoli dell&apos;AI Act. Scansione pubblica, nessuna registrazione.
            </p>
          </div>
          <Link href="/scanner" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            fontFamily: MONO, fontSize: 12, fontWeight: 500,
            color: "#0D1016", background: "#ffffff",
            borderRadius: 8, padding: "13px 28px",
            textDecoration: "none", whiteSpace: "nowrap",
            transition: "opacity .18s ease", flexShrink: 0,
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Prova lo Scanner →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Coming soon ──────────────────────────────────────────────────────────────
function ComingSoon() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const ITEMS = [
    { label: "Qualità Dati", art: "Art. 10" },
    { label: "LogVault",     art: "Art. 12" },
    { label: "Post-Market",  art: "Art. 72–73" },
    { label: "Deployer Dashboard", art: "Art. 26" },
  ];

  return (
    <section style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "64px 24px" }}>
      <div ref={ref} style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: "1.5px",
            textTransform: "uppercase", color: "rgba(0,0,0,0.25)", marginBottom: 24 }}>
            In arrivo
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {ITEMS.map((item, i) => (
              <motion.span
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                style={{
                  fontFamily: MONO, fontSize: 12, fontWeight: 400,
                  color: "rgba(0,0,0,0.40)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 6, padding: "8px 16px",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                {item.label}
                <span style={{ color: "rgba(0,0,0,0.22)", fontSize: 10 }}>{item.art}</span>
              </motion.span>
            ))}
          </div>
          <Link href="/pricing" style={{
            fontFamily: MONO, fontSize: 12, fontWeight: 500,
            color: "#0D1016", textDecoration: "none",
            borderBottom: "1px solid rgba(0,0,0,0.25)",
            paddingBottom: 2,
          }}>
            Vedi i piani →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Modules data ─────────────────────────────────────────────────────────────
const MODULES: ModuleProps[] = [
  {
    id: "mod-triage",
    num: "01",
    badge: "Triage · Art. 5 · 6 · 51",
    title: "Capisci quali obblighi ti riguardano.",
    desc: "Quattro aree tematiche, poche domande guidate, e AIComply classifica il tuo sistema — rischio inaccettabile, alto, limitato o minimo — mappandolo agli articoli e agli allegati che contano.",
    capabilities: ["Classificazione 4 livelli", "Mapping Art. 6 + Annex III", "Export PDF", "Storico sessioni"],
    videoSrc: "/videos/triage.mp4",
    reverse: false,
  },
  {
    id: "mod-legal",
    num: "02",
    badge: "Legal Assistant · 2024/1689",
    title: "Risposte con le fonti, non opinioni.",
    desc: "Fai una domanda sull'AI Act, su ISO 22989 o sulle Guidelines: il Legal Assistant cita il testo esatto, articolo per articolo, con il chunk sorgente sempre verificabile a fianco.",
    capabilities: ["RAG su EU AI Act", "ISO 22989 + Guidelines", "Chunk sorgente verificabile", "Badge articolo per risposta"],
    videoSrc: "/videos/legal.mp4",
    videoScale: 1.0,
    videoPosition: "center center",
    reverse: true,
  },
  {
    id: "mod-risk",
    num: "03",
    badge: "Risk Manager · Art. 9 · 27 · 35",
    title: "Valutazioni d'impatto che si scrivono da sole.",
    desc: "Risk Register, FRIA e DPIA prendono forma dai dati già raccolti negli altri moduli. AIComply pre-compila le sezioni e tu validi.",
    capabilities: ["Risk Register", "FRIA + DPIA integrate", "Pre-compilazione automatica", "Export firmato"],
    videoSrc: "/videos/fria.mp4",
    reverse: false,
  },
  {
    id: "mod-eudb",
    num: "04",
    badge: "Registrazione EUDB · Art. 49",
    title: "Pronto per il database UE, senza copia-incolla.",
    desc: "Mappatura dei campi Annex VIII e criteri di eleggibilità pre-compilati dal Triage, da verificare contro il testo consolidato del Regolamento.",
    capabilities: ["Annex VIII mapping", "Criteri eleggibilità", "Pre-fill da Triage", "Testo consolidato"],
    videoSrc: "/videos/eudb.mp4",
    reverse: true,
  },
  {
    id: "mod-trust",
    num: "05",
    badge: "Trust Center · Art. 13 · 50",
    title: "Dimostra la conformità in pubblico.",
    desc: "Pubblica una pagina di trasparenza verificabile: classificazione del rischio, finalità d'uso e pacchetto di conformità esportabile, confermati prima di andare online.",
    capabilities: ["Pagina pubblica verificabile", "Classificazione rischio", "Export pacchetto conformità", "Controllo pre-pubblicazione"],
    videoSrc: "/videos/trust.mp4",
    reverse: false,
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 800px) {
          .module-flex { flex-direction: column !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <Nav />
      <StickyTOC />

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "100px 24px 72px" }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p style={{
            fontFamily: MONO, fontSize: 11, fontWeight: 500,
            letterSpacing: "1.5px", textTransform: "uppercase",
            color: "rgba(0,0,0,0.25)", marginBottom: 20,
          }}>
            Il prodotto
          </p>
          <h1 style={{
            fontFamily: SERIF,
            fontSize: "clamp(40px, 6vw, 72px)",
            fontWeight: 400, letterSpacing: "-3px",
            lineHeight: 1.02, color: "#0D1016",
            marginBottom: 24, maxWidth: 700,
          }}>
            Ogni obbligo EU AI Act.<br />Uno strumento.
          </h1>
          <p style={{
            fontSize: 16, fontWeight: 300,
            color: "rgba(0,0,0,0.45)", lineHeight: 1.78,
            maxWidth: 480,
          }}>
            Sei moduli integrati che coprono l&apos;intero ciclo di vita della conformità — dalla classificazione del rischio alla pagina di trasparenza pubblica.
          </p>
        </motion.div>
      </section>

      {/* ── Module sections + conversion blocks ── */}
      {MODULES.map((mod) => (
        <div key={mod.id}>
          <ModuleSection {...mod} />
          <ConversionBlock data={CONVERSION[mod.id]} />
        </div>
      ))}

      {/* ── Scanner ── */}
      <ScannerBanner />

      {/* ── Coming soon ── */}
      <ComingSoon />

      {/* ── Final CTA ── */}
      <section style={{
        borderTop: "1px solid rgba(0,0,0,0.07)",
        padding: "80px 24px",
        textAlign: "center",
      }}>
        <p style={{
          fontFamily: SERIF, fontSize: "clamp(22px, 3vw, 36px)",
          fontWeight: 400, letterSpacing: "-1.2px",
          color: "#0D1016", marginBottom: 12,
        }}>
          Pronto a iniziare?
        </p>
        <p style={{ fontSize: 15, color: "rgba(0,0,0,0.40)", marginBottom: 28 }}>
          Nessuna carta di credito. Setup in 5 minuti.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" style={{
            display: "inline-block", fontFamily: MONO, fontSize: 12, fontWeight: 500,
            color: "#ffffff", background: "#0D1016",
            borderRadius: 8, padding: "13px 32px",
            textDecoration: "none",
          }}>
            Inizia gratis →
          </Link>
          <Link href="/pricing" style={{
            display: "inline-block", fontFamily: MONO, fontSize: 12, fontWeight: 500,
            color: "#0D1016", background: "transparent",
            border: "1px solid rgba(0,0,0,0.14)",
            borderRadius: 8, padding: "13px 28px",
            textDecoration: "none",
          }}>
            Vedi i piani
          </Link>
        </div>
      </section>
    </div>
  );
}
