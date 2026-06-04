"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Building2, ChevronRight, CheckCircle2,
  GitBranch, FileText, Shield, AlertTriangle,
  BarChart3, Scale, Activity, ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileType = "startup_dev" | "enterprise_dpo" | null;
type RiskTier    = "high" | "limited" | "minimal" | "gpai" | null;
type Urgency     = "immediate" | "planning" | "exploring" | null;

interface CopilotAnswers {
  profile:  ProfileType;
  riskTier: RiskTier;
  urgency:  Urgency;
}

interface RoadmapStep {
  id:          string;
  title:       string;
  description: string;
  href:        string;
  icon:        React.ReactNode;
  priority:    "critical" | "high" | "medium";
  article:     string;
  done:        boolean;
}

// ─── Tool paths per profilo ───────────────────────────────────────────────────

function buildRoadmap(answers: CopilotAnswers, doneTools: string[]): RoadmapStep[] {
  const isDone = (id: string) => doneTools.includes(id);

  if (answers.profile === "startup_dev") {
    const steps: RoadmapStep[] = [
      {
        id: "classifier",
        title: "1. Classifica il tuo sistema AI",
        description: "Scopri se sei ad alto rischio, limitato o minimale. Base di tutto.",
        href: "/dashboard/tools/classifier",
        icon: <BarChart3 className="h-4 w-4" />,
        priority: "critical",
        article: "Art. 6",
        done: isDone("classifier"),
      },
      {
        id: "scanner",
        title: "2. Scanner Art. 50 pubblico",
        description: "Scansione rapida del tuo sistema. Zero registrazione.",
        href: "/scanner",
        icon: <Zap className="h-4 w-4" />,
        priority: "critical",
        article: "Art. 50",
        done: isDone("scanner"),
      },
      {
        id: "docugen",
        title: "3. Genera il Technical File",
        description: "Annex IV obbligatorio per sistemi ad alto rischio.",
        href: "/dashboard/tools/docugen",
        icon: <FileText className="h-4 w-4" />,
        priority: answers.riskTier === "high" ? "critical" : "high",
        article: "Art. 11",
        done: isDone("docugen"),
      },
      {
        id: "transparency",
        title: "4. Configura disclosure AI",
        description: "Implementa i requisiti di trasparenza verso gli utenti.",
        href: "/dashboard/tools/transparency",
        icon: <Shield className="h-4 w-4" />,
        priority: "high",
        article: "Art. 50",
        done: isDone("transparency"),
      },
      {
        id: "logvault",
        title: "5. Attiva LogVault",
        description: "Logging automatico obbligatorio per sistemi ad alto rischio.",
        href: "/dashboard/tools/logvault",
        icon: <Activity className="h-4 w-4" />,
        priority: answers.riskTier === "high" ? "high" : "medium",
        article: "Art. 12",
        done: isDone("logvault"),
      },
    ];
    return steps;
  }

  // Enterprise / DPO flow
  return [
    {
      id: "classifier",
      title: "1. Classifica tutti i sistemi AI",
      description: "Mappa completa del portfolio AI dell'organizzazione.",
      href: "/dashboard/tools/classifier",
      icon: <BarChart3 className="h-4 w-4" />,
      priority: "critical",
      article: "Art. 6",
      done: isDone("classifier"),
    },
    {
      id: "fria",
      title: "2. FRIA — Valutazione diritti fondamentali",
      description: "Obbligatoria per sistemi ad alto rischio.",
      href: "/dashboard/tools/fria",
      icon: <Scale className="h-4 w-4" />,
      priority: "critical",
      article: "Art. 27",
      done: isDone("fria"),
    },
    {
      id: "dpia",
      title: "3. DPIA integrata",
      description: "Valutazione impatto privacy per sistemi con dati personali.",
      href: "/dashboard/tools/dpia",
      icon: <Shield className="h-4 w-4" />,
      priority: "critical",
      article: "GDPR Art. 35",
      done: isDone("dpia"),
    },
    {
      id: "qms",
      title: "4. Sistema di Gestione Qualità",
      description: "QMS obbligatorio per provider di sistemi ad alto rischio.",
      href: "/dashboard/tools/qms",
      icon: <CheckCircle2 className="h-4 w-4" />,
      priority: "high",
      article: "Art. 17",
      done: isDone("qms"),
    },
    {
      id: "l132",
      title: "5. MOG 231 + L.132/2025 Italia",
      description: "Protocolli anticollusione AI e compliance italiana.",
      href: "/dashboard/tools/l132",
      icon: <Building2 className="h-4 w-4" />,
      priority: "high",
      article: "D.Lgs. 231",
      done: isDone("l132"),
    },
    {
      id: "docugen",
      title: "6. Technical File Annex IV",
      description: "Documentazione tecnica completa per sistemi ad alto rischio.",
      href: "/dashboard/tools/docugen",
      icon: <FileText className="h-4 w-4" />,
      priority: "high",
      article: "Art. 11",
      done: isDone("docugen"),
    },
    {
      id: "logvault",
      title: "7. LogVault + monitoraggio continuo",
      description: "Audit trail automatico e alerting compliance.",
      href: "/dashboard/tools/logvault",
      icon: <Activity className="h-4 w-4" />,
      priority: "medium",
      article: "Art. 12",
      done: isDone("logvault"),
    },
    {
      id: "conformity",
      title: "8. Dichiarazione di Conformità UE",
      description: "Art. 47 — documento legale finale prima del deploy.",
      href: "/dashboard/tools/conformity",
      icon: <GitBranch className="h-4 w-4" />,
      priority: "medium",
      article: "Art. 47",
      done: isDone("conformity"),
    },
  ];
}

// ─── Priority styling ─────────────────────────────────────────────────────────

const PRIORITY_STYLE = {
  critical: { bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.15)", text: "#dc2626", label: "Critico" },
  high:     { bg: "rgba(202,138,4,0.07)",  border: "rgba(202,138,4,0.15)",  text: "#b45309", label: "Alto" },
  medium:   { bg: "rgba(59,130,246,0.07)", border: "rgba(59,130,246,0.12)", text: "#2563eb", label: "Medio" },
};

// ─── Question components ──────────────────────────────────────────────────────

function QuestionCard({
  question, options, onSelect, selected,
}: {
  question: string;
  options: { value: string; label: string; description: string; icon: React.ReactNode }[];
  onSelect: (v: string) => void;
  selected: string | null;
}) {
  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-1" style={{ color: "#0D1016", letterSpacing: "-0.5px" }}>
        {question}
      </h2>
      <p className="text-[13px] mb-5" style={{ color: "rgba(0,0,0,0.45)" }}>
        Scegli l'opzione più vicina alla tua situazione
      </p>
      <div className="space-y-3">
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className="w-full flex items-start gap-4 rounded-xl p-4 text-left transition-all"
              style={{
                background: active ? "rgba(13,16,22,0.04)" : "#fff",
                border: `1.5px solid ${active ? "#0D1016" : "rgba(0,0,0,0.08)"}`,
                boxShadow: active ? "0 0 0 3px rgba(13,16,22,0.06)" : "none",
              }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: active ? "#0D1016" : "rgba(0,0,0,0.05)", color: active ? "#fff" : "rgba(0,0,0,0.45)" }}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium mb-0.5" style={{ color: "#0D1016" }}>{opt.label}</p>
                <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.45)" }}>{opt.description}</p>
              </div>
              {active && <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-1" style={{ color: "#0D1016" }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const COPILOT_KEY = "copilot_answers";
const DONE_TOOLS_KEY = "copilot_done_tools";

export default function CopilotPage() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0=q1, 1=q2, 2=q3, 3=roadmap
  const [answers, setAnswers] = useState<CopilotAnswers>({ profile: null, riskTier: null, urgency: null });
  const [doneTools, setDoneTools] = useState<string[]>([]);

  // Carica stato salvato
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COPILOT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CopilotAnswers;
        setAnswers(parsed);
        if (parsed.profile && parsed.riskTier && parsed.urgency) setStep(3);
      }
      const savedDone = localStorage.getItem(DONE_TOOLS_KEY);
      if (savedDone) setDoneTools(JSON.parse(savedDone));
    } catch { /* ignore */ }
  }, []);

  function saveAnswers(next: CopilotAnswers) {
    setAnswers(next);
    localStorage.setItem(COPILOT_KEY, JSON.stringify(next));
  }

  function markDone(toolId: string) {
    const next = [...new Set([...doneTools, toolId])];
    setDoneTools(next);
    localStorage.setItem(DONE_TOOLS_KEY, JSON.stringify(next));
  }

  function reset() {
    setAnswers({ profile: null, riskTier: null, urgency: null });
    setStep(0);
    localStorage.removeItem(COPILOT_KEY);
  }

  const roadmap = step === 3 && answers.profile ? buildRoadmap(answers, doneTools) : [];
  const completedCount = roadmap.filter((s) => s.done).length;
  const progressPct = roadmap.length > 0 ? Math.round((completedCount / roadmap.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto pb-16" style={{ fontFamily: "var(--font-inter, system-ui)" }}>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 text-[11px] font-medium"
          style={{ background: "rgba(13,16,22,0.06)", color: "rgba(0,0,0,0.5)" }}>
          <Zap className="h-3 w-3" /> Compliance Copilot
        </div>
        <h1 className="text-[26px] font-semibold mb-2" style={{ color: "#0D1016", letterSpacing: "-0.8px" }}>
          Il tuo percorso di conformità
        </h1>
        <p className="text-[14px]" style={{ color: "rgba(0,0,0,0.45)" }}>
          3 domande — poi ti mostro esattamente cosa fare e in quale ordine.
        </p>
      </div>

      {/* Progress bar wizard */}
      {step < 3 && (
        <div className="flex items-center gap-2 mb-8">
          {([0, 1, 2] as const).map((i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ background: "#0D1016", width: step > i ? "100%" : step === i ? "50%" : "0%" }} />
            </div>
          ))}
          <span className="text-[11px] ml-1" style={{ color: "rgba(0,0,0,0.35)" }}>
            {step + 1}/3
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* Step 0 — Profilo */}
        {step === 0 && (
          <motion.div key="q0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuestionCard
              question="Chi sei in relazione all'AI Act?"
              options={[
                {
                  value: "startup_dev",
                  label: "Startup / Sviluppatore",
                  description: "Sviluppo o distribuisco sistemi AI. Voglio capire cosa devo fare e farlo velocemente.",
                  icon: <GitBranch className="h-4 w-4" />,
                },
                {
                  value: "enterprise_dpo",
                  label: "Enterprise / DPO / Compliance",
                  description: "Gestisco la conformità di un'organizzazione. Ho bisogno di un processo strutturato.",
                  icon: <Building2 className="h-4 w-4" />,
                },
              ]}
              selected={answers.profile}
              onSelect={(v) => {
                saveAnswers({ ...answers, profile: v as ProfileType });
                setTimeout(() => setStep(1), 300);
              }}
            />
          </motion.div>
        )}

        {/* Step 1 — Tier di rischio */}
        {step === 1 && (
          <motion.div key="q1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuestionCard
              question="Che tipo di sistema AI hai?"
              options={[
                {
                  value: "high",
                  label: "Alto rischio (Annex III)",
                  description: "HR, sanità, istruzione, infrastrutture critiche, processi giudiziari, biometria.",
                  icon: <AlertTriangle className="h-4 w-4" />,
                },
                {
                  value: "gpai",
                  label: "Modello AI general purpose (GPAI)",
                  description: "Modello base o modello con impatto sistemico (>10^25 FLOPs).",
                  icon: <Zap className="h-4 w-4" />,
                },
                {
                  value: "limited",
                  label: "Rischio limitato",
                  description: "Chatbot, sistema generativo di contenuti, deepfake — obblighi di trasparenza.",
                  icon: <Shield className="h-4 w-4" />,
                },
                {
                  value: "minimal",
                  label: "Rischio minimale / Non so ancora",
                  description: "Spam filter, giochi, AI non critica — pochi obblighi formali.",
                  icon: <CheckCircle2 className="h-4 w-4" />,
                },
              ]}
              selected={answers.riskTier}
              onSelect={(v) => {
                saveAnswers({ ...answers, riskTier: v as RiskTier });
                setTimeout(() => setStep(2), 300);
              }}
            />
            <button onClick={() => setStep(0)} className="mt-4 text-[12px]" style={{ color: "rgba(0,0,0,0.35)" }}>
              ← Indietro
            </button>
          </motion.div>
        )}

        {/* Step 2 — Urgenza */}
        {step === 2 && (
          <motion.div key="q2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuestionCard
              question="Qual è la tua situazione temporale?"
              options={[
                {
                  value: "immediate",
                  label: "Devo essere conforme subito",
                  description: "Il sistema è già in produzione o va deployato a breve. Priorità massima.",
                  icon: <AlertTriangle className="h-4 w-4" />,
                },
                {
                  value: "planning",
                  label: "Sto pianificando la conformità",
                  description: "Ho qualche mese. Voglio fare le cose per bene con un piano strutturato.",
                  icon: <FileText className="h-4 w-4" />,
                },
                {
                  value: "exploring",
                  label: "Sto esplorando i requisiti",
                  description: "Capire cosa comporta l'AI Act prima di impegnarmi.",
                  icon: <BarChart3 className="h-4 w-4" />,
                },
              ]}
              selected={answers.urgency}
              onSelect={(v) => {
                saveAnswers({ ...answers, urgency: v as Urgency });
                setTimeout(() => setStep(3), 300);
              }}
            />
            <button onClick={() => setStep(1)} className="mt-4 text-[12px]" style={{ color: "rgba(0,0,0,0.35)" }}>
              ← Indietro
            </button>
          </motion.div>
        )}

        {/* Step 3 — Roadmap personalizzata */}
        {step === 3 && (
          <motion.div key="roadmap" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

            {/* Summary badge */}
            <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-6"
              style={{ background: "#0D1016", color: "#fff" }}>
              <div>
                <p className="text-[12px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Percorso personalizzato per te
                </p>
                <p className="text-[15px] font-semibold">
                  {answers.profile === "startup_dev" ? "Startup / Developer" : "Enterprise / DPO"} ·{" "}
                  {answers.riskTier === "high" ? "Alto rischio" :
                   answers.riskTier === "gpai" ? "GPAI" :
                   answers.riskTier === "limited" ? "Rischio limitato" : "Rischio minimale"}
                </p>
              </div>
              <button onClick={reset} className="text-[11px] px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                Ricomincia
              </button>
            </div>

            {/* Progress */}
            <div className="rounded-xl p-4 mb-5"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
                  Completamento percorso
                </span>
                <span className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>
                  {completedCount}/{roadmap.length} step
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ background: progressPct === 100 ? "#16a34a" : "#0D1016" }}
                />
              </div>
              {progressPct === 100 && (
                <p className="text-[12px] mt-2 font-medium" style={{ color: "#16a34a" }}>
                  ✓ Percorso completato — ottimo lavoro!
                </p>
              )}
            </div>

            {/* Roadmap steps */}
            <div className="space-y-3">
              {roadmap.map((s) => {
                const style = PRIORITY_STYLE[s.priority];
                return (
                  <div key={s.id} className="rounded-xl overflow-hidden"
                    style={{ background: "#fff", border: `1px solid ${s.done ? "rgba(22,163,74,0.2)" : "rgba(0,0,0,0.07)"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                    <div className="flex items-center gap-4 p-4">

                      {/* Status circle */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: s.done ? "rgba(22,163,74,0.1)" : style.bg,
                          border: `1.5px solid ${s.done ? "rgba(22,163,74,0.3)" : style.border}`,
                          color: s.done ? "#16a34a" : style.text,
                        }}>
                        {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[13px] font-medium" style={{ color: s.done ? "rgba(0,0,0,0.4)" : "#0D1016" }}>
                            {s.title}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                            {style.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.4)" }}>
                            {s.article}
                          </span>
                        </div>
                        <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.45)" }}>{s.description}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!s.done && (
                          <button
                            onClick={() => markDone(s.id)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                            style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}
                          >
                            ✓ Fatto
                          </button>
                        )}
                        <button
                          onClick={() => router.push(s.href)}
                          className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                          style={{ background: s.done ? "rgba(0,0,0,0.04)" : "#0D1016", color: s.done ? "rgba(0,0,0,0.4)" : "#fff" }}
                        >
                          {s.done ? "Rivedi" : "Vai"} <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Urgency alert */}
            {answers.urgency === "immediate" && (
              <div className="mt-5 rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.15)" }}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
                <div>
                  <p className="text-[13px] font-medium mb-0.5" style={{ color: "#dc2626" }}>
                    Urgenza alta — scadenza agosto 2026
                  </p>
                  <p className="text-[12px]" style={{ color: "rgba(220,38,38,0.8)" }}>
                    Inizia dai passi "Critico" — sono i requisiti minimi per operare legalmente.
                  </p>
                </div>
              </div>
            )}

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
