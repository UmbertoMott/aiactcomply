"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ChevronRight, ChevronLeft, AlertTriangle, Shield,
  CheckCircle2, Clock, ArrowRight, FileText, Zap,
  AlertOctagon, Info, ExternalLink,
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
  personalData?: "sensitive" | "personal" | "none";
  automatedDecisions?: "full" | "support" | "no";
  endUsers?: string[];
  deployment?: "eu_only" | "eu_plus" | "outside_eu";
  stage?: "development" | "production" | "update";
  riskSignals?: string[];
  isGPAI?: boolean;
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

// ─── Step IDs ─────────────────────────────────────────────────────────────────

type StepId =
  | "role" | "sector" | "outputType" | "personalData"
  | "automatedDecisions" | "endUsers" | "deployment"
  | "stage" | "riskSignals" | "result";

// ─── Logica di classificazione ────────────────────────────────────────────────

function computeTriage(answers: Answers): TriageReport {
  const {
    role, sector, outputType, personalData, automatedDecisions,
    endUsers = [], riskSignals = [], isGPAI,
  } = answers;

  const prohibited: string[] = [];

  // Art. 5 — pratiche vietate
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
          label: "Interrompi immediatamente il sistema",
          article: "Art. 5",
          deadline: "Immediato",
          href: "/dashboard/tools/prohibited",
        },
        {
          label: "Consulta un legale specializzato EU AI Act",
          article: "Art. 5",
          deadline: "Entro 48h",
          href: "/dashboard/tools/legal-assistant",
        },
      ],
      applicableArticles: [
        { article: "Art. 5", description: "Pratiche AI vietate", obligation: "Divieto assoluto di messa in opera" },
      ],
      estimatedEffortDays: 0,
      summary:
        "Il sistema presenta caratteristiche che rientrano nelle pratiche vietate dall'Art. 5 EU AI Act. Non può essere messo in opera nell'UE.",
    };
  }

  // GPAI
  if (isGPAI || outputType === "content_generation") {
    return buildGPAIReport(answers);
  }

  // Alto rischio Annex III
  const isHighRisk = checkHighRisk(sector, outputType, automatedDecisions, riskSignals, endUsers);
  if (isHighRisk) return buildHighRiskReport(answers, role || "unknown");

  // Rischio limitato Art. 50
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
        { article: "Art. 6",  description: "Classificazione alto rischio",         obligation: "Applicare tutti gli obblighi Capo III" },
        { article: "Art. 9",  description: "Sistema gestione rischio",              obligation: "Obbligatorio, continuo, documentato" },
        { article: "Art. 10", description: "Governance dei dati",                   obligation: "Qualità, provenienza, bias mitigation" },
        { article: "Art. 11", description: "Documentazione tecnica Annex IV",       obligation: "Obbligatoria prima del deploy" },
        { article: "Art. 12", description: "Logging automatico",                    obligation: "Obbligatorio per sistemi alto rischio" },
        { article: "Art. 13", description: "Trasparenza",                           obligation: "Istruzioni per l'uso, metriche performance" },
        { article: "Art. 14", description: "Supervisione umana",                    obligation: "Meccanismi di override obbligatori" },
        { article: "Art. 15", description: "Accuratezza e robustezza",              obligation: "Testing obbligatorio" },
        { article: "Art. 27", description: "FRIA",                                  obligation: "Prima del deploy per sistemi che impattano diritti fondamentali" },
        { article: "Art. 43", description: "Conformity assessment",                 obligation: "Self-assessment o notified body" },
        { article: "Art. 49", description: "Registrazione EUDB",                    obligation: "Obbligatoria per provider alto rischio" },
      ]
    : [
        { article: "Art. 26", description: "Obblighi deployer",       obligation: "9 obblighi specifici per chi usa sistemi alto rischio" },
        { article: "Art. 14", description: "Supervisione umana",       obligation: "Nomina supervisori formati" },
        { article: "Art. 12", description: "Log retention",            obligation: "Conservare log almeno 6 mesi" },
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
      { article: "Art. 51", description: "Classificazione GPAI",       obligation: "Notifica se systemic risk" },
      { article: "Art. 53", description: "Obblighi GPAI provider",     obligation: "Documentazione tecnica, copyright policy" },
      { article: "Art. 54", description: "Obblighi GPAI systemic",     obligation: "Adversarial testing, incident reporting" },
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
      { article: "Art. 5",  description: "Pratiche vietate",     obligation: "Verifica assenza (sempre obbligatorio)" },
      { article: "Art. 95", description: "Codici di condotta",   obligation: "Facoltativo ma raccomandato" },
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
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span>Domanda {current} di {total}</span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(current / total) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function OptionButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 ${
        selected
          ? "border-blue-500/60 bg-blue-500/10 text-white"
          : "border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800/70"
      }`}
    >
      <div className="font-medium text-sm">{label}</div>
      {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
    </button>
  );
}

function MultiOptionButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 flex items-start gap-3 ${
        selected
          ? "border-blue-500/60 bg-blue-500/10 text-white"
          : "border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-slate-600"
      }`}
    >
      <div
        className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded border ${
          selected ? "border-blue-400 bg-blue-500" : "border-slate-600"
        } flex items-center justify-center`}
      >
        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <div>
        <div className="font-medium text-sm">{label}</div>
        {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
      </div>
    </button>
  );
}

// ─── Report View ──────────────────────────────────────────────────────────────

function TriageReportView({ report }: { report: TriageReport }) {
  const cfg = RISK_CONFIG[report.riskTier];

  return (
    <div className="space-y-6">
      {/* Risk tier banner */}
      <div
        className="rounded-2xl p-5 border flex items-start gap-4"
        style={{ background: cfg.bg, borderColor: cfg.border }}
      >
        <div style={{ color: cfg.color }}>{cfg.icon}</div>
        <div>
          <div
            className="text-xs font-semibold tracking-widest mb-1"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{report.summary}</p>
        </div>
      </div>

      {/* Pratiche vietate */}
      {report.prohibitedFlags.length > 0 && (
        <div className="rounded-xl border border-red-500/30 p-4 space-y-2" style={{ background: "rgba(239,68,68,0.06)" }}>
          <div className="text-xs font-semibold text-red-400 tracking-wider">VIOLAZIONI RILEVATE</div>
          {report.prohibitedFlags.map((f, i) => (
            <div key={i} className="text-sm text-red-300 flex items-start gap-2">
              <AlertOctagon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      )}

      {/* Azioni urgenti */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">
          Azioni prioritarie
        </h3>
        <div className="space-y-2">
          {report.urgentActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:border-slate-600 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm text-slate-200 font-medium">{action.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span className="text-blue-400">{action.article}</span>
                    {" · "}
                    <Clock className="w-3 h-3 inline mr-0.5" />
                    {action.deadline}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Articoli applicabili */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">
          Articoli applicabili
        </h3>
        <div className="space-y-2">
          {report.applicableArticles.map((art, i) => (
            <div
              key={i}
              className="px-4 py-3 rounded-xl border border-slate-700/50 bg-slate-800/30"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-blue-400">{art.article}</span>
                <span className="text-xs text-slate-400">— {art.description}</span>
              </div>
              <p className="text-xs text-slate-500">{art.obligation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Effort */}
      {report.estimatedEffortDays > 0 && (
        <div className="px-4 py-3 rounded-xl border border-slate-700/50 bg-slate-800/30 flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-xs text-slate-400">Stima effort compliance</div>
            <div className="text-sm text-slate-200 font-medium">
              ~{report.estimatedEffortDays} giorni lavorativi
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-3 pt-2">
        <Link
          href="/dashboard/journey"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          Vai alla Roadmap completa
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/dashboard/tools/classifier"
          className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:border-slate-600 transition-colors flex items-center justify-center"
        >
          <FileText className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TriagePage() {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState<StepId>("role");
  const [report, setReport] = useState<TriageReport | null>(null);
  const [endUsers, setEndUsers] = useState<string[]>([]);
  const [riskSignals, setRiskSignals] = useState<string[]>([]);

  const TOTAL_STEPS = 9;

  const stepIndex: Record<StepId, number> = {
    role: 1, sector: 2, outputType: 3, personalData: 4,
    automatedDecisions: 5, endUsers: 6, deployment: 7,
    stage: 8, riskSignals: 9, result: 9,
  };

  const prevStep: Record<StepId, StepId> = {
    role: "role", sector: "role", outputType: "sector",
    personalData: "outputType", automatedDecisions: "personalData",
    endUsers: "automatedDecisions", deployment: "endUsers",
    stage: "deployment", riskSignals: "stage", result: "riskSignals",
  };

  function advance(updates: Partial<Answers>, nextStep: StepId) {
    const updated = { ...answers, ...updates };
    setAnswers(updated);
    if (nextStep === "result") {
      const r = computeTriage({ ...updated, endUsers, riskSignals });
      setReport(r);
      try {
        localStorage.setItem(
          "aicomply_triage_result",
          JSON.stringify({
            ...r,
            answers: { ...updated, endUsers, riskSignals },
            completedAt: new Date().toISOString(),
          }),
        );
      } catch {}
    }
    setStep(nextStep);
  }

  function toggleMulti(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  const slide = {
    initial:    { opacity: 0, x: 24 },
    animate:    { opacity: 1, x: 0  },
    exit:       { opacity: 0, x: -24 },
    transition: { duration: 0.22, ease: "easeOut" as const },
  };

  return (
    <div className="min-h-screen bg-[#0D1016] text-white">
      <div className="max-w-xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-slate-400">Triage EU AI Act</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Analisi rapida di conformità</h1>
          <p className="text-sm text-slate-400">
            9 domande per capire subito quali obblighi si applicano al tuo sistema AI.
          </p>
          {step !== "result" && (
            <div className="mt-4">
              <ProgressBar current={stepIndex[step]} total={TOTAL_STEPS} />
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* STEP 1 — Ruolo */}
          {step === "role" && (
            <motion.div key="role" {...slide} className="space-y-3">
              <h2 className="text-base font-semibold text-white mb-4">
                Qual è il tuo ruolo rispetto al sistema AI?
              </h2>
              {[
                { value: "provider",     label: "Provider",       description: "Sviluppo o commercializzo il sistema AI" },
                { value: "deployer",     label: "Deployer",       description: "Uso un sistema AI di terze parti nella mia organizzazione" },
                { value: "importer",     label: "Importatore",    description: "Porto nell'UE sistemi AI sviluppati fuori dall'UE" },
                { value: "distributor",  label: "Distributore",   description: "Distribuisco sistemi AI senza modificarli" },
                { value: "unknown",      label: "Non so ancora",  description: "Ho bisogno di capire prima il mio ruolo" },
              ].map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={answers.role === opt.value}
                  onClick={() => advance({ role: opt.value as Role }, "sector")}
                />
              ))}
            </motion.div>
          )}

          {/* STEP 2 — Settore */}
          {step === "sector" && (
            <motion.div key="sector" {...slide} className="space-y-3">
              <h2 className="text-base font-semibold text-white mb-4">
                In quale settore opera principalmente il sistema AI?
              </h2>
              {[
                { value: "hr",              label: "Risorse umane",           description: "Selezione, valutazione, gestione dipendenti" },
                { value: "health",          label: "Sanità / medicina",       description: "Diagnosi, terapia, supporto clinico" },
                { value: "education",       label: "Istruzione / formazione", description: "Valutazione studenti, tutoring, accesso a istituti" },
                { value: "finance",         label: "Servizi finanziari",      description: "Credito, assicurazioni, scoring finanziario" },
                { value: "lawenforcement",  label: "Sicurezza pubblica",      description: "Polizia, magistratura, controllo frontiere" },
                { value: "infrastructure",  label: "Infrastrutture critiche", description: "Energia, acqua, trasporti" },
                { value: "publicadmin",     label: "Pubblica amministrazione",description: "Servizi pubblici, benefici sociali" },
                { value: "other",           label: "Altro settore",           description: "Marketing, customer service, produzione, etc." },
              ].map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={answers.sector === opt.value}
                  onClick={() => advance({ sector: opt.value as Sector }, "outputType")}
                />
              ))}
            </motion.div>
          )}

          {/* STEP 3 — Tipo output */}
          {step === "outputType" && (
            <motion.div key="outputType" {...slide} className="space-y-3">
              <h2 className="text-base font-semibold text-white mb-4">
                Cosa produce o fa principalmente il sistema AI?
              </h2>
              {[
                { value: "decisions",            label: "Prende o supporta decisioni su persone",  description: "Approvazioni, rifiuti, score, raccomandazioni che impattano individui" },
                { value: "content_generation",   label: "Genera contenuti",                         description: "Testi, immagini, audio, video, codice" },
                { value: "profiling",            label: "Profila o classifica persone",             description: "Segmentazione, scoring comportamentale, predizione personalità" },
                { value: "biometric",            label: "Riconosce biometria",                      description: "Volti, voci, gesti, emozioni, impronte" },
                { value: "internal_optimization",label: "Ottimizza processi interni",               description: "Logistica, manutenzione, previsione domanda — senza impatto diretto su persone" },
                { value: "other",                label: "Altro",                                    description: "Ricerca, analisi dati aggregati, simulazioni" },
              ].map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={answers.outputType === opt.value}
                  onClick={() => advance({ outputType: opt.value as OutputType }, "personalData")}
                />
              ))}
            </motion.div>
          )}

          {/* STEP 4 — Dati personali */}
          {step === "personalData" && (
            <motion.div key="personalData" {...slide} className="space-y-3">
              <h2 className="text-base font-semibold text-white mb-4">
                Il sistema processa dati personali?
              </h2>
              {[
                { value: "sensitive", label: "Sì, dati sensibili",                   description: "Salute, etnia, orientamento sessuale, biometria, opinioni politiche, religione" },
                { value: "personal",  label: "Sì, dati personali standard",          description: "Nome, email, comportamento online, localizzazione" },
                { value: "none",      label: "No, solo dati aggregati o anonimi",    description: "Nessun dato riconducibile a individui specifici" },
              ].map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={answers.personalData === opt.value}
                  onClick={() =>
                    advance(
                      { personalData: opt.value as "sensitive" | "personal" | "none" },
                      "automatedDecisions",
                    )
                  }
                />
              ))}
            </motion.div>
          )}

          {/* STEP 5 — Decisioni automatizzate */}
          {step === "automatedDecisions" && (
            <motion.div key="automatedDecisions" {...slide} className="space-y-3">
              <h2 className="text-base font-semibold text-white mb-4">
                Il sistema prende decisioni automatizzate che impattano persone fisiche?
              </h2>
              {[
                { value: "full",    label: "Sì, decisioni completamente automatiche",   description: "L'output dell'AI è la decisione finale, senza revisione umana obbligatoria" },
                { value: "support", label: "Sì, ma supporta una decisione umana",        description: "L'AI raccomanda, un umano decide in ultima istanza" },
                { value: "no",      label: "No, non impatta direttamente persone",       description: "Uso puramente interno o tecnico" },
              ].map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={answers.automatedDecisions === opt.value}
                  onClick={() =>
                    advance(
                      { automatedDecisions: opt.value as "full" | "support" | "no" },
                      "endUsers",
                    )
                  }
                />
              ))}
            </motion.div>
          )}

          {/* STEP 6 — Utenti finali (multi-select) */}
          {step === "endUsers" && (
            <motion.div key="endUsers" {...slide} className="space-y-3">
              <h2 className="text-base font-semibold text-white mb-1">
                Chi sono gli utenti finali?{" "}
                <span className="text-slate-400 font-normal">(seleziona tutti)</span>
              </h2>
              <p className="text-xs text-slate-400 mb-3">Puoi selezionarne più di uno.</p>
              {[
                { value: "consumers",    label: "Consumatori / cittadini",  description: "Persone comuni, non professionisti del settore" },
                { value: "professionals",label: "Professionisti",           description: "Medici, avvocati, ingegneri, HR specialist" },
                { value: "employees",    label: "Dipendenti aziendali",     description: "Solo uso interno all'organizzazione" },
                { value: "minors",       label: "Minori (under 18)",        description: "Il sistema può essere usato o impattare bambini/adolescenti" },
                { value: "vulnerable",   label: "Persone vulnerabili",      description: "Anziani, persone con disabilità, minoranze" },
              ].map(opt => (
                <MultiOptionButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={endUsers.includes(opt.value)}
                  onClick={() => toggleMulti(endUsers, setEndUsers, opt.value)}
                />
              ))}
              <button
                onClick={() => advance({}, "deployment")}
                disabled={endUsers.length === 0}
                className="w-full mt-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                Continua <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* STEP 7 — Deployment */}
          {step === "deployment" && (
            <motion.div key="deployment" {...slide} className="space-y-3">
              <h2 className="text-base font-semibold text-white mb-4">
                Dove è (o sarà) deployato il sistema?
              </h2>
              {[
                { value: "eu_only",     label: "Solo nell'Unione Europea",                      description: "Utenti e infrastruttura esclusivamente in UE" },
                { value: "eu_plus",     label: "UE e altri paesi",                              description: "Presente in UE e altrove" },
                { value: "outside_eu",  label: "Fuori dall'UE ma accessibile da utenti UE",     description: "Server fuori UE ma gli utenti possono essere europei" },
              ].map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={answers.deployment === opt.value}
                  onClick={() =>
                    advance(
                      { deployment: opt.value as "eu_only" | "eu_plus" | "outside_eu" },
                      "stage",
                    )
                  }
                />
              ))}
            </motion.div>
          )}

          {/* STEP 8 — Stato */}
          {step === "stage" && (
            <motion.div key="stage" {...slide} className="space-y-3">
              <h2 className="text-base font-semibold text-white mb-4">
                A che punto è il sistema?
              </h2>
              {[
                { value: "development", label: "In fase di sviluppo",           description: "Non ancora in produzione" },
                { value: "production",  label: "Già in produzione",             description: "Gli utenti lo usano ora" },
                { value: "update",      label: "In aggiornamento sostanziale",  description: "Modifica che cambia funzioni o performance del sistema esistente" },
              ].map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={answers.stage === opt.value}
                  onClick={() =>
                    advance({ stage: opt.value as "development" | "production" | "update" }, "riskSignals")
                  }
                />
              ))}
            </motion.div>
          )}

          {/* STEP 9 — Segnali di rischio (multi-select) */}
          {step === "riskSignals" && (
            <motion.div key="riskSignals" {...slide} className="space-y-3">
              <h2 className="text-base font-semibold text-white mb-1">
                Seleziona tutti gli elementi che si applicano:
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Nessuno è obbligatorio — seleziona solo ciò che è pertinente.
              </p>
              {[
                { value: "realtime_biometric_public", label: "Identifica persone in tempo reale in spazi pubblici tramite biometria",  description: "⚠️ Potenzialmente vietato (Art. 5)" },
                { value: "emotion_workplace",          label: "Rileva emozioni in luoghi di lavoro",                                   description: "⚠️ Potenzialmente vietato (Art. 5)" },
                { value: "emotion_education",          label: "Rileva emozioni in contesti educativi",                                 description: "⚠️ Potenzialmente vietato (Art. 5)" },
                { value: "social_scoring",             label: "Assegna punteggi sociali a cittadini per conto di enti pubblici",       description: "⚠️ Vietato (Art. 5)" },
                { value: "credit_scoring",             label: "Calcola scoring creditizio o assicurativo su persone fisiche",          description: "Alto rischio — Annex III" },
                { value: "deepfake",                   label: "Genera immagini, video o audio sintetici (deepfake)",                   description: "Obbligo labeling Art. 50 + L.132/2025" },
                { value: "chatbot",                    label: "Interfaccia conversazionale con utenti (chatbot)",                      description: "Obbligo disclosure Art. 50" },
                { value: "annex3_explicit",            label: "È un sistema esplicitamente elencato nell'Annex III",                   description: "Già classificato come alto rischio" },
                { value: "subliminal_manipulation",    label: "Usa tecniche subliminali o sfrutta debolezze cognitive",               description: "⚠️ Vietato (Art. 5)" },
                { value: "vulnerable_exploitation",    label: "Sfrutta vulnerabilità specifiche di gruppi a rischio",                  description: "⚠️ Potenzialmente vietato (Art. 5)" },
                { value: "none",                       label: "Nessuno di questi elementi",                                           description: "" },
              ].map(opt => (
                <MultiOptionButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={riskSignals.includes(opt.value)}
                  onClick={() => toggleMulti(riskSignals, setRiskSignals, opt.value)}
                />
              ))}
              <button
                onClick={() => advance({}, "result")}
                className="w-full mt-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                Genera report di triage <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* RESULT */}
          {step === "result" && report && (
            <motion.div key="result" {...slide}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-white">Report di triage</h2>
                <button
                  onClick={() => {
                    setStep("role");
                    setAnswers({});
                    setEndUsers([]);
                    setRiskSignals([]);
                    setReport(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Ricomincia
                </button>
              </div>
              <TriageReportView report={report} />
            </motion.div>
          )}

        </AnimatePresence>

        {/* Back button */}
        {step !== "role" && step !== "result" && (
          <button
            onClick={() => setStep(prevStep[step])}
            className="mt-6 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Indietro
          </button>
        )}

      </div>
    </div>
  );
}
