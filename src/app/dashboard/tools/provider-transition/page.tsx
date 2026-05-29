"use client";

import { useState, useRef, useCallback, CSSProperties } from "react";
import {
  ArrowRightLeft, AlertTriangle, CheckCircle2, Info,
  ChevronDown, ChevronRight, Save, Plus, Trash2, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { writeToStorage } from "@/lib/dossier/storage-schema";
import type { ProviderTransitionResult } from "@/lib/dossier/storage-schema";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.22)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bg:      "#f9f9fb",
  red:     "#dc2626",  redBg:   "rgba(220,38,38,0.07)",  redBdr:  "rgba(220,38,38,0.20)",
  amber:   "#92400e",  amberBg: "rgba(202,138,4,0.07)",  amberBdr:"rgba(202,138,4,0.22)",
  orange:  "#c2410c",  orangeBg:"rgba(194,65,12,0.07)",  orangeBdr:"rgba(194,65,12,0.22)",
  green:   "#15803d",  greenBg: "rgba(22,163,74,0.06)",  greenBdr:"rgba(22,163,74,0.18)",
  blue:    "#1d4ed8",  blueBg:  "rgba(29,78,216,0.05)",  blueBdr: "rgba(29,78,216,0.16)",
  gray:    "#374151",  grayBg:  "rgba(55,65,81,0.06)",   grayBdr: "rgba(55,65,81,0.18)",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const inputSt: CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: `1px solid ${T.border}`, fontSize: 12,
  color: T.text, background: T.card, outline: "none",
};

const taSt: CSSProperties = { ...inputSt, resize: "vertical" };

// ─── Storage keys ─────────────────────────────────────────────────────────────

const ANSWERS_KEY  = "provider_transition_answers";
const MODS_KEY     = "provider_transition_modifications";
const OBL_KEY      = "provider_transition_obligations";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransitionAnswer = "yes" | "no" | "unsure" | null;

interface ProviderTransitionCheck {
  id: string;
  question: string;
  explanation: string;
  trigger_article: string;
  is_trigger: boolean;
}

interface ModificationRecord {
  id: string;
  date: string;
  description: string;
  type: "retraining" | "integration" | "purpose" | "maintenance" | "other";
  is_substantial: boolean | null;
  notes: string;
  assessed_by: string;
  assessed_date: string;
}

type Verdict = "provider" | "risk" | "deployer" | "incomplete";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSITION_CHECKS: ProviderTransitionCheck[] = [
  {
    id: "own_name",
    question: "Hai immesso o intendi immettere il sistema sul mercato UE sotto il tuo nome commerciale o marchio?",
    explanation: "Se il prodotto viene presentato al mercato come tuo (es. con il tuo brand sul packaging, nel contratto o nell'interfaccia) anche se sviluppato da altri, sei considerato provider.",
    trigger_article: "Art. 28(1)(a)",
    is_trigger: true,
  },
  {
    id: "purpose_change",
    question: "Hai cambiato lo scopo d'uso del sistema rispetto a quello dichiarato dal provider originale nelle istruzioni operative?",
    explanation: "Se il provider ha dichiarato che il sistema serve per X (es. screening CV) e tu lo usi per Y (es. valutazione performance dipendenti), si tratta di una modifica dello scopo previsto.",
    trigger_article: "Art. 28(1)(b) + Art. 3(23)",
    is_trigger: true,
  },
  {
    id: "retraining",
    question: "Hai ri-addestrato, fine-tunato o aggiornato il modello AI con nuovi dati o nuovi obiettivi?",
    explanation: "Qualsiasi retraining o fine-tuning che alteri le prestazioni o il comportamento del modello e' considerato modifica sostanziale, anche se limitato a uno strato del modello.",
    trigger_article: "Art. 28(1)(b) + Art. 3(23)(a)",
    is_trigger: true,
  },
  {
    id: "performance_impact",
    question: "Hai integrato il sistema con altri moduli, API o database in modo da alterarne le prestazioni o l'accuratezza complessiva?",
    explanation: "L'integrazione con sistemi esterni che modifica significativamente l'output finale (es. aggiungere un layer di decisione automatica) puo' configurare una modifica sostanziale.",
    trigger_article: "Art. 28(1)(b) + Art. 3(23)(b)",
    is_trigger: true,
  },
  {
    id: "safety_degradation",
    question: "Hai apportato modifiche che potrebbero ridurre la conformita' del sistema ai requisiti di sicurezza o accuratezza dichiarati dal provider?",
    explanation: "Disabilitare safety filter, modificare soglie di confidenza, rimuovere meccanismi di override umano: tutte modifiche che peggiorano la conformita' configurano trigger Art. 28.",
    trigger_article: "Art. 28(1)(b) + Art. 3(23)(c)",
    is_trigger: true,
  },
  {
    id: "ordinary_maintenance",
    question: "Le modifiche apportate rientrano nella manutenzione ordinaria (patch di sicurezza, aggiornamenti UI, correzioni bug senza impatto funzionale) come definita dal provider?",
    explanation: "La manutenzione ordinaria esplicitamente prevista nelle istruzioni del provider non configura modifica sostanziale. Ma deve essere documentata.",
    trigger_article: "Art. 3(23) — eccezione",
    is_trigger: false,
  },
];

const PROVIDER_OBLIGATIONS: { id: string; label: string; href: string; art: string }[] = [
  { id: "docugen",    label: "Documentazione tecnica (Annex IV)",  href: "/dashboard/tools/docugen",    art: "Art. 11" },
  { id: "qms",        label: "Sistema di gestione qualita'",        href: "/dashboard/tools/qms",         art: "Art. 17" },
  { id: "conformity", label: "Conformity Assessment",               href: "/dashboard/tools/conformity",  art: "Art. 43" },
  { id: "eudb",       label: "Registrazione EUDB",                  href: "/dashboard/tools/eudb",        art: "Art. 49" },
  { id: "postmarket", label: "Post-Market Monitoring",              href: "/dashboard/post-market",       art: "Art. 72" },
];

const MOD_TYPE_LABELS: Record<ModificationRecord["type"], string> = {
  retraining:  "Ri-addestramento / Fine-tuning",
  integration: "Integrazione con sistemi esterni",
  purpose:     "Modifica scopo previsto",
  maintenance: "Manutenzione ordinaria",
  other:       "Altro",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initAnswers(): Record<string, TransitionAnswer> {
  const init: Record<string, TransitionAnswer> = {};
  TRANSITION_CHECKS.forEach(c => { init[c.id] = null; });
  return init;
}

function loadAnswers(): Record<string, TransitionAnswer> {
  try {
    if (typeof window === "undefined") return initAnswers();
    const raw = localStorage.getItem(ANSWERS_KEY);
    if (!raw) return initAnswers();
    const parsed = JSON.parse(raw) as Record<string, TransitionAnswer>;
    // Ensure all keys present
    return { ...initAnswers(), ...parsed };
  } catch { return initAnswers(); }
}

function loadMods(): ModificationRecord[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(MODS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadObligDone(): Record<string, boolean> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(OBL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function computeTransitionVerdict(
  checks: ProviderTransitionCheck[],
  answers: Record<string, TransitionAnswer>,
): Verdict {
  const triggeredYes    = checks.filter(c => c.is_trigger && answers[c.id] === "yes");
  const triggeredUnsure = checks.filter(c => c.is_trigger && answers[c.id] === "unsure");
  const maintenanceYes  = answers["ordinary_maintenance"] === "yes";

  if (triggeredYes.length > 0 && !maintenanceYes) return "provider";
  if (triggeredUnsure.length > 0 || triggeredYes.length > 0) return "risk";
  if (Object.values(answers).some(v => v === null)) return "incomplete";
  return "deployer";
}

function emptyNewMod(): Omit<ModificationRecord, "id"> {
  return {
    date: new Date().toISOString().slice(0, 10),
    description: "",
    type: "other",
    is_substantial: null,
    notes: "",
    assessed_by: "",
    assessed_date: "",
  };
}

function debounce<T>(
  timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  fn: (v: T) => void,
  delay = 800,
) {
  return (v: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(v), delay);
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnswerRadio({
  value,
  onChange,
  name,
}: {
  value: TransitionAnswer;
  onChange: (v: TransitionAnswer) => void;
  name: string;
}) {
  const opts: { v: TransitionAnswer; label: string; bg: string; col: string; bdr: string }[] = [
    { v: "yes",    label: "Si'",        bg: T.greenBg,  col: T.green,  bdr: T.greenBdr  },
    { v: "no",     label: "No",         bg: T.grayBg,   col: T.gray,   bdr: T.grayBdr   },
    { v: "unsure", label: "Non sicuro", bg: T.amberBg,  col: T.amber,  bdr: T.amberBdr  },
  ];
  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
      {opts.map(o => (
        <label
          key={o.v ?? "null"}
          style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
            background: value === o.v ? o.bg : "transparent",
            color: value === o.v ? o.col : T.muted,
            border: `1px solid ${value === o.v ? o.bdr : T.border}`,
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="radio" name={name} value={o.v ?? ""} checked={value === o.v}
            onChange={() => onChange(o.v)} style={{ display: "none" }}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function CheckQuestion({
  check,
  answer,
  expanded,
  onAnswer,
  onToggle,
}: {
  check: ProviderTransitionCheck;
  answer: TransitionAnswer;
  expanded: boolean;
  onAnswer: (v: TransitionAnswer) => void;
  onToggle: () => void;
}) {
  const isTriggered = check.is_trigger && answer === "yes";
  const isUnsure    = answer === "unsure";
  const isExcused   = !check.is_trigger && answer === "yes"; // maintenance = yes

  return (
    <div
      style={{
        border: `1px solid ${isTriggered ? T.redBdr : isUnsure ? T.amberBdr : T.border}`,
        borderRadius: 8,
        background: isTriggered ? T.redBg : isExcused ? T.greenBg : T.card,
        overflow: "hidden",
        transition: "all 0.15s",
      }}
    >
      {/* Header row */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {/* Article tag */}
          <span
            style={{
              flexShrink: 0, fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 600,
              marginTop: 2,
              background: check.is_trigger ? T.redBg : T.grayBg,
              color: check.is_trigger ? T.red : T.gray,
              border: `1px solid ${check.is_trigger ? T.redBdr : T.grayBdr}`,
            }}
          >
            {check.trigger_article}
          </span>

          {/* Question text */}
          <p style={{ flex: 1, fontSize: 12, color: T.text, margin: 0, lineHeight: 1.5 }}>
            {check.question}
          </p>

          {/* Radio + toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <AnswerRadio value={answer} onChange={onAnswer} name={check.id} />
            <button
              onClick={onToggle}
              title="Mostra spiegazione"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 2, color: T.faint, display: "flex", alignItems: "center",
              }}
            >
              <ChevronDown
                size={13}
                style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
              />
            </button>
          </div>
        </div>

        {/* Triggered alert */}
        {isTriggered && (
          <div style={{
            marginTop: 8, display: "flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 6,
            background: "rgba(220,38,38,0.10)", border: `1px solid ${T.redBdr}`,
          }}>
            <AlertTriangle size={11} style={{ color: T.red, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: T.red, fontWeight: 500 }}>
              Trigger attivato — potresti essere diventato provider (Art. 28)
            </span>
          </div>
        )}
      </div>

      {/* Explanation */}
      {expanded && (
        <div
          style={{
            padding: "8px 14px 12px",
            borderTop: `1px solid ${T.border}`,
            background: T.bg,
          }}
        >
          <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
            <Info size={12} style={{ color: T.blue, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: T.muted, margin: 0, lineHeight: 1.6 }}>
              {check.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProviderTransitionPage() {
  const [answers, setAnswers]     = useState<Record<string, TransitionAnswer>>(() => loadAnswers());
  const [modifications, setMods]  = useState<ModificationRecord[]>(() => loadMods());
  const [obligDone, setObligDone] = useState<Record<string, boolean>>(() => loadObligDone());
  const [expandedQs, setExpandedQs] = useState<Set<string>>(new Set());
  const [addingMod, setAddingMod] = useState(false);
  const [newMod, setNewMod]       = useState<Omit<ModificationRecord, "id">>(() => emptyNewMod());
  const [oblExpanded, setOblExpanded] = useState(false);
  const [toast, setToast]         = useState<string | null>(null);

  const answersTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modsTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oblTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveAnswers  = useCallback(debounce<Record<string, TransitionAnswer>>(answersTimer, v => {
    try { localStorage.setItem(ANSWERS_KEY, JSON.stringify(v)); } catch { /* ignore */ }
  }), []);

  const saveMods     = useCallback(debounce<ModificationRecord[]>(modsTimer, v => {
    try { localStorage.setItem(MODS_KEY, JSON.stringify(v)); } catch { /* ignore */ }
  }), []);

  const saveObl      = useCallback(debounce<Record<string, boolean>>(oblTimer, v => {
    try { localStorage.setItem(OBL_KEY, JSON.stringify(v)); } catch { /* ignore */ }
  }), []);

  function setAnswer(id: string, val: TransitionAnswer) {
    setAnswers(prev => {
      const next = { ...prev, [id]: val };
      saveAnswers(next);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpandedQs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addMod() {
    if (!newMod.description.trim()) return;
    const record: ModificationRecord = { ...newMod, id: `mod_${Date.now()}` };
    setMods(prev => {
      const next = [...prev, record];
      saveMods(next);
      return next;
    });
    setNewMod(emptyNewMod());
    setAddingMod(false);
  }

  function deleteMod(id: string) {
    setMods(prev => {
      const next = prev.filter(m => m.id !== id);
      saveMods(next);
      return next;
    });
  }

  function setOblig(id: string, done: boolean) {
    setObligDone(prev => {
      const next = { ...prev, [id]: done };
      saveObl(next);
      return next;
    });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleSave() {
    const triggeredYes = TRANSITION_CHECKS
      .filter(c => c.is_trigger && answers[c.id] === "yes")
      .map(c => c.id);
    const substCount = modifications.filter(m => m.is_substantial === true).length;

    writeToStorage<ProviderTransitionResult>("providerTransition", {
      verdict,
      triggered_checks: triggeredYes,
      modification_count: modifications.length,
      substantial_modifications: substCount,
      completedAt: new Date().toISOString(),
    });
    showToast("Salvato nel dossier ✓");
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const verdict: Verdict = computeTransitionVerdict(TRANSITION_CHECKS, answers);

  const sortedMods = [...modifications].sort((a, b) => b.date.localeCompare(a.date));

  const substMods    = modifications.filter(m => m.is_substantial === true).length;
  const oblDoneCount = PROVIDER_OBLIGATIONS.filter(o => obligDone[o.id]).length;

  // ── Verdict banner config ─────────────────────────────────────────────────

  const verdictConfig: Record<Verdict, { bg: string; bdr: string; col: string; icon: React.ReactNode; title: string; sub: string }> = {
    provider: {
      bg: T.redBg, bdr: T.redBdr, col: T.red,
      icon: <AlertTriangle size={15} />,
      title: "Sei diventato provider — obblighi Art. 16 applicabili",
      sub:   "Uno o piu' trigger Art. 28 sono stati attivati. Tutti gli obblighi del provider si applicano da subito.",
    },
    risk: {
      bg: T.orangeBg, bdr: T.orangeBdr, col: T.orange,
      icon: <AlertTriangle size={15} />,
      title: "Rischio potenziale — alcune risposte richiedono verifica legale",
      sub:   "Non e' possibile escludere con certezza la transizione a provider. Consulta il Legal Assistant.",
    },
    deployer: {
      bg: T.greenBg, bdr: T.greenBdr, col: T.green,
      icon: <CheckCircle2 size={15} />,
      title: "Rimani deployer — nessun trigger Art. 28 rilevato",
      sub:   "Sulla base delle risposte fornite, non risultano condizioni che attivino Art. 28. Aggiorna la valutazione ad ogni modifica.",
    },
    incomplete: {
      bg: T.grayBg, bdr: T.grayBdr, col: T.gray,
      icon: <Info size={15} />,
      title: "Completa tutte le risposte per ottenere la valutazione",
      sub:   "Rispondi a tutte e 6 le domande per calcolare il tuo status.",
    },
  };

  const vc = verdictConfig[verdict];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <SystemContextBanner checkProhibited={true} />
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <ArrowRightLeft size={16} style={{ color: T.blue }} />
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016", margin: 0 }}>Provider Transition Alert</h1>
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 600,
            background: T.redBg, color: T.red, border: `1px solid ${T.redBdr}`,
          }}>Art. 28</span>
        </div>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
          Verifica se come deployer hai attivato un trigger di transizione a provider — Regolamento (UE) 2024/1689
        </p>
      </div>

      {/* ── Sezione 1 — Self-assessment ────────────────────────────────────── */}

      <div style={{ ...cardSt, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <ArrowRightLeft size={13} style={{ color: T.red }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>
            Sezione 1 — Self-assessment &quot;Sei diventato provider?&quot;
          </p>
        </div>
        <p style={{ fontSize: 11, color: T.muted, margin: "0 0 14px" }}>
          Rispondi alle 6 domande. Usa il toggle ↓ per leggere la spiegazione in linguaggio semplice.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {TRANSITION_CHECKS.map(check => (
            <CheckQuestion
              key={check.id}
              check={check}
              answer={answers[check.id] ?? null}
              expanded={expandedQs.has(check.id)}
              onAnswer={v => setAnswer(check.id, v)}
              onToggle={() => toggleExpanded(check.id)}
            />
          ))}
        </div>

        {/* Verdict banner */}
        <div style={{
          padding: 14, borderRadius: 10,
          background: vc.bg, border: `1px solid ${vc.bdr}`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ color: vc.col, flexShrink: 0, marginTop: 1 }}>{vc.icon}</span>
            <div>
              <p style={{ fontSize: 12, color: vc.col, fontWeight: 600, margin: 0 }}>{vc.title}</p>
              <p style={{ fontSize: 11, color: vc.col, opacity: 0.85, margin: "3px 0 0" }}>{vc.sub}</p>

              {verdict === "provider" && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 11, color: T.red, fontWeight: 600, margin: "0 0 5px" }}>
                    Obblighi che scattano (Art. 16):
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {[
                      "Documentazione tecnica completa (Art. 11 + Annex IV)",
                      "Sistema di gestione qualita' (Art. 17)",
                      "Conformity assessment (Art. 43)",
                      "Dichiarazione di Conformita' UE (Art. 47)",
                      "Marcatura CE (Art. 48)",
                      "Registrazione EUDB (Art. 49)",
                      "Post-market monitoring plan (Art. 72)",
                    ].map(o => (
                      <li key={o} style={{ fontSize: 11, color: T.red, marginBottom: 2 }}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sezione 2 — Registro modifiche ────────────────────────────────── */}

      <div style={{ ...cardSt, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>
              Sezione 2 — Registro modifiche
            </p>
            <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0" }}>
              {modifications.length} modifica/e registrata/e
              {substMods > 0 && (
                <span style={{ color: T.red, fontWeight: 500 }}>
                  {" "}— {substMods} sostanzial{substMods === 1 ? "e" : "i"}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => { setAddingMod(true); setNewMod(emptyNewMod()); }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 9999, fontSize: 11, cursor: "pointer",
              background: T.blue, color: "#fff", border: "none", fontWeight: 500,
            }}
          >
            <Plus size={12} />
            Aggiungi modifica
          </button>
        </div>

        {/* Add form */}
        {addingMod && (
          <div style={{
            padding: 14, borderRadius: 8, marginBottom: 12,
            background: T.bg, border: `1px solid ${T.border}`,
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: "0 0 10px" }}>Nuova modifica</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <LabeledField label="Data *">
                <input style={inputSt} type="date" value={newMod.date}
                  onChange={e => setNewMod(p => ({ ...p, date: e.target.value }))} />
              </LabeledField>
              <LabeledField label="Tipo *">
                <select style={inputSt} value={newMod.type}
                  onChange={e => setNewMod(p => ({ ...p, type: e.target.value as ModificationRecord["type"] }))}>
                  {(Object.keys(MOD_TYPE_LABELS) as Array<ModificationRecord["type"]>).map(k => (
                    <option key={k} value={k}>{MOD_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </LabeledField>
              <LabeledField label="Descrizione *" span2>
                <input style={inputSt} value={newMod.description}
                  onChange={e => setNewMod(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descrizione della modifica apportata..." />
              </LabeledField>
              <LabeledField label="Modifica sostanziale?">
                <select style={inputSt}
                  value={newMod.is_substantial === null ? "" : String(newMod.is_substantial)}
                  onChange={e => setNewMod(p => ({
                    ...p,
                    is_substantial: e.target.value === "" ? null : e.target.value === "true",
                  }))}>
                  <option value="">Da valutare</option>
                  <option value="true">Si' — sostanziale</option>
                  <option value="false">No — non sostanziale</option>
                </select>
              </LabeledField>
              <LabeledField label="Valutato da">
                <input style={inputSt} value={newMod.assessed_by}
                  onChange={e => setNewMod(p => ({ ...p, assessed_by: e.target.value }))}
                  placeholder="Nome / ruolo" />
              </LabeledField>
              <LabeledField label="Note" span2>
                <textarea style={{ ...taSt, minHeight: 48 }} value={newMod.notes}
                  onChange={e => setNewMod(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Note aggiuntive..." />
              </LabeledField>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={addMod}
                disabled={!newMod.description.trim()}
                style={{
                  padding: "6px 14px", borderRadius: 7, fontSize: 11, cursor: newMod.description.trim() ? "pointer" : "not-allowed",
                  background: newMod.description.trim() ? T.blue : T.bg,
                  color: newMod.description.trim() ? "#fff" : T.faint,
                  border: `1px solid ${newMod.description.trim() ? T.blue : T.border}`,
                  fontWeight: 500,
                }}
              >
                Aggiungi
              </button>
              <button
                onClick={() => setAddingMod(false)}
                style={{
                  padding: "6px 14px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                  background: T.bg, color: T.muted, border: `1px solid ${T.border}`,
                }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {sortedMods.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Data", "Tipo", "Descrizione", "Sostanziale", "Valutato da", ""].map(h => (
                    <th key={h} style={{
                      padding: "6px 8px", textAlign: "left", fontSize: 10,
                      fontWeight: 600, color: T.muted, textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedMods.map(mod => {
                  const isSubst = mod.is_substantial === true;
                  return (
                    <tr
                      key={mod.id}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        background: isSubst ? T.redBg : "transparent",
                      }}
                    >
                      <td style={{ padding: "7px 8px", color: T.muted, whiteSpace: "nowrap" }}>{mod.date}</td>
                      <td style={{ padding: "7px 8px", color: T.text }}>
                        <span style={{
                          fontSize: 10, padding: "2px 6px", borderRadius: 4,
                          background: T.bg, border: `1px solid ${T.border}`,
                        }}>
                          {MOD_TYPE_LABELS[mod.type]}
                        </span>
                      </td>
                      <td style={{ padding: "7px 8px", color: T.text, maxWidth: 220 }}>
                        <span title={mod.notes || undefined} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {mod.description}
                        </span>
                      </td>
                      <td style={{ padding: "7px 8px", whiteSpace: "nowrap" }}>
                        {mod.is_substantial === true ? (
                          <span style={{ color: T.red, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <AlertTriangle size={11} /> Si' — Art. 28
                          </span>
                        ) : mod.is_substantial === false ? (
                          <span style={{ color: T.green }}>No</span>
                        ) : (
                          <span style={{ color: T.faint, fontStyle: "italic" }}>Da valutare</span>
                        )}
                      </td>
                      <td style={{ padding: "7px 8px", color: T.muted }}>{mod.assessed_by || "—"}</td>
                      <td style={{ padding: "7px 8px" }}>
                        <button
                          onClick={() => deleteMod(mod.id)}
                          title="Elimina"
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: T.faint, padding: 2, display: "flex", alignItems: "center",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            padding: 24, textAlign: "center",
            color: T.faint, fontSize: 12, fontStyle: "italic",
          }}>
            Nessuna modifica registrata. Usa &quot;Aggiungi modifica&quot; per documentare le modifiche apportate al sistema.
          </div>
        )}
      </div>

      {/* ── Sezione 3 — Piano di azione ────────────────────────────────────── */}

      <div style={{ ...cardSt, marginBottom: 16, overflow: "hidden" }}>
        {/* Header — always visible */}
        <button
          onClick={() => setOblExpanded(o => !o)}
          style={{
            width: "100%", padding: 20, background: "none", border: "none", cursor: "pointer",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>
                Sezione 3 — Piano di azione
              </p>
              {verdict === "provider" && (
                <span style={{
                  fontSize: 9, padding: "2px 7px", borderRadius: 10, fontWeight: 700,
                  background: T.redBg, color: T.red, border: `1px solid ${T.redBdr}`,
                }}>ATTIVO</span>
              )}
            </div>
            {verdict !== "provider" && (
              <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0", textAlign: "left" }}>
                Pronto se la situazione cambia — {oblDoneCount}/{PROVIDER_OBLIGATIONS.length} obblighi completati
              </p>
            )}
            {verdict === "provider" && (
              <p style={{ fontSize: 11, color: T.red, margin: "2px 0 0", textAlign: "left" }}>
                {oblDoneCount}/{PROVIDER_OBLIGATIONS.length} obblighi completati
              </p>
            )}
          </div>
          <ChevronDown
            size={14} style={{
              color: T.muted,
              transform: (verdict === "provider" || oblExpanded) ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          />
        </button>

        {/* Body */}
        {(verdict === "provider" || oblExpanded) && (
          <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${T.border}` }}>
            {verdict !== "provider" && (
              <div style={{
                padding: 10, borderRadius: 8, marginTop: 14, marginBottom: 14,
                background: T.grayBg, border: `1px solid ${T.grayBdr}`,
                display: "flex", gap: 8, alignItems: "center",
              }}>
                <Info size={12} style={{ color: T.gray, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: T.gray, margin: 0 }}>
                  Il piano di azione e' disponibile ma non ancora necessario in base alle risposte attuali. Aggiorna la valutazione ad ogni modifica del sistema.
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: verdict === "provider" ? 14 : 0 }}>
              {PROVIDER_OBLIGATIONS.map(obl => {
                const done = !!obligDone[obl.id];
                return (
                  <div
                    key={obl.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 8,
                      background: done ? T.greenBg : T.bg,
                      border: `1px solid ${done ? T.greenBdr : T.border}`,
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={e => setOblig(obl.id, e.target.checked)}
                        style={{ accentColor: T.green, width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: 12, color: done ? T.green : T.text, fontWeight: done ? 500 : 400 }}>
                        {obl.label}
                      </span>
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: T.bg, border: `1px solid ${T.border}`,
                        color: T.muted,
                      }}>
                        {obl.art}
                      </span>
                    </label>
                    <Link
                      href={obl.href}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: T.blue, textDecoration: "none",
                        padding: "3px 8px", borderRadius: 6,
                        border: `1px solid ${T.blueBdr}`,
                        background: T.blueBg,
                      }}
                    >
                      Apri tool <ExternalLink size={10} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}

      <div style={{ ...cardSt, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0 }}>Salva nel dossier</p>
            <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0" }}>
              Registra il verdict Art. 28 e il registro modifiche nel Dossier AI Act.
            </p>
          </div>
          <button
            onClick={handleSave}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
              background: T.blue, color: "#fff", border: "none", cursor: "pointer",
            }}
          >
            <Save size={13} />
            Salva nel dossier
          </button>
        </div>
      </div>

      <SignOffPanel toolKey="provider-transition" toolLabel="Art. 28 -- Verifica transizione deployer->provider" />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          padding: "10px 18px", borderRadius: 10,
          background: T.green, color: "#fff",
          fontSize: 12, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function LabeledField({
  label,
  children,
  span2,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div style={{ gridColumn: span2 ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 4, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
