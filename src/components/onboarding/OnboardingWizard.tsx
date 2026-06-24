"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, X, CheckCircle, AlertTriangle, AlertOctagon, Info, ExternalLink } from "lucide-react";
import {
  type Sector, type SystemType, type DevPhase,
  type DecisionContext, type CompanySize, type OnboardingData,
  type RiskResult, type ToolPathItem,
  calculateRisk,
} from "@/lib/onboarding/risk-calculator";
import { addSystem, loadInventory, nextSystemId } from "@/lib/inventory/ai-system";
import type { SystemTier, SystemStatus } from "@/lib/inventory/ai-system";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_DONE = "aicomply_onboarding_done";
const STORAGE_DATA = "aicomply_onboarding_data";

export function isOnboardingDone(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_DONE) === "true";
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const card = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const font = { fontFamily: "var(--font-inter, system-ui)" };

// ─── Step definitions ─────────────────────────────────────────────────────────
interface Step {
  id: number;
  title: string;
  subtitle: string;
  field: keyof OnboardingData;
}

const STEPS: Step[] = [
  { id: 1, field: "sector",          title: "Settore di applicazione",        subtitle: "In quale settore opera il tuo sistema AI?" },
  { id: 2, field: "systemType",      title: "Tipo di sistema",                subtitle: "Come si comporta il tuo sistema AI?" },
  { id: 3, field: "devPhase",        title: "Fase di sviluppo",               subtitle: "A che punto è il ciclo di vita del sistema?" },
  { id: 4, field: "decisionContext", title: "Contesto decisionale",           subtitle: "Come vengono usati gli output del sistema?" },
  { id: 5, field: "companySize",     title: "Dimensione aziendale",           subtitle: "Quanti dipendenti ha la tua organizzazione?" },
];

// ─── Option lists ─────────────────────────────────────────────────────────────
const SECTOR_OPTIONS: { value: Sector; label: string; sub: string }[] = [
  { value: "hr",              label: "Risorse Umane",           sub: "Selezione, promozione, licenziamento" },
  { value: "credit",          label: "Credito e finanza",       sub: "Rating, scoring, prestiti" },
  { value: "education",       label: "Istruzione",              sub: "Ammissione, valutazione studenti" },
  { value: "critical_infra",  label: "Infrastrutture critiche", sub: "Energia, acqua, trasporti" },
  { value: "law_enforcement", label: "Forze dell'ordine",       sub: "Polizia, sicurezza pubblica" },
  { value: "migration",       label: "Migrazione e asilo",      sub: "Visti, status rifugiati" },
  { value: "justice",         label: "Giustizia",               sub: "Processi, decisioni giudiziarie" },
  { value: "health",          label: "Sanità",                  sub: "Diagnosi, terapie, farmaci" },
  { value: "other",           label: "Altro",                   sub: "Settori non elencati sopra" },
];

const SYSTEM_TYPE_OPTIONS: { value: SystemType; label: string; sub: string }[] = [
  { value: "classification",    label: "Classificazione",         sub: "Categorizza input in classi definite" },
  { value: "generation",        label: "Generazione",             sub: "Crea testo, immagini o codice" },
  { value: "recommendation",    label: "Raccomandazione",         sub: "Suggerisce azioni o contenuti" },
  { value: "biometric",         label: "Biometrico",              sub: "Riconoscimento volti, voce, movimenti" },
  { value: "monitoring",        label: "Monitoraggio",            sub: "Osserva e valuta comportamenti" },
  { value: "decision_support",  label: "Supporto decisionale",    sub: "Assiste in decisioni complesse" },
  { value: "other",             label: "Altro",                   sub: "Tipologia non elencata sopra" },
];

const DEV_PHASE_OPTIONS: { value: DevPhase; label: string; sub: string }[] = [
  { value: "concept",     label: "Concept",      sub: "Idea o prototipo iniziale" },
  { value: "development", label: "Sviluppo",     sub: "In fase di costruzione" },
  { value: "testing",     label: "Test",         sub: "Validazione e sperimentazione" },
  { value: "production",  label: "Produzione",   sub: "Pronto per il deployment" },
  { value: "deployed",    label: "Deployato",    sub: "Già in uso reale" },
];

const DECISION_CONTEXT_OPTIONS: { value: DecisionContext; label: string; sub: string }[] = [
  { value: "binding",     label: "Decisione vincolante",     sub: "L'AI decide autonomamente, senza override umano" },
  { value: "assisted",    label: "Assistenza decisionale",   sub: "L'umano decide, l'AI fornisce supporto" },
  { value: "informative", label: "Solo informativo",         sub: "Output consultivo, l'umano valuta in modo indipendente" },
  { value: "internal",    label: "Uso interno",              sub: "Strumenti interni senza impatto esterno diretto" },
];

const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string; sub: string }[] = [
  { value: "micro",  label: "Micro",  sub: "Meno di 10 dipendenti" },
  { value: "small",  label: "Piccola", sub: "10–49 dipendenti" },
  { value: "medium", label: "Media",  sub: "50–249 dipendenti" },
  { value: "large",  label: "Grande", sub: "250+ dipendenti" },
];

const OPTIONS_MAP = {
  sector:          SECTOR_OPTIONS,
  systemType:      SYSTEM_TYPE_OPTIONS,
  devPhase:        DEV_PHASE_OPTIONS,
  decisionContext: DECISION_CONTEXT_OPTIONS,
  companySize:     COMPANY_SIZE_OPTIONS,
} as const;

// ─── Risk level icons ─────────────────────────────────────────────────────────
function RiskIcon({ level, size = 20 }: { level: RiskResult["level"]; size?: number }) {
  const props = { size, strokeWidth: 1.5 };
  if (level === "unacceptable") return <AlertOctagon {...props} />;
  if (level === "high")         return <AlertTriangle {...props} />;
  if (level === "limited")      return <Info {...props} />;
  return <CheckCircle {...props} />;
}

// ─── Priority badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: ToolPathItem["priority"] }) {
  const styles: Record<ToolPathItem["priority"], { bg: string; color: string; label: string }> = {
    required:    { bg: "rgba(220,38,38,0.08)",  color: "#b91c1c", label: "Obbligatorio" },
    recommended: { bg: "rgba(217,119,6,0.08)",  color: "#d97706", label: "Consigliato" },
    optional:    { bg: "rgba(0,0,0,0.05)",      color: "rgba(0,0,0,0.4)", label: "Opzionale" },
  };
  const s = styles[priority];
  return (
    <span
      className="text-[10px] font-medium rounded-full px-2 py-0.5"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0–4 = wizard steps, 5 = result
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Partial<OnboardingData>>({});
  const [result, setResult] = useState<RiskResult | null>(null);

  const step = STEPS[currentStep];
  const total = STEPS.length;
  const currentAnswer = step ? answers[step.field] : undefined;
  const canProceed = !!currentAnswer;

  const selectOption = useCallback((field: keyof OnboardingData, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value as never }));
  }, []);

  const goNext = useCallback(() => {
    if (currentStep < total - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      // All steps done — calculate risk
      const fullData = answers as OnboardingData;
      const r = calculateRisk(fullData);
      setResult(r);
      setDirection(1);
      setCurrentStep(total); // result screen
    }
  }, [currentStep, total, answers]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // ── Auto-seed helpers ────────────────────────────────────────────────────
  const SECTOR_NAMES: Record<Sector, string> = {
    hr: "Sistema AI - Risorse Umane", credit: "Sistema AI - Credito",
    education: "Sistema AI - Istruzione", critical_infra: "Sistema AI - Infrastrutture critiche",
    law_enforcement: "Sistema AI - Sicurezza pubblica", migration: "Sistema AI - Migrazione",
    justice: "Sistema AI - Giustizia", health: "Sistema AI - Sanità",
    other: "Sistema AI principale",
  };
  const RISK_TIER: Record<string, SystemTier> = {
    unacceptable: "prohibited", high: "high_risk", limited: "limited", minimal: "minimal",
  };
  const PHASE_STATUS: Record<DevPhase, SystemStatus> = {
    concept: "planned", development: "in_development", testing: "in_development",
    production: "in_development", deployed: "in_production",
  };

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_DONE, "true");
    localStorage.setItem(STORAGE_DATA, JSON.stringify(answers));
    // Auto-seed inventory with data from onboarding (only if inventory is empty)
    if (result && loadInventory().length === 0) {
      const data = answers as OnboardingData;
      addSystem({
        id:                  nextSystemId(),
        name:                SECTOR_NAMES[data.sector] ?? "Sistema AI principale",
        owner:               "",
        description:         result.summary?.slice(0, 200) ?? "",
        status:              PHASE_STATUS[data.devPhase] ?? "planned",
        euNexus:             true,
        role:                "provider",
        roleBasis:           "Ipotizzato da onboarding — verificare [verify against current AI Act text]",
        tier:                RISK_TIER[result.level] ?? "unclassified",
        tierBasis:           `${result.articleRef} — ${result.riskLabel} (calcolato da onboarding)`,
        dualRoleFlag:        false,
        obligationsAssessed: true,
        obligationsNote:     result.obligations?.join("; ") ?? "",
        nextReview:          result.deadline ?? "",
        reviewTrigger:       "Scadenza derivata dalla classificazione iniziale",
        completedObligations: [],
        createdAt:           new Date().toISOString(),
        updatedAt:           new Date().toISOString(),
        source:              "ai_draft",
      });
    }
    onComplete();
  }, [answers, onComplete, result, SECTOR_NAMES, RISK_TIER, PHASE_STATUS]);

  // Slide variants
  const variants = {
    enter:  (dir: number) => ({ x: dir * 32, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir * -32, opacity: 0 }),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ ...card, boxShadow: "0 24px 48px rgba(0,0,0,0.12)", ...font }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-0"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="pb-4">
            <p className="text-[11px] font-semibold uppercase" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
              {currentStep < total ? `Passo ${currentStep + 1} di ${total}` : "Analisi completata"}
            </p>
          </div>
          {/* Progress bar */}
          {currentStep < total && (
            <div className="flex items-center gap-1.5 pb-4">
              {STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  className="h-1 rounded-full"
                  animate={{
                    width: i <= currentStep ? 20 : 12,
                    background: i <= currentStep ? "#0D1016" : "rgba(0,0,0,0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="relative overflow-hidden" style={{ minHeight: 380 }}>
          <AnimatePresence custom={direction} mode="wait">
            {currentStep < total ? (
              /* Wizard step */
              <motion.div
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 px-6 py-5 flex flex-col"
              >
                <h2
                  className="mb-1"
                  style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.5px", color: "#0D1016" }}
                >
                  {step.title}
                </h2>
                <p className="text-[13px] mb-5" style={{ color: "rgba(0,0,0,0.45)" }}>
                  {step.subtitle}
                </p>

                <div className="grid grid-cols-1 gap-2 overflow-y-auto flex-1 pr-0.5">
                  {(OPTIONS_MAP[step.field] as { value: string; label: string; sub: string }[]).map((opt) => {
                    const selected = currentAnswer === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => selectOption(step.field, opt.value)}
                        className="flex items-start gap-3 rounded-xl px-4 py-3 text-left transition-all duration-150"
                        style={{
                          background: selected ? "rgba(13,16,22,0.04)" : "#fafafa",
                          border: selected ? "1px solid rgba(13,16,22,0.2)" : "1px solid rgba(0,0,0,0.07)",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          className="mt-0.5 h-4 w-4 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{
                            border: selected ? "5px solid #0D1016" : "1.5px solid rgba(0,0,0,0.25)",
                            transition: "all 0.15s",
                          }}
                        />
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>{opt.label}</p>
                          <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.42)" }}>{opt.sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              /* Result screen */
              <motion.div
                key="result"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 px-6 py-5 overflow-y-auto flex flex-col gap-4"
              >
                {result && (
                  <>
                    {/* Risk badge */}
                    <div
                      className="rounded-xl p-4 flex items-start gap-3"
                      style={{ background: result.riskBg, border: `1px solid ${result.riskColor}30` }}
                    >
                      <div style={{ color: result.riskColor, marginTop: 1 }}>
                        <RiskIcon level={result.level} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[13px] font-semibold"
                            style={{ color: result.riskColor }}
                          >
                            {result.riskLabel}
                          </span>
                          <span
                            className="text-[10px] font-medium rounded px-1.5 py-0.5"
                            style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.4)" }}
                          >
                            {result.articleRef}
                          </span>
                          {result.annexIII && (
                            <span
                              className="text-[10px] font-medium rounded px-1.5 py-0.5"
                              style={{ background: result.riskColor + "15", color: result.riskColor }}
                            >
                              Allegato III
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: "#0D1016", opacity: 0.7 }}>
                          {result.summary}
                        </p>
                      </div>
                    </div>

                    {/* Obligations */}
                    <div>
                      <p
                        className="text-[10px] font-semibold uppercase mb-2"
                        style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}
                      >
                        Obblighi principali
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {result.obligations.map((ob, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "rgba(0,0,0,0.65)" }}>
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: result.riskColor }} />
                            {ob}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tool path */}
                    {result.toolPath.length > 0 && (
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase mb-2"
                          style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}
                        >
                          Percorso consigliato
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {result.toolPath.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                              style={card}
                            >
                              <span
                                className="text-[11px] font-semibold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}
                              >
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>{item.tool}</p>
                                <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.42)" }}>{item.reason}</p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span
                                  className="text-[10px] rounded px-1.5 py-0.5"
                                  style={{ background: "#f5f5f4", color: "rgba(0,0,0,0.35)" }}
                                >
                                  {item.art}
                                </span>
                                <PriorityBadge priority={item.priority} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deadline */}
                    {result.level !== "minimal" && (
                      <div
                        className="rounded-lg px-3 py-2.5 flex items-center gap-2"
                        style={{ background: "#f5f5f4" }}
                      >
                        <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.4)" }}>Scadenza normativa:</span>
                        <span className="text-[11px] font-semibold" style={{ color: "#0D1016" }}>
                          {new Date(result.deadline).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        <ExternalLink size={10} style={{ color: "rgba(0,0,0,0.3)", marginLeft: "auto" }} />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
        >
          {currentStep > 0 && currentStep < total ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-60"
              style={{ color: "rgba(0,0,0,0.45)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <ArrowLeft size={14} />
              Indietro
            </button>
          ) : (
            <div />
          )}

          {currentStep < total ? (
            <button
              onClick={goNext}
              disabled={!canProceed}
              className="flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-150"
              style={{
                background: canProceed ? "#0D1016" : "rgba(0,0,0,0.08)",
                color: canProceed ? "#ffffff" : "rgba(0,0,0,0.25)",
                border: "none",
                cursor: canProceed ? "pointer" : "not-allowed",
              }}
            >
              {currentStep === total - 1 ? "Calcola rischio" : "Continua"}
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-150 hover:opacity-85"
              style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}
            >
              Vai alla dashboard
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
