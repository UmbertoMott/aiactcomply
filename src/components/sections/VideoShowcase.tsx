"use client";

import { useEffect, useRef, useState } from "react";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";
const GREEN = "#0B3D2E";
const TERRA = "#7A2A1A";
const DARK = "#0D1016";

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

// ─── VIDEO ROW ────────────────────────────────────────────────────────────────

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
    <div style={{ flex: "0 0 38%", minWidth: 0, display: "flex", flexDirection: "column" as const, justifyContent: "center", paddingLeft: reverse ? 40 : 0, paddingRight: reverse ? 0 : 40, ...fadeUp }}>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.38)", letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 18, display: "block" }}>
        {badge}
      </span>
      <h3 style={{ fontFamily: SERIF, fontSize: "clamp(24px, 3.2vw, 40px)", fontWeight: 400, letterSpacing: "-1.5px", lineHeight: 1.08, color: DARK, marginBottom: 16 }}>
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

// ─── INTERSTITIAL 1: CLASSIFICATION ──────────────────────────────────────────
// Left 55%: DARK bg + Triage result CSS mockup
// Right 45%: Forest GREEN + big text

function TriageMockup() {
  const articles = ["Art. 5", "Art. 6", "Art. 9", "Art. 10", "Art. 11", "Annex III", "Art. 13", "Annex IV", "Art. 49"];
  const steps = [
    "Redigere documentazione tecnica Annex IV",
    "Completare la FRIA prima della messa in opera",
    "Registrare nel database EU (EUDB) prima dell'immissione",
  ];
  return (
    <div className="triage-card" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.28)", background: "#0e0e0e", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
      <div style={{ background: "#1a1a1a", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />)}
        </div>
        <div style={{ flex: 1, height: 18, borderRadius: 3, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.2)" }}>aicomply.it/triage/risultato</span>
        </div>
      </div>
      <div style={{ padding: "22px 20px" }}>
        <p style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 14 }}>
          Risultato classificazione
        </p>
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: "#fff", letterSpacing: "0.12em", fontWeight: 600 }}>SISTEMA AD ALTO RISCHIO</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.32)", marginTop: 3 }}>Regolamento (UE) 2024/1689 — Allegato III, cat. 5</div>
          </div>
        </div>
        <p style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.22)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>Articoli applicabili</p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 18 }}>
          {articles.map(a => (
            <span key={a} style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.45)", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }}>{a}</span>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, marginBottom: 14 }}>
          <p style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.22)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 10 }}>3 obblighi immediati identificati</p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 13, height: 13, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 2, flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: "#fff", borderRadius: 6, padding: "8px 0", textAlign: "center" as const }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: DARK, fontWeight: 500 }}>Avvia documentazione</span>
          </div>
          <div style={{ padding: "8px 14px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, display: "flex", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Esporta PDF</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassificationInterstitial() {
  const { ref, visible } = useInView(0.08);
  return (
    <div ref={ref} style={{ display: "flex" }} className="interstitial-row">
      <div style={{ flex: "0 0 55%", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 64px 80px 48px", minHeight: 560 }}>
        <div style={{ maxWidth: 440, width: "100%", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(-28px)", transition: "opacity .7s ease, transform .7s ease" }}>
          <TriageMockup />
        </div>
      </div>
      <div style={{ flex: "0 0 45%", background: GREEN, display: "flex", alignItems: "center", padding: "80px 64px 80px 56px" }}>
        <div style={{ maxWidth: 380, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(28px)", transition: "opacity .7s .18s ease, transform .7s .18s ease" }}>
          <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 24 }}>
            Triage — Art. 6
          </p>
          <h3 style={{ fontFamily: SERIF, fontSize: "clamp(32px, 3.5vw, 52px)", fontWeight: 400, color: "#fff", letterSpacing: "-2px", lineHeight: 1.05, marginBottom: 20 }}>
            Classificato<br />in 4 minuti.
          </h3>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.52)", lineHeight: 1.78, marginBottom: 32 }}>
            Nessun esperto esterno, nessun foglio Excel. AIComply legge le caratteristiche del tuo sistema e mappa ogni obbligo normativo in automatico.
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
            {[
              "4 livelli di rischio riconosciuti (Art. 5, 6, 7)",
              "Mapping immediato agli allegati applicabili",
              "Report PDF pronto in 60 secondi",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.52)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INTERSTITIAL 2: RISK REGISTER ───────────────────────────────────────────
// Left 42%: TERRACOTTA + text + 3 mini stats
// Right 58%: DARK + Risk Register with colored severity badges

const RISKS = [
  { label: "Accesso non autorizzato ai dati personali", level: "ALTO",  art: "Art. 9" },
  { label: "Bias nel dataset di training",              level: "MEDIO", art: "Art. 10" },
  { label: "Mancata trasparenza verso l'utente",       level: "ALTO",  art: "Art. 13" },
  { label: "Deriva del modello in produzione",         level: "BASSO", art: "Art. 72" },
  { label: "Documentazione tecnica incompleta",        level: "MEDIO", art: "Art. 11" },
];

function levelStyle(level: string): React.CSSProperties {
  if (level === "ALTO")  return { background: "rgba(150,50,32,0.85)", color: "#fff", border: "1px solid rgba(200,80,60,0.4)" };
  if (level === "MEDIO") return { background: "rgba(130,90,16,0.75)", color: "#fff", border: "1px solid rgba(180,130,20,0.3)" };
  return { background: "rgba(11,61,46,0.75)", color: "#fff", border: "1px solid rgba(30,120,80,0.3)" };
}

function RiskMockup() {
  return (
    <div className="risk-card" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.30)", background: "#0e0e0e", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
      <div style={{ background: "#1a1a1a", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />)}
        </div>
        <div style={{ flex: 1, height: 18, borderRadius: 3, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.2)" }}>aicomply.it/risk-manager</span>
        </div>
      </div>
      <div style={{ padding: "10px 16px 8px", display: "grid", gridTemplateColumns: "1fr 70px 54px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {["Rischio","Livello","Norma"].map(h => (
          <span key={h} style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{h}</span>
        ))}
      </div>
      {RISKS.map((r, i) => (
        <div key={i} style={{ padding: "11px 16px", display: "grid", gridTemplateColumns: "1fr 70px 54px", gap: 8, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>{r.label}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, padding: "3px 7px", borderRadius: 4, textAlign: "center" as const, ...levelStyle(r.level) }}>{r.level}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.28)" }}>{r.art}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.22)" }}>5 rischi · 2 ad alto livello</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.22)", padding: "3px 10px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, cursor: "pointer" }}>+ Aggiungi</span>
      </div>
    </div>
  );
}

function RiskInterstitial() {
  const { ref, visible } = useInView(0.08);
  return (
    <div ref={ref} style={{ display: "flex" }} className="interstitial-row">
      <div style={{ flex: "0 0 42%", background: TERRA, display: "flex", alignItems: "center", padding: "80px 56px 80px 48px", minHeight: 560 }}>
        <div style={{ maxWidth: 340, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(-28px)", transition: "opacity .7s ease, transform .7s ease" }}>
          <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 24 }}>
            Risk Manager — Art. 9
          </p>
          <h3 style={{ fontFamily: SERIF, fontSize: "clamp(32px, 3.5vw, 52px)", fontWeight: 400, color: "#fff", letterSpacing: "-2px", lineHeight: 1.05, marginBottom: 20 }}>
            Ogni rischio<br />ha una casa.
          </h3>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.52)", lineHeight: 1.78, marginBottom: 36 }}>
            Risk Register, FRIA e DPIA sincronizzati in tempo reale. Nessun foglio Excel, nessuna duplicazione — ogni rischio ha proprietario, misure e stato in un unico posto.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 28 }}>
            {[
              { v: "47+", l: "articoli coperti" },
              { v: "5",   l: "categorie rischio" },
              { v: "PDF", l: "export firmato" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 400, color: "#fff", letterSpacing: "-1px", marginBottom: 5 }}>{s.v}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.38)", letterSpacing: "0.05em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: "0 0 58%", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 48px 80px 64px" }}>
        <div style={{ maxWidth: 500, width: "100%", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(28px)", transition: "opacity .7s .18s ease, transform .7s .18s ease" }}>
          <RiskMockup />
        </div>
      </div>
    </div>
  );
}

// ─── FLOW TRIO (replaces StatsRow) ───────────────────────────────────────────
// Dark bg, 3 columns with mini CSS product mockups + step labels

function FlowTrio() {
  const { ref, visible } = useInView(0.12);

  const triageMini = (
    <div style={{ background: "#1c1c1c", borderRadius: 10, border: "1px solid rgba(255,255,255,0.20)", overflow: "hidden" }}>
      <div style={{ padding: "7px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 4 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />)}
      </div>
      <div style={{ padding: "18px 16px 16px" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Classificazione sistema AI</div>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 5, padding: "8px 10px", marginBottom: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
            <span style={{ fontFamily: MONO, fontSize: 8, color: "#fff", fontWeight: 600, letterSpacing: "0.08em" }}>ALTO RISCHIO</span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.28)" }}>Art. 6 · Allegato III, cat. 5</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
          {["Art. 9", "Art. 11", "Art. 13", "Annex IV", "Art. 49"].map(a => (
            <span key={a} style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.35)", padding: "3px 7px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3 }}>{a}</span>
          ))}
        </div>
      </div>
    </div>
  );

  const docMini = (
    <div style={{ background: "#1c1c1c", borderRadius: 10, border: "1px solid rgba(255,255,255,0.20)", overflow: "hidden" }}>
      <div style={{ padding: "7px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 4 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />)}
      </div>
      <div style={{ padding: "18px 16px 16px" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Annex IV — Fascicolo tecnico</div>
        {[
          { label: "Descrizione sistema AI", pct: 100 },
          { label: "Misure di conformità",   pct: 82 },
          { label: "Data governance",        pct: 55 },
          { label: "FRIA collegata",         pct: 94 },
        ].map(row => (
          <div key={row.label} style={{ marginBottom: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.28)" }}>{row.pct}%</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${row.pct}%`, height: "100%", background: row.pct === 100 ? "rgba(11,61,46,0.9)" : "rgba(255,255,255,0.3)", borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const monitorMini = (
    <div style={{ background: "#1c1c1c", borderRadius: 10, border: "1px solid rgba(255,255,255,0.20)", overflow: "hidden" }}>
      <div style={{ padding: "7px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 4 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />)}
      </div>
      <div style={{ padding: "18px 16px 16px" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Post-Market — Dashboard</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[
            { label: "Uptime", val: "99.8%" },
            { label: "Drift",  val: "0.02"  },
            { label: "Alert",  val: "0"     },
          ].map(m => (
            <div key={m.label} style={{ flex: 1, background: "rgba(11,61,46,0.35)", borderRadius: 4, padding: "6px 7px", border: "1px solid rgba(30,120,80,0.25)" }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: "#fff", fontWeight: 500 }}>{m.val}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
        {[
          "14:32 — Nessuna deriva rilevata",
          "13:10 — Soglie Art. 73 verificate",
          "12:00 — Report settimanale inviato",
        ].map((log, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2D7A50", flexShrink: 0 }} />
            <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.38)" }}>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const panels = [
    { num: "01", title: "Classifica", desc: "Il sistema AI viene classificato per livello di rischio e mappato agli articoli applicabili in pochi minuti.", mini: triageMini },
    { num: "02", title: "Documenta", desc: "Fascicolo tecnico Annex IV, FRIA e DPIA pre-compilati dai dati già inseriti — nessun copia-incolla tra moduli.", mini: docMini },
    { num: "03", title: "Monitora",  desc: "Post-Market sorveglia il sistema in produzione con drift detection e alert automatici per l'autorità notificante.", mini: monitorMini },
  ];

  return (
    <div ref={ref} style={{ background: DARK, padding: "80px 56px" }}>
      <div>
        <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 56 }}>
          Il flusso completo
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 56 }} className="trio-grid">
          {panels.map((p, i) => (
            <div key={p.num} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: `opacity .55s ${i*0.14}s ease, transform .55s ${i*0.14}s ease` }}>
              <div style={{ marginBottom: 24 }}>{p.mini}</div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 18 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>{p.num}</span>
                  <span style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 400, color: "#fff", letterSpacing: "-1px" }}>{p.title}</span>
                </div>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.42)", lineHeight: 1.72 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LEGAL VIDEO ROW (animated pan: left → right) ────────────────────────────

function LegalVideoRow({ badge, title, desc, chips, videoSrc, reverse }: Omit<RowProps, "zoom" | "zoomX" | "playbackRate">) {
  const { ref, visible } = useInView(0.1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!visible) return;
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = 1;
    v.play().catch(() => {});
  }, [visible]);

  const fadeUp  = { opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity .6s ease, transform .6s ease" };
  const fadeUp2 = { opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity .6s .1s ease, transform .6s .1s ease" };

  const textCol = (
    <div style={{ flex: "0 0 38%", minWidth: 0, display: "flex", flexDirection: "column" as const, justifyContent: "center", paddingLeft: reverse ? 40 : 0, paddingRight: reverse ? 0 : 40, ...fadeUp }}>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.38)", letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 18, display: "block" }}>
        {badge}
      </span>
      <h3 style={{ fontFamily: SERIF, fontSize: "clamp(24px, 3.2vw, 40px)", fontWeight: 400, letterSpacing: "-1.5px", lineHeight: 1.08, color: DARK, marginBottom: 16 }}>
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
        {/* Browser chrome */}
        <div style={{ background: "#f3f3f2", borderBottom: "1px solid rgba(0,0,0,0.09)", padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(0,0,0,0.15)" }} />)}
          </div>
          <div style={{ flex: 1, height: 20, borderRadius: 4, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(0,0,0,0.25)" }}>aicomply.it / legal-assistant</span>
          </div>
        </div>
        {/* Video with CSS pan animation */}
        <div style={{ aspectRatio: "16/9", overflow: "hidden", position: "relative" }}>
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
              animation: visible ? "legalZoomPan 11s ease-in-out infinite" : "none",
              transformOrigin: "center center",
            }}
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

// ─── ROW DATA ─────────────────────────────────────────────────────────────────

const ROW1: RowProps = {
  badge: "Triage · Art. 5 · 6 · 51",
  title: "Capisci quali obblighi ti riguardano.",
  desc: "Quattro aree tematiche, poche domande guidate, e AIComply classifica il tuo sistema — rischio inaccettabile, alto, limitato o minimo — mappandolo agli articoli e agli allegati che contano.",
  chips: ["Classificazione 4 livelli", "Mapping Art. 6 + Annex III", "Export PDF", "Storico sessioni"],
  videoSrc: "/videos/triage.mp4",
  reverse: false,
};

const ROW2: Omit<RowProps, "zoom" | "zoomX" | "playbackRate"> = {
  badge: "Legal Assistant · 2024/1689",
  title: "Risposte con le fonti, non opinioni.",
  desc: "Fai una domanda sull'AI Act, su ISO 22989 o sulle Guidelines: il Legal Assistant cita il testo esatto, articolo per articolo, con il chunk sorgente sempre verificabile a fianco.",
  chips: ["RAG su EU AI Act", "ISO 22989 + Guidelines", "Chunk sorgente verificabile", "Badge articolo per risposta"],
  videoSrc: "/videos/legal-assistant.mp4",
  reverse: true,
};

const ROW3: RowProps = {
  badge: "Risk Manager · Art. 27",
  title: "Valutazioni d'impatto che si scrivono da sole.",
  desc: "Risk Register, FRIA e DPIA prendono forma dai dati già raccolti negli altri moduli. AIComply pre-compila le sezioni e tu validi.",
  chips: ["Risk Register", "FRIA + DPIA integrate", "Pre-compilazione automatica", "Export firmato"],
  videoSrc: "/videos/fria.mp4",
  reverse: false,
};

const ROW4: RowProps = {
  badge: "Registrazione EUDB · Art. 49",
  title: "Pronto per il database UE, senza copia-incolla.",
  desc: "Mappatura dei campi Annex VIII e criteri di eleggibilità pre-compilati dal Triage, da verificare contro il testo consolidato del Regolamento.",
  chips: ["Annex VIII mapping", "Criteri eleggibilità", "Sincronizzato con Triage"],
  videoSrc: "/videos/eudb.mp4",
  reverse: true,
};

const ROW5: RowProps = {
  badge: "Trust Center · Art. 13 · 50",
  title: "Dimostra la conformità in pubblico.",
  desc: "Pubblica una pagina di trasparenza verificabile: classificazione del rischio, finalità d'uso e pacchetto di conformità esportabile, confermati prima di andare online.",
  chips: ["Pagina pubblica verificabile", "Badge conformità", "Export pacchetto compliance"],
  videoSrc: "/videos/trust.mp4",
  reverse: false,
};

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export default function VideoShowcase() {
  return (
    <section style={{ background: "#ffffff", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
      <style>{`
        @media (max-width: 768px) {
          .showcase-row { flex-direction: column !important; gap: 32px !important; }
          .interstitial-row { flex-direction: column !important; }
          .trio-grid { grid-template-columns: 1fr !important; }
        }
        /* Legal Assistant: zoom in on left (input), pan to right (output) */
        @keyframes legalZoomPan {
          0%   { transform: scale(1.62) translateX(18%);  }  /* zoomed left — chat input */
          28%  { transform: scale(1.62) translateX(18%);  }  /* hold left */
          52%  { transform: scale(1.62) translateX(-18%); }  /* smooth pan to right */
          80%  { transform: scale(1.62) translateX(-18%); }  /* hold right — source output */
          100% { transform: scale(1.62) translateX(18%);  }  /* loop back */
        }
        .triage-card {
          cursor: pointer;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .triage-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.18) !important;
        }
        .triage-card:active {
          transform: scale(0.978);
          transition: transform 0.1s ease;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5) !important;
        }
        .risk-card {
          cursor: pointer;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .risk-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.22) !important;
        }
        .risk-card:active {
          transform: scale(0.978);
          transition: transform 0.1s ease;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5) !important;
        }
      `}</style>

      {/* Header */}
      <div className="px-12 py-24" style={{ maxWidth: 960, margin: "0 auto" }}>
        <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(0,0,0,0.28)", marginBottom: 14 }}>
          Il prodotto in movimento
        </p>
        <h2 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 400, letterSpacing: "-2px", color: DARK, lineHeight: 1.05 }}>
          Vedi come funziona ogni modulo.
        </h2>
      </div>

      {/* ① Triage video */}
      <div className="px-12 pb-24" style={{ maxWidth: 1280, margin: "0 auto" }}>
        <VideoRow {...ROW1} />
      </div>

      {/* ② Classification interstitial — fullbleed */}
      <ClassificationInterstitial />

      {/* ③ Legal video */}
      <div className="px-12 py-24" style={{ maxWidth: 1280, margin: "0 auto" }}>
        <LegalVideoRow {...ROW2} />
      </div>

      {/* ④ Risk Register interstitial — fullbleed */}
      <RiskInterstitial />

      {/* ⑤ FRIA/Risk Manager video */}
      <div className="px-12 py-24" style={{ maxWidth: 1280, margin: "0 auto" }}>
        <VideoRow {...ROW3} />
      </div>

      {/* ⑥ Flow trio — dark 3-col */}
      <FlowTrio />

      {/* ⑦ EUDB video */}
      <div className="px-12 py-24" style={{ maxWidth: 1280, margin: "0 auto" }}>
        <VideoRow {...ROW4} />
      </div>

      {/* ⑧ Trust Center video */}
      <div className="px-12 pb-24" style={{ maxWidth: 1280, margin: "0 auto" }}>
        <VideoRow {...ROW5} />
      </div>
    </section>
  );
}
