"use client";
import React, { useState } from "react";
import { Map, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

const FONT = "var(--font-inter, system-ui)";

const FUNCTIONS = [
  {
    id: "govern",
    code: "GOVERN",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.06)",
    border: "rgba(22,163,74,0.15)",
    desc: "Stabilire politiche, processi e cultura organizzativa per la gestione del rischio AI",
    aiActRefs: [
      { art: "Art. 9", label: "Sistema di gestione del rischio" },
      { art: "Art. 17", label: "Sistema di gestione della qualità" },
      { art: "Art. 26", label: "Obblighi deployer" },
      { art: "Art. 72", label: "Sorveglianza post-commercializzazione" },
    ],
    subcategories: [
      "GOVERN 1 — Politiche e processi di AI risk governance",
      "GOVERN 2 — Responsabilità e ruoli per la supervisione AI",
      "GOVERN 3 — Cultura organizzativa e formazione",
      "GOVERN 4 — Gestione del rischio di terze parti",
      "GOVERN 5 — Meccanismi di feedback e miglioramento continuo",
      "GOVERN 6 — Politiche su uso accettabile dei sistemi AI",
    ],
  },
  {
    id: "map",
    code: "MAP",
    color: "#b45309",
    bg: "rgba(180,83,9,0.06)",
    border: "rgba(180,83,9,0.15)",
    desc: "Identificare e classificare il contesto, le parti interessate e i rischi specifici del sistema AI",
    aiActRefs: [
      { art: "Art. 6–7", label: "Classificazione e allegato III" },
      { art: "Art. 10", label: "Dati di addestramento e testing" },
      { art: "Art. 13", label: "Trasparenza e informazioni" },
      { art: "Art. 5",  label: "Pratiche proibite" },
    ],
    subcategories: [
      "MAP 1 — Contesto e scopo del sistema AI",
      "MAP 2 — Classificazione e categorizzazione del rischio",
      "MAP 3 — Identificazione delle parti interessate e impatti",
      "MAP 4 — Dipendenze e supply chain AI",
      "MAP 5 — Impatti su individui e società",
    ],
  },
  {
    id: "measure",
    code: "MEASURE",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.06)",
    border: "rgba(124,58,237,0.15)",
    desc: "Analizzare, valutare e monitorare i rischi AI con metodi quantitativi e qualitativi",
    aiActRefs: [
      { art: "Art. 9",  label: "Analisi e mitigazione del rischio" },
      { art: "Art. 10", label: "Qualità dei dati" },
      { art: "Art. 15", label: "Accuratezza e robustezza" },
      { art: "Art. 62", label: "Notifica incidenti gravi" },
    ],
    subcategories: [
      "MEASURE 1 — Metriche e metodi di valutazione del rischio",
      "MEASURE 2 — Testing e validazione del sistema AI",
      "MEASURE 3 — Impatti su bias, equità e diritti fondamentali",
      "MEASURE 4 — Monitoraggio continuo delle prestazioni",
    ],
  },
  {
    id: "manage",
    code: "MANAGE",
    color: "#0369a1",
    bg: "rgba(3,105,161,0.06)",
    border: "rgba(3,105,161,0.15)",
    desc: "Prioritizzare e trattare i rischi identificati; rispondere agli incidenti e apprendere",
    aiActRefs: [
      { art: "Art. 9",  label: "Misure di gestione del rischio" },
      { art: "Art. 18", label: "Conservazione documentazione" },
      { art: "Art. 61", label: "Monitoraggio post-mercato" },
      { art: "Art. 73", label: "Notifica incidenti (deployer)" },
    ],
    subcategories: [
      "MANAGE 1 — Prioritizzazione e trattamento dei rischi",
      "MANAGE 2 — Strategie di risposta e piani di contingenza",
      "MANAGE 3 — Gestione degli incidenti e rimedi",
      "MANAGE 4 — Aggiornamenti e miglioramento del sistema AI",
    ],
  },
];

function SectionHeader({ title, legalRef }: { title: string; legalRef: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#0D1016", borderRadius: 6, padding: "11px 18px",
      margin: "20px 0 12px",
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", letterSpacing: "0.3px" }}>
        {title}
      </span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 500, letterSpacing: "0.5px" }}>
        {legalRef}
      </span>
    </div>
  );
}

function FunctionCard({ fn }: { fn: typeof FUNCTIONS[0] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      border: `1px solid ${fn.border}`,
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 10,
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "flex-start", gap: 14,
          padding: "16px 18px", background: fn.bg, border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 4,
          color: fn.color, background: `${fn.color}18`, border: `1px solid ${fn.border}`,
          letterSpacing: "0.8px", flexShrink: 0, marginTop: 1,
        }}>
          {fn.code}
        </span>
        <span style={{ flex: 1, fontSize: 12.5, color: "#0D1016", lineHeight: 1.5 }}>
          {fn.desc}
        </span>
        <span style={{ color: fn.color, flexShrink: 0, marginTop: 2 }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>

      {open && (
        <div style={{ padding: "14px 18px 18px", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
            <tbody>
              {fn.aiActRefs.map((ref, i) => (
                <tr key={i} style={{ borderBottom: i < fn.aiActRefs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <td style={{ padding: "7px 0", width: "28%", verticalAlign: "top" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: fn.color,
                      background: `${fn.color}12`, padding: "2px 7px", borderRadius: 4,
                    }}>
                      {ref.art}
                    </span>
                  </td>
                  <td style={{ padding: "7px 0", fontSize: 12, color: "#0D1016", verticalAlign: "top" }}>
                    {ref.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>
            Sottocategorie
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {fn.subcategories.map((sub, i) => (
              <div key={i} style={{
                fontSize: 11.5, color: "rgba(0,0,0,0.65)", padding: "5px 10px",
                background: "rgba(0,0,0,0.02)", borderRadius: 5,
                borderLeft: `2px solid ${fn.border}`,
              }}>
                {sub}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NistAiRmfPage() {
  return (
    <div style={{ fontFamily: FONT, color: "#0D1016" }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>
          NIST AI RMF 1.0
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Map size={18} style={{ color: "#0D1016" }} />
          <h1 style={{ fontSize: 24, fontWeight: 500, color: "#0D1016", letterSpacing: "-0.8px", margin: 0 }}>
            NIST AI Risk Management Framework
          </h1>
        </div>
        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", margin: 0 }}>
          Mapping tra le 4 core functions del NIST AI RMF e gli obblighi dell&apos;AI Act UE
        </p>
      </div>

      <div style={{
        background: "#fff", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px 28px",
      }}>
        <SectionHeader title="Panoramica framework" legalRef="NIST AI RMF 1.0 · 2023" />

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <tbody>
            {[
              ["Framework", "NIST AI Risk Management Framework (AI RMF) 1.0"],
              ["Emesso da", "National Institute of Standards and Technology (NIST)"],
              ["Data pubblicazione", "Gennaio 2023"],
              ["Compatibilità", "Volontario, complementare all'AI Act UE"],
              ["Struttura", "4 Core Functions · 19 Categorie · 72+ Sottocategorie"],
            ].map(([label, value], i, arr) => (
              <tr key={label} style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                <td style={{ padding: "9px 0", width: "38%", verticalAlign: "top" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0D1016" }}>{label}</span>
                </td>
                <td style={{ padding: "9px 0", fontSize: 12.5, color: "rgba(0,0,0,0.7)" }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <SectionHeader title="Core Functions — mapping AI Act" legalRef="Reg. UE 2024/1689" />

        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginBottom: 16, lineHeight: 1.6 }}>
          Le 4 core functions del NIST AI RMF non si sovrappongono 1:1 all&apos;AI Act ma coprono
          aree complementari. Espandi ogni funzione per vedere il mapping con gli articoli rilevanti.
        </p>

        {FUNCTIONS.map((fn) => (
          <FunctionCard key={fn.id} fn={fn} />
        ))}

        <SectionHeader title="Note di utilizzo" legalRef="Informativo" />

        <div style={{
          padding: "12px 16px", borderRadius: 8,
          background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)",
          fontSize: 12, color: "rgba(0,0,0,0.55)", lineHeight: 1.7,
        }}>
          Questo mapping è orientativo. Il NIST AI RMF è un framework volontario degli Stati Uniti;
          l&apos;AI Act è legislazione vincolante UE. Le organizzazioni che adottano entrambi possono
          usare il RMF come struttura operativa per soddisfare i requisiti AI Act, in particolare per
          i sistemi ad alto rischio (Allegato III).
          {" "}<a
            href="https://airc.nist.gov/RMF"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0D1016", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}
          >
            Documentazione ufficiale NIST <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
