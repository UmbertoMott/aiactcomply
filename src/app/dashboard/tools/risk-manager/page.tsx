"use client";
export const maxDuration = 60;

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ProviderTransitionAlertBanner from "@/components/shared/provider-transition-alert-banner";
import {
  Shield, Send, Download, RotateCcw,
  ChevronRight, AlertTriangle, Loader2, Play, Pause,
  FileText, ChevronDown, Bold, Italic, Underline, Highlighter,
  Pencil, Check,
} from "lucide-react";
import { riskManagerChat, type ChatMessage, type RiskDocumentation, type RiskPhaseId } from "@/app/actions/riskManagerChat";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { RiskManagerResult, ClassifierResult } from "@/lib/dossier/storage-schema";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { RiskRegisterViewer } from "./components/RiskRegisterViewer";
import { buildRiskRegisterDocument, buildAnnexSections, shouldShowGpaiModule, type AnnexSection } from "@/lib/risk/risk-register-mapper";
import type { RiskRegisterDocument } from "@/lib/risk/risk-register-types";
import { computeRegisterProgress, type SectionProgress } from "@/lib/risk/risk-register-progress";
import { RiskRegisterGuidedMode } from "@/components/risk/RiskRegisterGuidedMode";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Rimuove la formattazione markdown (**, *, __, _) dal testo */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1");
}

// ─── Phase definitions ────────────────────────────────────────────────────────

interface Phase {
  id: RiskPhaseId;
  label: string;
  subtitle: string;
  article: string;        // citazione primaria
  supportRef?: string;    // citazione di supporto (opzionale)
  docSection?: string;    // sezione del template docx
}

// 11 step numerati 1-11 (allineamento template Art. 9 §0-§9 + trasversale Comunicazione).
// Il modulo condizionale gpai_systemic_risk NON è in questo array.
const PHASES: Phase[] = [
  { id: "scoping",        label: "1. Scoping",                   subtitle: "§0 Ambito e criteri rischio",    article: "Art. 9(1) [verify against current AI Act text]",               supportRef: "Art. 6, Allegato III [verify against current AI Act text]",   docSection: "§0" },
  { id: "identification", label: "2. Identificazione Rischi",    subtitle: "§1 incl. minori e vulnerabili",  article: "Art. 9(2)(a) [verify against current AI Act text]",            supportRef: "Art. 9(9) [verify against current AI Act text]",              docSection: "§1" },
  { id: "estimation",     label: "3. Stima e Valutazione",       subtitle: "§2 uso previsto / improprio",    article: "Art. 9(2)(b) [verify against current AI Act text]",            docSection: "§2" },
  { id: "testing",        label: "4. Test e Validazione",        subtitle: "§3 metriche e soglie",           article: "Art. 9(6)-(8) [verify against current AI Act text]",           supportRef: "Art. 60 [verify against current AI Act text]",                docSection: "§3" },
  { id: "mitigation",     label: "5. Trattamento Rischio",       subtitle: "§4 rischio residuo",             article: "Art. 9(2)(d), 9(4)-(5) [verify against current AI Act text]", supportRef: "Art. 13 [verify against current AI Act text]",                docSection: "§4" },
  { id: "monitoring",     label: "6. Monitoraggio Post-Market",  subtitle: "§5 drift detection",             article: "Art. 9(2)(c) [verify against current AI Act text]",            supportRef: "Art. 72 [verify against current AI Act text]",                docSection: "§5" },
  { id: "gap_check",      label: "7. Gap Check Art. 9",          subtitle: "§6 verifica di copertura",       article: "Art. 9(2)(a)-(d), 9(6)-(9) [verify against current AI Act text]", docSection: "§6" },
  { id: "traceability",   label: "8. Tracciabilità",             subtitle: "§7 versionamento e QMS",         article: "Art. 9(1)-(2) [verify against current AI Act text]",           supportRef: "Art. 12, 17 [verify against current AI Act text]",            docSection: "§7" },
  { id: "dismissal",      label: "9. Dismissione / Ritiro",      subtitle: "§8 rischi di fine vita",         article: "Art. 9 [verify against current AI Act text]",                  supportRef: "ISO 23894 Annex C",                                           docSection: "§8" },
  { id: "signoff",        label: "10. Approvazione e Firme",     subtitle: "§9 sign-off finale",             article: "Art. 9(1) + 9(10) [verify against current AI Act text]",      docSection: "§9" },
  { id: "communication",  label: "11. Comunicazione",            subtitle: "Trasversale — ISO 23894 §6.2",  article: "ISO 23894 §6.2",                                               docSection: "Trasversale" },
];

// Modulo condizionale separato (non numerato, non in PHASES)
const GPAI_MODULE: Phase = {
  id: "gpai_systemic_risk",
  label: "GPAI & Rischio Sistemico",
  subtitle: "Modulo condizionale",
  article: "Art. 51-55 (Capo V) [verify against current AI Act text]",
  docSection: "(condizionale)",
};

type PhaseStatus = "pending" | "active" | "complete";

// ─── Phase guide cards ────────────────────────────────────────────────────────

interface PhaseGuide {
  goal: string;
  examples: { label: string; text: string }[];
  starters: string[];
}

const PHASE_GUIDES: Partial<Record<RiskPhaseId, PhaseGuide>> = {
  scoping: {
    goal: "Definisci il sistema AI, il suo scopo, chi lo usa e in quale contesto. Indica il tier di rischio e se tratta dati personali.",
    examples: [
      { label: "Sì — dati personali", text: "Il sistema elabora dati personali di candidati HR (nome, CV, esperienza) su base contrattuale Art. 6(1)(b) GDPR." },
      { label: "No — dati anonimi", text: "Il sistema ottimizza routing logistico su dati di veicoli anonimizzati, nessun dato personale trattato." },
    ],
    starters: ["Il sistema tratta dati personali?", "È richiesta supervisione umana (Art. 14)?", "Qual è il tier di rischio classificato?", "Il sistema incorpora modelli GPAI?"],
  },
  identification: {
    goal: "Elenca almeno 3-5 rischi concreti: bias algoritmico, opacità, perdita controllo umano. Valuta l'impatto su minori e gruppi vulnerabili (Art. 9(9)).",
    examples: [
      { label: "Bias algoritmico", text: "R-01: Il modello penalizza sistematicamente candidati con gap occupazionali. Probabilità: alta. Impatto: alto (discriminazione)." },
      { label: "Opacità decisionale", text: "R-02: Gli utenti non ricevono spiegazione del motivo di esclusione. Probabilità: media. Impatto: medio (mancanza trasparenza)." },
    ],
    starters: ["Descrivere il rischio principale", "Il sistema impatta minori o persone vulnerabili?", "Ci sono rischi di bias algoritmico?", "Quali dati di addestramento sono stati usati?"],
  },
  estimation: {
    goal: "Stima gli usi previsti e gli usi impropri prevedibili. Quantifica le persone coinvolte e valuta se il rischio è accettabile rispetto al risk appetite.",
    examples: [
      { label: "Uso previsto", text: "Pre-selezione CV per ~200 candidature/mese in ambito HR. Decisione finale sempre umana." },
      { label: "Uso improprio", text: "Utilizzo per profilazione estesa oltre la selezione iniziale (contrario alla finalità dichiarata)." },
    ],
    starters: ["Quante persone sono impattate mensilmente?", "Quali usi impropri sono prevedibili?", "Il rischio rientra nel risk appetite aziendale?"],
  },
  testing: {
    goal: "Definisci metriche di accuratezza/fairness, soglie accettabili e criteri di rilascio in produzione (Art. 9(8)).",
    examples: [
      { label: "Metriche definite", text: "Accuratezza ≥90%, Disparate Impact ≥0.8, test su dataset validation set hold-out 20%." },
      { label: "Soglia non rispettata", text: "Il DI score è 0.72 — sotto soglia. Il modello non può essere rilasciato senza debiasing." },
    ],
    starters: ["Quali metriche di fairness sono state usate?", "Il modello ha superato il test su dataset di validazione?", "Qual è la soglia di accuratezza minima accettabile?"],
  },
  mitigation: {
    goal: "Scegli l'opzione di trattamento (Modifica/Evitamento/Condivisione/Ritenzione) e definisci le misure concrete seguendo la gerarchia Art. 9(5).",
    examples: [
      { label: "Design-mitigation", text: "Eliminazione feature proxy (cap_residenza) dal dataset. Retraining con CTGAN debiasing. Testing fairness post-modifica." },
      { label: "Controllo", text: "Revisione umana obbligatoria per i 20 candidati con score più vicino alla soglia di esclusione." },
    ],
    starters: ["Quale opzione di trattamento è stata scelta?", "Quali misure tecniche sono state adottate?", "Chi è il responsabile delle misure di mitigazione?"],
  },
  monitoring: {
    goal: "Definisci frequenza monitoraggio, soglia PSI per drift detection e trigger di revisione del risk register.",
    examples: [
      { label: "PSI stabile", text: "PSI < 0.1 — modello stabile. Monitoraggio mensile automatico via pipeline Airflow." },
      { label: "Trigger revisione", text: "PSI > 0.2 rilevato dopo aggiornamento dataset: revisione urgente avviata, modello sospeso temporaneamente." },
    ],
    starters: ["Qual è la frequenza di monitoraggio pianificata?", "È stato definito il PSI threshold?", "Cosa scatena una revisione straordinaria del risk register?"],
  },
  gap_check: {
    goal: "Verifica che tutti i requisiti Art. 9(2)(a)-(d) + (6)-(9) siano coperti. Assegna un coverage score 0-100 e identifica le aree mancanti.",
    examples: [
      { label: "Copertura alta", text: "Coverage score: 85/100. Area mancante: Art. 9(9) impatto gruppi vulnerabili non ancora documentato." },
      { label: "Gap critico", text: "Art. 9(2)(c) monitoraggio post-market non definito — gap obbligatorio da colmare prima del deployment." },
    ],
    starters: ["Qual è il coverage score stimato?", "Quali requisiti Art. 9 non sono ancora coperti?", "Ci sono gap obbligatori da colmare prima del rilascio?"],
  },
  traceability: {
    goal: "Definisci la policy di versionamento del risk register, il periodo di retention dei log (Art. 12) e l'integrazione con il QMS aziendale (Art. 17).",
    examples: [
      { label: "Versionamento attivo", text: "Versione v1.0 approvata. Log automatici via Git. Retention 5 anni. Integrato nel QMS ISO 9001." },
      { label: "Nessun QMS", text: "Il sistema di gestione rischi è standalone — non integrato in un QMS formale. Raccomandato allineamento Art. 17." },
    ],
    starters: ["Il risk register è integrato nel QMS aziendale?", "Qual è la policy di retention dei log?", "Come vengono tracciate le versioni del registro?"],
  },
  dismissal: {
    goal: "Identifica i rischi specifici della fase di fine vita: cancellazione dati, dipendenze downstream, comunicazione ai deployer.",
    examples: [
      { label: "Dipendenza downstream", text: "3 sistemi esterni usano gli output del modello — necessaria migrazione dati prima della dismissione." },
      { label: "Cancellazione dati", text: "Dataset di addestramento da anonimizzare entro 30 giorni dal ritiro, con log di cancellazione certificato." },
    ],
    starters: ["Ci sono sistemi downstream che dipendono dagli output?", "Come vengono gestiti i dati al momento del ritiro?", "I deployer sono stati informati del piano di dismissione?"],
  },
  signoff: {
    goal: "Raccogli i nominativi per il sign-off (risk owner, compliance/legale, rappresentante legale) e la valutazione complessiva del rischio.",
    examples: [
      { label: "Approvazione completa", text: "Risk owner: Mario Rossi (CTO). Compliance: Avv. Anna Bianchi. Overall risk: MEDIO — accettabile con misure in vigore." },
      { label: "Approvazione condizionata", text: "Approvazione condizionata: deployment autorizzato solo dopo completamento del debiasing (entro 30/09/2026)." },
    ],
    starters: ["Chi è il risk owner del sistema?", "Qual è la valutazione complessiva del rischio (overall risk)?", "C'è un'approvazione condizionata con azioni pendenti?"],
  },
  communication: {
    goal: "Documenta chi è stato consultato: interni (DPO, legale, engineering), esterni (deployer, autorità), e se la FRIA ha informato questa sezione.",
    examples: [
      { label: "Consultazione interna", text: "Coinvolti: DPO (parere GDPR), Engineering (risk tecnico), Legale (compliance AI Act). Nessuna consultazione esterna richiesta." },
      { label: "FRIA collegata", text: "FRIA completata il 15/06/2026 — risultati integrati nella sezione Identificazione Rischi (impatto diritti fondamentali)." },
    ],
    starters: ["Chi è stato coinvolto internamente nel processo di risk management?", "La FRIA è stata completata e collegata?", "Ci sono stakeholder esterni da coinvolgere (deployer, autorità)?"],
  },
};

// ─── Persistence ──────────────────────────────────────────────────────────────

const CHAT_STORAGE_KEY = "aicomply_risk_manager_chat_v3";

interface PersistedChatState {
  messages: ChatMessage[];
  documentation: RiskDocumentation;
  currentPhaseIndex: number;
  completedPhases: RiskPhaseId[];
  docEdits?: Partial<Record<RiskPhaseId, string>>;
}

function loadChatState(): PersistedChatState | null {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedChatState) : null;
  } catch { return null; }
}

function saveChatState(s: PersistedChatState) {
  try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── TTS hook ────────────────────────────────────────────────────────────────

function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioIdRef = useRef<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const speak = useCallback(async (text: string, id: number) => {
    // Stesso messaggio in riproduzione → pausa
    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    // Stesso messaggio in pausa → riprendi
    if (audioIdRef.current === id && audioRef.current) {
      audioRef.current.play();
      setPlayingId(id);
      return;
    }
    // Messaggio diverso → ferma il precedente e scarica il nuovo audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; audioIdRef.current = null; }

    setPlayingId(id);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: stripMarkdown(text) }),
      });
      if (!res.ok) { setPlayingId(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audioIdRef.current = id;
      audio.onended = () => { setPlayingId(null); audioIdRef.current = null; URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingId(null); audioIdRef.current = null; };
      audio.play();
    } catch {
      setPlayingId(null);
    }
  }, [playingId]);

  return { speak, playingId };
}

// ─── Phase row ────────────────────────────────────────────────────────────────

function PhaseRow({
  phase, status, onOpen, hasData,
}: {
  phase: Phase; status: PhaseStatus; onOpen: () => void; hasData: boolean;
}) {
  const borderColor = status === "active" ? "rgba(0,0,0,0.2)" : status === "complete" ? "rgba(22,163,74,0.2)" : "rgba(0,0,0,0.07)";
  const bg = status === "active" ? "rgba(0,0,0,0.03)" : status === "complete" ? "rgba(22,163,74,0.04)" : "transparent";

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bg, borderRadius: 8, overflow: "hidden", marginBottom: 4 }}>
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-2.5 text-left transition-colors"
        style={{ padding: "8px 10px", cursor: "pointer", background: "transparent" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{ flexShrink: 0 }}>
          {status === "complete"
            ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #23403a" }} />
            : <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #dc2626" }} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11.5, fontWeight: 600,
            fontFamily: "var(--font-inter, system-ui)",
            color: status === "complete" ? "#15803d" : "#0D1016",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {phase.label}
          </div>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-inter, system-ui)",
            color: "rgba(0,0,0,0.4)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {phase.subtitle}
          </div>
        </div>
        {hasData && (
          <ChevronRight size={11} style={{ flexShrink: 0, color: "rgba(0,0,0,0.25)" }} />
        )}
      </button>
    </div>
  );
}

// ─── Document section row (mappa sezione documento → click → scroll nel PDF) ──

const SECTION_ANCHORS: Record<string, string> = {
  identification: "sec-identification",
  risks:          "sec-risks",
  gapCheck:       "sec-gap",
  reviewLog:      "sec-review",
  signOff:        "sec-signoff",
};

const SECTION_LEGAL_REFS: Record<string, string> = {
  identification: "Art. 9(2)(a)",
  risks:          "Art. 9(2)(b)",
  gapCheck:       "Art. 9(2)(c)",
  reviewLog:      "Art. 9(7)",
  signOff:        "Art. 9(9)",
};

function SectionRow({ section, onOpen, index }: { section: SectionProgress; onOpen: (anchor: string) => void; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const anchor      = SECTION_ANCHORS[section.key] ?? "";
  const legalRef    = SECTION_LEGAL_REFS[section.key] ?? "";
  const isComplete  = section.percent === 100;
  const circleColor = isComplete ? "#23403a" : "#dc2626";
  const pctColor    = isComplete ? "#23403a" : section.percent > 0 ? "#b45309" : "rgba(0,0,0,0.28)";
  const borderColor = isComplete ? "rgba(35,64,58,0.12)" : "rgba(0,0,0,0.07)";
  const doneCount   = section.subPoints.filter(sp => sp.done).length;

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: "hidden", marginBottom: 4, background: "transparent" }}>
      <button
        onClick={() => { onOpen(anchor); setExpanded(e => !e); }}
        style={{ padding: "9px 10px", cursor: "pointer", background: "transparent", width: "100%", border: "none", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{ flexShrink: 0 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${circleColor}` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {index + 1}. {section.label}
          </p>
          <p style={{ fontSize: 9, color: "rgba(0,0,0,0.42)", margin: 0, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doneCount}/{section.subPoints.length} · {legalRef}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: pctColor, fontFamily: "monospace" }}>{section.percent}%</span>
          <ChevronRight size={10} style={{ color: "rgba(0,0,0,0.22)", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
        </div>
      </button>
      <div style={{ height: 2, background: "rgba(0,0,0,0.04)" }}>
        <div style={{ height: "100%", width: `${section.percent}%`, background: circleColor, transition: "width 0.4s" }} />
      </div>
      {expanded && section.subPoints.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "4px 6px 6px 6px" }}>
          {section.subPoints.map((sp, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 4px", borderRadius: 5 }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${sp.done ? "#23403a" : "#dc2626"}` }} />
              </div>
              <p style={{
                fontSize: 10, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                color: sp.done ? "rgba(0,0,0,0.42)" : "#0D1016",
                textDecoration: sp.done ? "line-through" : "none",
                opacity: sp.done ? 0.55 : 1,
              }}>
                {sp.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Error boundary ──────────────────────────────────────────────────────────

class ViewerErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", background: "#ffffff" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>Errore visualizzazione documento</span>
            <button onClick={this.props.onClose} style={{ fontSize: 12, background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.4)" }}>✕</button>
          </div>
          <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "#991b1b", margin: 0, fontFamily: "monospace", background: "#FEE2E2", padding: "8px 12px", borderRadius: 6 }}>{this.state.error}</p>
            <p style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", margin: 0 }}>Ricarica la pagina o resetta la conversazione per ripristinare.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Phase viewer modal ───────────────────────────────────────────────────────

function ToolbarBtn({ icon, title, onClick, active }: {
  icon: React.ReactNode; title: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      onMouseDown={e => e.preventDefault()} // non perdere la selezione di testo
      onClick={onClick}
      title={title}
      style={{
        width: 26, height: 26, borderRadius: 6,
        background: active ? "#0D1016" : "transparent",
        color: active ? "#ffffff" : "rgba(0,0,0,0.55)",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.07)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {icon}
    </button>
  );
}

function PhaseDocColumn({
  registerDoc, annexes, editedHtml, onSaveEdit, onClose, scrollToAnchor,
}: {
  registerDoc: RiskRegisterDocument; annexes: AnnexSection[];
  editedHtml?: string; onSaveEdit: (html: string) => void;
  onClose: () => void; scrollToAnchor?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollToAnchor || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current.querySelector(`#${scrollToAnchor}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollToAnchor]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editRef.current?.focus();
  };

  const enterEdit = () => {
    const source = editedHtml ?? viewerRef.current?.innerHTML ?? "";
    setEditing(true);
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.innerHTML = source;
        editRef.current.querySelectorAll("[data-noedit]").forEach(el => {
          (el as HTMLElement).contentEditable = "false";
        });
        // Strip inline color from editable elements — prevents cursor inheriting
        // stale color (e.g. red) from a previously styled value element
        editRef.current.querySelectorAll("p, span, em, i, b, strong").forEach(el => {
          const htmlEl = el as HTMLElement;
          if (!htmlEl.closest("[data-noedit]")) htmlEl.style.color = "";
        });
        editRef.current.focus();
      }
    }, 0);
  };

  const confirmEdit = () => {
    if (editRef.current) onSaveEdit(editRef.current.innerHTML);
    setEditing(false);
  };

  const docStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 4,
    border: editing ? "1px solid rgba(13,16,22,0.35)" : "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    padding: "28px 32px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const docHeader = (
    <div data-noedit="true" style={{ marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #0D1016", fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.38)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>
        Art. 9 · Reg. UE 2024/1689 — Sistema di gestione dei rischi
      </p>
      <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0D1016", margin: "0 0 6px", fontFamily: "inherit" }}>
        Registro dei Rischi{registerDoc.identification.systemName ? ` — ${registerDoc.identification.systemName}` : ""}
      </h1>
    </div>
  );

  const docFooter = (
    <div style={{ borderTop: "1px solid rgba(0,0,0,0.12)", marginTop: 20, paddingTop: 8 }}>
      <p style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", fontStyle: "italic", margin: 0 }}>
        Generato da AIComply · {new Date().toLocaleDateString("it-IT")} · [verificare sul testo AI Act vigente]
      </p>
    </div>
  );

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10,
      overflow: "hidden", background: "#ffffff", minWidth: 0,
    }}>
      {/* Header colonna */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fafafa", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.8px", textTransform: "uppercase", margin: 0 }}>
            Art. 9 · Documento
          </p>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#0D1016", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Registro dei Rischi
          </p>
        </div>

        {/* Toolbar formattazione — visibile solo in modifica */}
        {editing && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "2px 4px", background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
            <ToolbarBtn icon={<Bold size={13} />}        title="Grassetto"    onClick={() => exec("bold")} />
            <ToolbarBtn icon={<Italic size={13} />}      title="Corsivo"      onClick={() => exec("italic")} />
            <ToolbarBtn icon={<Underline size={13} />}   title="Sottolineato" onClick={() => exec("underline")} />
            <ToolbarBtn icon={<Highlighter size={13} />} title="Evidenzia"    onClick={() => exec("hiliteColor", "#fef08a")} />
          </div>
        )}

        {/* Matita / conferma modifica */}
        <ToolbarBtn
          icon={editing ? <Check size={13} /> : <Pencil size={13} />}
          title={editing ? "Salva modifiche" : "Modifica documento"}
          onClick={editing ? confirmEdit : enterEdit}
          active={editing}
        />

        <button
          onClick={onClose}
          title="Chiudi documento"
          style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: 12,
            background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(0,0,0,0.45)", fontSize: 12,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
        >
          ✕
        </button>
      </div>

      {/* Corpo — pagina stile documento */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#FAFAFA", display: "flex", flexDirection: "column" }}>
        {editing ? (
          /* Modalità modifica: contentEditable puro, nessun componente React dentro */
          <div style={docStyle}>
            {docHeader}
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              style={{ outline: "none", cursor: "text", flex: 1 }}
            />
            {docFooter}
          </div>
        ) : (
          /* Modalità lettura: RiskRegisterViewer come normale componente React */
          <div style={docStyle}>
            {docHeader}
            <div ref={viewerRef} style={{ flex: 1 }}>
              {editedHtml
                ? <div dangerouslySetInnerHTML={{ __html: editedHtml }} />
                : <RiskRegisterViewer doc={registerDoc} annexes={annexes} />
              }
            </div>
            {docFooter}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message, index, onSpeak, isPlaying }: {
  message: ChatMessage; index: number;
  onSpeak: (text: string, id: number) => void; isPlaying: boolean;
}) {
  const isUser = message.role === "user";
  const clean = stripMarkdown(message.content);

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div style={{ maxWidth: "82%", position: "relative" }}>
        <div style={{
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          padding: "10px 14px",
          fontSize: 13, lineHeight: 1.55,
          background: isUser ? "#0D1016" : "#f5f5f4",
          color: isUser ? "#ffffff" : "#0D1016",
          border: isUser ? "none" : "1px solid rgba(0,0,0,0.07)",
        }}>
          {!isUser && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Shield size={10} style={{ color: "#0D1016" }} />
                <span style={{ fontSize: 9, color: "#0D1016", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Risk Manager AI
                </span>
              </div>
              <button
                onClick={() => onSpeak(clean, index)}
                title={isPlaying ? "Pausa" : "Ascolta"}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", marginLeft: 8,
                  fontSize: 10, fontWeight: 500,
                  borderRadius: 20, cursor: "pointer",
                  background: isPlaying ? "#0D1016" : "rgba(0,0,0,0.05)",
                  color: isPlaying ? "#ffffff" : "rgba(0,0,0,0.45)",
                  border: "1px solid " + (isPlaying ? "#0D1016" : "rgba(0,0,0,0.08)"),
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.background = "rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }}
              >
                {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                {isPlaying ? "Pausa" : "Ascolta"}
              </button>
            </div>
          )}
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{clean}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Export dropdown ──────────────────────────────────────────────────────────

function ExportMenu({ documentation, systemName }: { documentation: RiskDocumentation; systemName?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const name = systemName ?? "sistema";
  const date = new Date().toISOString().slice(0, 10);

  const buildSections = () => PHASES.map(p => {
    const data = documentation[p.id as keyof RiskDocumentation];
    return {
      title: `${p.label} (${p.article})`,
      content: data && Object.keys(data).length > 0
        ? Object.entries(data as Record<string, unknown>).map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "")}`).join("\n")
        : "Non completata",
    };
  });

  function exportMarkdown() {
    const lines = ["# Risk Register — AI Act Art. 9", `**Sistema**: ${name}`, `**Data**: ${date}`, ""];
    buildSections().forEach(s => { lines.push(`## ${s.title}`, s.content, ""); });
    lines.push("---\n*[verify against current AI Act text] — Generato da AIComply*");
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `RiskRegister_${name}_${date}.md` });
    a.click(); URL.revokeObjectURL(a.href);
    setOpen(false);
  }

  async function exportPDF() {
    const sections = buildSections().map(s => ({ title: s.title, content: s.content, status: s.content === "Non completata" ? "empty" as const : "complete" as const }));
    try {
      const res = await fetch("/api/compliance/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemName: name, tier: "high", sections }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `RiskRegister_${name}_${date}.pdf` });
      a.click(); URL.revokeObjectURL(a.href);
    } catch { /* silent */ }
    setOpen(false);
  }

  function exportWord() {
    const sections = buildSections();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a1a1a;margin:2cm}
h1{font-size:18pt;font-weight:600;margin-bottom:4pt}
h2{font-size:13pt;font-weight:600;margin-top:18pt;margin-bottom:4pt;color:#1d4ed8;border-bottom:1px solid #e0e0e0;padding-bottom:4pt}
p{margin:4pt 0;line-height:1.5}
.meta{font-size:9pt;color:#666;margin-bottom:16pt}
.footer{font-size:8pt;color:#999;margin-top:24pt;border-top:1px solid #ddd;padding-top:8pt}
</style></head><body>
<h1>Risk Register — AI Act Art. 9</h1>
<p class="meta">Sistema: ${name} &nbsp;·&nbsp; Data: ${date} &nbsp;·&nbsp; Generato da AIComply</p>
${sections.map(s => `<h2>${s.title}</h2><p>${s.content.replace(/\n/g, "<br>")}</p>`).join("\n")}
<p class="footer">[verify against current AI Act text] — Documento generato da AIComply. Richiedere verifica legale professionale prima dell&apos;utilizzo.</p>
</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `RiskRegister_${name}_${date}.doc` });
    a.click(); URL.revokeObjectURL(a.href);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, padding: "6px 12px", borderRadius: 20, background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer" }}
      >
        <Download size={12} /> Esporta <ChevronDown size={10} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 50, minWidth: 160, overflow: "hidden" }}>
          {[
            { label: "PDF", icon: "📄", action: exportPDF },
            { label: "Word (.doc)", icon: "📝", action: exportWord },
            { label: "Markdown", icon: "📋", action: exportMarkdown },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", fontSize: 12, color: "#0D1016", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RiskManagerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documentation, setDocumentation] = useState<RiskDocumentation>({});
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<RiskPhaseId[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [docEdits, setDocEdits] = useState<Partial<Record<RiskPhaseId, string>>>({});
  const [docWidth, setDocWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAnchor, setViewerAnchor] = useState<string | null>(null);
  const [showPhaseGuide, setShowPhaseGuide] = useState(true);
  const [customPhrase, setCustomPhrase] = useState("");
  const [guidedMode, setGuidedMode] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  // Apre il documento e scrolla alla sezione richiesta
  const openSection = useCallback((anchor: string) => {
    if (!viewerOpen) {
      const total = layoutRef.current?.clientWidth ?? 1200;
      const available = total - 256 - 12 * 3 - 6;
      setDocWidth(Math.max(280, Math.floor(available / 2)));
    }
    setViewerOpen(true);
    setViewerAnchor(anchor);
  }, [viewerOpen]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = docWidth;
    const onMove = (ev: MouseEvent) => {
      const max = (layoutRef.current?.clientWidth ?? 1200) * 0.6;
      setDocWidth(Math.min(Math.max(startWidth + (ev.clientX - startX), 280), max));
    };
    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [docWidth]);
  const [hydrated, setHydrated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { speak, playingId } = useTTS();

  const classifierData = readFromStorage<ClassifierResult>("classifier");
  const systemContext = {
    systemName: classifierData?.systemName,
    riskLevel: classifierData?.riskLevel,
    isGPAI: classifierData?.isGPAI,
  };

  // Registro dei Rischi derivato (sola lettura) dallo stato chat
  const registerDoc: RiskRegisterDocument = useMemo(
    () => buildRiskRegisterDocument(documentation, classifierData),
    [documentation, classifierData]
  );
  const annexes: AnnexSection[] = useMemo(
    () => buildAnnexSections(documentation),
    [documentation]
  );
  // Modulo condizionale GPAI — visibile se riskTier=gpai o incorporatesGpaiModel=yes
  const showGpaiModule = useMemo(() => shouldShowGpaiModule(documentation), [documentation]);
  // Avanzamento documento per sezione (usato nel rail sinistro)
  const registerProgress = useMemo(() => computeRegisterProgress(registerDoc), [registerDoc]);

  useEffect(() => {
    const saved = loadChatState();
    if (saved) {
      setMessages(saved.messages);
      setDocumentation(saved.documentation);
      setCurrentPhaseIndex(saved.currentPhaseIndex);
      setCompletedPhases(saved.completedPhases);
      setDocEdits(saved.docEdits ?? {});
    } else {
      setMessages([{
        role: "assistant",
        content: `Benvenuto nel Risk Manager AI Act di AIComply.\n\nTi guiderò attraverso 8 fasi per costruire un Risk Register completo ai sensi dell'Art. 9 Reg. UE 2024/1689.\n\nCominciamo con lo Scoping: indica il nome del sistema AI e il contesto in cui viene utilizzato (settore, uso previsto, categorie di utenti coinvolti).`,
      }]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { setShowPhaseGuide(true); setCustomPhrase(""); }, [currentPhaseIndex]);

  const persistState = useCallback((msgs: ChatMessage[], doc: RiskDocumentation, phaseIdx: number, completed: RiskPhaseId[]) => {
    saveChatState({ messages: msgs, documentation: doc, currentPhaseIndex: phaseIdx, completedPhases: completed, docEdits });
  }, [docEdits]);

  const saveDocEdit = useCallback((phaseId: RiskPhaseId, html: string) => {
    setDocEdits(prev => {
      const next = { ...prev, [phaseId]: html };
      const saved = loadChatState();
      if (saved) saveChatState({ ...saved, docEdits: next });
      return next;
    });
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const currentPhase = PHASES[currentPhaseIndex];
    const result = await Promise.race([
      riskManagerChat(newMessages, currentPhase.id, documentation, systemContext),
      new Promise<Awaited<ReturnType<typeof riskManagerChat>>>(resolve =>
        setTimeout(() => resolve({ error: "Timeout: risposta AI troppo lenta. Riprova." }), 55000)
      ),
    ]);

    if (result.error) {
      const updated = [...newMessages, { role: "assistant" as const, content: result.error }];
      setMessages(updated);
      persistState(updated, documentation, currentPhaseIndex, completedPhases);
      setIsLoading(false);
      return;
    }

    const assistantMsg: ChatMessage = { role: "assistant", content: result.reply ?? "" };
    const updatedMessages = [...newMessages, assistantMsg];
    let newDoc = documentation;
    let newPhaseIndex = currentPhaseIndex;
    let newCompleted = completedPhases;

    if (result.patch) {
      newDoc = { ...documentation, ...result.patch };
      setDocumentation(newDoc);
    }

    if (result.stepComplete && currentPhaseIndex < PHASES.length - 1) {
      newCompleted = [...completedPhases, currentPhase.id];
      setCompletedPhases(newCompleted);
      newPhaseIndex = currentPhaseIndex + 1;
      setCurrentPhaseIndex(newPhaseIndex);
      updatedMessages.push({
        role: "assistant",
        content: `Fase "${currentPhase.label}" completata e documentata.\n\nProcediamo con la fase "${PHASES[newPhaseIndex].label}" (${PHASES[newPhaseIndex].article}).`,
      });
    } else if (result.stepComplete && currentPhaseIndex === PHASES.length - 1) {
      newCompleted = [...completedPhases, currentPhase.id];
      setCompletedPhases(newCompleted);
      writeToStorage<RiskManagerResult>("riskManager", {
        risks: [],
        overallRiskLevel: newDoc.signoff?.overallRisk === "alto" ? "high" : newDoc.signoff?.overallRisk === "critico" ? "critical" : "medium",
        completedAt: new Date().toISOString(),
        nextReviewDate: newDoc.signoff?.nextReviewDate,
      });
    }

    setMessages(updatedMessages);
    persistState(updatedMessages, newDoc, newPhaseIndex, newCompleted);
    setIsLoading(false);
  }, [input, isLoading, messages, currentPhaseIndex, documentation, completedPhases, systemContext, persistState]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetChat = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([{
      role: "assistant",
      content: `Benvenuto nel Risk Manager AI Act di AIComply.\n\nTi guiderò attraverso 8 fasi per costruire un Risk Register completo ai sensi dell'Art. 9 Reg. UE 2024/1689.\n\nCominciamo con lo Scoping: indica il nome del sistema AI e il contesto in cui viene utilizzato.`,
    }]);
    setDocumentation({});
    setCurrentPhaseIndex(0);
    setCompletedPhases([]);
    setDocEdits({});
    setViewerOpen(false);
    setViewerAnchor(null);
    setInput("");
  };

  if (!hydrated) return null;

  if (guidedMode) {
    return (
      <div style={{ fontFamily: "var(--font-inter, system-ui)", background: "#ffffff", height: "calc(100vh - 4rem)", display: "flex", flexDirection: "column" }}>
        <SystemSelector />
        <ProviderTransitionAlertBanner />
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <RiskRegisterGuidedMode onExitGuidedMode={() => setGuidedMode(false)} />
        </div>
      </div>
    );
  }

  const progressPct = registerProgress.overallPercent;
  const hasContent = completedPhases.length > 0 || Object.keys(documentation).length > 0;

  return (
    <div style={{ fontFamily: "var(--font-inter, system-ui)", background: "#ffffff", height: "calc(100vh - 4rem)", display: "flex", flexDirection: "column" }}>
      <SystemSelector />
      <ProviderTransitionAlertBanner />

      {/* Header */}
      <div style={{ paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginTop: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>
              Art. 9 · Reg. UE 2024/1689
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: "#0D1016", letterSpacing: "-0.8px", margin: 0 }}>
              Risk Manager
            </h1>
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginTop: 4 }}>
              Framework guidato AI — Monte Carlo, audit bitemporale, drift detection, GPAI. Ogni risposta AI include audio con voce Chirp3-HD.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {hasContent && <ExportMenu documentation={documentation} systemName={systemContext.systemName} />}
            <button
              onClick={resetChat}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 12px", borderRadius: 20, background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.07)", cursor: "pointer" }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Tab switcher: Form completo / Risk Register guidato */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.08)", marginTop: 8 }}>
          <button
            onClick={() => setGuidedMode(false)}
            style={{
              padding: "8px 16px", fontSize: 12, fontWeight: !guidedMode ? 700 : 500,
              color: !guidedMode ? "#0D1016" : "rgba(0,0,0,0.42)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: !guidedMode ? "2px solid #0D1016" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            Form strutturato
          </button>
          <button
            onClick={() => setGuidedMode(true)}
            style={{
              padding: "8px 16px", fontSize: 12, fontWeight: guidedMode ? 700 : 500,
              color: guidedMode ? "#0D1016" : "rgba(0,0,0,0.42)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: guidedMode ? "2px solid #0D1016" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            Risk Register guidato
          </button>
        </div>
      </div>

      {/* Split layout: sinistra fissa · documento (ridimensionabile) · chat */}
      <div ref={layoutRef} style={{ display: "flex", flex: 1, minHeight: 0, gap: 12, overflow: "hidden" }}>

        {/* LEFT — progress */}
        <div style={{ width: 256, flexShrink: 0, display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", background: "#fafafa" }}>
          <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Avanzamento
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", fontFamily: "monospace" }}>
                {progressPct}%
              </span>
            </div>
            <div style={{ width: "100%", height: 4, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "#0D1016", borderRadius: 2, transition: "width 0.5s ease" }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            {/* Sezioni del documento — click apre il PDF e scrolla alla sezione */}
            {registerProgress.sections.map((section, idx) => (
              <SectionRow key={section.key} section={section} onOpen={openSection} index={idx} />
            ))}
          </div>

          {/* Footer sidebar: verifica legale + nota Art. 99-101 (non interattiva) */}
          <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 9, color: "rgba(0,0,0,0.35)" }}>
              <AlertTriangle size={10} style={{ flexShrink: 0, marginTop: 1, color: "#b45309" }} />
              <span>I campi estratti dall&apos;AI richiedono verifica legale professionale.</span>
            </div>
            <div style={{ fontSize: 9, color: "rgba(0,0,0,0.3)", lineHeight: 1.4, paddingTop: 3, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
              La mancata conformità all&apos;Art. 9 può comportare sanzioni ai sensi degli artt. 99-101 [verify against current AI Act text].
            </div>
          </div>
        </div>

        {/* CENTER — documento (apribile, ridimensionabile) */}
        {viewerOpen && (
          <>
            <div style={{ width: docWidth, flexShrink: 0, minWidth: 280, maxWidth: "60%" }}>
              <ViewerErrorBoundary onClose={() => setViewerOpen(false)}>
                <PhaseDocColumn
                  registerDoc={registerDoc}
                  annexes={annexes}
                  editedHtml={docEdits["scoping"]}
                  onSaveEdit={html => saveDocEdit("scoping", html)}
                  onClose={() => setViewerOpen(false)}
                  scrollToAnchor={viewerAnchor}
                />
              </ViewerErrorBoundary>
            </div>
            {/* Splitter trascinabile */}
            <div
              onMouseDown={startResize}
              style={{
                width: 6, flexShrink: 0, cursor: "col-resize",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 3,
                background: isResizing ? "rgba(0,0,0,0.12)" : "transparent",
                transition: isResizing ? "none" : "background 0.15s",
              }}
              onMouseEnter={e => { if (!isResizing) e.currentTarget.style.background = "rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { if (!isResizing) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 2, height: 32, borderRadius: 1, background: "rgba(0,0,0,0.2)" }} />
            </div>
          </>
        )}

        {/* RIGHT — chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#f5f5f4", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0D1016" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0D1016" }}>
              Fase corrente: {PHASES[currentPhaseIndex]?.label}
            </span>
            <span style={{ fontSize: 11, color: "rgba(0,0,0,0.45)" }}>
              — {PHASES[currentPhaseIndex]?.article}
            </span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <FileText size={10} style={{ color: "rgba(0,0,0,0.25)" }} />
              <span style={{ fontSize: 9, color: "rgba(0,0,0,0.25)" }}>Audio Chirp3-HD disponibile</span>
            </div>
          </div>

          {/* Phase guide card */}
          {(() => {
            const guide = PHASE_GUIDES[PHASES[currentPhaseIndex]?.id as RiskPhaseId];
            if (!guide) return null;
            return (
              <div style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafafa", flexShrink: 0 }}>
                <button
                  onClick={() => setShowPhaseGuide(v => !v)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.45)",
                  }}
                >
                  <span>Guida fase · {PHASES[currentPhaseIndex]?.label}</span>
                  <span style={{ fontSize: 10 }}>{showPhaseGuide ? "▲" : "▼"}</span>
                </button>
                {showPhaseGuide && (
                  <div style={{ padding: "0 16px 12px" }}>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", margin: "0 0 8px", lineHeight: 1.5 }}>
                      {guide.goal}
                    </p>
                    {/* Starter questions */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {guide.starters.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(s)}
                          style={{
                            fontSize: 10, padding: "4px 10px", borderRadius: 20,
                            background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.08)",
                            color: "#0D1016", cursor: "pointer", fontWeight: 500,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {/* Example answer chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {guide.examples.map((ex, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(ex.text)}
                          style={{
                            fontSize: 10, padding: "4px 10px", borderRadius: 20,
                            background: "rgba(13,16,22,0.06)", border: "1px solid rgba(0,0,0,0.10)",
                            color: "#0D1016", cursor: "pointer", textAlign: "left", fontWeight: 500,
                          }}
                          title={ex.text}
                        >
                          Esempio: {ex.label}
                        </button>
                      ))}
                    </div>
                    {/* Custom phrase input */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        value={customPhrase}
                        onChange={e => setCustomPhrase(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && customPhrase.trim()) {
                            setInput(customPhrase.trim());
                            setCustomPhrase("");
                          }
                        }}
                        placeholder="Oppure scrivi una risposta personalizzata…"
                        style={{
                          flex: 1, fontSize: 11, padding: "6px 10px", borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.10)", outline: "none",
                          background: "#fff", color: "#0D1016",
                        }}
                      />
                      {customPhrase.trim() && (
                        <button
                          onClick={() => { setInput(customPhrase.trim()); setCustomPhrase(""); }}
                          style={{
                            fontSize: 10, fontWeight: 700, padding: "5px 10px", borderRadius: 8,
                            background: "#0D1016", color: "#fff", border: "none", cursor: "pointer",
                          }}
                        >
                          Inserisci →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
            {messages.map((msg, i) => (
              <ChatBubble
                key={i} message={msg} index={i}
                onSpeak={speak} isPlaying={playingId === i}
              />
            ))}
            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "14px 14px 14px 4px", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={13} style={{ color: "#0D1016", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>Analisi in corso…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Fase: ${PHASES[currentPhaseIndex]?.subtitle} — scrivi la tua risposta…`}
                rows={2}
                disabled={isLoading}
                style={{
                  flex: 1, fontSize: 13, padding: "10px 14px", borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016", resize: "none",
                  outline: "none", fontFamily: "var(--font-inter, system-ui)",
                  background: "#ffffff", lineHeight: 1.5,
                  opacity: isLoading ? 0.5 : 1,
                }}
                onFocus={e => (e.target.style.borderColor = "rgba(0,0,0,0.25)")}
                onBlur={e => (e.target.style.borderColor = "rgba(0,0,0,0.12)")}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  flexShrink: 0, width: 40, height: 40,
                  background: (!input.trim() || isLoading) ? "rgba(0,0,0,0.06)" : "#0D1016",
                  color: (!input.trim() || isLoading) ? "rgba(0,0,0,0.25)" : "#ffffff",
                  border: "none", borderRadius: 10, cursor: (!input.trim() || isLoading) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
                }}
              >
                <Send size={15} />
              </button>
            </div>
            <p style={{ fontSize: 10, color: "rgba(0,0,0,0.25)", marginTop: 6 }}>
              Enter per inviare · Shift+Enter per andare a capo
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
