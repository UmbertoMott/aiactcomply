"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ExternalLink, Info, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.45)",
  faint:  "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.07)",
  card:   "#ffffff",
};

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type NistFunction = "GOVERN" | "MAP" | "MEASURE" | "MANAGE";

interface EUArticle {
  article: string;
  description: string;
  toolHref: string;
  storageKey: string | null;
}

interface NistMapping {
  nistFunction: NistFunction;
  subcategory: string;
  subcategoryDesc: string;
  euArticles: EUArticle[];
}

// ─── Colori per funzione NIST ─────────────────────────────────────────────────

const FUNCTION_CONFIG: Record<NistFunction, { color: string; bg: string; border: string; desc: string }> = {
  GOVERN: {
    color: "#7c3aed", bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.2)",
    desc: "Stabilisce accountability, cultura e governance per la gestione del rischio AI nell'organizzazione.",
  },
  MAP: {
    color: "#2563eb", bg: "rgba(37,99,235,0.06)", border: "rgba(37,99,235,0.2)",
    desc: "Identifica e classifica i rischi AI nel contesto dell'organizzazione e degli stakeholder.",
  },
  MEASURE: {
    color: "#d97706", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)",
    desc: "Analizza, valuta e traccia i rischi AI con metriche e indicatori.",
  },
  MANAGE: {
    color: "#15803d", bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.2)",
    desc: "Prioritizza e tratta i rischi AI identificati, con piani di risposta e monitoraggio continuo.",
  },
};

// ─── Mappatura NIST ↔ EU AI Act ───────────────────────────────────────────────

const MAPPINGS: NistMapping[] = [
  // ── GOVERN ──────────────────────────────────────────────────────────────────
  {
    nistFunction: "GOVERN",
    subcategory: "GV-1.1",
    subcategoryDesc: "Politiche, processi e procedure per la gestione del rischio AI sono stabiliti e comunicati",
    euArticles: [
      { article: "Art. 9",  description: "Sistema di gestione del rischio",     toolHref: "/dashboard/tools/risk-manager", storageKey: "aicomply_risk_manager_result" },
      { article: "Art. 17", description: "Sistema di gestione qualità (QMS)",   toolHref: "/dashboard/tools/qms",          storageKey: "aicomply_qms_result"          },
    ],
  },
  {
    nistFunction: "GOVERN",
    subcategory: "GV-1.2",
    subcategoryDesc: "Responsabilità e accountability per il rischio AI sono assegnate a ruoli specifici",
    euArticles: [
      { article: "Art. 4",    description: "AI Literacy — formazione del personale",           toolHref: "/dashboard/tools/literacy", storageKey: "ai_literacy_store"           },
      { article: "Art. 26(2)",description: "Deployer: assegnazione supervisori formati",        toolHref: "/dashboard/tools/deployer", storageKey: "aicomply_deployer_result"    },
    ],
  },
  {
    nistFunction: "GOVERN",
    subcategory: "GV-2.1",
    subcategoryDesc: "Pratiche di gestione del rischio AI sono integrate nei processi organizzativi",
    euArticles: [
      { article: "Art. 17", description: "QMS integrato nel ciclo di vita AI",          toolHref: "/dashboard/tools/qms",   storageKey: "aicomply_qms_result"          },
      { article: "Art. 72", description: "Post-market monitoring continuativo",         toolHref: "/dashboard/post-market", storageKey: "aicomply_postmarket_result"   },
    ],
  },
  {
    nistFunction: "GOVERN",
    subcategory: "GV-4.1",
    subcategoryDesc: "Rischi organizzativi derivanti da AI di terze parti sono considerati",
    euArticles: [
      { article: "Art. 26", description: "Obblighi deployer verso provider",            toolHref: "/dashboard/tools/deployer",  storageKey: "aicomply_deployer_result"  },
      { article: "Art. 14", description: "Supervisione umana su sistemi di terze parti", toolHref: "/dashboard/tools/oversight", storageKey: "aicomply_oversight_result" },
    ],
  },
  {
    nistFunction: "GOVERN",
    subcategory: "GV-6.1",
    subcategoryDesc: "Politiche di trasparenza verso utenti e stakeholder sono definite",
    euArticles: [
      { article: "Art. 13", description: "Trasparenza sistemi alto rischio",       toolHref: "/dashboard/tools/transparency", storageKey: "aicomply_transparency_result" },
      { article: "Art. 50", description: "Disclosure per sistemi limitati/chatbot", toolHref: "/dashboard/tools/art50-kit",   storageKey: "aicomply_art50_result"        },
    ],
  },
  // ── MAP ─────────────────────────────────────────────────────────────────────
  {
    nistFunction: "MAP",
    subcategory: "MP-1.1",
    subcategoryDesc: "Il contesto del sistema AI è stabilito: intended purpose, stakeholder, ambiente di deployment",
    euArticles: [
      { article: "Art. 6", description: "Classificazione del rischio (Art. 6(1)/(2)/(3))", toolHref: "/dashboard/tools/classifier", storageKey: "aicomply_classifier_result" },
      { article: "Art. 5", description: "Verifica assenza pratiche vietate",                toolHref: "/dashboard/tools/prohibited", storageKey: "aicomply_prohibited_result" },
    ],
  },
  {
    nistFunction: "MAP",
    subcategory: "MP-2.2",
    subcategoryDesc: "I rischi scientifici e tecnici del sistema AI sono identificati e documentati",
    euArticles: [
      { article: "Art. 9",  description: "Risk assessment — identificazione scenari di rischio", toolHref: "/dashboard/tools/risk-manager", storageKey: "aicomply_risk_manager_result" },
      { article: "Art. 27", description: "FRIA — impatti su diritti fondamentali",               toolHref: "/dashboard/tools/fria",         storageKey: "aicomply_fria_result"         },
    ],
  },
  {
    nistFunction: "MAP",
    subcategory: "MP-3.5",
    subcategoryDesc: "I rischi legati ai dati (bias, qualità, provenienza) sono identificati",
    euArticles: [
      { article: "Art. 10",    description: "Governance dati — qualità e bias mitigation", toolHref: "/dashboard/tools/data-audit", storageKey: "aicomply_data_audit_result" },
      { article: "Art. 27(3)", description: "FRIA — sezione dati e bias",                  toolHref: "/dashboard/tools/fria",       storageKey: "aicomply_fria_result"       },
    ],
  },
  {
    nistFunction: "MAP",
    subcategory: "MP-5.1",
    subcategoryDesc: "Gli impatti sui diritti e la dignità delle persone sono valutati",
    euArticles: [
      { article: "Art. 27",    description: "Fundamental Rights Impact Assessment (FRIA)", toolHref: "/dashboard/tools/fria", storageKey: "aicomply_fria_result" },
      { article: "Art. 35 GDPR", description: "Data Protection Impact Assessment (DPIA)", toolHref: "/dashboard/tools/dpia", storageKey: "aicomply_dpia_result" },
    ],
  },
  // ── MEASURE ─────────────────────────────────────────────────────────────────
  {
    nistFunction: "MEASURE",
    subcategory: "MS-1.1",
    subcategoryDesc: "Metriche per valutare performance e rischi del sistema AI sono definite",
    euArticles: [
      { article: "Art. 9",  description: "KRI e soglie di rischio documentate",            toolHref: "/dashboard/tools/risk-manager", storageKey: "aicomply_risk_manager_result" },
      { article: "Art. 15", description: "Metriche accuratezza, robustezza, resilienza",    toolHref: "/dashboard/tools/resilience",   storageKey: "aicomply_resilience_result"   },
    ],
  },
  {
    nistFunction: "MEASURE",
    subcategory: "MS-2.5",
    subcategoryDesc: "Il sistema AI è monitorato continuativamente in produzione",
    euArticles: [
      { article: "Art. 12", description: "Logging automatico — LogVault",  toolHref: "/dashboard/tools/logvault", storageKey: "aicomply_logvault_result"   },
      { article: "Art. 72", description: "Post-market monitoring system",  toolHref: "/dashboard/post-market",   storageKey: "aicomply_postmarket_result" },
    ],
  },
  {
    nistFunction: "MEASURE",
    subcategory: "MS-2.6",
    subcategoryDesc: "La qualità e integrità dei dati è verificata nel tempo",
    euArticles: [
      { article: "Art. 10",    description: "Data Audit — qualità dataset",          toolHref: "/dashboard/tools/data-audit", storageKey: "aicomply_data_audit_result" },
      { article: "Art. 15(3)", description: "Robustezza contro data poisoning",       toolHref: "/dashboard/tools/resilience", storageKey: "aicomply_resilience_result" },
    ],
  },
  {
    nistFunction: "MEASURE",
    subcategory: "MS-4.1",
    subcategoryDesc: "Audit trail e documentazione delle decisioni AI sono mantenuti",
    euArticles: [
      { article: "Art. 12",           description: "Logging con hash chain immutabile", toolHref: "/dashboard/tools/logvault", storageKey: "aicomply_logvault_result" },
      { article: "Art. 11 + Annex IV",description: "Documentazione tecnica completa",   toolHref: "/dashboard/tools/docugen", storageKey: "aicomply_docugen_result"  },
    ],
  },
  // ── MANAGE ──────────────────────────────────────────────────────────────────
  {
    nistFunction: "MANAGE",
    subcategory: "MG-1.3",
    subcategoryDesc: "I rischi identificati sono trattati con controlli appropriati",
    euArticles: [
      { article: "Art. 9(6)", description: "Risk treatment — misure di mitigazione",          toolHref: "/dashboard/tools/risk-manager", storageKey: "aicomply_risk_manager_result" },
      { article: "Art. 14",   description: "Supervisione umana come controllo compensativo",   toolHref: "/dashboard/tools/oversight",    storageKey: "aicomply_oversight_result"   },
    ],
  },
  {
    nistFunction: "MANAGE",
    subcategory: "MG-2.4",
    subcategoryDesc: "Procedure per rispondere a incidenti e malfunzionamenti AI sono definite",
    euArticles: [
      { article: "Art. 73", description: "Segnalazione incidenti gravi alle autorità", toolHref: "/dashboard/post-market", storageKey: "aicomply_postmarket_result" },
      { article: "Art. 20", description: "Azioni correttive e ritiro dal mercato",     toolHref: "/dashboard/post-market", storageKey: "aicomply_postmarket_result" },
    ],
  },
  {
    nistFunction: "MANAGE",
    subcategory: "MG-3.1",
    subcategoryDesc: "I rischi residui sono monitorati e rivalutati nel tempo",
    euArticles: [
      { article: "Art. 72",  description: "Post-market monitoring — revisioni periodiche", toolHref: "/dashboard/post-market",        storageKey: "aicomply_postmarket_result"   },
      { article: "Art. 9(2)",description: "Risk management continuo e iterativo",          toolHref: "/dashboard/tools/risk-manager", storageKey: "aicomply_risk_manager_result" },
    ],
  },
  {
    nistFunction: "MANAGE",
    subcategory: "MG-4.1",
    subcategoryDesc: "Le pratiche di gestione del rischio AI sono aggiornate in base all'esperienza",
    euArticles: [
      { article: "Art. 17(1)(g)", description: "QMS — ciclo di miglioramento continuo",    toolHref: "/dashboard/tools/qms",      storageKey: "aicomply_qms_result"         },
      { article: "Art. 26(5)",    description: "Deployer: feedback al provider su incidenti", toolHref: "/dashboard/tools/deployer", storageKey: "aicomply_deployer_result"    },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NistRmfPage() {
  const [coverage, setCoverage]         = useState<Record<string, boolean>>({});
  const [activeFunction, setActiveFunction] = useState<NistFunction | "ALL">("ALL");
  const [expanded, setExpanded]         = useState<string | null>(null);

  useEffect(() => {
    const keys = [
      "aicomply_risk_manager_result", "aicomply_qms_result", "ai_literacy_store",
      "aicomply_deployer_result", "aicomply_oversight_result", "aicomply_transparency_result",
      "aicomply_art50_result", "aicomply_classifier_result", "aicomply_prohibited_result",
      "aicomply_fria_result", "aicomply_dpia_result", "aicomply_data_audit_result",
      "aicomply_resilience_result", "aicomply_logvault_result", "aicomply_postmarket_result",
      "aicomply_docugen_result",
    ];
    const result: Record<string, boolean> = {};
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        result[key] = !!raw && raw !== "null";
      } catch {
        result[key] = false;
      }
    }
    setCoverage(result);
  }, []);

  function coverageForFunction(fn: NistFunction): { covered: number; total: number } {
    const rows = MAPPINGS.filter(m => m.nistFunction === fn);
    let covered = 0;
    let total = 0;
    for (const row of rows) {
      for (const art of row.euArticles) {
        total++;
        if (art.storageKey && coverage[art.storageKey]) covered++;
      }
    }
    return { covered, total };
  }

  const functions: NistFunction[] = ["GOVERN", "MAP", "MEASURE", "MANAGE"];
  const filtered = activeFunction === "ALL"
    ? MAPPINGS
    : MAPPINGS.filter(m => m.nistFunction === activeFunction);

  return (
    <div className="w-full space-y-6 pb-10" style={{ color: T.text }}>

      {/* Header */}
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: T.muted }}>Multi-Framework Compliance</p>
        <h1 className="text-xl font-bold mb-1">NIST AI RMF ↔ EU AI Act</h1>
        <p className="text-sm" style={{ color: T.muted }}>
          Mappa la tua conformità EU AI Act sulle 4 funzioni del NIST AI Risk Management Framework.
          Copertura calcolata in base ai tool completati.
        </p>
        <a
          href="https://airc.nist.gov/RMF"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs mt-2 hover:underline"
          style={{ color: "#2563eb" }}
        >
          NIST AI RMF ufficiale <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Score cards per funzione */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {functions.map(fn => {
          const { covered, total } = coverageForFunction(fn);
          const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
          const cfg = FUNCTION_CONFIG[fn];
          const isActive = activeFunction === fn;
          return (
            <button
              key={fn}
              onClick={() => setActiveFunction(isActive ? "ALL" : fn)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                background: isActive ? cfg.bg : T.card,
                border: `1px solid ${isActive ? cfg.border : T.border}`,
              }}
            >
              <div className="text-xs font-bold mb-1" style={{ color: cfg.color }}>{fn}</div>
              <div className="text-xl font-bold" style={{ color: T.text }}>{pct}%</div>
              <div className="text-[10px]" style={{ color: T.muted }}>{covered}/{total} articoli coperti</div>
              <div className="mt-2 h-1 rounded-full w-full" style={{ background: "rgba(0,0,0,0.07)" }}>
                <div
                  className="h-1 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: cfg.color }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Banner funzione attiva */}
      {activeFunction !== "ALL" && (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: FUNCTION_CONFIG[activeFunction].bg,
            border: `1px solid ${FUNCTION_CONFIG[activeFunction].border}`,
          }}
        >
          <div className="text-xs font-bold mb-0.5" style={{ color: FUNCTION_CONFIG[activeFunction].color }}>
            {activeFunction}
          </div>
          <p className="text-xs" style={{ color: T.muted }}>
            {FUNCTION_CONFIG[activeFunction].desc}
          </p>
          <button
            onClick={() => setActiveFunction("ALL")}
            className="text-[11px] mt-1 hover:underline"
            style={{ color: T.muted }}
          >
            ← Mostra tutti
          </button>
        </div>
      )}

      {/* Tabella mapping */}
      <div className="space-y-2">
        {filtered.map(row => {
          const cfg = FUNCTION_CONFIG[row.nistFunction];
          const isOpen = expanded === row.subcategory;
          const rowCovered = row.euArticles.every(a => !a.storageKey || coverage[a.storageKey]);
          const rowPartial = !rowCovered && row.euArticles.some(a => a.storageKey && coverage[a.storageKey]);

          return (
            <div
              key={row.subcategory}
              className="rounded-xl overflow-hidden"
              style={{ background: T.card, border: `1px solid ${T.border}` }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : row.subcategory)}
                className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-black/[0.01] transition-colors"
              >
                {/* Status icon */}
                {rowCovered
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#16a34a" }} />
                  : rowPartial
                  ? <Circle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#d97706" }} />
                  : <Circle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.2)" }} />
                }

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                    >
                      {row.subcategory}
                    </span>
                    <span className="text-xs" style={{ color: T.text }}>{row.subcategoryDesc}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {row.euArticles.map(a => (
                      <span
                        key={a.article}
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: a.storageKey && coverage[a.storageKey]
                            ? "rgba(22,163,74,0.08)"
                            : "rgba(0,0,0,0.04)",
                          color: a.storageKey && coverage[a.storageKey] ? "#15803d" : T.muted,
                          border: `1px solid ${a.storageKey && coverage[a.storageKey]
                            ? "rgba(22,163,74,0.2)"
                            : "rgba(0,0,0,0.06)"}`,
                        }}
                      >
                        {a.article}
                      </span>
                    ))}
                  </div>
                </div>

                {isOpen
                  ? <ChevronUp   className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.faint }} />
                  : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.faint }} />
                }
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2" style={{ borderTop: `1px solid ${T.border}` }}>
                  {row.euArticles.map(a => {
                    const done = !!(a.storageKey && coverage[a.storageKey]);
                    return (
                      <Link
                        key={a.article}
                        href={a.toolHref}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                        style={{
                          background: done ? "rgba(22,163,74,0.04)" : "rgba(0,0,0,0.02)",
                          border: `1px solid ${done ? "rgba(22,163,74,0.15)" : T.border}`,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {done
                            ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#16a34a" }} />
                            : <Circle       className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.2)" }} />
                          }
                          <div>
                            <span className="text-xs font-medium" style={{ color: "#2563eb" }}>{a.article}</span>
                            <span className="text-xs ml-1.5" style={{ color: T.muted }}>— {a.description}</span>
                          </div>
                        </div>
                        <span className="text-[10px] ml-2 flex-shrink-0" style={{ color: T.muted }}>
                          {done ? "✓ Completato" : "Vai al tool →"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div
        className="rounded-xl px-4 py-3 flex items-start gap-2"
        style={{ background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}` }}
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.faint }} />
        <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
          La copertura NIST è calcolata in base ai tool AIComply completati. Il NIST AI RMF è volontario
          negli USA ma adottato come best practice anche in Europa. La conformità EU AI Act non implica
          automaticamente conformità NIST e viceversa — la mappatura indica aree di sovrapposizione,
          non equivalenza.
        </p>
      </div>

    </div>
  );
}
