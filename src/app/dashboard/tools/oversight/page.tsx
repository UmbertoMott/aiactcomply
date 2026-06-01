"use client";

import { useState, useRef, useEffect, CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Brain, StopCircle, AlertTriangle,
  Settings, Shield, Activity, Plus, X, CheckCircle2,
  AlertCircle, Play,
} from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { OversightResult, ClassifierResult, RiskManagerResult, ResilienceResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.22)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bg:      "#f9f9fb",
  red:     "#dc2626",  redBg:   "rgba(220,38,38,0.06)",  redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#d97706",  amberBg: "rgba(202,138,4,0.07)",  amberBdr:"rgba(202,138,4,0.22)",
  green:   "#15803d",  greenBg: "rgba(22,163,74,0.06)",  greenBdr:"rgba(22,163,74,0.18)",
  blue:    "#1d4ed8",  blueBg:  "rgba(29,78,216,0.05)",  blueBdr: "rgba(29,78,216,0.16)",
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

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface OversightConfig {
  known_capabilities: string;
  known_limitations: string;
  anomaly_indicators: string[];
  monitoring_tools: string;
  do_not_use_conditions: string[];
  automation_bias_training: "yes" | "no" | "";
  automation_bias_notes: string;
  output_format_explained: string;
  confidence_threshold: string;
  interpretation_guide: string;
  available_xai_tools: string;
  decision_authority_persons: string[];
  override_procedure: string;
  escalation_path: string;
}

function createEmptyConfig(): OversightConfig {
  return {
    known_capabilities: "",
    known_limitations: "",
    anomaly_indicators: [
      "Confidenza > 95% su casi edge",
      "Output fuori distribuzione rilevato",
      "Pattern bias su gruppo demografico",
    ],
    monitoring_tools: "",
    do_not_use_conditions: [
      "Dataset input fuori distribuzione",
      "Incertezza molto elevata sulla situazione specifica",
    ],
    automation_bias_training: "",
    automation_bias_notes: "",
    output_format_explained: "",
    confidence_threshold: "",
    interpretation_guide: "",
    available_xai_tools: "",
    decision_authority_persons: [],
    override_procedure: "",
    escalation_path: "",
  };
}

interface FrictionEvent {
  id: string;
  type: "approved" | "friction_bypassed" | "blocked";
  timestamp: string;
  elapsed: number;
  reason?: string;
}

const CONFIG_KEY  = "oversight_config";
const EVENTS_KEY  = "oversight_events";
const SUSPEND_KEY = "oversight_suspended";

// ─── Tag input helper ─────────────────────────────────────────────────────────

function TagInput({
  items, onChange, placeholder,
}: { items: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft("");
  }
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder} style={{ ...inputSt, flex: 1 }} />
        <button onClick={add} style={{
          padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`,
          background: T.card, cursor: "pointer", display: "flex", alignItems: "center",
        }}>
          <Plus className="h-3.5 w-3.5" style={{ color: T.muted }} />
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11, padding: "3px 8px", borderRadius: 20,
              background: T.bg, border: `1px solid ${T.border}`, color: T.text,
            }}>
              {item}
              <button onClick={() => onChange(items.filter((_, j) => j !== i))}
                style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <X className="h-2.5 w-2.5" style={{ color: T.faint }} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>
      {children}{required && <span style={{ color: T.red }}> *</span>}
    </label>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SecHead({ art, label, desc }: { art: string; label: string; desc: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
          background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBdr}`,
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>{art}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{label}</span>
      </div>
      <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.55 }}>{desc}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OversightPage() {
  const [activeTab, setActiveTab] = useState<"config" | "friction" | "log">("config");

  // Config state
  const [config, setConfig] = useState<OversightConfig>(() => {
    if (typeof window === "undefined") return createEmptyConfig();
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? { ...createEmptyConfig(), ...JSON.parse(raw) } : createEmptyConfig();
    } catch { return createEmptyConfig(); }
  });
  const configTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Friction Gate state
  const [approved,        setApproved]        = useState(false);
  const [frictionActive,  setFrictionActive]  = useState(false);
  const [frictionReason,  setFrictionReason]  = useState("");
  const [blocked,         setBlocked]         = useState(false);
  const [systemSuspended, setSystemSuspended] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SUSPEND_KEY) === "1";
  });

  // Events
  const [events, setEvents] = useState<FrictionEvent[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(EVENTS_KEY) ?? "[]") as FrictionEvent[]; }
    catch { return []; }
  });

  // Toast & saved
  const [toast,   setToast]   = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<OversightResult>("oversight")?.completedAt ?? null
  );

  const startTime = useRef<number>(Date.now());

  useEffect(() => { startTime.current = Date.now(); }, []);

  // Pre-populate from other tools' localStorage data
  useEffect(() => {
    const cls = readFromStorage<ClassifierResult>("classifier");
    const risk = readFromStorage<RiskManagerResult>("riskManager");
    const res = readFromStorage<ResilienceResult>("resilience");

    setConfig(prev => {
      const patch: Partial<OversightConfig> = {};

      // Pre-populate known_capabilities from classifier riskLevel
      if (!prev.known_capabilities && cls?.riskLevel) {
        patch.known_capabilities = `Sistema classificato come rischio "${cls.riskLevel}" (EU AI Act). ${cls.systemDescription ?? ""}`.trim();
      }

      // Pre-populate do_not_use_conditions from top risk titles
      if (prev.do_not_use_conditions.length === 0 && risk?.risks && risk.risks.length > 0) {
        const topRisks = risk.risks
          .filter(r => r.residualRisk !== "acceptable")
          .slice(0, 3)
          .map(r => r.title);
        if (topRisks.length > 0) {
          patch.do_not_use_conditions = topRisks;
        }
      }

      // Pre-populate confidence_threshold from resilience accuracyMetric
      if (!prev.confidence_threshold && res?.accuracyMetric != null) {
        patch.confidence_threshold = String((res.accuracyMetric / 100).toFixed(2));
      }

      return Object.keys(patch).length > 0 ? { ...prev, ...patch } : prev;
    });
  }, []);

  // Autosave config 800ms
  function upConfig(patch: Partial<OversightConfig>) {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      if (configTimerRef.current) clearTimeout(configTimerRef.current);
      configTimerRef.current = setTimeout(() => {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
      }, 800);
      return next;
    });
  }

  function showToast(msg: string, kind: "ok" | "err" = "ok") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }

  function addEvent(ev: FrictionEvent) {
    setEvents(prev => {
      const next = [ev, ...prev].slice(0, 50);
      localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
      return next;
    });
  }

  // ── Save to dossier ──────────────────────────────────────────────────────

  function saveToDossier() {
    const now = new Date().toISOString();
    writeToStorage<OversightResult>("oversight", {
      oversightMechanism: "Art. 14(3)(a-e) — Framework completo di supervisione umana",
      humanInterventionPoints: config.decision_authority_persons.length > 0
        ? config.decision_authority_persons
        : ["Da configurare"],
      stopCapability: true,
      responsiblePersons: config.decision_authority_persons,
      completedAt: now,
    });
    appendEvidence("decision", {
      type: "Oversight — Framework Art. 14(3)(a-e) configurato",
      anomalyIndicators: config.anomaly_indicators.length,
      doNotUseConditions: config.do_not_use_conditions.length,
      authorityPersons: config.decision_authority_persons.length,
      frictionEvents: events.length,
      systemSuspended,
      savedAt: now,
    }, "oversight");
    setSavedAt(now);
    showToast("Framework Oversight salvato nel dossier");
  }

  // ── Friction Gate ────────────────────────────────────────────────────────

  function handleApprove() {
    const elapsed = (Date.now() - startTime.current) / 1000;
    if (elapsed < 2.0) {
      setFrictionActive(true);
      addEvent({ id: crypto.randomUUID(), type: "friction_bypassed", timestamp: new Date().toISOString(), elapsed });
      return;
    }
    setApproved(true);
    const ev: FrictionEvent = { id: crypto.randomUUID(), type: "approved", timestamp: new Date().toISOString(), elapsed };
    addEvent(ev);
    appendEvidence("decision", {
      type: "Supervisione umana — Approvazione deliberata Art. 14",
      scenario: "Screening CV: candidato respinto con confidenza 89%",
      elapsedSeconds: elapsed.toFixed(2),
      frictionTriggered: false,
      timestamp: ev.timestamp,
    }, "oversight");
    showToast("Output approvato e registrato nell'Evidence Layer");
  }

  function confirmWithReason() {
    if (!frictionReason.trim()) return;
    setApproved(true);
    setFrictionActive(false);
    const ev: FrictionEvent = {
      id: crypto.randomUUID(), type: "friction_bypassed",
      timestamp: new Date().toISOString(),
      elapsed: (Date.now() - startTime.current) / 1000,
      reason: frictionReason.trim(),
    };
    addEvent(ev);
    appendEvidence("decision", {
      type: "Friction Gate superato con motivazione — Art. 14(4)",
      scenario: "Screening CV: candidato respinto con confidenza 89%",
      motivazione: frictionReason.trim(),
      elapsedSeconds: ev.elapsed.toFixed(2),
      frictionTriggered: true,
      timestamp: ev.timestamp,
    }, "oversight");
    showToast("Approvazione con motivazione registrata nell'Evidence Layer");
    setFrictionReason("");
  }

  function blockOutput() {
    setFrictionActive(false);
    setBlocked(true);
    const ev: FrictionEvent = {
      id: crypto.randomUUID(), type: "blocked",
      timestamp: new Date().toISOString(),
      elapsed: (Date.now() - startTime.current) / 1000,
      reason: frictionReason.trim() || "Output bloccato dall'operatore",
    };
    addEvent(ev);
    appendEvidence("decision", {
      type: "Output bloccato da supervisore umano — Art. 14",
      scenario: "Screening CV: candidato respinto con confidenza 89%",
      reason: ev.reason,
      timestamp: ev.timestamp,
    }, "oversight");
    showToast("Output bloccato e registrato nell'Evidence Layer", "err");
    setFrictionReason("");
  }

  function suspendSystem() {
    setSystemSuspended(true);
    localStorage.setItem(SUSPEND_KEY, "1");
    appendEvidence("decision", {
      type: "Sistema AI sospeso — Art. 14(3)(e)",
      suspendedAt: new Date().toISOString(),
      operator: "Supervisore umano",
    }, "oversight");
    showToast("Sistema sospeso — supervisione umana attiva", "err");
  }

  function resumeSystem() {
    setSystemSuspended(false);
    localStorage.removeItem(SUSPEND_KEY);
    appendEvidence("decision", {
      type: "Sistema AI riattivato — Art. 14(3)(e)",
      resumedAt: new Date().toISOString(),
    }, "oversight");
    showToast("Sistema riattivato");
  }

  // ── Metrics ──────────────────────────────────────────────────────────────

  const totalEvents   = events.length;
  const frictionCount = events.filter(e => e.type === "friction_bypassed").length;
  const blockedCount  = events.filter(e => e.type === "blocked").length;
  const approvedCount = events.filter(e => e.type === "approved").length;
  const frictionPct   = totalEvents > 0 ? Math.round((frictionCount / totalEvents) * 100) : 0;
  const blockedPct    = totalEvents > 0 ? Math.round((blockedCount  / totalEvents) * 100) : 0;
  const highBias      = frictionPct > 30;

  // ── Render ────────────────────────────────────────────────────────────────

  const tabs: { id: "config" | "friction" | "log"; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { id: "config",  label: "Configurazione",  Icon: Settings   },
    { id: "friction",label: "Friction Gate",   Icon: Shield     },
    { id: "log",     label: "Log & Metriche",  Icon: Activity   },
  ];

  return (
    <div className="w-full">

      <SystemContextBanner checkProhibited={true} />

      {/* Dossier banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}>
          <span style={{ color: T.green }}>✓ Salvato nel dossier · {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity"
            style={{ color: T.green }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <span style={{ color: T.muted }}>Salva il framework di oversight nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
            style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
            Salva nel dossier
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016", margin: 0 }}>
          Supervisione Umana — Art. 14 AI Act
        </h1>
        <p style={{ marginTop: 4, fontSize: 12, color: T.muted, lineHeight: 1.55 }}>
          Framework completo Art. 14(3)(a-e): capacità/limiti, quando non usare il sistema,
          interpretazione output, autorità di decisione indipendente, intervento e sospensione.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: "8px 8px 0 0",
              fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer", border: `1px solid ${activeTab === tab.id ? T.border : "transparent"}`,
              borderBottom: activeTab === tab.id ? `1px solid ${T.card}` : "none",
              background: activeTab === tab.id ? T.card : "transparent",
              color: activeTab === tab.id ? T.text : T.muted,
              marginBottom: activeTab === tab.id ? -1 : 0,
              transition: "all 0.12s",
            }}>
            <tab.Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: CONFIGURAZIONE ─────────────────────────────────────────── */}
      {activeTab === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Sezione A — Art. 14(3)(a) */}
          <div style={{ ...cardSt, padding: 18 }}>
            <SecHead
              art="Art. 14(3)(a)"
              label="Capacità, limiti e indicatori di anomalia"
              desc="Il supervisore deve comprendere le capacità e i limiti del sistema e saper rilevare anomalie, disfunzioni e performance inattese."
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <Lbl>Cosa sa fare il sistema (capacità documentate)</Lbl>
                <textarea value={config.known_capabilities}
                  onChange={e => upConfig({ known_capabilities: e.target.value })}
                  rows={3} placeholder="es. Classificazione testo italiano con F1 0.91, supporta batch fino a 10k record, output: label + confidence score 0-1…"
                  style={taSt} />
              </div>
              <div>
                <Lbl>Cosa NON sa fare — limiti e failure modes noti</Lbl>
                <textarea value={config.known_limitations}
                  onChange={e => upConfig({ known_limitations: e.target.value })}
                  rows={3} placeholder="es. Non gestisce testi in dialetto, degrada con input > 512 token, non calibrato su dati post-2023, fallisce su ironia…"
                  style={taSt} />
              </div>
              <div>
                <Lbl>Indicatori di anomalia da monitorare</Lbl>
                <TagInput
                  items={config.anomaly_indicators}
                  onChange={v => upConfig({ anomaly_indicators: v })}
                  placeholder="Aggiungi indicatore (Invio per confermare)"
                />
              </div>
              <div>
                <Lbl>Strumenti di monitoraggio disponibili</Lbl>
                <input value={config.monitoring_tools}
                  onChange={e => upConfig({ monitoring_tools: e.target.value })}
                  placeholder="es. Dashboard Grafana, alert email su drift > 5%, log Splunk…"
                  style={inputSt} />
              </div>
            </div>
          </div>

          {/* Sezione B — Art. 14(3)(b) */}
          <div style={{ ...cardSt, padding: 18 }}>
            <SecHead
              art="Art. 14(3)(b)"
              label="Quando NON fare affidamento sull'output"
              desc="Il supervisore deve sapere quando e come non usare l'output del sistema, incluso il rischio di automation bias."
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <Lbl>Situazioni in cui l&apos;output NON deve essere seguito</Lbl>
                <TagInput
                  items={config.do_not_use_conditions}
                  onChange={v => upConfig({ do_not_use_conditions: v })}
                  placeholder="Aggiungi condizione (Invio per confermare)"
                />
              </div>
              <div>
                <Lbl>Formazione su automation bias completata?</Lbl>
                <select value={config.automation_bias_training}
                  onChange={e => upConfig({ automation_bias_training: e.target.value as OversightConfig["automation_bias_training"] })}
                  style={inputSt}>
                  <option value="">— seleziona —</option>
                  <option value="yes">Sì — formazione completata</option>
                  <option value="no">No — formazione non ancora erogata</option>
                </select>
                {config.automation_bias_training === "no" && (
                  <div style={{ marginTop: 8, padding: "9px 12px", borderRadius: 8,
                    background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.amber, marginBottom: 2 }}>
                      ⚠ Formazione mancante
                    </p>
                    <p style={{ fontSize: 11, color: "#78350f", lineHeight: 1.5 }}>
                      L&apos;Art. 14(4) richiede che i supervisori abbiano competenze adeguate.
                      Pianificare la formazione sull&apos;automation bias prima del deployment.
                    </p>
                  </div>
                )}
              </div>
              {config.automation_bias_training === "yes" && (
                <div>
                  <Lbl>Note sulla formazione (provider, data, contenuti)</Lbl>
                  <textarea value={config.automation_bias_notes}
                    onChange={e => upConfig({ automation_bias_notes: e.target.value })}
                    rows={2} placeholder="es. Corso interno HR + AI, 4h, aprile 2025. Materiali disponibili in /compliance/training…"
                    style={taSt} />
                </div>
              )}
            </div>
          </div>

          {/* Sezione C — Art. 14(3)(c) */}
          <div style={{ ...cardSt, padding: 18 }}>
            <SecHead
              art="Art. 14(3)(c)"
              label="Interpretazione corretta dell'output"
              desc="Il supervisore deve saper interpretare correttamente l'output tenendo conto degli strumenti e metodi di interpretazione disponibili."
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <Lbl>Come si legge l&apos;output (formato, scale, labels)</Lbl>
                <textarea value={config.output_format_explained}
                  onChange={e => upConfig({ output_format_explained: e.target.value })}
                  rows={2} placeholder="es. Score 0-1 (> 0.8 = alta confidenza), label binaria ACCEPT/REJECT, top-3 feature importance…"
                  style={taSt} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Lbl>Soglia di confidenza minima</Lbl>
                  <input value={config.confidence_threshold}
                    onChange={e => upConfig({ confidence_threshold: e.target.value })}
                    placeholder="es. 0.75 — sotto questa soglia non usare l'output"
                    style={inputSt} />
                </div>
                <div>
                  <Lbl>Strumenti XAI disponibili</Lbl>
                  <input value={config.available_xai_tools}
                    onChange={e => upConfig({ available_xai_tools: e.target.value })}
                    placeholder="es. SHAP dashboard, LIME locale, feature importance…"
                    style={inputSt} />
                </div>
              </div>
              <div>
                <Lbl>Guida breve per i supervisori</Lbl>
                <textarea value={config.interpretation_guide}
                  onChange={e => upConfig({ interpretation_guide: e.target.value })}
                  rows={3} placeholder="es. 1) Verifica confidence score, 2) Se < soglia apri SHAP dashboard, 3) Controlla feature importance vs policy interna…"
                  style={taSt} />
              </div>
            </div>
          </div>

          {/* Sezione D — Art. 14(3)(d) */}
          <div style={{ ...cardSt, padding: 18 }}>
            <SecHead
              art="Art. 14(3)(d)"
              label="Autorità di decisione indipendente"
              desc="Il supervisore deve poter decidere di non usare il sistema in situazioni specifiche o annullarne l'output. Identificare chi ha questa autorità e come."
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <Lbl>Persone autorizzate a ignorare / annullare l&apos;output</Lbl>
                <TagInput
                  items={config.decision_authority_persons}
                  onChange={v => upConfig({ decision_authority_persons: v })}
                  placeholder="es. Responsabile HR, AI Compliance Officer (Invio)"
                />
              </div>
              <div>
                <Lbl>Procedura documentata per l&apos;override</Lbl>
                <textarea value={config.override_procedure}
                  onChange={e => upConfig({ override_procedure: e.target.value })}
                  rows={2} placeholder="es. 1) Documenta motivazione nel registro override, 2) Notifica AI compliance officer, 3) Archivia in Evidence Layer…"
                  style={taSt} />
              </div>
              <div>
                <Lbl>Percorso di escalation</Lbl>
                <input value={config.escalation_path}
                  onChange={e => upConfig({ escalation_path: e.target.value })}
                  placeholder="es. Team leader HR → AI Compliance Officer → DPO → CTO"
                  style={inputSt} />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button onClick={saveToDossier}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium hover:opacity-80 transition-opacity"
              style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Salva nel dossier
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: FRICTION GATE ─────────────────────────────────────────── */}
      {activeTab === "friction" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* System suspended banner */}
          {systemSuspended && (
            <div style={{ ...cardSt, padding: 16, background: T.redBg, border: `1px solid ${T.redBdr}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StopCircle className="h-5 w-5 flex-shrink-0" style={{ color: T.red }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: T.red }}>
                      Sistema sospeso — supervisione umana attiva
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(220,38,38,0.7)", marginTop: 2 }}>
                      Il sistema AI è stato fermato. Nessun output deve essere usato fino alla riattivazione.
                    </p>
                  </div>
                </div>
                <button onClick={resumeSystem}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: T.red, color: "#fff", border: "none", cursor: "pointer" }}>
                  <Play className="h-3.5 w-3.5" /> Riattiva sistema
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Friction Gate panel */}
            <div style={{ ...cardSt, padding: 20 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>
                Scenario: Output rischioso rilevato
              </h2>
              <div className="rounded-lg p-4 mb-4"
                style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
                <AlertTriangle className="h-4 w-4 inline mr-1 mb-1" style={{ color: T.amber }} />
                <p style={{ fontSize: 12, fontWeight: 500, color: T.text }}>
                  Screening CV: candidato respinto con confidenza 89%
                </p>
                <p style={{ fontSize: 10, color: T.muted, marginTop: 4, lineHeight: 1.5 }}>
                  Il sistema ha rilevato un pattern di bias di genere nel training set.
                  L&apos;output potrebbe violare l&apos;Art. 21 Carta UE.
                </p>
              </div>

              {!approved && !frictionActive && !systemSuspended && (
                <button onClick={handleApprove}
                  style={{
                    width: "100%", borderRadius: 8, background: T.text,
                    padding: "10px 16px", fontSize: 13, fontWeight: 500,
                    color: "#fff", border: "none", cursor: "pointer",
                  }}>
                  Approva output
                </button>
              )}

              {systemSuspended && !approved && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: T.redBg, border: `1px solid ${T.redBdr}` }}>
                  <p style={{ fontSize: 12, color: T.red, fontWeight: 500 }}>
                    Sistema sospeso — approvazione disabilitata
                  </p>
                </div>
              )}

              {frictionActive && (
                <div className="rounded-lg p-4"
                  style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <StopCircle className="h-5 w-5" style={{ color: T.red }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.red }}>⛔ Friction Gate ATTIVATO</span>
                  </div>
                  <p style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
                    Approvazione troppo rapida. Motivazione obbligatoria (Art. 14(4)).
                  </p>
                  <textarea value={frictionReason} onChange={e => setFrictionReason(e.target.value)}
                    placeholder="Spiega perché questo output è accettabile nonostante il bias rilevato..."
                    style={{ ...taSt, marginBottom: 12 }} rows={3} />
                  <div className="flex gap-2">
                    <button onClick={confirmWithReason} disabled={!frictionReason.trim()}
                      style={{
                        borderRadius: 7, background: T.text, padding: "7px 14px",
                        fontSize: 12, fontWeight: 500, color: "#fff",
                        border: "none", cursor: "pointer", opacity: !frictionReason.trim() ? 0.4 : 1,
                      }}>
                      Conferma con motivazione
                    </button>
                    <button onClick={blockOutput}
                      style={{
                        borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 500,
                        border: `1px solid ${T.redBdr}`, color: T.red,
                        background: "transparent", cursor: "pointer",
                      }}>
                      Blocca output
                    </button>
                  </div>
                </div>
              )}

              {approved && !frictionActive && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg p-3 flex items-center gap-2"
                  style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}`, color: T.green, fontSize: 12 }}>
                  <CheckCircle className="h-4 w-4" /> Output approvato e registrato nell&apos;Evidence Layer.
                </motion.div>
              )}
              {blocked && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg p-3 flex items-center gap-2"
                  style={{ background: T.redBg, border: `1px solid ${T.redBdr}`, color: T.red, fontSize: 12 }}>
                  <StopCircle className="h-4 w-4" /> Output bloccato — Registrato nell&apos;Evidence Layer.
                </motion.div>
              )}

              {/* Reset demo */}
              {(approved || blocked) && (
                <button onClick={() => {
                  setApproved(false); setBlocked(false);
                  setFrictionActive(false); setFrictionReason("");
                  startTime.current = Date.now();
                }} style={{
                  marginTop: 10, fontSize: 11, color: T.muted, background: "none",
                  border: "none", cursor: "pointer", textDecoration: "underline", padding: 0,
                }}>
                  Resetta scenario demo
                </button>
              )}
            </div>

            {/* Log panel */}
            <div style={{ ...cardSt, padding: 20 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>
                Log eventi Friction Gate
              </h2>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {events.length === 0 ? (
                  <p style={{ fontSize: 12, color: T.faint, padding: "8px 0" }}>
                    Nessun evento registrato. Usa il pannello a sinistra per interagire.
                  </p>
                ) : events.map((ev) => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 11 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 4, flexShrink: 0, marginTop: 3,
                      background: ev.type === "approved" ? T.green : ev.type === "blocked" ? T.red : "#ca8a04",
                    }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontWeight: 500, color: T.text }}>
                          {ev.type === "approved" ? "Approvato" : ev.type === "blocked" ? "Bloccato" : "Friction Gate"}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: T.faint, flexShrink: 0 }}>
                          {new Date(ev.timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                      <p style={{ color: T.muted }}>
                        {ev.elapsed.toFixed(1)}s · {ev.reason ?? (ev.type === "approved" ? "Deliberata" : "Attivato automaticamente")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, borderRadius: 8, background: "rgba(0,0,0,0.03)", padding: 10, fontSize: 10, color: T.muted, lineHeight: 1.5 }}>
                <Brain style={{ width: 11, height: 11, display: "inline", marginRight: 4, color: "#2563eb" }} />
                Art. 14(4): Se l&apos;approvazione avviene in &lt; 2s, il sistema presume Automation Bias e attiva il Friction Gate.
              </div>
            </div>
          </div>

          {/* Stop fisico — Art. 14(3)(e) */}
          <div style={{ ...cardSt, padding: 18, border: `1px solid ${T.redBdr}` }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                    background: T.redBg, color: T.red, border: `1px solid ${T.redBdr}`,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>Art. 14(3)(e)</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Stop fisico del sistema</span>
                </div>
                <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.55, maxWidth: 480 }}>
                  Il deployer deve poter intervenire, sospendere o sovrascrivere il sistema in qualsiasi momento.
                  La sospensione viene registrata nell&apos;Evidence Layer e blocca ogni nuova approvazione.
                </p>
              </div>
              {!systemSuspended ? (
                <button onClick={suspendSystem}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-[12px] font-semibold hover:opacity-80 transition-opacity flex-shrink-0"
                  style={{ background: T.red, color: "#fff", border: "none", cursor: "pointer" }}>
                  <StopCircle className="h-4 w-4" /> SOSPENDI SISTEMA
                </button>
              ) : (
                <button onClick={resumeSystem}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-[12px] font-semibold hover:opacity-80 transition-opacity flex-shrink-0"
                  style={{ background: T.green, color: "#fff", border: "none", cursor: "pointer" }}>
                  <Play className="h-4 w-4" /> Riattiva sistema
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LOG & METRICHE ────────────────────────────────────────── */}
      {activeTab === "log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Totale eventi",    value: String(totalEvents),                   color: T.text  },
              { label: "Approvazioni",     value: `${approvedCount} (${totalEvents > 0 ? Math.round(approvedCount / totalEvents * 100) : 0}%)`, color: T.green },
              { label: "Friction gate",    value: `${frictionCount} (${frictionPct}%)`,  color: "#ca8a04" },
              { label: "Output bloccati",  value: `${blockedCount} (${blockedPct}%)`,    color: T.red   },
            ].map(m => (
              <div key={m.label} style={{ ...cardSt, padding: "14px 16px" }}>
                <p style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.5px", color: m.color }}>{m.value}</p>
                <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Automation bias alert */}
          {highBias && (
            <div style={{ ...cardSt, padding: 14, background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: T.amber }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.amber }}>
                    ⚠ Rischio automation bias elevato — {frictionPct}% degli eventi
                  </p>
                  <p style={{ fontSize: 11, color: "#78350f", marginTop: 2, lineHeight: 1.5 }}>
                    Oltre il 30% delle decisioni ha attivato il Friction Gate. Verificare la formazione del personale
                    e rivedere la soglia di confidenza del sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Full event log */}
          <div style={{ ...cardSt, padding: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>
              Log completo eventi
            </h2>
            {events.length === 0 ? (
              <p style={{ fontSize: 12, color: T.faint }}>Nessun evento ancora. Usa il Friction Gate (tab 2) per generare eventi.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {events.map((ev, i) => (
                  <div key={ev.id} style={{
                    display: "grid", gridTemplateColumns: "8px 1fr auto auto",
                    alignItems: "start", gap: 10,
                    padding: "8px 0",
                    borderBottom: i < events.length - 1 ? `1px solid ${T.border}` : "none",
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0,
                      background: ev.type === "approved" ? T.green : ev.type === "blocked" ? T.red : "#ca8a04",
                    }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: T.text }}>
                        {ev.type === "approved" ? "Approvato (deliberato)" : ev.type === "blocked" ? "Output bloccato" : "Friction Gate attivato"}
                      </p>
                      {ev.reason && <p style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>→ {ev.reason}</p>}
                    </div>
                    <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>
                      {ev.elapsed.toFixed(1)}s
                    </span>
                    <span style={{ fontSize: 10, color: T.faint, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {new Date(ev.timestamp).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {events.length > 0 && (
            <div className="flex justify-end">
              <button onClick={() => {
                setEvents([]);
                localStorage.removeItem(EVENTS_KEY);
              }} style={{
                fontSize: 11, color: T.muted, background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline",
              }}>
                Cancella log
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg"
            style={{ background: toast.kind === "err" ? "rgba(220,38,38,0.95)" : T.text, color: "#fff" }}>
            {toast.kind === "err" ? "⛔" : "✓"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
