"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult, OrgProfile } from "@/lib/dossier/storage-schema";
import {
  ChevronRight, ChevronLeft, AlertTriangle, Crosshair,
  CheckCircle2, ArrowRight, FileText,
  AlertOctagon, Info, BookOpen, Save, Ban, Zap,
} from "lucide-react";
import { classify, type ClassifyAnswers, type ClassifyResult, type ClassificationOutcome } from "@/lib/classifier/classify";
import { ART5_PRACTICES, ANNEX_III_AREAS, ART63_EXCEPTIONS, ANNEX_I_PRODUCTS } from "@/lib/classifier/classifier-rules";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.28)",
  border:  "rgba(0,0,0,0.07)",
  card:    "#ffffff",
  bg:      "#FAFAF9",
  red:     "#dc2626",
  redBg:   "rgba(220,38,38,0.06)",
  redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#d97706",
  amberBg: "rgba(245,158,11,0.06)",
  green:   "#15803d",
  greenBg: "rgba(22,163,74,0.06)",
} as const;

// ─── Tipi locali ──────────────────────────────────────────────────────────────

type Role = "provider" | "deployer" | "importer" | "distributor" | "authorized_rep" | "product_manufacturer" | "unknown";
type AreaId = "scope" | "system" | "highrisk" | "transparency" | "result";

// ─── Outcome → display config ─────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<ClassificationOutcome, {
  label: string; color: string; bg: string; border: string;
  icon: React.ReactNode; estimatedDays: number;
}> = {
  out_of_scope: {
    label: "FUORI AMBITO AI ACT",
    color: T.green,
    bg: T.greenBg,
    border: "rgba(21,128,61,0.25)",
    icon: <CheckCircle2 className="w-6 h-6" />,
    estimatedDays: 0,
  },
  not_ai_system: {
    label: "NON È UN SISTEMA AI",
    color: T.green,
    bg: T.greenBg,
    border: "rgba(21,128,61,0.25)",
    icon: <CheckCircle2 className="w-6 h-6" />,
    estimatedDays: 0,
  },
  prohibited: {
    label: "PRATICA VIETATA — ART. 5",
    color: T.red,
    bg: T.redBg,
    border: T.redBdr,
    icon: <AlertOctagon className="w-6 h-6" />,
    estimatedDays: 0,
  },
  high_risk_annex_i: {
    label: "ALTO RISCHIO — ALLEGATO I",
    color: T.amber,
    bg: T.amberBg,
    border: "rgba(245,158,11,0.28)",
    icon: <AlertTriangle className="w-6 h-6" />,
    estimatedDays: 60,
  },
  high_risk_annex_iii: {
    label: "ALTO RISCHIO — ALLEGATO III",
    color: T.amber,
    bg: T.amberBg,
    border: "rgba(245,158,11,0.28)",
    icon: <AlertTriangle className="w-6 h-6" />,
    estimatedDays: 60,
  },
  limited: {
    label: "RISCHIO LIMITATO",
    color: "#b45309",
    bg: "rgba(180,83,9,0.06)",
    border: "rgba(180,83,9,0.22)",
    icon: <Info className="w-6 h-6" />,
    estimatedDays: 5,
  },
  minimal: {
    label: "RISCHIO MINIMALE",
    color: T.green,
    bg: T.greenBg,
    border: "rgba(21,128,61,0.25)",
    icon: <CheckCircle2 className="w-6 h-6" />,
    estimatedDays: 2,
  },
};

// ─── Mappa outcome → ClassifierResult.riskLevel ───────────────────────────────

function outcomeToRiskLevel(o: ClassificationOutcome): ClassifierResult["riskLevel"] {
  if (o === "prohibited" || o === "out_of_scope") return "unacceptable";
  if (o === "high_risk_annex_i" || o === "high_risk_annex_iii") return "high";
  if (o === "limited") return "limited";
  return "minimal";
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(current / total) * 100}%`, background: T.text }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color: T.muted }}>
        {current}/{total}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: T.muted }}>
      {children}
    </p>
  );
}

function OptionButton({ label, description, selected, onClick }: {
  label: string; description?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={selected
        ? { border: `1px solid ${T.text}`, background: "rgba(0,0,0,0.04)", borderRadius: 12 }
        : { border: `1px solid ${T.border}`, background: T.card, borderRadius: 12 }
      }
      className="w-full text-left px-4 py-3 transition-all duration-150 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: T.text }}>{label}</p>
          {description && <p className="text-xs mt-0.5" style={{ color: T.muted }}>{description}</p>}
        </div>
        {selected && (
          <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: T.text }}>
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        )}
      </div>
    </button>
  );
}

function MultiOptionButton({ label, description, selected, onClick, warn }: {
  label: string; description?: string; selected: boolean; onClick: () => void; warn?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={selected
        ? { border: `1px solid ${warn ? T.red : T.text}`, background: warn ? T.redBg : "rgba(0,0,0,0.04)", borderRadius: 12 }
        : { border: `1px solid ${T.border}`, background: T.card, borderRadius: 12 }
      }
      className="w-full text-left px-4 py-3 transition-all duration-150 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-colors"
          style={selected
            ? { background: warn ? T.red : T.text, border: `1px solid ${warn ? T.red : T.text}` }
            : { border: "1px solid rgba(0,0,0,0.20)", background: "white" }
          }
        >
          {selected && (
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="currentColor">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium" style={{ color: T.text }}>{label}</p>
          {description && <p className="text-xs mt-0.5" style={{ color: warn ? T.red : T.muted }}>{description}</p>}
        </div>
      </div>
    </button>
  );
}

function AreaStep({ index, label, active }: { index: number; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: active ? T.text : T.muted }}>
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={active ? { background: T.text, color: "white" } : { background: "rgba(0,0,0,0.06)", color: T.muted }}
      >
        {index}
      </div>
      <span className={active ? "font-medium" : ""}>{label}</span>
    </div>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────

function ResultView({
  result, onSaveDraft, draftSaved, onReset,
}: {
  result: ClassifyResult; onSaveDraft: () => void; draftSaved: boolean; onReset: () => void;
}) {
  const cfg = OUTCOME_CONFIG[result.outcome];

  return (
    <div className="space-y-4">
      {/* Outcome badge */}
      <div className="rounded-xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
        <div className="flex items-center gap-3 mb-2">
          <span style={{ color: cfg.color }}>{cfg.icon}</span>
          <div>
            <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
            {result.gpai && (
              <span
                className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,0,0,0.07)", color: T.text, fontFamily: "monospace" }}
              >
                + GPAI
              </span>
            )}
            {result.gpaiSystemic && (
              <span
                className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBdr}`, fontFamily: "monospace" }}
              >
                RISCHIO SISTEMICO
              </span>
            )}
          </div>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.65)" }}>{result.rationale}</p>
        <p className="text-[10px] mt-2 italic" style={{ color: T.faint }}>{result.legalNote}</p>
      </div>

      {/* Pratiche vietate dettaglio */}
      {result.prohibitedPractices.length > 0 && (
        <div>
          <SectionLabel>Violazioni Art. 5 rilevate</SectionLabel>
          <div className="space-y-2">
            {result.prohibitedPractices.map(p => (
              <div key={p.letter} className="rounded-lg px-3 py-2.5" style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
                <div className="flex items-start gap-2.5">
                  <Ban className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: T.red }}>({p.letter}) {p.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>{p.ref}</p>
                    {p.exceptions && p.exceptions.length > 0 && (
                      <p className="text-[10px] mt-1" style={{ color: T.muted }}>
                        <em>Eccezioni tassative: {p.exceptions.join("; ")}</em>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profilazione override */}
      {result.profilingOverride && (
        <div className="rounded-lg px-3 py-2.5" style={{ background: T.amberBg, border: "1px solid rgba(245,158,11,0.28)" }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: T.amber }}>
            Override Art. 6(3) — profilazione rilevata
          </p>
          <p className="text-[10px]" style={{ color: T.muted }}>
            La presenza di profilazione di persone fisiche blocca l&apos;applicazione di qualsiasi eccezione Art. 6(3): il sistema resta classificato ad alto rischio. [verifica]
          </p>
        </div>
      )}

      {/* Eccezione 6(3) applicata */}
      {result.exception63Applied && (
        <div className="rounded-lg px-3 py-2.5" style={{ background: T.greenBg, border: "1px solid rgba(21,128,61,0.25)" }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: T.green }}>
            Eccezione Art. 6(3) applicata — {result.exception63Applied.label}
          </p>
          <p className="text-[10px]" style={{ color: T.muted }}>
            {result.exception63Applied.ref} · Obbligo di documentare la valutazione di esenzione. [verifica]
          </p>
        </div>
      )}

      {/* Annex III aree */}
      {result.annexIIIAreas.length > 0 && (
        <div>
          <SectionLabel>Aree Allegato III coinvolte</SectionLabel>
          <div className="space-y-1.5">
            {result.annexIIIAreas.map(a => (
              <div key={a.id} className="rounded-lg px-3 py-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <p className="text-xs font-semibold" style={{ color: T.text }}>§{a.id} — {a.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>{a.ref}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allegato I */}
      {result.annexIProduct && (
        <div className="rounded-lg px-3 py-2.5" style={{ background: T.amberBg, border: "1px solid rgba(245,158,11,0.28)" }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: T.amber }}>Allegato I — {result.annexIProduct}</p>
          <p className="text-[10px]" style={{ color: T.muted }}>Percorso Art. 6(1): obblighi alto rischio applicabili. [verifica]</p>
        </div>
      )}

      {/* Trasparenza Art. 50 */}
      {result.transparencyObligations.length > 0 && (
        <div>
          <SectionLabel>Obblighi trasparenza Art. 50</SectionLabel>
          <div className="space-y-1.5">
            {result.transparencyObligations.map((o, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: T.text }} />
                <p className="text-xs" style={{ color: T.muted }}>{o}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Effort */}
      {cfg.estimatedDays > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <FileText className="w-3.5 h-3.5" style={{ color: T.muted }} />
          <p className="text-xs" style={{ color: T.muted }}>
            Effort stimato:
            <span className="ml-1 font-semibold" style={{ color: T.text }}>~{cfg.estimatedDays} giorni lavorativi</span>
          </p>
        </div>
      )}

      {/* Articoli e obblighi */}
      {result.obligations.length > 0 && (
        <div>
          <SectionLabel>Obblighi applicabili</SectionLabel>
          <div className="space-y-1.5">
            {result.obligations.map((o, i) => (
              <div key={i} className="rounded-lg px-3 py-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold" style={{ color: T.text }}>{o.article}</span>
                  <span className="text-xs" style={{ color: "rgba(0,0,0,0.65)" }}>{o.description}</span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>{o.obligation}</p>
                {o.toolHref && (
                  <Link href={o.toolHref} className="text-[10px] font-semibold underline mt-0.5 block" style={{ color: T.text }}>
                    Vai al tool →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-2 pt-1">
        <Link
          href="/dashboard/journey"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium transition-colors hover:opacity-90"
          style={{ background: T.text }}
        >
          Vai alla Roadmap <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/dashboard/tools/classifier"
          className="px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-center hover:shadow-sm"
          style={{ border: `1px solid ${T.border}`, background: "rgba(0,0,0,0.04)", color: T.text }}
        >
          <FileText className="w-4 h-4" />
        </Link>
      </div>

      {/* Salva bozza / nuovo triage */}
      <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex items-start gap-3">
          <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.muted }} />
          <div className="flex-1">
            <p className="text-xs font-medium mb-1" style={{ color: T.text }}>Salva risultato per revisione</p>
            <p className="text-[11px] mb-3" style={{ color: T.muted }}>
              Salva localmente questo report e condividilo con il tuo consulente.
            </p>
            {draftSaved ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: T.green }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Salvato
              </div>
            ) : (
              <button onClick={onSaveDraft} className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-medium hover:opacity-90" style={{ background: T.text }}>
                <Save className="w-3.5 h-3.5" /> Salva bozza
              </button>
            )}
          </div>
        </div>
      </div>

      <button onClick={onReset} className="w-full text-xs py-2 rounded-lg" style={{ color: T.muted, border: `1px solid ${T.border}` }}>
        ← Ricomincia triage
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TriagePage() {
  const [area, setArea]             = useState<AreaId>("scope");
  const [result, setResult]         = useState<ClassifyResult | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  // ── Area 1: Ambito & Ruolo ─────────────────────────────────────────────────
  const [scopeExclusions, setScopeExclusions] = useState<string[]>([]);
  const [isAISystem, setIsAISystem]           = useState<boolean | null>(null);
  const [isDeterministic, setIsDeterministic] = useState<boolean | null>(null);
  const [role, setRole]                       = useState<Role | null>(null);
  const [outsideEU, setOutsideEU]             = useState<boolean | null>(null);
  const [isProductMfr, setIsProductMfr]       = useState<boolean | null>(null);

  // ── Area 2: Sistema (Art.5 + GPAI) ────────────────────────────────────────
  const [art5Flags, setArt5Flags]                   = useState<string[]>([]);
  const [art5Exceptions, setArt5Exceptions]         = useState<Record<string, boolean>>({});
  const [isGPAIModel, setIsGPAIModel]               = useState<boolean | null>(null);
  const [gpaiSystemic, setGpaiSystemic]             = useState<boolean | null>(null);

  // ── Area 3: Alto rischio (Annex I + III + 6(3)) ───────────────────────────
  const [annexIProductId, setAnnexIProductId]                   = useState<string | null>(null);
  const [annexIThirdParty, setAnnexIThirdParty]                 = useState<boolean | null>(null);
  const [annexIIIAreaIds, setAnnexIIIAreaIds]                   = useState<number[]>([]);
  const [art63ExceptionId, setArt63ExceptionId]                 = useState<string | null>(null);
  const [profilingOfPersons, setProfilingOfPersons]             = useState<boolean | null>(null);

  // ── Area 4: Trasparenza (Art.50) ───────────────────────────────────────────
  const [isChatbot, setIsChatbot]                                     = useState<boolean | null>(null);
  const [generatesSyntheticMedia, setGeneratesSyntheticMedia]         = useState<boolean | null>(null);
  const [hasEmotionNonProhibited, setHasEmotionNonProhibited]         = useState<boolean | null>(null);
  const [hasBiometricCatNonProhibited, setHasBiometricCatNonProhibited] = useState<boolean | null>(null);
  const [generatesPublicText, setGeneratesPublicText]                 = useState<boolean | null>(null);

  // Derived
  const scopedOut = scopeExclusions.length > 0 && !scopeExclusions.includes("none");
  const notAI     = isDeterministic === true;

  // Step progress
  const TOTAL_STEPS = 4;
  const areaIdx: Record<AreaId, number> = { scope: 1, system: 2, highrisk: 3, transparency: 4, result: 4 };

  const areaLabels = ["Ambito & Ruolo", "Sistema & Art.5", "Alto rischio", "Trasparenza"];

  function goResult() {
    const answers: ClassifyAnswers = {
      scopeExclusions: scopedOut ? (scopeExclusions.filter(s => s !== "none") as ClassifyAnswers["scopeExclusions"]) : [],
      hasMLOrInference: isAISystem === true,
      producesInfluentialOutput: isAISystem === true,
      isPurelyDeterministic: isDeterministic === true,
      art5Flags: art5Flags.filter(f => f !== "none") as ClassifyAnswers["art5Flags"],
      art5ExceptionsApplied: art5Exceptions as ClassifyAnswers["art5ExceptionsApplied"],
      isGPAIModel: isGPAIModel ?? false,
      gpaiSystemicRisk: gpaiSystemic ?? false,
      annexIProductId: annexIProductId,
      annexIRequiresThirdPartyAssessment: annexIThirdParty ?? false,
      annexIIIAreaIds: annexIIIAreaIds,
      art63ExceptionId: (art63ExceptionId ?? null) as ClassifyAnswers["art63ExceptionId"],
      profilingOfPersons: profilingOfPersons ?? false,
      isChatbot: isChatbot ?? false,
      generatesSyntheticMedia: generatesSyntheticMedia ?? false,
      hasEmotionRecognitionNonProhibited: hasEmotionNonProhibited ?? false,
      hasNonProhibitedBiometricCategorization: hasBiometricCatNonProhibited ?? false,
      generatesPublicInterestText: generatesPublicText ?? false,
      role: (isProductMfr ? "product_manufacturer" : outsideEU ? "authorized_rep" : role) as ClassifyAnswers["role"],
      outsideEUProvider: outsideEU ?? false,
      isProductManufacturerProvider: isProductMfr ?? false,
    };
    const r = classify(answers);
    setResult(r);
    syncToStorage(r, role);
    setArea("result");
  }

  function syncToStorage(r: ClassifyResult, rl: Role | null) {
    try {
      const existing = readFromStorage<ClassifierResult>("classifier");
      const classifierData: ClassifierResult = {
        systemName: existing?.systemName || "Sistema AI",
        systemDescription: existing?.systemDescription || "",
        riskLevel: outcomeToRiskLevel(r.outcome),
        annexIII: r.outcome === "high_risk_annex_iii",
        annexI: r.outcome === "high_risk_annex_i",
        applicableArticles: r.applicableArticles,
        completedAt: new Date().toISOString(),
        role: rl ?? undefined,
        isGPAI: r.gpai,
      };
      writeToStorage<ClassifierResult>("classifier", classifierData);
      if (r.gpai) {
        const orgProfile = readFromStorage<OrgProfile>("orgProfile") ?? { paItaly: false, gpaiDetected: false, nistEnabled: false };
        writeToStorage<OrgProfile>("orgProfile", { ...orgProfile, gpaiDetected: true });
      }
    } catch {}
  }

  function saveDraft() {
    if (!result) return;
    try {
      localStorage.setItem("aicomply_triage_draft", JSON.stringify({ ...result, status: "draft", savedAt: new Date().toISOString() }));
      setDraftSaved(true);
    } catch {}
  }

  function reset() {
    setArea("scope");
    setResult(null); setDraftSaved(false);
    setScopeExclusions([]); setIsAISystem(null); setIsDeterministic(null);
    setRole(null); setOutsideEU(null); setIsProductMfr(null);
    setArt5Flags([]); setArt5Exceptions({}); setIsGPAIModel(null); setGpaiSystemic(null);
    setAnnexIProductId(null); setAnnexIThirdParty(null); setAnnexIIIAreaIds([]);
    setArt63ExceptionId(null); setProfilingOfPersons(null);
    setIsChatbot(null); setGeneratesSyntheticMedia(null); setHasEmotionNonProhibited(null);
    setHasBiometricCatNonProhibited(null); setGeneratesPublicText(null);
  }

  function toggleArr<T>(arr: T[], val: T, setter: (a: T[]) => void) {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  const slide = {
    initial:    { opacity: 0, x: 24 },
    animate:    { opacity: 1, x: 0  },
    exit:       { opacity: 0, x: -24 },
    transition: { duration: 0.22, ease: "easeOut" as const },
  };

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text }}>
      <div className="max-w-xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair className="w-5 h-5" style={{ color: T.text }} />
            <span className="text-sm font-medium" style={{ color: T.muted }}>Triage EU AI Act</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: T.text }}>Analisi rapida di conformità</h1>
          <p className="text-sm" style={{ color: T.muted }}>
            Albero decisionale esaustivo — Artt. 2, 3, 5, 6 + GPAI + Art. 50. {" "}
            <span style={{ color: T.faint }}>Non è consulenza legale. [verifica]</span>
          </p>
          {area !== "result" && (
            <div className="mt-5">
              <ProgressBar current={areaIdx[area]} total={TOTAL_STEPS} />
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {areaLabels.map((label, i) => (
                  <AreaStep key={i} index={i + 1} label={label} active={areaIdx[area] === i + 1} />
                ))}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* ── AREA 1 — Ambito & Ruolo (Passi 0 + 1 + ruolo) ──────────────── */}
          {area === "scope" && (
            <motion.div key="scope" {...slide} className="space-y-5">

              {/* Passo 0 — esclusioni ambito Art. 2 */}
              <div>
                <SectionLabel>Passo 0 — Ambito Art. 2: il sistema rientra in una di queste esclusioni?</SectionLabel>
                <div className="space-y-2">
                  {[
                    { value: "military",              label: "Finalità militari, difesa o sicurezza nazionale",        warn: false },
                    { value: "research_premarket",    label: "Solo R&D, non ancora immesso sul mercato",               warn: false },
                    { value: "personal_nonprofessional", label: "Uso personale non professionale",                     warn: false },
                    { value: "foss_no_high_risk",     label: "Software open source (non distribuito come alto rischio/GPAI)", warn: false },
                    { value: "none",                  label: "Nessuna di queste — il sistema è in ambito AI Act",       warn: false },
                  ].map(opt => (
                    <MultiOptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={scopeExclusions.includes(opt.value)}
                      onClick={() => {
                        if (opt.value === "none") { setScopeExclusions(["none"]); return; }
                        toggleArr(scopeExclusions.filter(s => s !== "none"), opt.value, setScopeExclusions);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Se escluso, va direttamente al risultato */}
              {scopedOut && (
                <div className="rounded-lg p-3" style={{ background: T.greenBg, border: "1px solid rgba(21,128,61,0.25)" }}>
                  <p className="text-xs" style={{ color: T.green }}>
                    Sistema escluso dall&apos;ambito AI Act (Art. 2). Puoi ottenere subito l&apos;esito.
                  </p>
                </div>
              )}

              {scopedOut && (
                <button onClick={goResult} className="w-full px-4 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2" style={{ background: T.text }}>
                  Ottieni esito <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Passo 1 — Art. 3(1): è un sistema di IA? */}
              {!scopedOut && scopeExclusions.length > 0 && (
                <>
                  <div>
                    <SectionLabel>Passo 1 — Art. 3(1): il sistema è un sistema di IA?</SectionLabel>
                    <div className="space-y-2">
                      {[
                        { value: true,  label: "Sì — usa ML/inferenza e produce output non puramente deterministici" },
                        { value: false, label: "No — è puramente deterministico (regole esplicite pre-programmate senza inferenza)" },
                      ].map(opt => (
                        <OptionButton
                          key={String(opt.value)}
                          label={opt.label}
                          selected={isDeterministic === !opt.value && isAISystem === opt.value}
                          onClick={() => { setIsAISystem(opt.value); setIsDeterministic(!opt.value); }}
                        />
                      ))}
                    </div>
                  </div>

                  {notAI && (
                    <button onClick={goResult} className="w-full px-4 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2" style={{ background: T.text }}>
                      Ottieni esito <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}

              {/* Ruolo */}
              {!scopedOut && isAISystem === true && (
                <div>
                  <SectionLabel>Qual è il tuo ruolo? (Art. 3 + Art. 22 + Art. 25)</SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: "provider",              label: "Provider",              description: "Sviluppo o commercializzo il sistema" },
                      { value: "deployer",              label: "Deployer",              description: "Uso un sistema AI di terze parti nella mia organizzazione" },
                      { value: "importer",              label: "Importatore",           description: "Porto nell'UE sistemi AI sviluppati fuori dall'UE" },
                      { value: "distributor",           label: "Distributore",          description: "Distribuisco senza modificare" },
                      { value: "product_manufacturer",  label: "Fabbricante (Art. 25)", description: "Immetto il sistema come mio prodotto o lo modifico sostanzialmente" },
                      { value: "unknown",               label: "Non so ancora",         description: "Devo capire il mio ruolo" },
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
              )}

              {/* Art. 22: provider fuori UE */}
              {!scopedOut && role === "provider" && (
                <div>
                  <SectionLabel>Il provider è stabilito fuori dall'UE? (Art. 22)</SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: true,  label: "Sì — ho bisogno di un rappresentante autorizzato nell'UE (Art. 22)" },
                      { value: false, label: "No — sono stabilito nell'UE" },
                    ].map(opt => (
                      <OptionButton key={String(opt.value)} label={opt.label} selected={outsideEU === opt.value} onClick={() => setOutsideEU(opt.value)} />
                    ))}
                  </div>
                </div>
              )}

              {!scopedOut && role && (role !== "provider" || outsideEU !== null) && (
                <button onClick={() => setArea("system")} className="w-full px-4 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2" style={{ background: T.text }}>
                  Continua <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {(role === "importer" || role === "distributor") && (
                <div className="rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}` }}>
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: T.muted }} />
                  <p className="text-[11px]" style={{ color: T.muted }}>
                    Come <strong style={{ color: T.text }}>{role === "distributor" ? "Distributore" : "Importatore"}</strong> gli obblighi principali sono Art. 23/24. Il triage completo ti mostrerà le verifiche richieste prima della distribuzione.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── AREA 2 — Sistema (Passo 2: Art.5 + Passo 3: GPAI) ──────────── */}
          {area === "system" && (
            <motion.div key="system" {...slide} className="space-y-5">

              {/* Passo 2: Art. 5 — 8 fattispecie con lettere corrette */}
              <div>
                <SectionLabel>Passo 2 — Art. 5: il sistema rientra in pratiche vietate? (seleziona tutte)</SectionLabel>
                <div className="space-y-2">
                  {ART5_PRACTICES.map(p => (
                    <MultiOptionButton
                      key={p.letter}
                      label={`(${p.letter}) ${p.label}`}
                      description={`${p.ref} — ${p.description.slice(0, 80)}…`}
                      selected={art5Flags.includes(p.letter)}
                      warn={art5Flags.includes(p.letter)}
                      onClick={() => toggleArr(art5Flags.filter(f => f !== "none"), p.letter, setArt5Flags)}
                    />
                  ))}
                  <MultiOptionButton
                    label="Nessuna di queste pratiche vietate"
                    selected={art5Flags.includes("none") || art5Flags.length === 0}
                    onClick={() => setArt5Flags(["none"])}
                  />
                </div>
              </div>

              {/* Eccezioni per (d), (f), (g), (h) */}
              {(["d", "f", "g", "h"] as const).some(l => art5Flags.includes(l)) && (
                <div className="rounded-lg p-3 space-y-2" style={{ background: T.amberBg, border: "1px solid rgba(245,158,11,0.28)" }}>
                  <p className="text-xs font-semibold" style={{ color: T.amber }}>
                    Le fattispecie (d), (f), (g), (h) hanno eccezioni tassative. Si applica qualcuna?
                  </p>
                  {(["d", "f", "g", "h"] as const).filter(l => art5Flags.includes(l)).map(l => {
                    const practice = ART5_PRACTICES.find(p => p.letter === l)!;
                    return (
                      <div key={l}>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: T.text }}>({l}) Eccezione:</p>
                        {practice.exceptions?.map((exc, i) => (
                          <MultiOptionButton
                            key={i}
                            label={exc.slice(0, 90)}
                            selected={art5Exceptions[l] === true}
                            onClick={() => setArt5Exceptions(prev => ({ ...prev, [l]: !prev[l] }))}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Passo 3: GPAI */}
              {art5Flags.length > 0 && (
                <div>
                  <SectionLabel>Passo 3 — GPAI (Artt. 51-55): è un modello AI a uso generale?</SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: true,  label: "Sì — modello fondazionale / GPAI (es. LLM, diffusion model)",  description: "Artt. 51-55 applicabili in parallelo" },
                      { value: false, label: "No — sistema specifico per uno scopo determinato",               description: "" },
                    ].map(opt => (
                      <OptionButton key={String(opt.value)} label={opt.label} description={opt.description} selected={isGPAIModel === opt.value} onClick={() => setIsGPAIModel(opt.value)} />
                    ))}
                  </div>

                  {isGPAIModel === true && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-2">
                      <SectionLabel>Supera la soglia di rischio sistemico? (≥10²⁵ FLOP o designazione Commissione)</SectionLabel>
                      {[
                        { value: true,  label: "Sì — Art. 55 (rischio sistemico) applicabile" },
                        { value: false, label: "No / Non so" },
                      ].map(opt => (
                        <OptionButton key={String(opt.value)} label={opt.label} selected={gpaiSystemic === opt.value} onClick={() => setGpaiSystemic(opt.value)} />
                      ))}
                    </motion.div>
                  )}
                </div>
              )}

              {art5Flags.length > 0 && isGPAIModel !== null && (
                <div className="flex gap-2">
                  <button onClick={() => setArea("scope")} className="px-4 py-3 rounded-xl text-sm flex items-center gap-1 hover:shadow-sm" style={{ border: `1px solid ${T.border}`, color: T.muted }}>
                    <ChevronLeft className="w-4 h-4" /> Indietro
                  </button>
                  <button onClick={() => setArea("highrisk")} className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2" style={{ background: T.text }}>
                    Continua <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── AREA 3 — Alto rischio (Passo 4: Annex I + Passo 5-6: Annex III) */}
          {area === "highrisk" && (
            <motion.div key="highrisk" {...slide} className="space-y-5">

              {/* Passo 4: Allegato I */}
              <div>
                <SectionLabel>Passo 4 — Allegato I (Art. 6(1)): il sistema è componente di sicurezza di un prodotto regolamentato UE?</SectionLabel>
                <div className="space-y-2">
                  {[...ANNEX_I_PRODUCTS.map(p => ({ value: p.id, label: p.label, description: p.ref })),
                    { value: "none", label: "No — non è un prodotto Allegato I", description: "" }].map(opt => (
                    <OptionButton key={opt.value} label={opt.label} description={opt.description} selected={(annexIProductId ?? "none") === opt.value} onClick={() => setAnnexIProductId(opt.value === "none" ? null : opt.value)} />
                  ))}
                </div>
              </div>

              {annexIProductId && (
                <div>
                  <SectionLabel>Richiede valutazione di conformità di terzi (Notified Body)?</SectionLabel>
                  <div className="space-y-2">
                    {[{ value: true, label: "Sì" }, { value: false, label: "No" }].map(opt => (
                      <OptionButton key={String(opt.value)} label={opt.label} selected={annexIThirdParty === opt.value} onClick={() => setAnnexIThirdParty(opt.value)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Passo 5: Allegato III — 8 aree */}
              {(annexIProductId === null || annexIThirdParty !== null) && (
                <div>
                  <SectionLabel>Passo 5 — Allegato III (Art. 6(2)): il sistema rientra in una di queste 8 aree? (seleziona tutte)</SectionLabel>
                  <div className="space-y-2">
                    {ANNEX_III_AREAS.map(a => (
                      <MultiOptionButton
                        key={a.id}
                        label={`§${a.id} — ${a.label}`}
                        description={`${a.ref} — ${a.examples[0]}`}
                        selected={annexIIIAreaIds.includes(a.id)}
                        onClick={() => toggleArr(annexIIIAreaIds, a.id, setAnnexIIIAreaIds)}
                      />
                    ))}
                    <MultiOptionButton
                      label="Nessuna area Allegato III"
                      selected={annexIIIAreaIds.length === 0}
                      onClick={() => setAnnexIIIAreaIds([])}
                    />
                  </div>
                </div>
              )}

              {/* Passo 6: profilazione + eccezione 6(3) */}
              {annexIIIAreaIds.length > 0 && (
                <>
                  <div>
                    <SectionLabel>Override Art. 6(3): il sistema effettua profilazione di persone fisiche?</SectionLabel>
                    <div className="space-y-2">
                      {[
                        { value: true,  label: "Sì — effettua profilazione",         description: "Blocca qualsiasi eccezione Art. 6(3): il sistema è sempre alto rischio" },
                        { value: false, label: "No — non effettua profilazione",      description: "Possibile applicazione di un'eccezione Art. 6(3)" },
                      ].map(opt => (
                        <OptionButton key={String(opt.value)} label={opt.label} description={opt.description} selected={profilingOfPersons === opt.value} onClick={() => setProfilingOfPersons(opt.value)} />
                      ))}
                    </div>
                  </div>

                  {profilingOfPersons === false && (
                    <div>
                      <SectionLabel>Eccezione Art. 6(3): si applica una di queste eccezioni?</SectionLabel>
                      <div className="space-y-2">
                        {ART63_EXCEPTIONS.map(e => (
                          <OptionButton
                            key={e.id}
                            label={e.label}
                            description={`${e.ref} — ${e.condition}`}
                            selected={art63ExceptionId === e.id}
                            onClick={() => setArt63ExceptionId(art63ExceptionId === e.id ? null : e.id)}
                          />
                        ))}
                        <OptionButton
                          label="Nessuna eccezione applicabile"
                          selected={art63ExceptionId === null}
                          onClick={() => setArt63ExceptionId(null)}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2">
                <button onClick={() => setArea("system")} className="px-4 py-3 rounded-xl text-sm flex items-center gap-1 hover:shadow-sm" style={{ border: `1px solid ${T.border}`, color: T.muted }}>
                  <ChevronLeft className="w-4 h-4" /> Indietro
                </button>
                <button
                  onClick={() => setArea("transparency")}
                  disabled={(annexIProductId !== null && annexIThirdParty === null) || (annexIIIAreaIds.length > 0 && profilingOfPersons === null)}
                  className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: T.text }}
                >
                  Continua <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── AREA 4 — Trasparenza (Passo 7: Art. 50) ────────────────────── */}
          {area === "transparency" && (
            <motion.div key="transparency" {...slide} className="space-y-5">
              <div>
                <SectionLabel>Passo 7 — Trasparenza Art. 50: il sistema presenta una di queste caratteristiche?</SectionLabel>
                <p className="text-xs mb-3" style={{ color: T.muted }}>
                  Queste domande riguardano obblighi di trasparenza, indipendentemente dal rischio.
                </p>
                <div className="space-y-2">
                  {[
                    {
                      q: "È un chatbot o sistema conversazionale con utenti?",
                      val: isChatbot,
                      set: setIsChatbot,
                      note: "Art. 50(1) — disclosure obbligatoria",
                    },
                    {
                      q: "Genera contenuti sintetici / deepfake (immagini, video, audio, testi)?",
                      val: generatesSyntheticMedia,
                      set: setGeneratesSyntheticMedia,
                      note: "Art. 50(2)–(4) — marcatura obbligatoria",
                    },
                    {
                      q: "Ha funzioni di riconoscimento emozioni (non vietate ex Art. 5)?",
                      val: hasEmotionNonProhibited,
                      set: setHasEmotionNonProhibited,
                      note: "Art. 50(1) — informativa alle persone",
                    },
                    {
                      q: "Ha funzioni di categorizzazione biometrica non vietate?",
                      val: hasBiometricCatNonProhibited,
                      set: setHasBiometricCatNonProhibited,
                      note: "Art. 50(1) — informativa",
                    },
                    {
                      q: "Genera testi AI destinati a informare il pubblico su questioni di interesse generale?",
                      val: generatesPublicText,
                      set: setGeneratesPublicText,
                      note: "Art. 50(3) — marcatura",
                    },
                  ].map(({ q, val, set, note }, i) => (
                    <div key={i} className="rounded-xl p-3 space-y-2" style={{ border: `1px solid ${T.border}`, background: T.card }}>
                      <p className="text-xs font-medium" style={{ color: T.text }}>{q}</p>
                      <p className="text-[10px]" style={{ color: T.faint }}>{note}</p>
                      <div className="flex gap-2">
                        {[{ v: true, l: "Sì" }, { v: false, l: "No" }].map(({ v, l }) => (
                          <button
                            key={String(v)}
                            onClick={() => set(v)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                            style={val === v
                              ? { background: T.text, color: "white", border: `1px solid ${T.text}` }
                              : { background: T.card, color: T.muted, border: `1px solid ${T.border}` }
                            }
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setArea("highrisk")} className="px-4 py-3 rounded-xl text-sm flex items-center gap-1 hover:shadow-sm" style={{ border: `1px solid ${T.border}`, color: T.muted }}>
                  <ChevronLeft className="w-4 h-4" /> Indietro
                </button>
                <button
                  onClick={goResult}
                  disabled={[isChatbot, generatesSyntheticMedia, hasEmotionNonProhibited, hasBiometricCatNonProhibited, generatesPublicText].some(v => v === null)}
                  className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: T.text }}
                >
                  Genera report <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── RESULT ─────────────────────────────────────────────────────── */}
          {area === "result" && result && (
            <motion.div key="result" {...slide}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4" style={{ color: T.muted }} />
                <span className="text-xs font-medium" style={{ color: T.muted }}>Report di triage</span>
              </div>
              <ResultView
                result={result}
                onSaveDraft={saveDraft}
                draftSaved={draftSaved}
                onReset={reset}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
