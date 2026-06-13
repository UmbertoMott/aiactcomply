"use client";
import React, { useState, useRef, useEffect, useCallback, CSSProperties } from "react";
import Link from "next/link";
import {
  Shield, CheckCircle2, Clock, Minus, AlertTriangle, StopCircle,
  Play, Plus, X, Sparkles, Loader2, Check, Brain, Info,
  ExternalLink, AlertCircle,
} from "lucide-react";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";
import {
  OVERSIGHT_REQUIREMENTS,
  FOUR_EYES_MODULE,
  MEASURE_IMPLEMENTATION_TYPE_LABELS,
} from "@/lib/oversight/oversight-requirements";
import {
  loadOversightRecord,
  saveOversightRecord,
  loadFrictionEvents,
  saveFrictionEvents,
  getSystemSuspended,
  setSystemSuspendedStorage,
  countImplemented,
  type OversightRecord,
  type OversightRequirementRecord,
  type OversightRequirementStatus,
  type FrictionEvent,
} from "@/lib/oversight/oversight-types";
import {
  suggestOversightMeasures,
  assessFourEyesApplicability,
} from "@/app/actions/oversightActions";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.22)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bg:      "#f9f9fb",
  red:     "#dc2626",  redBg:    "rgba(220,38,38,0.06)",  redBdr:   "rgba(220,38,38,0.18)",
  amber:   "#d97706",  amberBg:  "rgba(202,138,4,0.07)",  amberBdr: "rgba(202,138,4,0.22)",
  green:   "#15803d",  greenBg:  "rgba(22,163,74,0.06)",  greenBdr: "rgba(22,163,74,0.18)",
  blue:    "#1d4ed8",  blueBg:   "rgba(29,78,216,0.05)",  blueBdr:  "rgba(29,78,216,0.16)",
  violet:  "#7c3aed",  violetBg: "rgba(124,58,237,0.05)", violetBdr:"rgba(124,58,237,0.16)",
} as const;

const FONT: CSSProperties = { fontFamily: "Inter, system-ui, sans-serif" };
const card: CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const inp: CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, background: T.card, outline: "none" };
const ta: CSSProperties = { ...inp, resize: "vertical" as const };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: OversightRequirementStatus }) {
  const map = {
    not_started: { label: "Non avviato", color: T.red,   bg: T.redBg   },
    in_progress:  { label: "In corso",    color: T.amber, bg: T.amberBg },
    implemented:  { label: "Implementato",color: T.green, bg: T.greenBg },
  };
  const s = map[status];
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}22` }}>
      {s.label}
    </span>
  );
}

function TagInput({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
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
          placeholder={placeholder} style={{ ...inp, flex: 1 }} />
        <button onClick={add} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: "pointer" }}>
          <Plus className="h-3.5 w-3.5" style={{ color: T.muted }} />
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-1" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: T.bg, border: `1px solid ${T.border}`, color: T.text }}>
              {item}
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <X className="h-2.5 w-2.5" style={{ color: T.faint }} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Friction Gate component (migrated from original, used by automation_bias + override_non_use) ──

interface FrictionGateProps {
  events: FrictionEvent[];
  onAddEvent: (ev: FrictionEvent) => void;
  systemSuspended: boolean;
  mode: "automation_bias" | "override";
}

function FrictionGate({ events, onAddEvent, systemSuspended, mode }: FrictionGateProps) {
  const [approved, setApproved] = useState(false);
  const [frictionActive, setFrictionActive] = useState(false);
  const [frictionReason, setFrictionReason] = useState("");
  const [blocked, setBlocked] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => { startTime.current = Date.now(); }, []);

  function handleApprove() {
    if (systemSuspended) return;
    const elapsed = (Date.now() - startTime.current) / 1000;
    if (mode === "automation_bias" && elapsed < 2.0) {
      setFrictionActive(true);
      onAddEvent({ id: crypto.randomUUID(), type: "friction_bypassed", timestamp: new Date().toISOString(), elapsed });
      return;
    }
    setApproved(true);
    const ev: FrictionEvent = { id: crypto.randomUUID(), type: "approved", timestamp: new Date().toISOString(), elapsed };
    onAddEvent(ev);
    appendEvidence("decision", { type: "Supervisione umana — Approvazione deliberata Art. 14(4)(b)", elapsed: elapsed.toFixed(2), timestamp: ev.timestamp }, "oversight");
  }

  function confirmWithReason() {
    if (!frictionReason.trim()) return;
    setApproved(true);
    setFrictionActive(false);
    const ev: FrictionEvent = { id: crypto.randomUUID(), type: "friction_bypassed", timestamp: new Date().toISOString(), elapsed: (Date.now() - startTime.current) / 1000, reason: frictionReason.trim() };
    onAddEvent(ev);
    appendEvidence("decision", { type: "Friction Gate superato con motivazione — Art. 14(4)(b)", motivazione: frictionReason.trim(), timestamp: ev.timestamp }, "oversight");
    setFrictionReason("");
  }

  function blockOutput() {
    setFrictionActive(false);
    setBlocked(true);
    const ev: FrictionEvent = { id: crypto.randomUUID(), type: "blocked", timestamp: new Date().toISOString(), elapsed: (Date.now() - startTime.current) / 1000, reason: frictionReason.trim() || "Output bloccato dall'operatore" };
    onAddEvent(ev);
    appendEvidence("decision", { type: "Output bloccato — Art. 14(4)(d)", reason: ev.reason, timestamp: ev.timestamp }, "oversight");
    setFrictionReason("");
  }

  const recentEvents = events.slice(0, 5);
  const frictionCount = events.filter(e => e.type === "friction_bypassed").length;
  const frictionPct = events.length > 0 ? Math.round((frictionCount / events.length) * 100) : 0;
  const highBias = frictionPct > 30;

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: T.muted }}>
        {mode === "automation_bias" ? "Simulazione Friction Gate — Art. 14(4)(b)" : "Simulazione Override — Art. 14(4)(d)"}
      </p>

      <div className="rounded-lg p-3 mb-3" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
        <AlertTriangle className="h-4 w-4 inline mr-1 mb-0.5" style={{ color: T.amber }} />
        <span className="text-[12px] font-medium" style={{ color: T.text }}>
          Scenario: Output rischioso rilevato — candidato respinto con confidenza 89%
        </span>
        <p className="text-[10px] mt-1" style={{ color: T.muted }}>
          Il sistema ha rilevato un pattern di bias nel training set. L&apos;output potrebbe violare l&apos;Art. 21 Carta UE.
        </p>
      </div>

      {!approved && !frictionActive && !systemSuspended && !blocked && (
        <button onClick={handleApprove}
          className="w-full rounded-lg text-[12px] font-medium"
          style={{ padding: "9px 16px", background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
          {mode === "automation_bias" ? "Approva output (test timing gate)" : "Approva output"}
        </button>
      )}
      {systemSuspended && !approved && (
        <div className="text-[12px] rounded-lg p-2.5" style={{ background: T.redBg, border: `1px solid ${T.redBdr}`, color: T.red }}>
          Sistema sospeso — approvazione disabilitata
        </div>
      )}

      {frictionActive && (
        <div className="rounded-lg p-4" style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
          <div className="flex items-center gap-2 mb-2">
            <StopCircle className="h-4 w-4" style={{ color: T.red }} />
            <span className="text-[12px] font-bold" style={{ color: T.red }}>⛔ Friction Gate ATTIVATO</span>
          </div>
          <p className="text-[11px] mb-3" style={{ color: T.muted }}>
            Approvazione troppo rapida (&lt; 2s). Motivazione obbligatoria per prevenire automation bias.
          </p>
          <textarea value={frictionReason} onChange={e => setFrictionReason(e.target.value)}
            placeholder="Spiega perché questo output è accettabile nonostante i rischi rilevati..."
            style={{ ...ta, marginBottom: 10 }} rows={3} />
          <div className="flex gap-2">
            <button onClick={confirmWithReason} disabled={!frictionReason.trim()}
              style={{ borderRadius: 7, background: T.text, padding: "7px 14px", fontSize: 12, fontWeight: 500, color: "#fff", border: "none", cursor: "pointer", opacity: !frictionReason.trim() ? 0.4 : 1 }}>
              Conferma con motivazione
            </button>
            <button onClick={blockOutput}
              style={{ borderRadius: 7, padding: "7px 14px", fontSize: 12, border: `1px solid ${T.redBdr}`, color: T.red, background: "transparent", cursor: "pointer" }}>
              Blocca output
            </button>
          </div>
        </div>
      )}
      {approved && (
        <div className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}>
          <CheckCircle2 className="h-4 w-4" style={{ color: T.green }} />
          <span className="text-[12px]" style={{ color: T.green }}>Output approvato e registrato nell&apos;Evidence Layer.</span>
        </div>
      )}
      {blocked && (
        <div className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
          <StopCircle className="h-4 w-4" style={{ color: T.red }} />
          <span className="text-[12px]" style={{ color: T.red }}>Output bloccato — registrato nell&apos;Evidence Layer.</span>
        </div>
      )}
      {(approved || blocked) && (
        <button onClick={() => { setApproved(false); setBlocked(false); setFrictionActive(false); setFrictionReason(""); startTime.current = Date.now(); }}
          style={{ marginTop: 8, fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
          Resetta scenario demo
        </button>
      )}

      {/* Automation bias alert */}
      {highBias && (
        <div className="mt-3 rounded-lg p-2.5 flex items-start gap-2" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: T.amber }} />
          <p className="text-[11px]" style={{ color: "#78350f" }}>
            ⚠ {frictionPct}% dei {events.length} eventi ha attivato il Friction Gate — verificare la formazione del personale.
          </p>
        </div>
      )}

      {/* Mini event log */}
      {recentEvents.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: T.faint }}>Ultimi eventi</p>
          {recentEvents.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2 py-1" style={{ borderTop: `1px solid ${T.border}`, fontSize: 11 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: ev.type === "approved" ? T.green : ev.type === "blocked" ? T.red : T.amber }} />
              <span style={{ flex: 1, color: T.text }}>{ev.type === "approved" ? "Approvato" : ev.type === "blocked" ? "Bloccato" : "Friction Gate"}</span>
              <span style={{ color: T.faint }}>{ev.elapsed.toFixed(1)}s</span>
            </div>
          ))}
          <p className="text-[10px] mt-1.5" style={{ color: T.faint }}>
            <Brain className="h-3 w-3 inline mr-1" style={{ color: T.blue }} />
            Art. 14(4): approvazione &lt; 2s presume automation bias. [verify against current AI Act text]
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Requirement card ─────────────────────────────────────────────────────────

interface ReqCardProps {
  req: typeof OVERSIGHT_REQUIREMENTS[number];
  record: OversightRequirementRecord | undefined;
  pending: { measureDescription?: string; implementationType?: string } | null;
  onUpdate: (id: string, patch: Partial<OversightRequirementRecord>) => void;
  onAcceptAi: (id: string) => void;
  frictionEvents: FrictionEvent[];
  onAddFrictionEvent: (ev: FrictionEvent) => void;
  systemSuspended: boolean;
  index: number;
}

function RequirementCard({ req, record, pending, onUpdate, onAcceptAi, frictionEvents, onAddFrictionEvent, systemSuspended, index }: ReqCardProps) {
  const [open, setOpen] = useState(false);
  const status = record?.status ?? "not_started";

  return (
    <div className="rounded-xl border transition-shadow hover:shadow-sm" style={{ background: T.card, borderColor: status === "implemented" ? "#86efac" : T.border }}>
      {/* Header */}
      <button className="w-full flex items-start gap-3 p-4 text-left" onClick={() => setOpen(v => !v)}>
        <div className="mt-0.5 flex-shrink-0">
          {status === "implemented" ? <CheckCircle2 size={16} style={{ color: T.green }} /> :
           status === "in_progress"  ? <Clock size={16} style={{ color: T.amber }} /> :
           <Minus size={16} style={{ color: T.faint }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold" style={{ color: T.blue }}>Art. 14(4)({String.fromCharCode(96 + index)})</span>
            <span className="text-sm font-semibold" style={{ color: T.text }}>{req.label}</span>
            <StatusPill status={status} />
            {pending && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: T.violetBg, color: T.violet, border: `1px solid ${T.violetBdr}` }}>✦ AI</span>}
          </div>
          <p className="text-[11px] mt-1" style={{ color: T.muted }}>{req.primaryReference}</p>
        </div>
        <span className="text-xs ml-2 flex-shrink-0" style={{ color: T.faint }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "#f3f4f6" }}>
          <p className="text-[12px] mt-3 mb-4 leading-relaxed" style={{ color: T.muted }}>{req.description}</p>

          {/* AI pending suggestion */}
          {pending && (
            <div className="rounded-lg p-3 mb-4" style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}` }}>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: T.violet }}>✦ AI — verifica e conferma</p>
              {pending.implementationType && (
                <p className="text-[11px] mb-1" style={{ color: T.text }}>
                  <strong>Tipo misura proposto:</strong> {MEASURE_IMPLEMENTATION_TYPE_LABELS[pending.implementationType] ?? pending.implementationType}
                </p>
              )}
              {pending.measureDescription && (
                <p className="text-[12px] whitespace-pre-wrap" style={{ color: T.text }}>{pending.measureDescription}</p>
              )}
              <button onClick={() => onAcceptAi(req.id)}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded"
                style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer" }}>
                <Check size={12} /> Accetta e applica
              </button>
            </div>
          )}

          {/* Implementation type */}
          <div className="mb-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: T.muted }}>
              Tipo di misura — Art. 14(3) [verify against current AI Act text]
            </label>
            <select
              value={record?.implementationType ?? "not_specified"}
              onChange={e => onUpdate(req.id, { implementationType: e.target.value as OversightRequirementRecord["implementationType"], lastUpdated: new Date().toISOString() })}
              style={inp}>
              {Object.entries(MEASURE_IMPLEMENTATION_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Measure description */}
          <div className="mb-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: T.muted }}>
              Descrizione della misura adottata
            </label>
            <textarea
              rows={3}
              value={record?.measureDescription ?? ""}
              onChange={e => onUpdate(req.id, { measureDescription: e.target.value })}
              placeholder="Descrivi concretamente la misura implementata o pianificata..."
              style={ta} />
          </div>

          {/* Status */}
          <div className="mb-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: T.muted }}>Stato</label>
            <div className="flex gap-2 flex-wrap">
              {(["not_started", "in_progress", "implemented"] as OversightRequirementStatus[]).map(s => {
                const labels = { not_started: "Non avviato", in_progress: "In corso", implemented: "Implementato" };
                const colors = { not_started: T.red, in_progress: T.amber, implemented: T.green };
                const active = (record?.status ?? "not_started") === s;
                return (
                  <button key={s}
                    onClick={() => onUpdate(req.id, { status: s, lastUpdated: new Date().toISOString() })}
                    className="text-[12px] px-3 py-1 rounded-lg border transition-all"
                    style={{ borderColor: active ? colors[s] : T.border, background: active ? `${colors[s]}10` : "transparent", color: active ? colors[s] : T.muted, fontWeight: active ? 600 : 400 }}>
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linked tool */}
          {req.linkedToolPath && (
            <Link href={req.linkedToolPath} className="inline-flex items-center gap-1.5 text-[12px] font-medium"
              style={{ color: T.blue }}>
              <ExternalLink size={12} />
              {req.linkedToolLabel}
            </Link>
          )}

          {/* Friction Gate — embedded in automation_bias and override_non_use */}
          {(req.id === "automation_bias_awareness" || req.id === "override_non_use") && (
            <FrictionGate
              events={frictionEvents}
              onAddEvent={onAddFrictionEvent}
              systemSuspended={systemSuspended}
              mode={req.id === "automation_bias_awareness" ? "automation_bias" : "override"}
            />
          )}

          {/* Suspend/resume — embedded in intervention_stop */}
          {req.id === "intervention_stop" && (
            <InterventionStopPanel systemSuspended={systemSuspended} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Intervention Stop panel (migrated from original suspendSystem/resumeSystem) ───

function InterventionStopPanel({ systemSuspended }: { systemSuspended: boolean }) {
  const [suspended, setSuspended] = useState(systemSuspended);

  function suspend() {
    setSuspended(true);
    setSystemSuspendedStorage(true);
    appendEvidence("decision", { type: "Sistema AI sospeso — Art. 14(4)(e)", suspendedAt: new Date().toISOString(), operator: "Supervisore umano" }, "oversight");
  }
  function resume() {
    setSuspended(false);
    setSystemSuspendedStorage(false);
    appendEvidence("decision", { type: "Sistema AI riattivato — Art. 14(4)(e)", resumedAt: new Date().toISOString() }, "oversight");
  }

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: suspended ? T.redBg : T.bg, border: `1px solid ${suspended ? T.redBdr : T.border}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: suspended ? T.red : T.muted }}>
        Controllo arresto di sicurezza — Art. 14(4)(e) [verify against current AI Act text]
      </p>
      <p className="text-[12px] mb-3 leading-relaxed" style={{ color: suspended ? T.red : T.muted }}>
        {suspended
          ? "Sistema sospeso. Le decisioni in sospeso vengono instradate a revisione manuale. Il sistema non emette nuovi output fino alla riattivazione da parte di un supervisore autorizzato."
          : "Il deployer può intervenire e arrestare il sistema in qualsiasi momento, portandolo in uno stato sicuro."}
      </p>
      {!suspended ? (
        <button onClick={suspend}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-semibold"
          style={{ background: T.red, color: "#fff", border: "none", cursor: "pointer" }}>
          <StopCircle className="h-4 w-4" /> SOSPENDI SISTEMA
        </button>
      ) : (
        <button onClick={resume}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-semibold"
          style={{ background: T.green, color: "#fff", border: "none", cursor: "pointer" }}>
          <Play className="h-4 w-4" /> Riattiva sistema
        </button>
      )}
    </div>
  );
}

// ─── Four-eyes module ─────────────────────────────────────────────────────────

function FourEyesModule({
  record,
  onUpdate,
  systemName,
  systemDescription,
  onAiAssess,
  aiAssessing,
}: {
  record: OversightRecord["fourEyes"];
  onUpdate: (patch: Partial<OversightRecord["fourEyes"]>) => void;
  systemName: string;
  systemDescription: string;
  onAiAssess: () => void;
  aiAssessing: boolean;
}) {
  const [rolesInput, setRolesInput] = useState(record.verifierRoles ?? []);

  return (
    <div className="rounded-xl border-2 p-4" style={{ background: T.card, borderColor: T.violet }}>
      <div className="flex items-center gap-2 mb-1">
        <Shield size={16} style={{ color: T.violet }} />
        <span className="font-semibold text-sm" style={{ color: T.text }}>{FOUR_EYES_MODULE.label}</span>
        <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: T.violetBg, color: T.violet }}>
          {FOUR_EYES_MODULE.primaryReference}
        </span>
      </div>
      <p className="text-[12px] mb-4 leading-relaxed" style={{ color: T.muted }}>{FOUR_EYES_MODULE.description}</p>

      {record.applicable === "unspecified" && (
        <div className="rounded-lg p-3 mb-4" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
          <p className="text-[12px] font-semibold mb-2" style={{ color: T.amber }}>
            Applicabilità da verificare — {FOUR_EYES_MODULE.supportReference}
          </p>
          <p className="text-[11px] mb-3" style={{ color: "#78350f" }}>
            Questo sistema risulta in Annex III secondo il Classificatore, ma non è stato determinato
            se rientra specificamente nel punto 1(a) — identificazione/categorizzazione biometrica.
            Conferma applicabilità:
          </p>
          <div className="flex gap-2 flex-wrap mb-2">
            <button onClick={() => onUpdate({ applicable: "yes" })}
              className="text-[12px] px-3 py-1 rounded-lg border"
              style={{ background: T.greenBg, borderColor: T.green, color: T.green, fontWeight: 600 }}>
              Sì — è un sistema biometrico (Annex III 1(a))
            </button>
            <button onClick={() => onUpdate({ applicable: "no" })}
              className="text-[12px] px-3 py-1 rounded-lg border"
              style={{ background: T.redBg, borderColor: T.red, color: T.red }}>
              No — non è un sistema biometrico
            </button>
          </div>
          <button onClick={onAiAssess} disabled={aiAssessing}
            className="flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: T.violet, background: "none", border: "none", cursor: "pointer" }}>
            {aiAssessing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            Valuta applicabilità con AI
          </button>
          {record.aiConfirmed && (
            <p className="text-[11px] mt-1 font-semibold" style={{ color: T.amber }}>✦ AI — verifica e conferma</p>
          )}
        </div>
      )}

      {record.applicable === "yes" && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: T.muted }}>
              Procedura di verifica a due persone
            </label>
            <textarea rows={3} value={record.procedureDescription ?? ""}
              onChange={e => onUpdate({ procedureDescription: e.target.value })}
              placeholder="Descrivi la procedura: chi verifica, in quale sequenza, come si documenta la doppia conferma..."
              style={ta} />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: T.muted }}>
              Ruoli/funzioni autorizzati alla doppia verifica
            </label>
            <TagInput items={rolesInput}
              onChange={(v) => { setRolesInput(v); onUpdate({ verifierRoles: v }); }}
              placeholder="es. Operatore L1, Supervisore L2 (Invio per aggiungere)" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: T.muted }}>Stato</label>
            <div className="flex gap-2">
              {(["not_started", "in_progress", "implemented"] as OversightRequirementStatus[]).map(s => {
                const labels = { not_started: "Non avviato", in_progress: "In corso", implemented: "Implementato" };
                const colors = { not_started: T.red, in_progress: T.amber, implemented: T.green };
                const active = record.status === s;
                return (
                  <button key={s} onClick={() => onUpdate({ status: s })}
                    className="text-[12px] px-3 py-1 rounded-lg border"
                    style={{ borderColor: active ? colors[s] : T.border, background: active ? `${colors[s]}10` : "transparent", color: active ? colors[s] : T.muted, fontWeight: active ? 600 : 400 }}>
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {record.applicable === "no" && (
        <div className="rounded-lg p-3" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
          <p className="text-[12px]" style={{ color: T.muted }}>
            Modulo non applicabile — il sistema non è classificato in Annex III punto 1(a).
            <button onClick={() => onUpdate({ applicable: "unspecified" })} className="ml-2 underline" style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 11 }}>
              Modifica
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OversightPage() {
  const [record, setRecord] = useState<OversightRecord>(() => loadOversightRecord());
  const [frictionEvents, setFrictionEvents] = useState<FrictionEvent[]>(() => loadFrictionEvents());
  const [systemSuspended] = useState(() => getSystemSuspended());
  const [savedAt, setSavedAt] = useState<string | null>(() => readFromStorage<{ completedAt?: string }>("oversight")?.completedAt ?? null);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [fourEyesAiLoading, setFourEyesAiLoading] = useState(false);

  // Pending AI suggestions per requirement id
  const [pendingSuggestions, setPendingSuggestions] = useState<Record<string, { measureDescription?: string; implementationType?: string }>>({});

  // Determine biometric / four-eyes applicability from AI Inventory / Classifier
  const [showFourEyes, setShowFourEyes] = useState<boolean | null>(null);

  useEffect(() => {
    // Try to determine if system is biometric from stored classifier / risk manager data
    const cls = readFromStorage<ClassifierResult>("classifier");
    if (!cls) { setShowFourEyes(null); return; }
    if (!cls.annexIII) { setShowFourEyes(false); return; }
    // Annex III is true — check description for biometric keywords
    const desc = (cls.systemDescription ?? "").toLowerCase() + " " + (cls.systemName ?? "").toLowerCase();
    const biometricKeywords = ["biometric", "biometri", "faccial", "viso", "volto", "impronta", "riconoscimento", "identificazione persone", "annex iii 1(a)", "allegato iii 1(a)", "punto 1(a)"];
    const isBiometric = biometricKeywords.some(k => desc.includes(k));
    // Also check risk manager scoping annexIIIArea
    const rmRaw = localStorage.getItem("aicomply_risk_manager_chat_v3");
    if (rmRaw) {
      try {
        const rm = JSON.parse(rmRaw);
        const area = (rm?.scoping?.identification?.annexIIIArea ?? "").toLowerCase();
        if (biometricKeywords.some(k => area.includes(k))) { setShowFourEyes(true); return; }
      } catch { /* ignore */ }
    }
    // If annexIII=true but can't confirm biometric → show triage (unspecified)
    setShowFourEyes(isBiometric || record.fourEyes.applicable === "yes" || record.fourEyes.applicable === "unspecified");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string, kind: "ok" | "err" = "ok") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }

  function getReqRecord(id: string): OversightRequirementRecord | undefined {
    return record.requirements.find(r => r.requirementId === id);
  }

  function updateRequirement(id: string, patch: Partial<OversightRequirementRecord>) {
    setRecord(prev => {
      const existing = prev.requirements.find(r => r.requirementId === id);
      const updated: OversightRequirementRecord = { requirementId: id, status: "not_started", implementationType: "not_specified", aiConfirmed: false, ...existing, ...patch };
      const newReqs = prev.requirements.some(r => r.requirementId === id)
        ? prev.requirements.map(r => r.requirementId === id ? updated : r)
        : [...prev.requirements, updated];
      const next = { ...prev, requirements: newReqs, updatedAt: new Date().toISOString() };
      saveOversightRecord(next);
      return next;
    });
  }

  function updateFourEyes(patch: Partial<OversightRecord["fourEyes"]>) {
    setRecord(prev => {
      const next = { ...prev, fourEyes: { ...prev.fourEyes, ...patch }, updatedAt: new Date().toISOString() };
      saveOversightRecord(next);
      return next;
    });
    if (patch.applicable === "yes") setShowFourEyes(true);
    if (patch.applicable === "no") setShowFourEyes(false);
  }

  function addFrictionEvent(ev: FrictionEvent) {
    setFrictionEvents(prev => {
      const next = [ev, ...prev].slice(0, 50);
      saveFrictionEvents(next);
      return next;
    });
  }

  function acceptAiSuggestion(reqId: string) {
    const s = pendingSuggestions[reqId];
    if (!s) return;
    updateRequirement(reqId, {
      measureDescription: s.measureDescription,
      implementationType: (s.implementationType as OversightRequirementRecord["implementationType"]) ?? "not_specified",
      aiConfirmed: true,
    });
    setPendingSuggestions(prev => { const n = { ...prev }; delete n[reqId]; return n; });
  }

  async function runAiSuggest() {
    setAiLoading(true);
    setAiError(null);
    try {
      const cls = readFromStorage<ClassifierResult>("classifier");
      const result = await suggestOversightMeasures({
        systemName: cls?.systemName ?? "Sistema AI",
        systemDescription: cls?.systemDescription ?? "",
        riskTier: cls?.riskLevel ?? "high",
      });
      const map: Record<string, { measureDescription?: string; implementationType?: string }> = {};
      for (const m of result.measures) {
        map[m.requirementId] = { measureDescription: m.measureDescription, implementationType: m.implementationType };
      }
      setPendingSuggestions(map);
      showToast("Bozze AI generate — verifica e accetta per ciascun requisito");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Errore AI");
    } finally {
      setAiLoading(false);
    }
  }

  async function runFourEyesAi() {
    setFourEyesAiLoading(true);
    try {
      const cls = readFromStorage<ClassifierResult>("classifier");
      const result = await assessFourEyesApplicability({
        systemName: cls?.systemName ?? "Sistema AI",
        systemDescription: cls?.systemDescription ?? "",
        riskTier: cls?.riskLevel,
      });
      updateFourEyes({ applicable: result.applicable, aiConfirmed: true });
      if (result.applicable === "yes") setShowFourEyes(true);
      if (result.applicable === "no") setShowFourEyes(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Errore AI", "err");
    } finally {
      setFourEyesAiLoading(false);
    }
  }

  function saveToDossier() {
    const now = new Date().toISOString();
    const implemented = countImplemented(record);
    writeToStorage("oversight", {
      oversightMechanism: `Art. 14(4)(a)-(e) — ${implemented}/5 requisiti implementati [verify against current AI Act text]`,
      humanInterventionPoints: record.requirements
        .filter(r => r.status === "implemented")
        .map(r => OVERSIGHT_REQUIREMENTS.find(d => d.id === r.requirementId)?.label ?? r.requirementId),
      stopCapability: record.requirements.find(r => r.requirementId === "intervention_stop")?.status === "implemented",
      responsiblePersons: [],
      completedAt: now,
    });
    appendEvidence("decision", { type: "Oversight Art. 14 — framework configurato", implemented, frictionEvents: frictionEvents.length, savedAt: now }, "oversight");
    setSavedAt(now);
    showToast("Framework Oversight salvato nel dossier");
  }

  const implementedCount = countImplemented(record);
  const fourEyesDone = record.fourEyes.applicable === "yes" && record.fourEyes.status === "implemented";
  const cls = typeof window !== "undefined" ? readFromStorage<ClassifierResult>("classifier") : null;
  const systemName = cls?.systemName ?? "Sistema AI";
  const systemDescription = cls?.systemDescription ?? "";

  return (
    <div className="w-full max-w-4xl mx-auto" style={FONT}>
      <SystemContextBanner checkProhibited={true} />

      {/* Dossier banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]" style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}>
          <span style={{ color: T.green }}>✓ Salvato nel dossier · {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium" style={{ color: T.green }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <span style={{ color: T.muted }}>Salva il framework di oversight nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1" style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
            Salva nel dossier
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} style={{ color: T.blue }} />
          <h1 className="text-xl font-bold" style={{ color: T.text }}>Supervisione Umana</h1>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: T.blueBg, color: T.blue }}>Art. 14</span>
        </div>
        <p className="text-[12px]" style={{ color: T.muted }}>
          Obblighi del deployer per la supervisione umana dei sistemi AI ad alto rischio.{" "}
          <span style={{ opacity: 0.7 }}>[verify against current AI Act text]</span>
        </p>
      </div>

      {/* Context box — Art. 14(1)-(2) non-interactive */}
      <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
        <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: T.blue }} />
        <div>
          <p className="text-[12px] font-semibold mb-1" style={{ color: T.blue }}>
            Finalità della supervisione umana — Art. 14(1)-(2) [verify against current AI Act text]
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: "#1e3a8a" }}>
            I sistemi AI ad alto rischio devono essere progettati e sviluppati in modo da poter essere
            efficacemente supervisionati da persone fisiche durante il periodo in cui sono in uso.
            La supervisione mira a prevenire o minimizzare i rischi per la salute, la sicurezza o
            i diritti fondamentali che possono emergere durante l&apos;uso del sistema, anche in caso
            di uso improprio ragionevolmente prevedibile.
          </p>
        </div>
      </div>

      {/* Progress + AI copilot */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold" style={{ color: implementedCount === 5 ? T.green : T.text }}>
            {implementedCount}/5
          </span>
          <div>
            <div className="text-[11px] font-medium" style={{ color: T.muted }}>requisiti Art. 14(4)</div>
            {showFourEyes && (
              <div className="text-[11px]" style={{ color: fourEyesDone ? T.green : T.violet }}>
                {fourEyesDone ? "+1 Art. 14(5) ✓" : "+1 modulo Art. 14(5) in corso"}
              </div>
            )}
          </div>
          <div className="h-2 w-32 rounded-full" style={{ background: T.border }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${(implementedCount / 5) * 100}%`, background: implementedCount === 5 ? T.green : T.blue }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aiError && <span className="text-[11px]" style={{ color: T.red }}>{aiError}</span>}
          <button onClick={runAiSuggest} disabled={aiLoading}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer", opacity: aiLoading ? 0.7 : 1 }}>
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {Object.keys(pendingSuggestions).length > 0 ? "Rigenera bozze AI" : "Bozze AI per tutti i requisiti"}
          </button>
        </div>
      </div>

      {/* 5 Requirement cards */}
      <div className="space-y-3 mb-6">
        {OVERSIGHT_REQUIREMENTS.map((req, i) => (
          <RequirementCard
            key={req.id}
            req={req}
            index={i + 1}
            record={getReqRecord(req.id)}
            pending={pendingSuggestions[req.id] ?? null}
            onUpdate={updateRequirement}
            onAcceptAi={acceptAiSuggestion}
            frictionEvents={frictionEvents}
            onAddFrictionEvent={addFrictionEvent}
            systemSuspended={systemSuspended}
          />
        ))}
      </div>

      {/* Four-eyes conditional module */}
      {showFourEyes && (
        <>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: T.border }} />
            <span className="text-[11px] font-semibold uppercase tracking-wide px-2" style={{ color: T.violet }}>
              Modulo condizionale — Annex III 1(a)
            </span>
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>
          <FourEyesModule
            record={record.fourEyes}
            onUpdate={updateFourEyes}
            systemName={systemName}
            systemDescription={systemDescription}
            onAiAssess={runFourEyesAi}
            aiAssessing={fourEyesAiLoading}
          />
        </>
      )}

      {/* Sanctions note */}
      <div className="flex items-start gap-2 p-3 rounded-lg mt-6 text-xs" style={{ background: "#fef9c3", border: "1px solid #fde047", color: "#713f12" }}>
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          <strong>Sanzioni Art. 99–101:</strong> Mancata implementazione della supervisione umana può comportare sanzioni fino a 30 milioni € o 6% del fatturato mondiale.{" "}
          <span style={{ opacity: 0.75 }}>[verify against current AI Act text]</span>
        </span>
      </div>

      {/* Save */}
      <div className="flex justify-end mt-4">
        <button onClick={saveToDossier}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium"
          style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Salva nel dossier
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg"
          style={{ background: toast.kind === "err" ? "rgba(220,38,38,0.95)" : T.text, color: "#fff" }}>
          {toast.kind === "err" ? "⛔" : "✓"} {toast.msg}
        </div>
      )}
    </div>
  );
}
