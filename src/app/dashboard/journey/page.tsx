"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, AlertTriangle } from "lucide-react";

// ─── Tool definition ──────────────────────────────────────────────────────────

type JourneyRole = "provider" | "deployer" | "importer" | "distributor" | "all";

interface JourneyTool {
  label: string;
  href: string;
  art: string;
  desc: string;
  storageKey: string | null;   // null = non tracciato via localStorage
  urgent?: boolean;
  optional?: boolean;
  roles?: JourneyRole[];        // se assente → tutti i ruoli
}

interface Phase {
  number: number;
  title: string;
  subtitle: string;
  tools: JourneyTool[];
}

interface RichTool extends JourneyTool {
  done: boolean;
}

interface RichPhase extends Omit<Phase, "tools"> {
  tools: RichTool[];
  status: "pending" | "partial" | "complete";
}

// ─── Fase definitions ─────────────────────────────────────────────────────────
// Ordine normativo: Scopri → Valuta → Documenta → Implementa → Certifica

const PHASES: Phase[] = [
  {
    number: 1,
    title: "Scopri & Classifica",
    subtitle: "Identifica i tuoi sistemi AI e i tuoi obblighi normativi prima di tutto il resto.",
    tools: [
      {
        label: "Discovery",
        href: "/dashboard/discovery",
        art: "",
        desc: "Mappa i sistemi AI presenti nella tua infrastruttura (GitHub, AWS, Azure).",
        storageKey: "aicomply_discovery_sources",
        roles: ["provider", "deployer"],
      },
      {
        label: "AI Literacy",
        href: "/dashboard/tools/literacy",
        art: "Art. 4",
        desc: "Forma il personale: obbligo in vigore dal 2 febbraio 2025.",
        storageKey: "ai_literacy_store",
        urgent: true,
        roles: ["provider", "deployer", "importer", "distributor"],
      },
      {
        label: "Art. 5 Checker",
        href: "/dashboard/tools/prohibited",
        art: "Art. 5",
        desc: "Verifica che nessuna pratica AI sia vietata. Obbligatorio e immediato.",
        storageKey: "aicomply_prohibited_result",
        urgent: true,
        roles: ["provider", "deployer", "importer", "distributor"],
      },
      {
        label: "AI Classifier",
        href: "/dashboard/tools/classifier",
        art: "Art. 6",
        desc: "Determina il livello di rischio del sistema (minimo / limitato / alto).",
        storageKey: "aicomply_classifier_result",
        roles: ["provider", "deployer", "importer"],
      },
    ],
  },
  {
    number: 2,
    title: "Valuta i Rischi",
    subtitle: "Analizza rischi, impatti e obblighi specifici in base al rischio classificato.",
    tools: [
      {
        label: "Risk Manager",
        href: "/dashboard/tools/risk-manager",
        art: "Art. 9",
        desc: "Sistema di gestione del rischio continuo durante tutto il ciclo di vita.",
        storageKey: "aicomply_risk_manager_result",
        roles: ["provider", "deployer"],
      },
      {
        label: "Data Audit",
        href: "/dashboard/tools/data-audit",
        art: "Art. 10",
        desc: "Qualità, provenienza e bias dei dataset usati nel training.",
        storageKey: "aicomply_data_audit_result",
        roles: ["provider"],
      },
      {
        label: "DPIA",
        href: "/dashboard/tools/dpia",
        art: "GDPR 35",
        desc: "Valutazione d'impatto GDPR obbligatoria per trattamenti ad alto rischio.",
        storageKey: "aicomply_dpia_result",
        roles: ["provider", "deployer"],
      },
      {
        label: "FRIA",
        href: "/dashboard/tools/fria",
        art: "Art. 27",
        desc: "Valutazione impatto diritti fondamentali (obbligatoria per enti pubblici).",
        storageKey: "aicomply_fria_result",
        optional: true,
        roles: ["deployer"],
      },
    ],
  },
  {
    number: 3,
    title: "Documenta",
    subtitle: "Produci la documentazione tecnica e di processo richiesta dall'AI Act.",
    tools: [
      {
        label: "DocuGen AI",
        href: "/dashboard/tools/docugen",
        art: "Art. 11",
        desc: "Genera la documentazione tecnica strutturata del sistema AI.",
        storageKey: "aicomply_docugen_result",
        roles: ["provider", "importer"],
      },
      {
        label: "LogVault",
        href: "/dashboard/tools/logvault",
        art: "Art. 12",
        desc: "Configura la registrazione automatica degli eventi (log audit-proof).",
        storageKey: "aicomply_logvault_result",
        roles: ["provider", "deployer"],
      },
      {
        label: "QMS Builder",
        href: "/dashboard/tools/qms",
        art: "Art. 17",
        desc: "Sistema di gestione della qualità: policy, cicli di revisione, certificazioni.",
        storageKey: "aicomply_qms_result",
        roles: ["provider"],
      },
    ],
  },
  {
    number: 4,
    title: "Implementa i Requisiti",
    subtitle: "Configura trasparenza, supervisione umana e misure tecniche di conformità.",
    tools: [
      {
        label: "Transparency",
        href: "/dashboard/tools/transparency",
        art: "Art. 13",
        desc: "Informativa agli utenti: cosa sa, come funziona, come contattare il provider.",
        storageKey: "aicomply_transparency_result",
        roles: ["provider"],
      },
      {
        label: "Oversight",
        href: "/dashboard/tools/oversight",
        art: "Art. 14",
        desc: "Definisci i meccanismi di sorveglianza umana e i punti di intervento.",
        storageKey: "aicomply_oversight_result",
        roles: ["provider", "deployer"],
      },
      {
        label: "Resilience",
        href: "/dashboard/tools/resilience",
        art: "Art. 15",
        desc: "Accuratezza, robustezza e misure di cybersecurity del sistema.",
        storageKey: "aicomply_resilience_result",
        roles: ["provider"],
      },
      {
        label: "Art. 50 Kit",
        href: "/dashboard/tools/art50-kit",
        art: "Art. 50",
        desc: "Disclosure AI per utenti finali — banner, modal, metadati machine-readable.",
        storageKey: null,
        urgent: true,
        roles: ["provider", "deployer"],
      },
      {
        label: "L.132/2025",
        href: "/dashboard/tools/l132",
        art: "L.132/25",
        desc: "Conformità alla legge AI italiana: HR transparency, deepfake, accessibilità.",
        storageKey: "aicomply_l132_result",
        urgent: true,
        roles: ["provider", "deployer", "importer"],
      },
    ],
  },
  {
    number: 5,
    title: "Certifica & Monitora",
    subtitle: "Ottieni la dichiarazione di conformità UE e attiva il monitoraggio continuo.",
    tools: [
      {
        label: "XAI Lab",
        href: "/dashboard/modules/xai",
        art: "Art. 13",
        desc: "Analisi di spiegabilità (SHAP, LIME) e bias detection tecnico.",
        storageKey: "aicomply_xai_result",
        optional: true,
        roles: ["provider"],
      },
      {
        label: "Conformity",
        href: "/dashboard/tools/conformity",
        art: "Art. 43",
        desc: "Dichiarazione di Conformità UE e riferimento registro EUDB.",
        storageKey: "aicomply_conformity_assessment",
        roles: ["provider", "importer"],
      },
      {
        label: "Post-Market",
        href: "/dashboard/post-market",
        art: "Art. 72",
        desc: "Piano e monitoraggio post-mercato: incidenti, feedback, aggiornamenti.",
        storageKey: null,
        roles: ["provider", "deployer"],
      },
      {
        label: "Compliance Hub",
        href: "/dashboard/compliance-nexus",
        art: "Art. 71",
        desc: "Cruscotto scadenze, stato complessivo e linea del tempo normativa.",
        storageKey: null,
        roles: ["provider", "deployer", "importer", "distributor"],
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkDone(storageKey: string | null): boolean {
  if (storageKey === null || typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // Array check (e.g. literacy store, discovery sources)
    if (Array.isArray(parsed)) return parsed.length > 0;
    // Object check
    return typeof parsed === "object" && parsed !== null && Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
}

function phaseStatus(tools: RichTool[]) {
  const mandatory = tools.filter((t) => !t.optional);
  const done = mandatory.filter((t) => t.done).length;
  if (done === 0) return "pending" as const;
  if (done === mandatory.length) return "complete" as const;
  return "partial" as const;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<JourneyRole, string> = {
  all: "Tutti i ruoli",
  provider: "Provider",
  deployer: "Deployer",
  importer: "Importatore",
  distributor: "Distributore",
};

function isToolRelevant(tool: JourneyTool, role: JourneyRole): boolean {
  if (role === "all") return true;
  if (!tool.roles || tool.roles.length === 0) return true;
  return tool.roles.includes(role);
}

export default function JourneyPage() {
  const [phases, setPhases] = useState<RichPhase[]>([]);
  const [selectedRole, setSelectedRole] = useState<JourneyRole>("all");

  useEffect(() => {
    const built: RichPhase[] = PHASES.map((phase) => {
      const toolsWithStatus: RichTool[] = phase.tools.map((t) => ({
        ...t,
        done: checkDone(t.storageKey),
      }));
      return {
        ...phase,
        tools: toolsWithStatus,
        status: phaseStatus(toolsWithStatus),
      };
    });
    setPhases(built);
  }, []);

  const totalMandatory = phases.flatMap((p) => p.tools.filter((t) => !t.optional)).length;
  const totalDone = phases.flatMap((p) => p.tools.filter((t) => !t.optional && t.done)).length;
  const pct = totalMandatory > 0 ? Math.round((totalDone / totalMandatory) * 100) : 0;

  const phaseColor = {
    complete: { dot: "#15803d", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.2)", label: "Completata" },
    partial:  { dot: "#d97706", bg: "rgba(202,138,4,0.08)",  border: "rgba(202,138,4,0.2)",  label: "In corso"   },
    pending:  { dot: "rgba(0,0,0,0.2)", bg: "rgba(0,0,0,0.03)", border: "rgba(0,0,0,0.08)", label: "Da iniziare" },
  };

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1
          style={{ fontSize: "26px", fontWeight: 400, letterSpacing: "-0.8px", color: "#0D1016" }}
          className="mb-1"
        >
          Roadmap di Conformità
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.42)", lineHeight: 1.6 }}>
          Segui le 5 fasi in ordine. Ogni fase sblocca quella successiva. I tool facoltativi
          sono indicati — salta solo se non applicabili al tuo caso.
        </p>

        {/* Role filter */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Filtra per il tuo ruolo
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ROLE_LABELS) as JourneyRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: selectedRole === role ? "#0D1016" : "rgba(0,0,0,0.04)",
                  color: selectedRole === role ? "#ffffff" : "rgba(0,0,0,0.5)",
                  border: `1px solid ${selectedRole === role ? "#0D1016" : "rgba(0,0,0,0.1)"}`,
                  cursor: "pointer",
                }}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
          {selectedRole !== "all" && (
            <p className="text-[11px] text-slate-400 mt-2">
              I tool <span className="font-semibold text-slate-600">evidenziati in blu</span> sono obbligatori per{" "}
              <strong>{ROLE_LABELS[selectedRole]}</strong>. Quelli in grigio non si applicano al tuo ruolo.
            </p>
          )}
        </div>
      </div>

      {/* Global progress */}
      {phases.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-8 flex items-center gap-4"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex-1">
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] font-medium" style={{ color: "rgba(0,0,0,0.5)" }}>
                Progresso complessivo
              </span>
              <span className="text-[11px] font-semibold" style={{ color: "#0D1016" }}>
                {totalDone}/{totalMandatory} obbligatori
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.07)" }}>
              <div
                className="h-1.5 rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct >= 80 ? "#15803d" : pct >= 40 ? "#d97706" : "#dc2626",
                }}
              />
            </div>
          </div>
          <span
            className="text-[22px] font-light flex-shrink-0"
            style={{ color: "#0D1016", letterSpacing: "-1px" }}
          >
            {pct}%
          </span>
        </div>
      )}

      {/* Phases */}
      <div className="space-y-3">
        {phases.map((phase, phaseIdx) => {
          const col = phaseColor[phase.status];
          const doneMandatory = phase.tools.filter((t) => !t.optional && t.done).length;
          const totalMandatoryPhase = phase.tools.filter((t) => !t.optional).length;

          return (
            <div
              key={phase.number}
              className="rounded-xl overflow-hidden"
              style={{
                background: "#ffffff",
                border: `1px solid ${col.border}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* Phase header */}
              <div
                className="px-5 py-4 flex items-start gap-4"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: col.bg }}
              >
                {/* Number circle */}
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold mt-0.5"
                  style={{
                    background: col.dot === "rgba(0,0,0,0.2)" ? "rgba(0,0,0,0.08)" : col.dot,
                    color: col.dot === "rgba(0,0,0,0.2)" ? "rgba(0,0,0,0.35)" : "#ffffff",
                  }}
                >
                  {phase.number}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span
                      className="text-[14px] font-medium"
                      style={{ color: "#0D1016" }}
                    >
                      {phase.title}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: col.border, color: col.dot }}
                    >
                      {col.label} · {doneMandatory}/{totalMandatoryPhase}
                    </span>
                  </div>
                  <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.45)", lineHeight: 1.5 }}>
                    {phase.subtitle}
                  </p>
                </div>
              </div>

              {/* Tool list */}
              <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                {phase.tools.map((tool) => {
                  const relevant = isToolRelevant(tool, selectedRole);
                  const mandatoryForRole = selectedRole !== "all" && relevant && !tool.optional;
                  return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.015] transition-colors group"
                    style={{ opacity: selectedRole !== "all" && !relevant ? 0.38 : 1 }}
                  >
                    {/* Completion dot */}
                    <div className="flex-shrink-0">
                      {tool.done ? (
                        <CheckCircle2 className="h-4 w-4" style={{ color: "#15803d" }} />
                      ) : (
                        <Circle
                          className="h-4 w-4"
                          style={{ color: tool.urgent ? "#dc2626" : mandatoryForRole ? "#2563eb" : "rgba(0,0,0,0.2)" }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[12px] font-medium"
                          style={{ color: tool.done ? "rgba(0,0,0,0.5)" : "#0D1016" }}
                        >
                          {tool.label}
                        </span>

                        {tool.art && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: tool.urgent ? "rgba(220,38,38,0.08)" : mandatoryForRole ? "rgba(37,99,235,0.07)" : "rgba(0,0,0,0.05)",
                              color: tool.urgent ? "#dc2626" : mandatoryForRole ? "#2563eb" : "rgba(0,0,0,0.4)",
                            }}
                          >
                            {tool.art}
                          </span>
                        )}

                        {tool.urgent && !tool.done && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: "#dc2626" }}>
                            <AlertTriangle className="h-2.5 w-2.5" />
                            IN VIGORE
                          </span>
                        )}

                        {mandatoryForRole && !tool.done && !tool.urgent && (
                          <span className="text-[9px] font-semibold" style={{ color: "#2563eb" }}>
                            obbligatorio per te
                          </span>
                        )}

                        {tool.optional && (
                          <span className="text-[9px]" style={{ color: "rgba(0,0,0,0.3)" }}>
                            facoltativo
                          </span>
                        )}

                        {selectedRole !== "all" && !relevant && (
                          <span className="text-[9px]" style={{ color: "rgba(0,0,0,0.25)" }}>
                            non applicabile al tuo ruolo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(0,0,0,0.38)" }}>
                        {tool.desc}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ArrowRight
                      className="h-3.5 w-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "rgba(0,0,0,0.3)" }}
                    />
                  </Link>
                  );
                })}
              </div>

              {/* Phase connector — last phase has no connector */}
              {phaseIdx < PHASES.length - 1 && (
                <div className="flex justify-start px-5 pb-1 pt-0">
                  <div
                    className="w-px h-3 ml-3.5"
                    style={{ background: "rgba(0,0,0,0.1)" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-[11px] mt-6 text-center" style={{ color: "rgba(0,0,0,0.3)" }}>
        Il progresso viene aggiornato automaticamente ogni volta che completi un tool.
        Puoi tornare qui in qualsiasi momento per vedere lo stato aggiornato.
      </p>
    </div>
  );
}
