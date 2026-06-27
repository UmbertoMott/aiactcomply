"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";
const CYCLE_MS = 2800;

const GREEN = "#1D3B2C";
const RUST  = "#7A2F1C";

const modules = [
  { art: "Art. 6",  num: "6",  name: "AI Classifier",  color: GREEN, desc: "Classificazione rischio automatica secondo gli allegati EU AI Act. Mappa il sistema agli articoli applicabili e genera le prime azioni da intraprendere in pochi minuti." },
  { art: "Art. 9",  num: "9",  name: "Risk Manager",   color: RUST,  desc: "Risk register, gap analysis e copertura Art. 9. Ogni rischio tracciato con misure di mitigazione, probabilità di impatto e responsabili assegnati." },
  { art: "Art. 11", num: "11", name: "Documentazione", color: GREEN, desc: "Fascicolo tecnico Annex IV generato automaticamente. FRIA e DPIA pre-compilate dai dati già inseriti — nessun copia-incolla tra moduli." },
  { art: "Art. 10", num: "10", name: "Data Audit",     color: RUST,  desc: "Qualità dati, bias detection e data lineage traceability. Metriche di conformità in tempo reale su dataset di training e inferenza." },
  { art: "Art. 12", num: "12", name: "LogVault",       color: GREEN, desc: "Logging hash-chained e audit trail immutabile. Ogni operazione firmata crittograficamente e verificabile dagli ispettori dell'autorità di vigilanza." },
  { art: "Art. 27", num: "27", name: "FRIA",           color: RUST,  desc: "Fundamental Rights Impact Assessment guidato passo-passo. Sincronizzato in tempo reale con Risk Manager e DPIA — i dati comuni non si inseriscono due volte." },
  { art: "Art. 72", num: "72", name: "Post-Market",    color: RUST,  desc: "Monitoraggio continuo con drift detection automatica. Soglie pre-configurate inviano alert all'autorità notificante secondo Art. 73 senza intervento manuale." },
  { art: "Art. 50", num: "50", name: "Scanner",        color: GREEN, desc: "Verifica trasparenza AI gratuita e anonima. Report completo in 30 secondi con valutazione Art. 50: nessuna registrazione richiesta." },
];

// diagonal cascade stagger: top-left → bottom-right wave
function diagonalDelay(i: number, cols = 4) {
  const row = Math.floor(i / cols);
  const col = i % cols;
  return (row + col) * 0.065;
}

export default function PlatformSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);

  // Scroll-in detection
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setSectionVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-cycle
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setActiveIdx(i => (i + 1) % modules.length);
      setProgressKey(k => k + 1);
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [paused]);

  // Resume progress bar on unpause
  useEffect(() => {
    if (!paused) setProgressKey(k => k + 1);
  }, [paused]);

  const active = modules[activeIdx];

  return (
    <section
      ref={sectionRef}
      className="px-12 py-24"
      style={{ background: "#FAFAF9", borderTop: "1px solid rgba(0,0,0,0.07)", position: "relative", overflow: "hidden" }}
    >
      <style>{`
        @keyframes progressFill {
          from { width: 0% }
          to { width: 100% }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1 }
          50% { opacity: 0 }
        }
      `}</style>

      {/* Watermark: large shifting art number */}
      <AnimatePresence mode="wait">
        <motion.span
          key={active.num}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            position: "absolute",
            right: -20,
            top: -10,
            fontFamily: SERIF,
            fontSize: "clamp(180px, 20vw, 280px)",
            fontWeight: 400,
            fontStyle: "italic",
            color: "rgba(0,0,0,0.03)",
            lineHeight: 1,
            userSelect: "none",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {active.num}
        </motion.span>
      </AnimatePresence>

      <div className="max-w-5xl mx-auto" style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 48 }}>
          <div>
            <p
              className="text-[12px] font-medium uppercase mb-5"
              style={{ letterSpacing: "1.5px", color: "rgba(0,0,0,0.28)", fontFamily: MONO }}
            >
              La piattaforma
            </p>
            <h2
              style={{
                fontFamily: SERIF,
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: 400,
                letterSpacing: "-2px",
                lineHeight: 1.05,
                color: "#0D1016",
                marginBottom: 16,
              }}
            >
              La piattaforma unificata<br />per la conformità AI.
            </h2>
            <p
              style={{ fontSize: 14, color: "rgba(0,0,0,0.42)", lineHeight: 1.65, maxWidth: 480 }}
            >
              Un unico sistema che connette classificazione, documentazione ed esecuzione degli obblighi normativi EU AI Act.
            </p>
          </div>

          {/* Module counter + nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, paddingBottom: 4 }}>
            <button
              onClick={() => {
                setActiveIdx(i => (i - 1 + modules.length) % modules.length);
                setProgressKey(k => k + 1);
                setPaused(true);
              }}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "1px solid rgba(0,0,0,0.12)",
                background: "transparent",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "rgba(0,0,0,0.45)",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#0D1016"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#0D1016"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.45)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.12)"; }}
            >
              ←
            </button>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.3)", letterSpacing: "0.05em", minWidth: 40, textAlign: "center" }}>
              {String(activeIdx + 1).padStart(2, "0")} / {String(modules.length).padStart(2, "0")}
            </span>
            <button
              onClick={() => {
                setActiveIdx(i => (i + 1) % modules.length);
                setProgressKey(k => k + 1);
                setPaused(true);
              }}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "1px solid rgba(0,0,0,0.12)",
                background: "transparent",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "rgba(0,0,0,0.45)",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#0D1016"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#0D1016"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.45)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.12)"; }}
            >
              →
            </button>
          </div>
        </div>

        {/* Grid */}
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(0,0,0,0.06)",
            gap: 1,
          }}
        >
          {modules.map((m, i) => {
            const isActive = i === activeIdx;
            return (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 14 }}
                animate={sectionVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ duration: 0.4, delay: diagonalDelay(i) }}
                onClick={() => {
                  setActiveIdx(i);
                  setProgressKey(k => k + 1);
                  setPaused(true);
                }}
                style={{
                  background: isActive ? m.color : "#FAFAF9",
                  padding: "22px 18px 20px",
                  transition: "background 0.28s ease",
                  cursor: "pointer",
                  minHeight: 90,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Art number watermark inside card */}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      bottom: -8,
                      fontFamily: SERIF,
                      fontSize: 52,
                      fontWeight: 400,
                      fontStyle: "italic",
                      color: "rgba(255,255,255,0.06)",
                      lineHeight: 1,
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {m.num}
                  </span>
                )}

                <p
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    fontWeight: 500,
                    color: isActive ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.28)",
                    letterSpacing: "0.07em",
                    marginBottom: 7,
                    textTransform: "uppercase",
                    transition: "color 0.28s ease",
                  }}
                >
                  {m.art}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: isActive ? "rgba(255,255,255,0.92)" : "#0D1016",
                    letterSpacing: "-0.3px",
                    transition: "color 0.28s ease",
                    lineHeight: 1.2,
                  }}
                >
                  {m.name}
                </p>

                {/* Progress bar on active card */}
                {isActive && !paused && (
                  <div
                    key={`${activeIdx}-${progressKey}`}
                    style={{
                      position: "absolute",
                      bottom: 0, left: 0, height: 2,
                      background: "rgba(255,255,255,0.35)",
                      animation: `progressFill ${CYCLE_MS}ms linear forwards`,
                    }}
                  />
                )}

                {/* Static indicator when paused on active */}
                {isActive && paused && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0, left: 0, right: 0, height: 2,
                      background: "rgba(255,255,255,0.18)",
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Description panel */}
        <div
          style={{
            marginTop: 1,
            borderRadius: "0 0 12px 12px",
            border: "1px solid rgba(0,0,0,0.08)",
            borderTop: "none",
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              <div
                style={{
                  width: 2, height: 36, borderRadius: 1,
                  background: active.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: "rgba(0,0,0,0.35)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}>
                  {active.art} — {active.name}
                </p>
                <p style={{
                  fontSize: 14,
                  color: "rgba(0,0,0,0.62)",
                  lineHeight: 1.65,
                  maxWidth: 640,
                }}>
                  {active.desc}
                </p>
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: "rgba(0,0,0,0.18)",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                }}
              >
                {String(activeIdx + 1).padStart(2, "0")} / {String(modules.length).padStart(2, "0")}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
