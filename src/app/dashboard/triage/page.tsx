"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult, OrgProfile } from "@/lib/dossier/storage-schema";
import {
  ChevronRight, ChevronLeft, AlertTriangle, Shield,
  CheckCircle2, ArrowRight, FileText, Zap,
  AlertOctagon, Info, BookOpen, Save,
} from "lucide-react";

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Role = "provider" | "deployer" | "importer" | "distributor" | "unknown";
type Sector =
  | "hr" | "health" | "education" | "finance" | "lawenforcement"
  | "infrastructure" | "publicadmin" | "other";
type OutputType =
  | "decisions" | "content_generation" | "profiling" | "biometric"
  | "internal_optimization" | "other";
type RiskTier = "prohibited" | "high" | "limited" | "minimal" | "gpai";

interface Answers {
  role?: Role;
  sector?: Sector;
  outputType?: OutputType;
  isGPAI?: boolean;
  personalData?: "sensitive" | "personal" | "none";
  automatedDecisions?: "full" | "support" | "no";
  endUsers?: string[];
  deployment?: "eu_only" | "eu_plus" | "outside_eu";
  stage?: "development" | "production" | "update";
  riskSignals?: string[];
}

interface TriageReport {
  riskTier: RiskTier;
  roleConfirmed: Role;
  urgentActions: { label: string; article: string; deadline: string; href: string }[];
  applicableArticles: { article: string; description: string; obligation: string }[];
  estimatedEffortDays: number;
  summary: string;
  prohibitedFlags: string[];
}

// ─── Macro-aree (4 step + result) ────────────────────────────────────────────

type AreaId = "context" | "system" | "people" | "deployment" | "result";

// ─── Logica di classificazione ────────────────────────────────────────────────

function computeTriage(answers: Answers): TriageReport {
  const {
    role, sector, outputType, personalData, automatedDecisions,
    endUsers = [], riskSignals = [], isGPAI,
  } = answers;

  const prohibited: string[] = [];

  if (riskSignals.includes("emotion_workplace") || riskSignals.includes("emotion_education"))
    prohibited.push("Riconoscimento emozioni in luoghi di lavoro/istruzione — Art. 5(1)(f)");
  if (riskSignals.includes("realtime_biometric_public"))
    prohibited.push("Identificazione biometrica in tempo reale in spazi pubblici — Art. 5(1)(b)");
  if (riskSignals.includes("social_scoring"))
    prohibited.push("Social scoring pubblico — Art. 5(1)(c)");
  if (riskSignals.includes("subliminal_manipulation"))
    prohibited.push("Manipolazione subliminale — Art. 5(1)(a)");
  if (riskSignals.includes("vulnerable_exploitation"))
    prohibited.push("Sfruttamento di vulnerabilità — Art. 5(1)(a)");

  if (prohibited.length > 0) {
    return {
      riskTier: "prohibited",
      roleConfirmed: role || "unknown",
      prohibitedFlags: prohibited,
      urgentActions: [
        {
          label: "Consulta un legale specializzato EU AI Act",
          article: "Art. 5",
          deadline: "Entro 48h",
          href: "/dashboard/tools/legal-assistant",
        },
        {
          label: "Rivedi l'architettura del sistema",
          article: "Art. 5",
          deadline: "Prima del deploy",
          href: "/dashboard/tools/classifier",
        },
      ],
      applicableArticles: [
        { article: "Art. 5", description: "Pratiche AI vietate", obligation: "Divieto assoluto di messa in opera" },
      ],
      estimatedEffortDays: 0,
      summary:
        "Il sistema presenta caratteristiche che rientrano nelle pratiche vietate dall'Art. 5 EU AI Act. Non può essere messo in opera nell'UE nella forma attuale.",
    };
  }

  if (isGPAI || outputType === "content_generation") {
    return buildGPAIReport(answers);
  }

  const isHighRisk = checkHighRisk(sector, outputType, automatedDecisions, riskSignals, endUsers);
  if (isHighRisk) return buildHighRiskReport(answers, role || "unknown");

  if (riskSignals.includes("deepfake") || riskSignals.includes("chatbot")) {
    return buildLimitedReport(answers, role || "unknown");
  }

  return buildMinimalReport(answers, role || "unknown");
}

function checkHighRisk(
  sector?: Sector,
  outputType?: OutputType,
  automatedDecisions?: string,
  riskSignals?: string[],
  endUsers?: string[],
): boolean {
  if (sector === "hr" && (automatedDecisions === "full" || automatedDecisions === "support")) return true;
  if (sector === "health") return true;
  if (sector === "education" && automatedDecisions !== "no") return true;
  if (sector === "finance" && riskSignals?.includes("credit_scoring")) return true;
  if (sector === "lawenforcement") return true;
  if (outputType === "biometric") return true;
  if (outputType === "profiling" && endUsers?.includes("consumers")) return true;
  if (riskSignals?.includes("annex3_explicit")) return true;
  return false;
}

function buildHighRiskReport(answers: Answers, role: Role): TriageReport {
  const isProvider = role === "provider";
  const isDeployer = role === "deployer";

  const urgentActions: TriageReport["urgentActions"] = [];

  urgentActions.push({
    label: "Completa l'AI Classifier (Art. 6 pathway)",
    article: "Art. 6",
    deadline: "Prima del deploy",
    href: "/dashboard/tools/classifier",
  });

  if (isProvider) {
    urgentActions.push({
      label: "Avvia gestione del rischio (Art. 9)",
      article: "Art. 9",
      deadline: "Prima del deploy",
      href: "/dashboard/tools/risk-manager",
    });
    urgentActions.push({
      label: "Genera documentazione tecnica Annex IV (Art. 11)",
      article: "Art. 11",
      deadline: "Prima del deploy",
      href: "/dashboard/tools/docugen",
    });
    urgentActions.push({
      label: "Configura LogVault per logging automatico (Art. 12)",
      article: "Art. 12",
      deadline: "Alla messa in opera",
      href: "/dashboard/tools/logvault",
    });
    urgentActions.push({
      label: "Completa la FRIA (Art. 27)",
      article: "Art. 27",
      deadline: "Prima del deploy",
      href: "/dashboard/tools/fria",
    });
  }

  if (isDeployer) {
    urgentActions.push({
      label: "Verifica obblighi deployer (Art. 26)",
      article: "Art. 26",
      deadline: "Prima dell'uso",
      href: "/dashboard/tools/deployer",
    });
    urgentActions.push({
      label: "Configura supervisione umana (Art. 14)",
      article: "Art. 14",
      deadline: "Prima dell'uso",
      href: "/dashboard/tools/oversight",
    });
  }

  const articles: TriageReport["applicableArticles"] = isProvider
    ? [
        { article: "Art. 6",  description: "Classificazione alto rischio",   obligation: "Applicare tutti gli obblighi Capo III" },
        { article: "Art. 9",  description: "Sistema gestione rischio",        obligation: "Obbligatorio, continuo, documentato" },
        { article: "Art. 10", description: "Governance dei dati",             obligation: "Qualità, provenienza, bias mitigation" },
        { article: "Art. 11", description: "Documentazione tecnica Annex IV", obligation: "Obbligatoria prima del deploy" },
        { article: "Art. 12", description: "Logging automatico",              obligation: "Obbligatorio per sistemi alto rischio" },
        { article: "Art. 13", description: "Trasparenza",                     obligation: "Istruzioni per l'uso, metriche performance" },
        { article: "Art. 14", description: "Supervisione umana",              obligation: "Meccanismi di override obbligatori" },
        { article: "Art. 15", description: "Accuratezza e robustezza",        obligation: "Testing obbligatorio" },
        { article: "Art. 27", description: "FRIA",                            obligation: "Prima del deploy per sistemi che impattano diritti fondamentali" },
        { article: "Art. 43", description: "Conformity assessment",           obligation: "Self-assessment o notified body" },
        { article: "Art. 49", description: "Registrazione EUDB",              obligation: "Obbligatoria per provider alto rischio" },
      ]
    : [
        { article: "Art. 26", description: "Obblighi deployer",  obligation: "9 obblighi specifici per chi usa sistemi alto rischio" },
        { article: "Art. 14", description: "Supervisione umana", obligation: "Nomina supervisori formati" },
        { article: "Art. 12", description: "Log retention",      obligation: "Conservare log almeno 6 mesi" },
      ];

  return {
    riskTier: "high",
    roleConfirmed: role,
    prohibitedFlags: [],
    urgentActions: urgentActions.slice(0, 5),
    applicableArticles: articles,
    estimatedEffortDays: isProvider ? 60 : 20,
    summary: `Sistema classificato ad ${
      isProvider ? "ALTO RISCHIO — provider" : "ALTO RISCHIO — deployer"
    }. ${
      isProvider
        ? "Obblighi completi del Capo III applicabili."
        : "Applica Art. 26 e verifica le condizioni di uso."
    }`,
  };
}

function buildGPAIReport(answers: Answers): TriageReport {
  return {
    riskTier: "gpai",
    roleConfirmed: answers.role || "provider",
    prohibitedFlags: [],
    urgentActions: [
      {
        label: "Verifica se il modello supera 10²⁵ FLOPS (systemic risk)",
        article: "Art. 51",
        deadline: "Subito",
        href: "/dashboard/tools/gpai",
      },
      {
        label: "Prepara documentazione tecnica modello",
        article: "Art. 53",
        deadline: "Prima della distribuzione",
        href: "/dashboard/tools/docugen",
      },
      {
        label: "Verifica aderenza al Code of Practice GPAI",
        article: "Art. 56",
        deadline: "Entro 2026",
        href: "/dashboard/tools/gpai",
      },
    ],
    applicableArticles: [
      { article: "Art. 51", description: "Classificazione GPAI",   obligation: "Notifica se systemic risk" },
      { article: "Art. 53", description: "Obblighi GPAI provider", obligation: "Documentazione tecnica, copyright policy" },
      { article: "Art. 54", description: "Obblighi GPAI systemic", obligation: "Adversarial testing, incident reporting" },
    ],
    estimatedEffortDays: 30,
    summary:
      "Modello AI a uso generale (GPAI). Applicano Art. 51-55. Se supera la soglia di calcolo → rischio sistemico con obblighi aggiuntivi.",
  };
}

function buildLimitedReport(answers: Answers, role: Role): TriageReport {
  return {
    riskTier: "limited",
    roleConfirmed: role,
    prohibitedFlags: [],
    urgentActions: [
      {
        label: "Implementa disclosure Art. 50 (chatbot/contenuti AI)",
        article: "Art. 50",
        deadline: "2 dicembre 2026",
        href: "/dashboard/tools/art50-kit",
      },
      {
        label: "Labeling contenuti sintetici (deepfake)",
        article: "Art. 50(4)",
        deadline: "2 dicembre 2026",
        href: "/dashboard/tools/art50-kit",
      },
    ],
    applicableArticles: [
      {
        article: "Art. 50",
        description: "Obblighi trasparenza sistemi limitati",
        obligation: "Disclosure obbligatoria per chatbot e media sintetici",
      },
    ],
    estimatedEffortDays: 5,
    summary:
      "Sistema a rischio limitato. L'obbligo principale è la disclosure all'utente (Art. 50). Deadline: 2 dicembre 2026.",
  };
}

function buildMinimalReport(answers: Answers, role: Role): TriageReport {
  return {
    riskTier: "minimal",
    roleConfirmed: role,
    prohibitedFlags: [],
    urgentActions: [
      {
        label: "Verifica assenza pratiche vietate Art. 5",
        article: "Art. 5",
        deadline: "In vigore ora",
        href: "/dashboard/tools/prohibited",
      },
      {
        label: "Considera adozione volontaria Codice di Condotta",
        article: "Art. 95",
        deadline: "Facoltativo",
        href: "/dashboard/tools/qms",
      },
    ],
    applicableArticles: [
      { article: "Art. 5",  description: "Pratiche vietate",   obligation: "Verifica assenza (sempre obbligatorio)" },
      { article: "Art. 95", description: "Codici di condotta", obligation: "Facoltativo ma raccomandato" },
    ],
    estimatedEffortDays: 2,
    summary:
      "Sistema a rischio minimale. Nessun obbligo specifico oltre alla verifica Art. 5. Puoi adottare volontariamente un codice di condotta.",
  };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<
  RiskTier,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  prohibited: {
    label: "PRATICA VIETATA",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.3)",
    icon: <AlertOctagon className="w-6 h-6" />,
  },
  high: {
    label: "ALTO RISCHIO",
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.3)",
    icon: <AlertTriangle className="w-6 h-6" />,
  },
  gpai: {
    label: "GPAI",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.3)",
    icon: <Zap className="w-6 h-6" />,
  },
  limited: {
    label: "RISCHIO LIMITATO",
    color: "#eab308",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.3)",
    icon: <Info className="w-6 h-6" />,
  },
  minimal: {
    label: "RISCHIO MINIMALE",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.3)",
    icon: <CheckCircle2 className="w-6 h-6" />,
  },
};

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
        <div
          className="h-full rounded-full bg-[#0D1016] transition-all duration-500"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color: "rgba(0,0,0,0.40)" }}>
        {current}/{total}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(0,0,0,0.40)" }}>
      {children}
    </p>
  );
}

function OptionButton({
  label, description, selected, onClick,
}: {
  label: string; description: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={selected
        ? { border: "1px solid #0D1016", background: "rgba(0,0,0,0.04)", borderRadius: 12 }
        : { border: "1px solid rgba(0,0,0,0.07)", background: "#ffffff", borderRadius: 12 }
      }
      className="w-full text-left px-4 py-3 transition-all duration-150 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: "#0D1016" }}>
            {label}
          </p>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: "rgba(0,0,0,0.40)" }}>{description}</p>
          )}
        </div>
        {selected && (
          <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "#0D1016" }}>
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        )}
      </div>
    </button>
  );
}

function MultiOptionButton({
  label, description, selected, onClick,
}: {
  label: string; description: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={selected
        ? { border: "1px solid #0D1016", background: "rgba(0,0,0,0.04)", borderRadius: 12 }
        : { border: "1px solid rgba(0,0,0,0.07)", background: "#ffffff", borderRadius: 12 }
      }
      className="w-full text-left px-4 py-3 transition-all duration-150 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-colors"
          style={selected
            ? { background: "#0D1016", border: "1px solid #0D1016" }
            : { border: "1px solid rgba(0,0,0,0.20)", background: "white" }
          }
        >
          {selected && (
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="currentColor">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "#0D1016" }}>
            {label}
          </p>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: "rgba(0,0,0,0.40)" }}>{description}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Report view ──────────────────────────────────────────────────────────────

function ProhibitedDraftView({
  report,
  onSaveDraft,
  draftSaved,
}: {
  report: TriageReport;
  onSaveDraft: () => void;
  draftSaved: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Banner principale */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.3)",
        }}
      >
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400 mb-1">
              PRATICA VIETATA — Art. 5 EU AI Act
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.65)" }}>
              Il sistema presenta caratteristiche incompatibili con il Regolamento UE 2024/1689.
              <strong style={{ color: "#0D1016" }}> Non può essere messo in opera nell'UE nella forma attuale.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Punti di violazione evidenziati */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(0,0,0,0.40)" }}>
          Violazioni rilevate
        </p>
        <div className="space-y-2">
          {report.prohibitedFlags.map((flag, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
              <p className="text-xs" style={{ color: "rgba(0,0,0,0.65)" }}>{flag}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cosa fare */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(0,0,0,0.40)" }}>
          Prossimi passi consigliati
        </p>
        <div className="space-y-2">
          {report.urgentActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:shadow-sm"
              style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#ffffff" }}
            >
              <div>
                <p className="text-xs font-medium" style={{ color: "#0D1016" }}>{action.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.40)" }}>{action.article} · {action.deadline}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.30)" }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Salva bozza */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-start gap-3">
          <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "rgba(0,0,0,0.40)" }} />
          <div className="flex-1">
            <p className="text-xs font-medium mb-1" style={{ color: "#0D1016" }}>
              Salva come bozza per revisione legale
            </p>
            <p className="text-[11px] mb-3" style={{ color: "rgba(0,0,0,0.40)" }}>
              Puoi salvare questo report come bozza con le violazioni evidenziate
              e condividerlo con il tuo consulente legale prima di qualunque modifica al sistema.
            </p>
            {draftSaved ? (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Bozza salvata localmente
              </div>
            ) : (
              <button
                onClick={onSaveDraft}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-medium transition-colors hover:opacity-90"
                style={{ background: "#0D1016" }}
              >
                <Save className="w-3.5 h-3.5" />
                Salva bozza
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TriageReportView({ report }: { report: TriageReport }) {
  const cfg = RISK_CONFIG[report.riskTier];

  return (
    <div className="space-y-4">
      {/* Tier badge */}
      <div
        className="rounded-xl p-4"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span style={{ color: cfg.color }}>{cfg.icon}</span>
          <span className="text-sm font-bold" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.65)" }}>{report.summary}</p>
      </div>

      {/* Effort */}
      {report.estimatedEffortDays > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}>
          <FileText className="w-3.5 h-3.5" style={{ color: "rgba(0,0,0,0.40)" }} />
          <p className="text-xs" style={{ color: "rgba(0,0,0,0.40)" }}>
            Effort stimato:
            <span className="ml-1 font-semibold" style={{ color: "#0D1016" }}>
              ~{report.estimatedEffortDays} giorni lavorativi
            </span>
          </p>
        </div>
      )}

      {/* Azioni urgenti */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(0,0,0,0.40)" }}>
          Azioni prioritarie
        </p>
        <div className="space-y-2">
          {report.urgentActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:shadow-sm"
              style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#ffffff" }}
            >
              <div>
                <p className="text-xs font-medium" style={{ color: "#0D1016" }}>{action.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.40)" }}>
                  {action.article} · {action.deadline}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.30)" }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Articoli applicabili */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(0,0,0,0.40)" }}>
          Articoli applicabili
        </p>
        <div className="space-y-1.5">
          {report.applicableArticles.map((a, i) => (
            <div
              key={i}
              className="rounded-lg px-3 py-2"
              style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold" style={{ color: "#0D1016" }}>
                  {a.article}
                </span>
                <span className="text-xs" style={{ color: "rgba(0,0,0,0.65)" }}>{a.description}</span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.40)" }}>{a.obligation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-2 pt-1">
        <Link
          href="/dashboard/journey"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          Vai alla Roadmap
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/dashboard/tools/classifier"
          className="px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-center hover:shadow-sm"
          style={{ border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.04)", color: "#0D1016" }}
        >
          <FileText className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ─── Area label component ─────────────────────────────────────────────────────

function AreaStep({
  index, label, active,
}: {
  index: number; label: string; active: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: active ? "#0D1016" : "rgba(0,0,0,0.35)" }}>
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={active
          ? { background: "#0D1016", color: "white" }
          : { background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.35)" }
        }
      >
        {index}
      </div>
      <span className={active ? "font-medium" : ""}>{label}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TriagePage() {
  const [area, setArea] = useState<AreaId>("context");
  const [report, setReport] = useState<TriageReport | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  // Area 1 — Contesto
  const [role, setRole] = useState<Role | null>(null);
  const [sector, setSector] = useState<Sector | null>(null);

  // Area 2 — Sistema
  const [outputType, setOutputType] = useState<OutputType | null>(null);
  const [isGPAI, setIsGPAI] = useState<boolean | null>(null);

  // Area 3 — Persone (skip per distributor/importer)
  const [personalData, setPersonalData] = useState<"sensitive" | "personal" | "none" | null>(null);
  const [automatedDecisions, setAutomatedDecisions] = useState<"full" | "support" | "no" | null>(null);
  const [endUsers, setEndUsers] = useState<string[]>([]);

  // Area 4 — Deployment
  const [deployment, setDeployment] = useState<"eu_only" | "eu_plus" | "outside_eu" | null>(null);
  const [stage, setStage] = useState<"development" | "production" | "update" | null>(null);
  const [riskSignals, setRiskSignals] = useState<string[]>([]);

  // Conditional logic: distributor/importer skip Area 3
  const skipPeopleArea = role === "distributor" || role === "importer";
  // Skip automatedDecisions if outputType = internal_optimization or no personal data
  const skipAutomatedDecisions = outputType === "internal_optimization" || personalData === "none";

  const TOTAL_AREAS = skipPeopleArea ? 3 : 4;
  const areaIndex: Record<AreaId, number> = {
    context: 1,
    system: 2,
    people: skipPeopleArea ? 2 : 3,
    deployment: skipPeopleArea ? 3 : 4,
    result: skipPeopleArea ? 3 : 4,
  };

  function goToArea(next: AreaId) {
    if (next === "result") {
      const answers: Answers = {
        role: role || undefined,
        sector: sector || undefined,
        outputType: outputType || undefined,
        isGPAI: isGPAI ?? false,
        personalData: skipPeopleArea ? undefined : (personalData || undefined),
        automatedDecisions: (skipPeopleArea || skipAutomatedDecisions) ? undefined : (automatedDecisions || undefined),
        endUsers: skipPeopleArea ? [] : endUsers,
        deployment: deployment || undefined,
        stage: stage || undefined,
        riskSignals,
      };
      const newReport = computeTriage(answers);
      setReport(newReport);
      // Auto-sync to classifier when triage result is computed
      if (next === "result") {
        syncToClassifier(newReport, answers);
      }
    }
    setArea(next);
  }

  function saveDraft() {
    if (!report) return;
    try {
      localStorage.setItem(
        "aicomply_triage_draft",
        JSON.stringify({
          ...report,
          status: "draft",
          savedAt: new Date().toISOString(),
        }),
      );
      setDraftSaved(true);
    } catch {}
    // Sync to shared classifier slot so Risk Manager, Journey, NIST-RMF can read it
    const currentAnswers: Answers = { role: role ?? undefined, sector: sector ?? undefined };
    syncToClassifier(report, currentAnswers);
  }

  function syncToClassifier(r: TriageReport, a: Answers) {
    try {
      const existing = readFromStorage<ClassifierResult>("classifier");
      const tierToLevel: Record<string, ClassifierResult["riskLevel"]> = {
        prohibited: "unacceptable",
        high: "high",
        gpai: "limited",
        limited: "limited",
        minimal: "minimal",
      };
      const classifierData: ClassifierResult = {
        systemName: existing?.systemName || "Sistema AI",
        systemDescription: existing?.systemDescription || (a.sector ? `Settore: ${a.sector}` : ""),
        riskLevel: tierToLevel[r.riskTier] ?? "limited",
        annexIII: r.riskTier === "high",
        annexI: false,
        applicableArticles: r.applicableArticles.map((x) => x.article),
        completedAt: new Date().toISOString(),
      };
      writeToStorage<ClassifierResult>("classifier", classifierData);
      // Aggiorna gpaiDetected in OrgProfile se il tier è GPAI
      if (r.riskTier === "gpai") {
        const orgProfile = readFromStorage<OrgProfile>("orgProfile") ?? {
          paItaly: false, gpaiDetected: false, nistEnabled: false
        };
        writeToStorage<OrgProfile>("orgProfile", { ...orgProfile, gpaiDetected: true });
      }
    } catch {}
  }

  function toggleSignal(val: string) {
    if (val === "none") {
      setRiskSignals(["none"]);
      return;
    }
    const filtered = riskSignals.filter(s => s !== "none");
    setRiskSignals(
      filtered.includes(val) ? filtered.filter(x => x !== val) : [...filtered, val],
    );
  }

  function reset() {
    setArea("context");
    setReport(null);
    setDraftSaved(false);
    setRole(null); setSector(null);
    setOutputType(null); setIsGPAI(null);
    setPersonalData(null); setAutomatedDecisions(null); setEndUsers([]);
    setDeployment(null); setStage(null); setRiskSignals([]);
  }

  const slide = {
    initial:    { opacity: 0, x: 24 },
    animate:    { opacity: 1, x: 0  },
    exit:       { opacity: 0, x: -24 },
    transition: { duration: 0.22, ease: "easeOut" as const },
  };

  const areaLabels = skipPeopleArea
    ? ["Ruolo & settore", "Il sistema", "Deployment"]
    : ["Ruolo & settore", "Il sistema", "Persone & dati", "Deployment"];

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF9", color: "#0D1016" }}>
      <div className="max-w-xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5" style={{ color: "#0D1016" }} />
            <span className="text-sm font-medium" style={{ color: "rgba(0,0,0,0.40)" }}>Triage EU AI Act</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#0D1016" }}>Analisi rapida di conformità</h1>
          <p className="text-sm" style={{ color: "rgba(0,0,0,0.40)" }}>
            4 aree tematiche per capire quali obblighi si applicano al tuo sistema AI.
          </p>

          {/* Step tracker */}
          {area !== "result" && (
            <div className="mt-5">
              <ProgressBar current={areaIndex[area]} total={TOTAL_AREAS} />
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {areaLabels.map((label, i) => (
                  <AreaStep
                    key={i}
                    index={i + 1}
                    label={label}
                    active={areaIndex[area] === i + 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* ── AREA 1 — Ruolo & Settore ─────────────────────────────────────── */}
          {area === "context" && (
            <motion.div key="context" {...slide} className="space-y-5">
              <div>
                <SectionLabel>Qual è il tuo ruolo?</SectionLabel>
                <div className="space-y-2">
                  {[
                    { value: "provider",    label: "Provider",      description: "Sviluppo o commercializzo il sistema AI" },
                    { value: "deployer",    label: "Deployer",      description: "Uso un sistema AI di terze parti nella mia organizzazione" },
                    { value: "importer",    label: "Importatore",   description: "Porto nell'UE sistemi AI sviluppati fuori dall'UE" },
                    { value: "distributor", label: "Distributore",  description: "Distribuisco sistemi AI senza modificarli" },
                    { value: "unknown",     label: "Non so ancora", description: "Ho bisogno di capire prima il mio ruolo" },
                  ].map(opt => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      description={opt.description}
                      selected={role === opt.value}
                      onClick={() => setRole(opt.value as Role)}
                    />
                  ))}
                </div>
              </div>

              {role && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SectionLabel>Settore di operatività</SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: "hr",             label: "Risorse umane",            description: "Selezione, valutazione, gestione dipendenti" },
                      { value: "health",         label: "Sanità / medicina",         description: "Diagnosi, terapia, supporto clinico" },
                      { value: "education",      label: "Istruzione / formazione",   description: "Valutazione studenti, tutoring, accesso a istituti" },
                      { value: "finance",        label: "Servizi finanziari",         description: "Credito, assicurazioni, scoring finanziario" },
                      { value: "lawenforcement", label: "Sicurezza pubblica",         description: "Polizia, magistratura, controllo frontiere" },
                      { value: "infrastructure", label: "Infrastrutture critiche",    description: "Energia, acqua, trasporti" },
                      { value: "publicadmin",    label: "Pubblica amministrazione",   description: "Servizi pubblici, benefici sociali" },
                      { value: "other",          label: "Altro settore",              description: "Marketing, customer service, produzione, etc." },
                    ].map(opt => (
                      <OptionButton
                        key={opt.value}
                        label={opt.label}
                        description={opt.description}
                        selected={sector === opt.value}
                        onClick={() => setSector(opt.value as Sector)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {role && sector && (
                <button
                  onClick={() => goToArea("system")}
                  className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Continua <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {(role === "distributor" || role === "importer") && (
                <div
                  className="rounded-lg px-3 py-2.5 flex items-start gap-2"
                  style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}
                >
                  <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.50)" }}>
                    Come <strong style={{ color: "#0D1016" }}>{role === "distributor" ? "Distributore" : "Importatore"}</strong>, le domande sui dati di addestramento e sui soggetti impattati non si applicano — saranno saltate automaticamente.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── AREA 2 — Il sistema ──────────────────────────────────────────── */}
          {area === "system" && (
            <motion.div key="system" {...slide} className="space-y-5">
              <div>
                <SectionLabel>Cosa produce principalmente il sistema?</SectionLabel>
                <div className="space-y-2">
                  {[
                    { value: "decisions",            label: "Decisioni su persone",        description: "Approvazioni, rifiuti, score che impattano individui" },
                    { value: "content_generation",   label: "Genera contenuti",             description: "Testi, immagini, audio, video, codice" },
                    { value: "profiling",            label: "Profila o classifica persone", description: "Segmentazione, scoring comportamentale" },
                    { value: "biometric",            label: "Riconosce biometria",          description: "Volti, voci, gesti, emozioni, impronte" },
                    { value: "internal_optimization",label: "Ottimizza processi interni",   description: "Logistica, manutenzione — senza impatto diretto su persone" },
                    { value: "other",                label: "Altro",                        description: "Ricerca, analisi dati aggregati, simulazioni" },
                  ].map(opt => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      description={opt.description}
                      selected={outputType === opt.value}
                      onClick={() => setOutputType(opt.value as OutputType)}
                    />
                  ))}
                </div>
              </div>

              {outputType && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SectionLabel>È un modello AI a uso generale (GPAI)?</SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: true,  label: "Sì, è un modello fondazionale / GPAI", description: "Addestrato su larga scala, usabile per molteplici task (es. LLM, diffusion model)" },
                      { value: false, label: "No, è un sistema AI specifico",         description: "Progettato per uno scopo preciso e limitato" },
                    ].map(opt => (
                      <OptionButton
                        key={String(opt.value)}
                        label={opt.label}
                        description={opt.description}
                        selected={isGPAI === opt.value}
                        onClick={() => setIsGPAI(opt.value)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {outputType && isGPAI !== null && (
                <button
                  onClick={() => goToArea(skipPeopleArea ? "deployment" : "people")}
                  className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Continua <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}

          {/* ── AREA 3 — Persone & dati (skip per distributor/importer) ─────── */}
          {area === "people" && !skipPeopleArea && (
            <motion.div key="people" {...slide} className="space-y-5">
              <div>
                <SectionLabel>Il sistema processa dati personali?</SectionLabel>
                <div className="space-y-2">
                  {[
                    { value: "sensitive", label: "Sì, dati sensibili",                  description: "Salute, etnia, biometria, opinioni politiche, religione" },
                    { value: "personal",  label: "Sì, dati personali standard",          description: "Nome, email, comportamento online, localizzazione" },
                    { value: "none",      label: "No, solo dati aggregati o anonimi",    description: "Nessun dato riconducibile a individui specifici" },
                  ].map(opt => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      description={opt.description}
                      selected={personalData === opt.value}
                      onClick={() => setPersonalData(opt.value as "sensitive" | "personal" | "none")}
                    />
                  ))}
                </div>
              </div>

              {personalData && !skipAutomatedDecisions && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SectionLabel>Il sistema prende decisioni automatizzate su persone?</SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: "full",    label: "Sì, decisioni completamente automatiche",  description: "L'output AI è la decisione finale, senza revisione umana obbligatoria" },
                      { value: "support", label: "Sì, ma supporta una decisione umana",       description: "L'AI raccomanda, un umano decide in ultima istanza" },
                      { value: "no",      label: "No, non impatta direttamente persone",      description: "Uso puramente interno o tecnico" },
                    ].map(opt => (
                      <OptionButton
                        key={opt.value}
                        label={opt.label}
                        description={opt.description}
                        selected={automatedDecisions === opt.value}
                        onClick={() => setAutomatedDecisions(opt.value as "full" | "support" | "no")}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {personalData && (skipAutomatedDecisions || automatedDecisions) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SectionLabel>
                    Chi sono gli utenti finali?{" "}
                    <span className="normal-case font-normal" style={{color:"rgba(0,0,0,0.35)"}}>(seleziona tutti)</span>
                  </SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: "consumers",     label: "Consumatori / cittadini", description: "Persone comuni, non professionisti del settore" },
                      { value: "professionals", label: "Professionisti",           description: "Medici, avvocati, ingegneri, HR specialist" },
                      { value: "employees",     label: "Dipendenti aziendali",     description: "Solo uso interno all'organizzazione" },
                      { value: "minors",        label: "Minori (under 18)",        description: "Il sistema può essere usato o impattare bambini/adolescenti" },
                      { value: "vulnerable",    label: "Persone vulnerabili",      description: "Anziani, persone con disabilità, minoranze" },
                    ].map(opt => (
                      <MultiOptionButton
                        key={opt.value}
                        label={opt.label}
                        description={opt.description}
                        selected={endUsers.includes(opt.value)}
                        onClick={() =>
                          setEndUsers(endUsers.includes(opt.value)
                            ? endUsers.filter(x => x !== opt.value)
                            : [...endUsers, opt.value])
                        }
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {personalData && (skipAutomatedDecisions || automatedDecisions) && endUsers.length > 0 && (
                <button
                  onClick={() => goToArea("deployment")}
                  className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Continua <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}

          {/* ── AREA 4 — Deployment & segnali ───────────────────────────────── */}
          {area === "deployment" && (
            <motion.div key="deployment" {...slide} className="space-y-5">
              <div>
                <SectionLabel>Dove è deployato il sistema?</SectionLabel>
                <div className="space-y-2">
                  {[
                    { value: "eu_only",    label: "Solo nell'Unione Europea",                    description: "Utenti e infrastruttura esclusivamente in UE" },
                    { value: "eu_plus",    label: "UE e altri paesi",                             description: "Presente in UE e altrove" },
                    { value: "outside_eu", label: "Fuori dall'UE ma accessibile da utenti UE",    description: "Server fuori UE ma gli utenti possono essere europei" },
                  ].map(opt => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      description={opt.description}
                      selected={deployment === opt.value}
                      onClick={() => setDeployment(opt.value as "eu_only" | "eu_plus" | "outside_eu")}
                    />
                  ))}
                </div>
              </div>

              {deployment && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SectionLabel>A che punto è il sistema?</SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: "development", label: "In fase di sviluppo",          description: "Non ancora in produzione" },
                      { value: "production",  label: "Già in produzione",             description: "Gli utenti lo usano ora" },
                      { value: "update",      label: "In aggiornamento sostanziale",  description: "Modifica che cambia funzioni o performance del sistema esistente" },
                    ].map(opt => (
                      <OptionButton
                        key={opt.value}
                        label={opt.label}
                        description={opt.description}
                        selected={stage === opt.value}
                        onClick={() => setStage(opt.value as "development" | "production" | "update")}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {deployment && stage && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SectionLabel>
                    Segnali di rischio{" "}
                    <span className="normal-case font-normal" style={{color:"rgba(0,0,0,0.35)"}}>(seleziona tutti i pertinenti)</span>
                  </SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: "realtime_biometric_public", label: "Identifica persone in tempo reale in spazi pubblici tramite biometria",  description: "⚠️ Potenzialmente vietato — Art. 5" },
                      { value: "emotion_workplace",          label: "Rileva emozioni in luoghi di lavoro",                                   description: "⚠️ Potenzialmente vietato — Art. 5" },
                      { value: "emotion_education",          label: "Rileva emozioni in contesti educativi",                                 description: "⚠️ Potenzialmente vietato — Art. 5" },
                      { value: "social_scoring",             label: "Assegna punteggi sociali a cittadini per conto di enti pubblici",       description: "⚠️ Vietato — Art. 5" },
                      { value: "subliminal_manipulation",    label: "Usa tecniche subliminali o sfrutta debolezze cognitive",               description: "⚠️ Vietato — Art. 5" },
                      { value: "vulnerable_exploitation",    label: "Sfrutta vulnerabilità specifiche di gruppi a rischio",                  description: "⚠️ Potenzialmente vietato — Art. 5" },
                      { value: "credit_scoring",             label: "Calcola scoring creditizio o assicurativo su persone fisiche",          description: "Alto rischio — Annex III" },
                      { value: "deepfake",                   label: "Genera immagini, video o audio sintetici (deepfake)",                   description: "Obbligo labeling — Art. 50" },
                      { value: "chatbot",                    label: "Interfaccia conversazionale con utenti (chatbot)",                      description: "Obbligo disclosure — Art. 50" },
                      { value: "annex3_explicit",            label: "È un sistema esplicitamente elencato nell'Annex III",                   description: "Già classificato alto rischio" },
                      { value: "none",                       label: "Nessuno di questi elementi",                                           description: "" },
                    ].map(opt => (
                      <MultiOptionButton
                        key={opt.value}
                        label={opt.label}
                        description={opt.description}
                        selected={riskSignals.includes(opt.value)}
                        onClick={() => toggleSignal(opt.value)}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => goToArea("result")}
                    disabled={riskSignals.length === 0}
                    className="w-full mt-3 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Genera report di triage <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── RESULT ──────────────────────────────────────────────────────── */}
          {area === "result" && report && (
            <motion.div key="result" {...slide}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold" style={{ color: "#0D1016" }}>Report di triage</h2>
                <button
                  onClick={reset}
                  className="text-xs transition-colors"
                  style={{ color: "rgba(0,0,0,0.40)" }}
                >
                  Ricomincia
                </button>
              </div>

              {report.riskTier === "prohibited" ? (
                <ProhibitedDraftView
                  report={report}
                  onSaveDraft={saveDraft}
                  draftSaved={draftSaved}
                />
              ) : (
                <TriageReportView report={report} />
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* Back button */}
        {area !== "context" && area !== "result" && (
          <button
            onClick={() => {
              if (area === "system") setArea("context");
              else if (area === "people") setArea("system");
              else if (area === "deployment") setArea(skipPeopleArea ? "system" : "people");
            }}
            className="mt-6 flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "rgba(0,0,0,0.40)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Indietro
          </button>
        )}

      </div>
    </div>
  );
}
