"use client";

import { useState, useRef, useEffect, useMemo, useCallback, CSSProperties } from "react";
import {
  ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Info,
  ExternalLink, Save, Plus, Trash2, Link2,
} from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { GPAIResult } from "@/lib/dossier/storage-schema";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { useT, useLocale } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.45)",
  faint:    "rgba(0,0,0,0.28)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#F8FAFC",
  red:      "#DC2626", redBg:  "#FEF2F2", redBdr:  "#FECACA",
  amber:    "#D97706", amberBg:"#FFFBEB", amberBdr:"#FDE68A",
  blue:     "#2563EB", blueBg: "#EFF6FF", blueBdr: "#BFDBFE",
  green:    "#16A34A", greenBg:"#F0FDF4", greenBdr:"#BBF7D0",
  yellow:   "#CA8A04", yellowBg:"#FEFCE8", yellowBdr:"#FEF08A",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: 12,
  padding: 20,
};

const DRAFT_KEY = "aicomply_gpai_draft";

// ─── Types ────────────────────────────────────────────────────────────────────

type Answer = "yes" | "no" | "unsure" | null;

type GPAIRole =
  | "gpai_provider_systemic"
  | "gpai_provider_standard"
  | "downstream_high_risk"
  | "downstream_standard"
  | "not_applicable"
  | "incomplete";

type ObligationStatus = "compliant" | "in_progress" | "not_started";

interface Art53ObligationState {
  id: string;
  status: ObligationStatus;
  notes: string;
}

interface Art55ObligationState {
  id: string;
  status: ObligationStatus;
  fields: Record<string, string>;
}

interface GPAIProviderUsed {
  id: string;
  provider_name: string;
  model_name: string;
  has_technical_doc: boolean | null;
  has_usage_policy: boolean | null;
  has_copyright_policy: boolean | null;
  has_limitations_doc: boolean | null;
  doc_url: string;
  notes: string;
}

interface DownstreamConfirmations {
  received_annex_xi: boolean;
  limitations_in_risk_manager: boolean;
  technical_doc_references_gpai: boolean;
  fria_considers_gpai: boolean;
}

interface GPAIDraft {
  answers: Record<string, Answer>;
  art53: Art53ObligationState[];
  art55: Art55ObligationState[];
  isOpenSource: boolean;
  openSourceNote: string;
  providers: GPAIProviderUsed[];
  downstreamConfirm: DownstreamConfirmations;
  savedAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

interface QualificationCheck {
  id: string;
  question: string;
  explanation: string;
  impact: "gpai_provider" | "downstream" | "neutral";
}

const QUALIFICATION_CHECKS: QualificationCheck[] = [
  {
    id: "uses_foundation_model",
    question: "Il tuo sistema AI usa come componente un modello foundation di un altro provider (es. OpenAI GPT, Anthropic Claude, Google Gemini, Meta Llama, Mistral, ecc.)?",
    explanation: "Se chiami API di modelli esterni o integri un modello pre-addestrato nel tuo prodotto, sei un downstream provider rispetto a quel modello. Questo non ti rende GPAI provider, ma comporta obblighi specifici su come usi la documentazione fornita dal provider upstream.",
    impact: "downstream",
  },
  {
    id: "own_foundation_model",
    question: "Hai sviluppato internamente un modello AI di uso generale (foundation model, LLM, modello multimodale) addestrato su larga scala?",
    explanation: "Un modello ‘di uso generale’ è addestrato su grandi quantità di dati con tecniche di self-supervision, con capacità di svolgere un’ampia gamma di compiti. Non è necessario renderlo pubblico: anche uso interno qualifica.",
    impact: "gpai_provider",
  },
  {
    id: "fine_tuned_and_redistributed",
    question: "Hai effettuato fine-tuning o retraining sostanziale di un modello foundation e lo stai distribuendo ad altri (clienti, utenti, partner) tramite API o prodotto?",
    explanation: "Il fine-tuning sostanziale che produce un nuovo modello con capacità proprie ti configura come GPAI provider per quel modello derivato, anche se parti da un modello open-source. La distribuzione è il fattore chiave — uso puramente interno è trattato diversamente.",
    impact: "gpai_provider",
  },
  {
    id: "systemic_risk_compute",
    question: "(Solo se GPAI provider) Il tuo modello è stato addestrato con capacità computazionale superiore a 10²⁵ FLOPs, oppure ha capacità equivalenti a modelli come GPT-4 o Claude 3 Opus?",
    explanation: "Sopra questa soglia scatta la presunzione di ‘rischio sistemico’ (Art. 51). I modelli open-source possono richiedere notifica all’AI Office anche sotto soglia se presentano rischi sistemici specifici. In caso di dubbio, la risposta conservativa è ‘unsure’.",
    impact: "gpai_provider",
  },
  {
    id: "downstream_high_risk",
    question: "Stai costruendo un sistema high-risk (Annex III) che usa un GPAI model come componente principale o critico?",
    explanation: "Se costruisci, ad esempio, un sistema di screening CV (Annex III pt.4) che usa GPT-4 come motore di valutazione, sei downstream provider rispetto al GPAI e provider del sistema high-risk. Puoi fare affidamento sulla documentazione tecnica fornita da OpenAI/Anthropic per la parte GPAI, ma rimani responsabile degli obblighi del sistema high-risk.",
    impact: "downstream",
  },
];

interface Art53Obligation {
  id: string;
  label: string;
  article: string;
  description: string;
  template_fields?: string[];
  note?: string;
  href?: string;
}

const ART53_OBLIGATIONS: Art53Obligation[] = [
  {
    id: "technical_doc",
    label: "Documentazione tecnica del modello (Annex XI)",
    article: "Art. 53(1)(a)",
    description: "Redigere e mantenere documentazione tecnica che copra: architettura, dati di addestramento, procedure di training, benchmark di valutazione, limitazioni note, misure di mitigazione rischi.",
    template_fields: [
      "Architettura del modello (parametri, layers, contesto)",
      "Dataset di addestramento (fonti, volume, filtri applicati)",
      "Procedura di training (hyperparameters, fine-tuning)",
      "Benchmark di valutazione (MMLU, HellaSwag, TruthfulQA o equivalenti)",
      "Limitazioni note e casi d’uso non supportati",
      "Misure tecniche per prevenire usi dannosi",
    ],
  },
  {
    id: "downstream_info",
    label: "Informazioni ai downstream provider",
    article: "Art. 53(1)(b)",
    description: "Fornire a chi integra il modello: documentazione tecnica, istruzioni per l’uso, limitazioni note, e informazioni per adempiere ai propri obblighi AI Act.",
    template_fields: [
      "URL documentazione tecnica pubblica o condivisa",
      "Terms of Service con obblighi downstream espliciti",
      "API documentation con sezione ‘AI Act compliance’",
      "Limitazioni d’uso dichiarate (use case proibiti)",
    ],
  },
  {
    id: "copyright_policy",
    label: "Policy utilizzo dati di addestramento (copyright)",
    article: "Art. 53(1)(c)-(d)",
    description: "Pubblicare una sintesi sufficientemente dettagliata dei dati usati per l’addestramento, con riferimento alla compliance copyright (opt-out per text/data mining).",
    template_fields: [
      "Tipologie di dati utilizzati (web, libri, codice, ecc.)",
      "Procedura di rispetto del copyright e opt-out",
      "URL della policy pubblica sui dati di addestramento",
    ],
  },
  {
    id: "eudb_registration",
    label: "Registrazione nel database UE",
    article: "Art. 53(1)(e) → Art. 49",
    description: "I GPAI provider devono registrarsi nel database UE. Categoria specifica per GPAI nel portale EC.",
    note: "Usa il tool EUDB Registration per generare il pacchetto Annex VIII.",
    href: "/dashboard/compliance-ops/eudb",
  },
];

interface Art55Obligation {
  id: string;
  label: string;
  article: string;
  description: string;
  fields?: string[];
  status_options?: string[];
  note?: string;
}

const ART55_OBLIGATIONS: Art55Obligation[] = [
  {
    id: "model_evaluation",
    label: "Valutazione del modello (adversarial testing)",
    article: "Art. 55(1)(a)",
    description: "Eseguire valutazione del modello prima dell’immissione sul mercato e dopo aggiornamenti significativi, incluso adversarial testing (red-teaming) per identificare rischi sistemici.",
    fields: [
      "Data ultima valutazione",
      "Metodologia usata (red-teaming interno/esterno, benchmark specifici)",
      "Soggetto che ha condotto la valutazione",
      "Esito e misure di mitigazione adottate",
    ],
  },
  {
    id: "systemic_risk_assessment",
    label: "Valutazione e mitigazione rischi sistemici",
    article: "Art. 55(1)(b)",
    description: "Identificare, analizzare e mitigare possibili rischi sistemici a livello UE: manipolazione informazioni su larga scala, cyberattacchi facilitati da AI, interruzione infrastrutture critiche.",
    fields: [
      "Rischi sistemici identificati",
      "Misure di mitigazione in atto",
      "Data prossima revisione",
    ],
  },
  {
    id: "incident_reporting",
    label: "Monitoraggio e notifica incidenti gravi",
    article: "Art. 55(1)(c)",
    description: "Monitorare, documentare e notificare senza ritardo all’AI Office (Commissione Europea) incidenti gravi e misure correttive adottate.",
    fields: [
      "Procedura di incident detection in atto (Sì/No)",
      "Canale notifica AI Office configurato (Sì/No)",
      "Log incidenti (numero eventi, ultima notifica)",
    ],
  },
  {
    id: "cybersecurity",
    label: "Protezione cybersecurity del modello",
    article: "Art. 55(1)(d)",
    description: "Garantire protezione adeguata contro cyberattacchi, data poisoning, e accesso non autorizzato ai pesi del modello.",
    fields: [
      "Misure di protezione dei pesi del modello",
      "Procedure di sicurezza per l’infrastruttura di addestramento",
      "Ultimo audit di sicurezza (data e soggetto)",
    ],
  },
  {
    id: "code_of_practice",
    label: "Adesione al GPAI Code of Practice",
    article: "Art. 56",
    description: "I provider con rischio sistemico possono dimostrare conformità ad Art. 55 aderendo al GPAI Code of Practice (marzo 2025). In alternativa, devono dimostrare conformità equivalente.",
    status_options: ["Aderente", "Conformità equivalente documentata", "In valutazione", "Non aderente"],
    note: "Il Code of Practice è gestito dall’AI Office. Adesione tramite: https://code-of-practice.ec.europa.eu",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeGPAIRole(answers: Record<string, Answer>): GPAIRole {
  const isGPAIProvider = answers.own_foundation_model === "yes" || answers.fine_tuned_and_redistributed === "yes";
  const hasSystemicRisk = answers.systemic_risk_compute === "yes";
  const isDownstream = answers.uses_foundation_model === "yes";
  const isDownstreamHighRisk = answers.downstream_high_risk === "yes";
  const hasNull = Object.values(answers).some(v => v === null);
  if (hasNull) return "incomplete";
  if (isGPAIProvider && hasSystemicRisk) return "gpai_provider_systemic";
  if (isGPAIProvider) return "gpai_provider_standard";
  if (isDownstream && isDownstreamHighRisk) return "downstream_high_risk";
  if (isDownstream) return "downstream_standard";
  return "not_applicable";
}

function initialAnswers(): Record<string, Answer> {
  return Object.fromEntries(QUALIFICATION_CHECKS.map(c => [c.id, null]));
}

function initialArt53(): Art53ObligationState[] {
  return ART53_OBLIGATIONS.map(o => ({ id: o.id, status: "not_started" as ObligationStatus, notes: "" }));
}

function initialArt55(): Art55ObligationState[] {
  return ART55_OBLIGATIONS.map(o => ({
    id: o.id,
    status: "not_started" as ObligationStatus,
    fields: Object.fromEntries((o.fields ?? []).map(f => [f, ""])),
  }));
}

function emptyProvider(): GPAIProviderUsed {
  return {
    id: `p${Date.now()}`,
    provider_name: "",
    model_name: "",
    has_technical_doc: null,
    has_usage_policy: null,
    has_copyright_policy: null,
    has_limitations_doc: null,
    doc_url: "",
    notes: "",
  };
}

function loadDraft(): GPAIDraft {
  if (typeof window === "undefined") return createEmptyDraft();
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<GPAIDraft>;
      return {
        answers: { ...initialAnswers(), ...p.answers },
        art53: p.art53 ?? initialArt53(),
        art55: p.art55 ?? initialArt55(),
        isOpenSource: p.isOpenSource ?? false,
        openSourceNote: p.openSourceNote ?? "",
        providers: p.providers ?? [],
        downstreamConfirm: p.downstreamConfirm ?? {
          received_annex_xi: false,
          limitations_in_risk_manager: false,
          technical_doc_references_gpai: false,
          fria_considers_gpai: false,
        },
        savedAt: p.savedAt,
      };
    }
  } catch { /* ignore */ }
  return createEmptyDraft();
}

function createEmptyDraft(): GPAIDraft {
  return {
    answers: initialAnswers(),
    art53: initialArt53(),
    art55: initialArt55(),
    isOpenSource: false,
    openSourceNote: "",
    providers: [],
    downstreamConfirm: {
      received_annex_xi: false,
      limitations_in_risk_manager: false,
      technical_doc_references_gpai: false,
      fria_considers_gpai: false,
    },
  };
}

function computeArt53Score(art53: Art53ObligationState[]): number {
  if (!art53.length) return 0;
  const sum = art53.reduce((acc, o) => {
    if (o.status === "compliant") return acc + 1;
    if (o.status === "in_progress") return acc + 0.5;
    return acc;
  }, 0);
  return Math.round((sum / art53.length) * 100);
}

function computeArt55Score(art55: Art55ObligationState[]): number {
  if (!art55.length) return 0;
  const sum = art55.reduce((acc, o) => {
    if (o.status === "compliant") return acc + 1;
    if (o.status === "in_progress") return acc + 0.5;
    return acc;
  }, 0);
  return Math.round((sum / art55.length) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnswerBtn({ value, selected, onClick, t }: {
  value: Answer; selected: boolean; onClick: () => void; t: TFn;
}) {
  const labels: Record<NonNullable<Answer>, string> = { yes: t("ans_yes"), no: t("ans_no"), unsure: t("ans_unsure") };
  const colors: Record<NonNullable<Answer>, { bg: string; text: string; border: string }> = {
    yes:    { bg: T.blueBg,   text: T.blue,  border: T.blueBdr  },
    no:     { bg: T.greenBg,  text: T.green, border: T.greenBdr },
    unsure: { bg: T.amberBg,  text: T.amber, border: T.amberBdr },
  };
  if (!value) return null;
  const c = colors[value];
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        border: `1.5px solid ${selected ? c.border : T.border}`,
        background: selected ? c.bg : T.card,
        color: selected ? c.text : T.muted,
        transition: "all 0.15s",
      }}
    >
      {labels[value]}
    </button>
  );
}

function StatusBadge({ status, onChange, t }: { status: ObligationStatus; onChange: (s: ObligationStatus) => void; t: TFn }) {
  const opts: { value: ObligationStatus; label: string; bg: string; text: string }[] = [
    { value: "compliant",    label: t("st_compliant"),   bg: T.greenBg,  text: T.green  },
    { value: "in_progress",  label: t("st_inProgress"),  bg: T.amberBg,  text: T.amber  },
    { value: "not_started",  label: t("st_notStarted"),  bg: T.bg,       text: T.muted  },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {opts.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
          background: status === o.value ? o.bg : "transparent",
          color: status === o.value ? o.text : T.faint,
          border: `1px solid ${status === o.value ? "currentColor" : T.border}`,
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function ProgressBar({ value, color = T.blue }: { value: number; color?: string }) {
  return (
    <div style={{ height: 6, background: T.border, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GPAIAssessmentPage() {
  const t = useT("toolGpai");
  const locale = useLocale();
  const loc = locale === "it" ? "it-IT" : "en-GB";
  const [draft, setDraftRaw] = useState<GPAIDraft>(() => loadDraft());
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
  const [expandedObl, setExpandedObl] = useState<Set<string>>(new Set());
  const [expandedProv, setExpandedProv] = useState<Set<string>>(new Set());
  const [savedAt, setSavedAt] = useState<string | null>(() => readFromStorage<GPAIResult>("gpai")?.completedAt ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const role = useMemo(() => computeGPAIRole(draft.answers), [draft.answers]);
  const art53Score = useMemo(() => computeArt53Score(draft.art53), [draft.art53]);
  const art55Score = useMemo(() => computeArt55Score(draft.art55), [draft.art55]);

  const setDraft = useCallback((updater: (prev: GPAIDraft) => GPAIDraft) => {
    setDraftRaw(prev => {
      const next = updater(prev);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...next, savedAt: new Date().toISOString() })); }
        catch { /* ignore */ }
      }, 800);
      return next;
    });
  }, []);

  function setAnswer(id: string, val: Answer) {
    setDraft(p => ({ ...p, answers: { ...p.answers, [id]: val } }));
  }

  function toggleCheck(id: string) {
    setExpandedChecks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleObl(id: string) {
    setExpandedObl(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function updateArt53(id: string, patch: Partial<Art53ObligationState>) {
    setDraft(p => ({ ...p, art53: p.art53.map(o => o.id === id ? { ...o, ...patch } : o) }));
  }

  function updateArt55(id: string, patch: Partial<Art55ObligationState>) {
    setDraft(p => ({ ...p, art55: p.art55.map(o => o.id === id ? { ...o, ...patch } : o) }));
  }

  function updateArt55Field(id: string, field: string, val: string) {
    setDraft(p => ({
      ...p,
      art55: p.art55.map(o => o.id === id ? { ...o, fields: { ...o.fields, [field]: val } } : o),
    }));
  }

  function addProvider() {
    setDraft(p => ({ ...p, providers: [...p.providers, emptyProvider()] }));
  }

  function updateProvider(id: string, patch: Partial<GPAIProviderUsed>) {
    setDraft(p => ({ ...p, providers: p.providers.map(pr => pr.id === id ? { ...pr, ...patch } : pr) }));
  }

  function removeProvider(id: string) {
    setDraft(p => ({ ...p, providers: p.providers.filter(pr => pr.id !== id) }));
  }

  function saveToDoasier() {
    const completedAt = new Date().toISOString();
    const copStatus = draft.art55.find(o => o.id === "code_of_practice");
    const obligationsCompleted =
      draft.art53.filter(o => o.status === "compliant").length +
      draft.art55.filter(o => o.status === "compliant").length;
    writeToStorage<GPAIResult>("gpai", {
      role,
      gpai_providers_used: draft.providers.length,
      art53_score: art53Score,
      art55_score: art55Score,
      code_of_practice_status: copStatus?.status ?? "not_started",
      obligationsCompleted,
      completedAt,
    });
    setSavedAt(completedAt);
    setToast(t("toast_saved"));
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Role banner config ──────────────────────────────────────────────────
  const roleBannerConfig: Record<Exclude<GPAIRole, "incomplete">, {
    bg: string; bdr: string; col: string; icon: React.ReactNode; title: string; desc: string;
  }> = {
    gpai_provider_systemic: {
      bg: T.redBg, bdr: T.redBdr, col: T.red,
      icon: <AlertTriangle size={16} />,
      title: t("role_systemic_title"),
      desc: t("role_systemic_desc"),
    },
    gpai_provider_standard: {
      bg: T.amberBg, bdr: T.amberBdr, col: T.amber,
      icon: <AlertTriangle size={16} />,
      title: t("role_standard_title"),
      desc: t("role_standard_desc"),
    },
    downstream_high_risk: {
      bg: T.yellowBg, bdr: T.yellowBdr, col: T.yellow,
      icon: <Info size={16} />,
      title: t("role_dhr_title"),
      desc: t("role_dhr_desc"),
    },
    downstream_standard: {
      bg: T.blueBg, bdr: T.blueBdr, col: T.blue,
      icon: <Info size={16} />,
      title: t("role_ds_title"),
      desc: t("role_ds_desc"),
    },
    not_applicable: {
      bg: T.greenBg, bdr: T.greenBdr, col: T.green,
      icon: <CheckCircle2 size={16} />,
      title: t("role_na_title"),
      desc: t("role_na_desc"),
    },
  };

  const inputSt: CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: 7,
    border: `1px solid ${T.border}`, fontSize: 13, color: T.text,
    background: T.card, outline: "none", boxSizing: "border-box",
  };

  const textareaSt: CSSProperties = {
    ...inputSt, resize: "vertical" as const, minHeight: 72,
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 60 }}>
      <SystemSelector checkProhibited={true} />

      {/* Dossier saved */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}>
          <CheckCircle2 size={13} style={{ color: T.green }} />
          <span style={{ color: T.green }}>{t("savedDossier")} · {new Date(savedAt).toLocaleDateString(loc)}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: T.green }}>
            {t("seeDossier")}
          </Link>
        </div>
      ) : null}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016", margin: 0 }}>GPAI Assessment</h1>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBdr}`, borderRadius: 6, padding: "2px 8px" }}>
            Art. 51-55
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.amber, background: T.amberBg, border: `1px solid ${T.amberBdr}`, borderRadius: 6, padding: "2px 8px" }}>
            {t("inForce")}
          </span>
        </div>
        <p style={{ fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.6 }}>
          {t("subtitle")}
        </p>
      </div>

      {/* ── Section 1: Qualification ─────────────────────────────────────────── */}
      <div style={{ ...cardSt, marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
            {t("sec1_title")}
          </h2>
          <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            {t("sec1_sub")}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {QUALIFICATION_CHECKS.map((check, idx) => {
            const ans = draft.answers[check.id];
            const expanded = expandedChecks.has(check.id);
            return (
              <div key={check.id} style={{
                border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px",
                background: ans !== null ? T.bg : T.card,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, minWidth: 18, paddingTop: 2 }}>
                    {idx + 1}.
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: T.text, margin: "0 0 10px", lineHeight: 1.5 }}>
                      {t(`q_${check.id}`)}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {(["yes", "no", "unsure"] as const).map(v => (
                        <AnswerBtn key={v} value={v} selected={ans === v} onClick={() => setAnswer(check.id, ans === v ? null : v)} t={t} />
                      ))}
                      <button
                        onClick={() => toggleCheck(check.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 3,
                          fontSize: 11, color: T.muted, background: "none", border: "none",
                          cursor: "pointer", padding: 0, marginLeft: "auto",
                        }}
                      >
                        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        {t("explanation")}
                      </button>
                    </div>
                    {expanded && (
                      <div style={{
                        marginTop: 10, padding: "10px 12px", borderRadius: 8,
                        background: T.blueBg, border: `1px solid ${T.blueBdr}`,
                        fontSize: 12, color: T.blue, lineHeight: 1.6,
                      }}>
                        {t(`e_${check.id}`)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Role result banner */}
        {role !== "incomplete" && (
          <div style={{
            marginTop: 16, padding: "12px 16px", borderRadius: 10,
            background: roleBannerConfig[role].bg,
            border: `1px solid ${roleBannerConfig[role].bdr}`,
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{ color: roleBannerConfig[role].col, flexShrink: 0, marginTop: 1 }}>
              {roleBannerConfig[role].icon}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: roleBannerConfig[role].col }}>
                {roleBannerConfig[role].title}
              </div>
              <div style={{ fontSize: 12, color: roleBannerConfig[role].col, marginTop: 2, opacity: 0.9 }}>
                {roleBannerConfig[role].desc}
              </div>
            </div>
          </div>
        )}

        {role === "incomplete" && (
          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 10,
            background: T.bg, border: `1px solid ${T.border}`,
            fontSize: 12, color: T.muted, display: "flex", alignItems: "center", gap: 8,
          }}>
            <Info size={14} />
            {t("completeAllQuestions")}
          </div>
        )}
      </div>

      {/* ── Section 2A: GPAI Provider ────────────────────────────────────────── */}
      {(role === "gpai_provider_standard" || role === "gpai_provider_systemic") && (
        <>
          {/* Open-source exception */}
          <div style={{ ...cardSt, marginBottom: 16, background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Info size={15} style={{ color: T.blue, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.blue, marginBottom: 4 }}>
                  {t("osException")}
                </div>
                <div style={{ fontSize: 12, color: T.blue, lineHeight: 1.6, marginBottom: 10 }}>
                  {t("osExceptionDesc")}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={draft.isOpenSource}
                    onChange={e => setDraft(p => ({ ...p, isOpenSource: e.target.checked }))}
                    style={{ width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 12, color: T.blue, fontWeight: 600 }}>
                    {t("osCheckbox")}
                  </span>
                </label>
                {draft.isOpenSource && (
                  <textarea
                    style={{ ...textareaSt, marginTop: 8, minHeight: 48, background: "rgba(255,255,255,0.6)" }}
                    placeholder={t("osNotePh")}
                    value={draft.openSourceNote}
                    onChange={e => setDraft(p => ({ ...p, openSourceNote: e.target.value }))}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Art. 53 obligations */}
          <div style={{ ...cardSt, marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
                  {t("sec2a1_title")}
                </h2>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBdr}`, borderRadius: 6, padding: "2px 8px" }}>
                  {t("allGpaiProviders")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <div style={{ flex: 1 }}><ProgressBar value={art53Score} /></div>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.blue, minWidth: 36 }}>{art53Score}%</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ART53_OBLIGATIONS.map(obl => {
                const state = draft.art53.find(o => o.id === obl.id)!;
                const expanded = expandedObl.has(obl.id);
                const isExempt = draft.isOpenSource && (obl.id === "downstream_info" || obl.id === "copyright_policy") && role !== "gpai_provider_systemic";
                return (
                  <div key={obl.id} style={{
                    border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden",
                    opacity: isExempt ? 0.55 : 1,
                  }}>
                    <div
                      style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: T.card }}
                      onClick={() => toggleObl(obl.id)}
                    >
                      {expanded ? <ChevronDown size={14} style={{ flexShrink: 0, color: T.muted }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: T.muted }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t(`a53_${obl.id}_label`)}</span>
                          <span style={{ fontSize: 10, color: T.muted, fontStyle: "italic" }}>{obl.article}</span>
                          {isExempt && <span style={{ fontSize: 10, fontWeight: 600, color: T.green, background: T.greenBg, borderRadius: 4, padding: "1px 6px" }}>{t("exemptOs")}</span>}
                        </div>
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <StatusBadge status={state.status} onChange={s => updateArt53(obl.id, { status: s })} t={t} />
                      </div>
                    </div>

                    {expanded && (
                      <div style={{ padding: "12px 14px 14px", borderTop: `1px solid ${T.border}`, background: T.bg }}>
                        <p style={{ fontSize: 12, color: T.muted, marginBottom: 10, lineHeight: 1.6 }}>{t(`a53_${obl.id}_desc`)}</p>

                        {obl.template_fields && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6 }}>{t("fieldsToDocument")}</div>
                            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: T.text, lineHeight: 1.8 }}>
                              {obl.template_fields.map((f, i) => <li key={i}>{t(`a53_${obl.id}_f${i}`)}</li>)}
                            </ul>
                          </div>
                        )}

                        {obl.href && (
                          <Link href={obl.href} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: T.blue, fontWeight: 600 }}>
                            <ExternalLink size={12} /> {obl.note ? t(`a53_${obl.id}_note`) : t("goToTool")}
                          </Link>
                        )}

                        <div style={{ marginTop: 10 }}>
                          <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>{t("notesEvidence")}</label>
                          <textarea
                            style={textareaSt}
                            placeholder={t("art53NotesPh")}
                            value={state.notes}
                            onChange={e => updateArt53(obl.id, { notes: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Art. 55 — systemic risk only */}
          {role === "gpai_provider_systemic" && (
            <div style={{ ...cardSt, marginBottom: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
                    {t("sec2a2_title")}
                  </h2>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.red, background: T.redBg, border: `1px solid ${T.redBdr}`, borderRadius: 6, padding: "2px 8px" }}>
                    {t("systemicOnly")}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <div style={{ flex: 1 }}><ProgressBar value={art55Score} color={T.red} /></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.red, minWidth: 36 }}>{art55Score}%</span>
                </div>
                {/* AI Office unsure warning */}
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: T.amberBg, border: `1px solid ${T.amberBdr}`, fontSize: 12, color: T.amber }}>
                  <span dangerouslySetInnerHTML={{ __html: t("flopsNote") }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ART55_OBLIGATIONS.map(obl => {
                  const state = draft.art55.find(o => o.id === obl.id)!;
                  const expanded = expandedObl.has(`55-${obl.id}`);
                  return (
                    <div key={obl.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                      <div
                        style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: T.card }}
                        onClick={() => toggleObl(`55-${obl.id}`)}
                      >
                        {expanded ? <ChevronDown size={14} style={{ flexShrink: 0, color: T.muted }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: T.muted }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t(`a55_${obl.id}_label`)}</span>
                            <span style={{ fontSize: 10, color: T.muted, fontStyle: "italic" }}>{obl.article}</span>
                          </div>
                        </div>
                        <div onClick={e => e.stopPropagation()}>
                          <StatusBadge status={state.status} onChange={s => updateArt55(obl.id, { status: s })} t={t} />
                        </div>
                      </div>

                      {expanded && (
                        <div style={{ padding: "12px 14px 14px", borderTop: `1px solid ${T.border}`, background: T.bg }}>
                          <p style={{ fontSize: 12, color: T.muted, marginBottom: 10, lineHeight: 1.6 }}>{t(`a55_${obl.id}_desc`)}</p>

                          {obl.status_options && (
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6 }}>{t("copStatusLabel")}</label>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {obl.status_options.map(opt => (
                                  <button key={opt} onClick={() => updateArt55Field(obl.id, "cop_status", opt)} style={{
                                    padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
                                    background: state.fields["cop_status"] === opt ? T.blueBg : T.card,
                                    color: state.fields["cop_status"] === opt ? T.blue : T.muted,
                                    border: `1px solid ${state.fields["cop_status"] === opt ? T.blueBdr : T.border}`,
                                  }}>{opt}</button>
                                ))}
                              </div>
                              {obl.note && (
                                <div style={{ marginTop: 8, fontSize: 11, color: T.muted }}>
                                  {t(`a55_${obl.id}_note`)} <a href="https://code-of-practice.ec.europa.eu" target="_blank" rel="noreferrer" style={{ color: T.blue }}>code-of-practice.ec.europa.eu ↗</a>
                                </div>
                              )}
                            </div>
                          )}

                          {obl.fields && obl.fields.map(f => (
                            <div key={f} style={{ marginBottom: 8 }}>
                              <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 3 }}>{f}</label>
                              <input
                                style={inputSt}
                                value={state.fields[f] ?? ""}
                                onChange={e => updateArt55Field(obl.id, f, e.target.value)}
                                placeholder={`${f}...`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Section 2B: Downstream Provider ─────────────────────────────────── */}
      {(role === "downstream_high_risk" || role === "downstream_standard") && (
        <>
          <div style={{ ...cardSt, marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
                  {t("sec2b1_title")}
                </h2>
              </div>
              <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                {t("sec2b1_sub")}
              </p>
            </div>

            {draft.providers.length === 0 && (
              <div style={{ padding: "24px", textAlign: "center", color: T.muted, fontSize: 13 }}>
                {t("noProviderAdded")}
              </div>
            )}

            {draft.providers.map(prov => {
              const expanded = expandedProv.has(prov.id);
              const allChecked = prov.has_technical_doc && prov.has_usage_policy && prov.has_copyright_policy && prov.has_limitations_doc;
              const missingCount = [prov.has_technical_doc, prov.has_usage_policy, prov.has_copyright_policy, prov.has_limitations_doc].filter(v => !v).length;
              return (
                <div key={prov.id} style={{ border: `1px solid ${allChecked ? T.greenBdr : T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                  <div
                    style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: allChecked ? T.greenBg : T.card }}
                    onClick={() => { const n = new Set(expandedProv); n.has(prov.id) ? n.delete(prov.id) : n.add(prov.id); setExpandedProv(n); }}
                  >
                    {expanded ? <ChevronDown size={14} style={{ color: T.muted }} /> : <ChevronRight size={14} style={{ color: T.muted }} />}
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.text }}>
                      {prov.provider_name || t("providerPlaceholder")} — {prov.model_name || t("modelPlaceholder")}
                    </div>
                    {missingCount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.amber, background: T.amberBg, border: `1px solid ${T.amberBdr}`, borderRadius: 6, padding: "2px 8px" }}>
                        {missingCount} {t("docsMissing")}
                      </span>
                    )}
                    {allChecked && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.green }}>✓ {t("complete")}</span>
                    )}
                    <button onClick={e => { e.stopPropagation(); removeProvider(prov.id); }} style={{
                      background: "none", border: "none", cursor: "pointer", padding: 4, color: T.muted,
                    }}>
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {expanded && (
                    <div style={{ padding: "12px 14px 14px", borderTop: `1px solid ${T.border}`, background: T.bg }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 3 }}>{t("providerLabel")}</label>
                          <input style={inputSt} value={prov.provider_name} onChange={e => updateProvider(prov.id, { provider_name: e.target.value })} placeholder="OpenAI" />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 3 }}>{t("modelLabel")}</label>
                          <input style={inputSt} value={prov.model_name} onChange={e => updateProvider(prov.id, { model_name: e.target.value })} placeholder="GPT-4o" />
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6, fontWeight: 600 }}>
                          {t("docReceived")}
                        </label>
                        {([
                          { key: "has_technical_doc" as const,    label: t("doc_technical") },
                          { key: "has_usage_policy" as const,     label: t("doc_usage") },
                          { key: "has_copyright_policy" as const, label: t("doc_copyright") },
                          { key: "has_limitations_doc" as const,  label: t("doc_limitations") },
                        ] as const).map(item => (
                          <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={prov[item.key] === true}
                              onChange={e => updateProvider(prov.id, { [item.key]: e.target.checked })}
                              style={{ width: 13, height: 13 }}
                            />
                            <span style={{ fontSize: 12, color: T.text }}>{item.label}</span>
                          </label>
                        ))}
                      </div>

                      {missingCount > 0 && (
                        <div style={{ padding: "8px 12px", borderRadius: 8, background: T.amberBg, border: `1px solid ${T.amberBdr}`, fontSize: 12, color: T.amber, marginBottom: 10 }}>
                          <strong>{t("docMissingTitle")}</strong> — {t("contactPre")} {prov.provider_name || t("theProvider")} {t("docMissingPost")}
                        </div>
                      )}

                      <div>
                        <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 3 }}>{t("docUrl")}</label>
                        <input style={inputSt} value={prov.doc_url} onChange={e => updateProvider(prov.id, { doc_url: e.target.value })} placeholder="https://..." />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 3 }}>{t("notesWord")}</label>
                        <textarea style={textareaSt} value={prov.notes} onChange={e => updateProvider(prov.id, { notes: e.target.value })} placeholder={t("notesPh")} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={addProvider}
              style={{
                display: "flex", alignItems: "center", gap: 6, marginTop: 8,
                padding: "8px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                background: T.card, border: `1px dashed ${T.border}`, color: T.muted, cursor: "pointer", width: "100%",
                justifyContent: "center",
              }}
            >
              <Plus size={13} /> {t("addProvider")}
            </button>
          </div>

          {/* Downstream high-risk chain */}
          {role === "downstream_high_risk" && (
            <div style={{ ...cardSt, marginBottom: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
                  {t("sec2b2_title")}
                </h2>
              </div>

              {/* Visual chain */}
              <div style={{ fontFamily: "monospace", fontSize: 12, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 16px", marginBottom: 14, lineHeight: 1.9 }}>
                <div style={{ color: T.blue, fontWeight: 700 }}>{t("chain_gpaiProvider")}</div>
                <div>&nbsp; ├── {t("chain_gpai_resp1")}</div>
                <div>&nbsp; │&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {t("chain_gpai_resp2")}</div>
                <div>&nbsp; └── {t("chain_gpai_notResp")}</div>
                <div style={{ marginTop: 6, color: T.text, fontWeight: 700 }}>{t("chain_you")}</div>
                <div>&nbsp; ├── {t("chain_you_resp1")}</div>
                <div>&nbsp; ├── {t("chain_you_resp2")}</div>
                <div>&nbsp; └── {t("chain_you_resp3")}</div>
              </div>

              {/* Confirmations */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {([
                  { key: "received_annex_xi" as const,               label: t("conf_annexXi") },
                  { key: "limitations_in_risk_manager" as const,     label: t("conf_limitations") },
                  { key: "technical_doc_references_gpai" as const,   label: t("conf_techDoc") },
                  { key: "fria_considers_gpai" as const,             label: t("conf_fria") },
                ] as const).map(item => (
                  <label key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={draft.downstreamConfirm[item.key]}
                      onChange={e => setDraft(p => ({ ...p, downstreamConfirm: { ...p.downstreamConfirm, [item.key]: e.target.checked } }))}
                      style={{ width: 14, height: 14, marginTop: 2 }}
                    />
                    <span style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{item.label}</span>
                  </label>
                ))}
              </div>

              {/* Quick links */}
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { href: "/dashboard/tools/risk-manager", label: "Risk Manager (Art. 9)" },
                  { href: "/dashboard/tools/docugen",      label: "DocuGen (Art. 11)" },
                  { href: "/dashboard/tools/fria",         label: "FRIA (Art. 27)" },
                ].map(l => (
                  <Link key={l.href} href={l.href} style={{
                    display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px",
                    borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.blue,
                    background: T.blueBg, border: `1px solid ${T.blueBdr}`, textDecoration: "none",
                  }}>
                    <Link2 size={11} /> {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Section 3: Score + Dossier ───────────────────────────────────────── */}
      {role !== "incomplete" && role !== "not_applicable" && (
        <div style={{ ...cardSt, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 14px" }}>
            {t("sec3_title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
            {(role === "gpai_provider_standard" || role === "gpai_provider_systemic") && (
              <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg }}>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Art. 53 Compliance</div>
                <ProgressBar value={art53Score} />
                <div style={{ fontSize: 18, fontWeight: 700, color: T.blue, marginTop: 6 }}>{art53Score}%</div>
              </div>
            )}
            {role === "gpai_provider_systemic" && (
              <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${T.redBdr}`, background: T.redBg }}>
                <div style={{ fontSize: 12, color: T.red, marginBottom: 6 }}>{t("art55Compliance")}</div>
                <ProgressBar value={art55Score} color={T.red} />
                <div style={{ fontSize: 18, fontWeight: 700, color: T.red, marginTop: 6 }}>{art55Score}%</div>
              </div>
            )}
            {(role === "downstream_high_risk" || role === "downstream_standard") && (
              <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg }}>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{t("upstreamCovered")}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{draft.providers.length}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {draft.providers.filter(p => p.has_technical_doc && p.has_usage_policy && p.has_copyright_policy && p.has_limitations_doc).length} {t("fullyDocumented")}
                </div>
              </div>
            )}
          </div>

          {/* Open issues */}
          {(role === "gpai_provider_standard" || role === "gpai_provider_systemic") && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8 }}>{t("openObligations")}</div>
              {[
                ...draft.art53.filter(o => o.status !== "compliant").map(o => ({ id: o.id, label: ART53_OBLIGATIONS.find(a => a.id === o.id)?.label ?? o.id, art: "Art. 53" })),
                ...(role === "gpai_provider_systemic" ? draft.art55.filter(o => o.status !== "compliant").map(o => ({ id: o.id, label: ART55_OBLIGATIONS.find(a => a.id === o.id)?.label ?? o.id, art: "Art. 55" })) : []),
              ].length === 0 ? (
                <div style={{ fontSize: 12, color: T.green }}>✓ {t("allCompliant")}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    ...draft.art53.filter(o => o.status !== "compliant").map(o => ({ id: o.id, label: ART53_OBLIGATIONS.find(a => a.id === o.id)?.label ?? o.id, art: "Art. 53", status: o.status })),
                    ...(role === "gpai_provider_systemic" ? draft.art55.filter(o => o.status !== "compliant").map(o => ({ id: o.id, label: ART55_OBLIGATIONS.find(a => a.id === o.id)?.label ?? o.id, art: "Art. 55", status: o.status })) : []),
                  ].map(item => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.text }}>
                      <XCircle size={12} style={{ color: item.status === "in_progress" ? T.amber : T.red, flexShrink: 0 }} />
                      <span>{item.label}</span>
                      <span style={{ fontSize: 10, color: T.muted, marginLeft: "auto" }}>{item.art}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Save + SignOff ─────────────────────────────────────────────────── */}
      <div style={{ ...cardSt, marginBottom: 20 }}>
        <button
          onClick={saveToDoasier}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
            borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: T.text, color: "#ffffff", border: "none", cursor: "pointer",
          }}
        >
          <Save size={14} /> {t("saveToDossier")}
        </button>
      </div>

      <SignOffPanel toolKey="gpai" toolLabel={t("signOffLabel")} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          background: T.text, color: "#fff", padding: "10px 18px",
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 9999,
        }}>{toast}</div>
      )}
    </div>
  );
}
