"use client";

import React, { useState, useRef, useEffect, useCallback, CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Shield, RefreshCw, AlertTriangle, CheckCircle, Settings,
  ChevronDown, ChevronUp, Info, Upload, FileText, Sparkles, Loader2,
  Check, ExternalLink, X, Plus, Hash,
} from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { LogvaultResult, ClassifierResult } from "@/lib/dossier/storage-schema";
import { suggestEventSeverity } from "@/app/actions/suggestEventSeverity";
import { parseLogFile, analyzeLogCoverage } from "@/app/actions/logvaultActions";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { TRACEABILITY_PURPOSES, BIOMETRIC_LOG_REQUIREMENTS, FIELD_NAME_HINTS, MAX_LOG_FILE_SIZE_BYTES } from "@/lib/logvault/traceability-purposes";
import {
  getAllDetectedFields, countCovered,
  type LogVaultRecord, type ImportedLogSet, type CoverageStatus,
  type TraceabilityCoverageRecord, type BiometricLogRequirementCoverage,
} from "@/lib/logvault/logvault-types";
import { useScopedStorage } from "@/lib/hooks/useScopedStorage";
import type { LogEvent, LogEventCategory, LogEventSeverity } from "@/types/logvault";
import { createLogEvent } from "@/lib/logvault/create-event";
import { analyzeLogDrift } from "./actions";
import type { DriftAnalysis } from "./actions";
import { VirtualLogGrid } from "@/components/logvault/VirtualLogGrid";
// Note: logvault-engine.ts is preserved for chain-verification utilities used by other tools.

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.22)", border: "rgba(0,0,0,0.08)",
  card: "#fff", bg: "#f9f9fb",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.18)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.07)", amberBdr: "rgba(202,138,4,0.22)",
  green: "#15803d", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.18)",
  blue: "#1d4ed8", blueBg: "rgba(29,78,216,0.05)", blueBdr: "rgba(29,78,216,0.16)",
  violet: "#7c3aed", violetBg: "rgba(124,58,237,0.05)", violetBdr: "rgba(124,58,237,0.16)",
} as const;
const FONT: CSSProperties = { fontFamily: "Inter, system-ui, sans-serif" };
const card: CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const inp: CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, background: T.card, outline: "none" };
const ta: CSSProperties = { ...inp, resize: "vertical" as const };

// ─── Kill Switch (Art. 14 — preserved from original) ─────────────────────────
function KillSwitch({ onActivate }: { onActivate: () => void }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activated, setActivated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = () => {
    if (activated) return;
    setHolding(true);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(intervalRef.current!); setActivated(true); setHolding(false); return 100; }
        return p + 3.4;
      });
    }, 100);
  };
  const stopHold = () => { if (activated) return; clearInterval(intervalRef.current!); setHolding(false); setProgress(0); };
  useEffect(() => { if (activated) onActivate(); }, [activated]); // eslint-disable-line
  useEffect(() => () => clearInterval(intervalRef.current!), []);

  return (
    <div className="rounded-xl p-4 flex flex-col items-center gap-3"
      style={{ background: activated ? T.redBg : "rgba(0,0,0,0.02)", border: `1px solid ${activated ? T.redBdr : T.border}` }}>
      <p className="text-[10px] font-semibold uppercase" style={{ color: T.faint, letterSpacing: "1px" }}>Kill Switch — Art. 14</p>
      <div className="relative">
        <motion.button
          onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
          onTouchStart={startHold} onTouchEnd={stopHold}
          animate={{ scale: holding ? 0.93 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-16 h-16 rounded-full flex items-center justify-center select-none"
          style={{ background: activated ? T.red : holding ? "#b91c1c" : T.text, cursor: activated ? "not-allowed" : "pointer", boxShadow: holding ? "0 0 0 6px rgba(220,38,38,0.15)" : "0 2px 8px rgba(0,0,0,0.2)" }}>
          <span className="text-white text-[10px] font-bold text-center leading-tight select-none">
            {activated ? "STOP\nACTIVE" : "HOLD\nSTOP"}
          </span>
        </motion.button>
        {holding && (
          <svg className="absolute inset-0 w-16 h-16 pointer-events-none" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(220,38,38,0.2)" strokeWidth="3" />
            <circle cx="32" cy="32" r="28" fill="none" stroke={T.red} strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 0.1s linear" }} />
          </svg>
        )}
      </div>
      <p className="text-[10px] text-center" style={{ color: T.faint }}>
        {activated ? "Sistema arrestato — Nessuna nuova inferenza" :
         holding ? `Rilascio emergenza… ${Math.round(progress)}%` :
         "Tieni premuto 3s per arrestare"}
      </p>
    </div>
  );
}

// ─── Coverage badge ───────────────────────────────────────────────────────────
function CoverageBadge({ covered }: { covered: CoverageStatus }) {
  const map = {
    yes: { label: "Coperta", color: T.green, bg: T.greenBg },
    partial: { label: "Parziale", color: T.amber, bg: T.amberBg },
    no: { label: "Non coperta", color: T.red, bg: T.redBg },
    unspecified: { label: "Da valutare", color: T.faint, bg: T.bg },
  };
  const s = map[covered];
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: s.color, background: s.bg }}>{s.label}</span>
  );
}

// ─── Traceability purpose card ────────────────────────────────────────────────
interface PurposeCardProps {
  def: typeof TRACEABILITY_PURPOSES[number];
  rec: TraceabilityCoverageRecord | undefined;
  pendingProposal?: { proposedCovered: "yes" | "partial" | "no"; evidenceFields: string[]; rationale: string } | null;
  onUpdate: (id: string, patch: Partial<TraceabilityCoverageRecord>) => void;
  onAcceptAi: (id: string) => void;
  allDetectedFields: string[];
}

function PurposeCard({ def, rec, pendingProposal, onUpdate, onAcceptAi, allDetectedFields }: PurposeCardProps) {
  const [open, setOpen] = useState(false);
  const covered = rec?.covered ?? "unspecified";

  // Heuristic field detection
  const hints = FIELD_NAME_HINTS[def.id] ?? [];
  const matchedFields = allDetectedFields.filter(f => hints.some(h => f.toLowerCase().includes(h)));

  return (
    <div className="rounded-xl border" style={{ background: T.card, borderColor: covered === "yes" ? "#86efac" : covered === "partial" ? "#fcd34d" : T.border }}>
      <button className="w-full flex items-start gap-3 p-4 text-left" onClick={() => setOpen(v => !v)}>
        <div className="mt-0.5">
          {covered === "yes" ? <CheckCircle size={15} style={{ color: T.green }} /> :
           covered === "partial" ? <AlertTriangle size={15} style={{ color: T.amber }} /> :
           covered === "no" ? <X size={15} style={{ color: T.red }} /> :
           <Shield size={15} style={{ color: T.faint }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: T.blueBg, color: T.blue }}>
              {def.reference.split(" ").slice(0, 2).join(" ")}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: T.text }}>{def.label}</span>
            <CoverageBadge covered={covered} />
            {pendingProposal && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: T.violetBg, color: T.violet }}>✦ AI</span>}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: T.faint }}>{def.crossReference}</p>
          {matchedFields.length > 0 && covered === "unspecified" && (
            <p className="text-[11px] mt-1" style={{ color: T.amber }}>
              ⚠ Campi potenzialmente rilevanti rilevati: {matchedFields.join(", ")}
            </p>
          )}
        </div>
        <span className="text-[10px] flex-shrink-0" style={{ color: T.faint }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "#f3f4f6" }}>
          {/* AI proposal */}
          {pendingProposal && (
            <div className="mt-3 rounded-lg p-3 mb-3" style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}` }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: T.violet }}>✦ AI — verifica e conferma</p>
              <p className="text-[12px] mb-1" style={{ color: T.text }}>{pendingProposal.rationale}</p>
              {pendingProposal.evidenceFields.length > 0 && (
                <p className="text-[11px]" style={{ color: T.muted }}>
                  Campi: {pendingProposal.evidenceFields.join(", ")}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px]" style={{ color: T.muted }}>Copertura proposta:</span>
                <CoverageBadge covered={pendingProposal.proposedCovered} />
              </div>
              <button onClick={() => onAcceptAi(def.id)}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded"
                style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer" }}>
                <Check size={11} /> Accetta e applica
              </button>
            </div>
          )}

          {/* Heuristic matched fields suggestion */}
          {matchedFields.length > 0 && covered === "unspecified" && !pendingProposal && (
            <div className="mt-3 rounded-lg p-3 mb-3" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: T.amber }}>
                ⚠ Campi potenzialmente rilevanti nei log importati
              </p>
              <p className="text-[11px]" style={{ color: T.text }}>{matchedFields.join(", ")}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => onUpdate(def.id, { covered: "partial", evidenceFields: matchedFields })}
                  className="text-[11px] px-2 py-0.5 rounded" style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBdr}`, cursor: "pointer" }}>
                  Segna come parzialmente coperta
                </button>
                <button onClick={() => onUpdate(def.id, { covered: "yes", evidenceFields: matchedFields })}
                  className="text-[11px] px-2 py-0.5 rounded" style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}`, cursor: "pointer" }}>
                  Confermo — coperta
                </button>
              </div>
            </div>
          )}

          {/* Coverage selector */}
          <div className="mt-3 mb-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5" style={{ color: T.muted }}>Copertura</label>
            <div className="flex gap-2 flex-wrap">
              {(["yes", "partial", "no", "unspecified"] as CoverageStatus[]).map(s => {
                const labels: Record<CoverageStatus, string> = { yes: "Coperta", partial: "Parziale", no: "Non coperta", unspecified: "Da valutare" };
                const active = covered === s;
                return (
                  <button key={s} onClick={() => onUpdate(def.id, { covered: s })}
                    className="text-[11px] px-2.5 py-1 rounded-lg border"
                    style={{ borderColor: active ? T.blue : T.border, background: active ? T.blueBg : "transparent", color: active ? T.blue : T.muted, fontWeight: active ? 600 : 400, cursor: "pointer" }}>
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evidence fields */}
          <div className="mb-3">
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: T.muted }}>Campi di evidenza (separati da virgola)</label>
            <input type="text" value={rec?.evidenceFields?.join(", ") ?? ""}
              onChange={e => onUpdate(def.id, { evidenceFields: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="es. error, alert, anomaly"
              style={inp} />
          </div>

          <div className="mb-3">
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: T.muted }}>Note</label>
            <textarea rows={2} value={rec?.notes ?? ""}
              onChange={e => onUpdate(def.id, { notes: e.target.value })}
              placeholder="Note sulla copertura di questa finalità..."
              style={ta} />
          </div>

          {/* Cross-link */}
          <Link href={def.linkedToolPath} className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: T.blue }}>
            <ExternalLink size={11} /> {def.linkedToolLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Biometric requirement card ───────────────────────────────────────────────
interface BiometricCardProps {
  def: typeof BIOMETRIC_LOG_REQUIREMENTS[number];
  rec: BiometricLogRequirementCoverage | undefined;
  pendingProposal?: { proposedCovered: "yes" | "partial" | "no"; evidenceFields: string[]; rationale: string } | null;
  onUpdate: (id: string, patch: Partial<BiometricLogRequirementCoverage>) => void;
  onAcceptAi: (id: string) => void;
  allDetectedFields: string[];
  verifierRoles?: string[];
}

function BiometricCard({ def, rec, pendingProposal, onUpdate, onAcceptAi, allDetectedFields, verifierRoles }: BiometricCardProps) {
  const [open, setOpen] = useState(false);
  const covered = rec?.covered ?? "unspecified";
  const hints = FIELD_NAME_HINTS[def.id] ?? [];
  const matched = allDetectedFields.filter(f => hints.some(h => f.toLowerCase().includes(h)));

  return (
    <div className="rounded-xl border" style={{ background: T.card, borderColor: covered === "yes" ? "#86efac" : covered === "partial" ? "#fcd34d" : T.border }}>
      <button className="w-full flex items-start gap-3 p-3 text-left" onClick={() => setOpen(v => !v)}>
        <div className="mt-0.5">
          {covered === "yes" ? <CheckCircle size={13} style={{ color: T.green }} /> :
           covered === "partial" ? <AlertTriangle size={13} style={{ color: T.amber }} /> :
           covered === "no" ? <X size={13} style={{ color: T.red }} /> :
           <Shield size={13} style={{ color: T.faint }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono px-1 py-0.5 rounded" style={{ background: T.bg, color: T.muted }}>{def.reference.split(" ").slice(0, 2).join(" ")}</span>
            <span className="text-[11px] font-medium" style={{ color: T.text }}>{def.label}</span>
            <CoverageBadge covered={covered} />
            {pendingProposal && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: T.violetBg, color: T.violet }}>✦ AI</span>}
          </div>
        </div>
        <span style={{ color: T.faint, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: "#f3f4f6" }}>
          {/* Verifier roles cross-check (Art. 12(3)(d) only) */}
          {def.id === "verifier_identity" && verifierRoles && verifierRoles.length > 0 && (
            <div className="mt-2 rounded-lg p-2.5 mb-2" style={{ background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: T.blue }}>
                Confronto con Oversight — Art. 14(5) [verify against current AI Act text]
              </p>
              <p className="text-[11px]" style={{ color: T.muted }}>
                Ruoli verificatori registrati in Oversight: <strong>{verifierRoles.join(", ")}</strong>
              </p>
              {matched.length > 0 && (
                <p className="text-[11px] mt-1" style={{ color: T.text }}>
                  I log contengono il campo <strong>{matched[0]}</strong> — verifica che identifichi correttamente i verificatori.
                </p>
              )}
            </div>
          )}

          {pendingProposal && (
            <div className="mt-2 rounded-lg p-2.5 mb-2" style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}` }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: T.violet }}>✦ AI — verifica e conferma</p>
              <p className="text-[11px]" style={{ color: T.text }}>{pendingProposal.rationale}</p>
              {pendingProposal.evidenceFields.length > 0 && <p className="text-[11px] mt-1" style={{ color: T.muted }}>Campi: {pendingProposal.evidenceFields.join(", ")}</p>}
              <button onClick={() => onAcceptAi(def.id)}
                className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer" }}>
                <Check size={10} /> Accetta
              </button>
            </div>
          )}

          {matched.length > 0 && covered === "unspecified" && !pendingProposal && (
            <div className="mt-2 rounded-lg p-2 mb-2" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
              <p className="text-[11px] font-semibold" style={{ color: T.amber }}>Campo rilevato: {matched.join(", ")}</p>
              <div className="flex gap-1 mt-1">
                <button onClick={() => onUpdate(def.id, { covered: "partial", evidenceField: matched[0] })}
                  className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBdr}`, cursor: "pointer" }}>Parziale</button>
                <button onClick={() => onUpdate(def.id, { covered: "yes", evidenceField: matched[0] })}
                  className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}`, cursor: "pointer" }}>Confermo</button>
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap mt-2 mb-2">
            {(["yes", "partial", "no", "unspecified"] as CoverageStatus[]).map(s => {
              const labels: Record<CoverageStatus, string> = { yes: "Sì", partial: "Parziale", no: "No", unspecified: "Da valutare" };
              const active = covered === s;
              return (
                <button key={s} onClick={() => onUpdate(def.id, { covered: s })}
                  className="text-[11px] px-2 py-0.5 rounded border"
                  style={{ borderColor: active ? T.blue : T.border, background: active ? T.blueBg : "transparent", color: active ? T.blue : T.muted, cursor: "pointer" }}>
                  {labels[s]}
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: T.muted }}>Campo di evidenza</label>
            <input type="text" value={rec?.evidenceField ?? ""}
              onChange={e => onUpdate(def.id, { evidenceField: e.target.value })}
              placeholder="nome_campo nei log"
              style={inp} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Log set import card ──────────────────────────────────────────────────────
function LogSetCard({ logSet, onRemove }: { logSet: ImportedLogSet; onRemove: () => void }) {
  return (
    <div className="rounded-lg p-3" style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <FileText size={12} style={{ color: T.green }} />
            <span className="text-[11px] font-semibold truncate" style={{ color: T.green }}>{logSet.fileName}</span>
            <span className="text-[10px] px-1 rounded" style={{ background: T.bg, color: T.muted }}>{logSet.format.toUpperCase()}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px]" style={{ color: T.muted }}>
            <span>{logSet.entryCount.toLocaleString()} voci</span>
            <span>{logSet.detectedFields.length} campi</span>
            {logSet.dateRangeStart && (
              <span>
                {new Date(logSet.dateRangeStart).toLocaleDateString("it-IT")} – {new Date(logSet.dateRangeEnd!).toLocaleDateString("it-IT")}
              </span>
            )}
          </div>
          {logSet.detectedFields.length > 0 && (
            <p className="text-[10px] mt-1 truncate" style={{ color: T.faint }}>
              Campi: {logSet.detectedFields.slice(0, 8).join(", ")}{logSet.detectedFields.length > 8 ? `... +${logSet.detectedFields.length - 8}` : ""}
            </p>
          )}
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
          <X size={13} style={{ color: T.muted }} />
        </button>
      </div>
    </div>
  );
}

const EMPTY_RECORD: LogVaultRecord = {
  loggingCapabilityConfirmed: "unspecified",
  importedLogSets: [],
  traceabilityCoverage: [],
  biometricLogging: { applicable: "unspecified", requirementCoverage: [] },
};


const CAT_LABELS: { value: LogEventCategory; label: string }[] = [
  { value: "human_override", label: "Override umano" },
  { value: "drift_alert", label: "Drift alert" },
  { value: "anomaly", label: "Anomalia" },
  { value: "system_restart", label: "Riavvio sistema" },
  { value: "config_change", label: "Cambio config" },
  { value: "incident_link", label: "Incidente collegato" },
  { value: "maintenance", label: "Manutenzione" },
  { value: "other", label: "Altro" },
];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LogVaultPage() {
  const [record, setRecord] = useScopedStorage<LogVaultRecord>("logvault_config", EMPTY_RECORD);
  const [events, setEvents] = useScopedStorage<LogEvent[]>("logvault_events", []);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(() => readFromStorage<LogvaultResult>("logvault")?.completedAt ?? null);
  const [killActive, setKillActive] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Import state
  const [uploading, setUploading] = useState(false);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [previewSamples, setPreviewSamples] = useState<Record<string, Record<string, string>[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI copilot
  const [analyzing, setAnalyzing] = useState(false);
  const [aiProposals, setAiProposals] = useState<Record<string, { proposedCovered: "yes" | "partial" | "no"; evidenceFields: string[]; rationale: string }>>({});
  const [aiSafeStateSuggestion, setAiSafeStateSuggestion] = useState<string | null>(null);

  // Operational event log state (PROMPT BE)
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventCategory, setNewEventCategory] = useState<LogEventCategory>("other");
  const [newEventSeverity, setNewEventSeverity] = useState<LogEventSeverity>("info");
  const [newEventOperator, setNewEventOperator] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);
  const [driftAnalysis, setDriftAnalysis] = useState<DriftAnalysis | null>(null);
  const [analyzingDrift, setAnalyzingDrift] = useState(false);

  // AI severity (preserved from original)
  const [eventDesc, setEventDesc] = useState("");
  const [severitySuggestion, setSeveritySuggestion] = useState<{ severity: string; rationale: string; regulatoryFlag?: string | null } | null>(null);
  const [loadingSeverity, setLoadingSeverity] = useState(false);

  // Read classifier context
  const cls = typeof window !== "undefined" ? readFromStorage<ClassifierResult>("classifier") : null;
  const systemName = cls?.systemName ?? "Sistema AI";
  const intendedPurpose = cls?.systemDescription ?? "";
  const riskTier = cls?.riskLevel ?? "n.d.";

  // Read Oversight fourEyes for biometric applicability
  function getOversightFourEyes() {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("aicomply_oversight_record_v1");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.fourEyes ?? null;
    } catch { return null; }
  }

  const oversightFourEyes = getOversightFourEyes();
  const biometricApplicable = record.biometricLogging.applicable !== "unspecified"
    ? record.biometricLogging.applicable
    : oversightFourEyes?.applicable !== "unspecified"
    ? oversightFourEyes?.applicable
    : "unspecified";
  const verifierRoles: string[] = oversightFourEyes?.verifierRoles ?? [];

  // Read Oversight intervention_stop safe state
  function getOversightSafeState(): string | undefined {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = localStorage.getItem("aicomply_oversight_record_v1");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      const req = (parsed?.requirements ?? []).find((r: { requirementId: string; measureDescription?: string }) => r.requirementId === "intervention_stop");
      return req?.measureDescription ?? undefined;
    } catch { return undefined; }
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  }

  function patchRecord(patch: Partial<LogVaultRecord>) {
    setRecord(prev => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  }

  // ── Import handling ────────────────────────────────────────────────────────
  async function handleFileImport(file: File) {
    if (file.size > MAX_LOG_FILE_SIZE_BYTES) { showToast(`File troppo grande (max ${MAX_LOG_FILE_SIZE_BYTES / 1024 / 1024} MB)`, "error"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["json", "ndjson", "csv"].includes(ext ?? "")) { showToast("Formato non supportato — usa .json, .ndjson o .csv", "error"); return; }

    setUploading(true);
    try {
      const text = await file.text();
      const meta = await parseLogFile(text, file.name);
      if (meta.entryCount === 0) { showToast("Nessuna voce valida trovata nel file", "error"); return; }

      const logSet: ImportedLogSet = {
        id: crypto.randomUUID(),
        fileName: file.name,
        format: meta.format,
        uploadedAt: new Date().toISOString(),
        entryCount: meta.entryCount,
        dateRangeStart: meta.dateRangeStart,
        dateRangeEnd: meta.dateRangeEnd,
        detectedFields: meta.detectedFields,
      };

      // Preview samples: client-only, not persisted
      setPreviewSamples(prev => ({ ...prev, [logSet.id]: meta.previewSample }));
      setUploadWarnings(meta.warnings);

      patchRecord({ importedLogSets: [...record.importedLogSets, logSet] });
      showToast(`${meta.entryCount.toLocaleString()} voci importate — ${meta.detectedFields.length} campi rilevati`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Errore durante il parsing", "error");
    } finally {
      setUploading(false);
    }
  }

  function removeLogSet(id: string) {
    patchRecord({ importedLogSets: record.importedLogSets.filter(ls => ls.id !== id) });
    setPreviewSamples(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  // ── Coverage management ────────────────────────────────────────────────────
  function updatePurpose(id: string, patch: Partial<TraceabilityCoverageRecord>) {
    const existing = record.traceabilityCoverage.find(c => c.purposeId === id);
    const updated = { purposeId: id, covered: "unspecified" as CoverageStatus, evidenceFields: [], aiConfirmed: false, ...existing, ...patch };
    const traceabilityCoverage = record.traceabilityCoverage.some(c => c.purposeId === id)
      ? record.traceabilityCoverage.map(c => c.purposeId === id ? updated : c)
      : [...record.traceabilityCoverage, updated];
    patchRecord({ traceabilityCoverage });
  }

  function acceptPurposeAi(id: string) {
    const p = aiProposals[id];
    if (!p) return;
    updatePurpose(id, { covered: p.proposedCovered, evidenceFields: p.evidenceFields, aiConfirmed: true });
    setAiProposals(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function updateBiometric(id: string, patch: Partial<BiometricLogRequirementCoverage>) {
    const reqs = record.biometricLogging.requirementCoverage;
    const existing = reqs.find(r => r.requirementId === id);
    const updated = { requirementId: id, covered: "unspecified" as CoverageStatus, aiConfirmed: false, ...existing, ...patch };
    const requirementCoverage = reqs.some(r => r.requirementId === id)
      ? reqs.map(r => r.requirementId === id ? updated : r)
      : [...reqs, updated];
    patchRecord({ biometricLogging: { ...record.biometricLogging, requirementCoverage } });
  }

  function acceptBiometricAi(id: string) {
    const p = aiProposals[id];
    if (!p) return;
    updateBiometric(id, { covered: p.proposedCovered, evidenceField: p.evidenceFields[0], aiConfirmed: true });
    setAiProposals(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  // ── Operational event log (PROMPT BE) ─────────────────────────────────────
  async function handleAddEvent() {
    if (!newEventDesc.trim()) return;
    setAddingEvent(true);
    try {
      const ev = await createLogEvent({
        category: newEventCategory,
        severity: newEventSeverity,
        description: newEventDesc.trim(),
        operator: newEventOperator.trim() || undefined,
      });
      setEvents(prev => [ev, ...prev]);
      setNewEventDesc("");
      setNewEventOperator("");
      showToast("Evento registrato con hash integrità");
    } catch {
      showToast("Errore durante la registrazione dell'evento", "error");
    } finally {
      setAddingEvent(false);
    }
  }

  async function handleAnalyzeDrift() {
    if (events.length === 0) return;
    setAnalyzingDrift(true);
    try {
      const summaries = events.slice(0, 50).map(e => ({
        timestamp: e.timestamp,
        category: e.category,
        severity: e.severity,
        description: e.description,
      }));
      const result = await analyzeLogDrift(summaries, systemName);
      setDriftAnalysis(result);
    } catch {
      showToast("Errore analisi drift", "error");
    } finally {
      setAnalyzingDrift(false);
    }
  }

  // ── AI copilot ─────────────────────────────────────────────────────────────
  async function runAiAnalysis() {
    setAnalyzing(true);
    try {
      const allFields = getAllDetectedFields(record);
      const safeState = getOversightSafeState();
      const result = await analyzeLogCoverage({
        detectedFields: allFields,
        systemName,
        intendedPurpose,
        riskTier,
        includeBiometric: biometricApplicable === "yes",
        oversightSafeStateDescription: safeState,
      });
      const proposals: typeof aiProposals = {};
      for (const p of result.proposals) {
        proposals[p.purposeOrRequirementId] = { proposedCovered: p.proposedCovered, evidenceFields: p.evidenceFields, rationale: p.rationale };
      }
      setAiProposals(proposals);
      if (result.safeStateSuggestion) setAiSafeStateSuggestion(result.safeStateSuggestion);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Errore AI", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  // ── AI severity (preserved from original) ──────────────────────────────────
  async function handleDescriptionBlur(description: string) {
    if (description.length < 20) return;
    setLoadingSeverity(true);
    const result = await suggestEventSeverity(description, riskTier);
    setLoadingSeverity(false);
    if (!("error" in result)) setSeveritySuggestion(result);
  }

  // ── Save to dossier ────────────────────────────────────────────────────────
  function saveToDossier() {
    const completedAt = new Date().toISOString();
    const allFields = getAllDetectedFields(record);
    writeToStorage<LogvaultResult>("logvault", {
      loggingEnabled: record.loggingCapabilityConfirmed === "yes",
      retentionDays: 180,
      loggedEvents: allFields,
      storageLocation: `LogVault — ${record.importedLogSets.length} set di log importati`,
      accessControl: "Analisi struttura log — dati aggregati, nessun log grezzo persistito",
      completedAt,
    });
    appendEvidence("log", {
      type: "LogVault — Analisi copertura Art. 12",
      loggingConfirmed: record.loggingCapabilityConfirmed,
      logSets: record.importedLogSets.length,
      totalEntries: record.importedLogSets.reduce((s, l) => s + l.entryCount, 0),
      detectedFields: allFields.length,
      purposesCovered: countCovered(record),
      biometricApplicable: biometricApplicable,
      savedAt: completedAt,
    }, "logvault");
    setSavedAt(completedAt);
    showToast("LogVault salvato nel dossier");
  }

  const allDetectedFields = getAllDetectedFields(record);
  const covered = countCovered(record);
  const biometricUncovered = biometricApplicable === "yes"
    ? record.biometricLogging.requirementCoverage.filter(r => r.covered === "no").length
    : 0;
  const allBiometricIds = BIOMETRIC_LOG_REQUIREMENTS.map(r => r.id);
  const totalBiometricUncovered = biometricApplicable === "yes"
    ? allBiometricIds.filter(id => {
        const rec = record.biometricLogging.requirementCoverage.find(r => r.requirementId === id);
        return !rec || rec.covered === "no";
      }).length
    : 0;

  return (
    <div className="w-full" style={FONT}>
      <SystemSelector checkProhibited={true} />

      {/* Dossier banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-4 text-[12px]" style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}>
          <span style={{ color: T.green }}>✓ Salvato nel dossier · {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium" style={{ color: T.green }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-4 text-[12px]" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <span style={{ color: T.muted }}>Salva l&apos;analisi Art. 12 nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1" style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>Salva</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase mb-0.5" style={{ color: T.faint, letterSpacing: "1.2px" }}>Art. 12 AI Act — Registrazione automatica eventi</p>
          <h1 className="text-2xl font-semibold" style={{ color: T.text, letterSpacing: "-0.6px" }}>LogVault</h1>
          {cls && <p className="text-[11px] mt-1" style={{ color: T.muted }}>{cls.systemName} · Tier {cls.riskLevel}</p>}
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowConfig(v => !v)}
            className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg"
            style={{ background: showConfig ? T.blueBg : T.bg, border: `1px solid ${T.border}`, color: T.muted }}>
            <Settings size={13} />
            {showConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={() => {
              const allFields = getAllDetectedFields(record);
              const report = { tipo: "LogVault — Evidence Export Art. 12", data: new Date().toISOString(), sistema: systemName, campiRilevati: allFields, setImportati: record.importedLogSets.map(ls => ({ file: ls.fileName, formato: ls.format, voci: ls.entryCount, campi: ls.detectedFields, intervallo: `${ls.dateRangeStart ?? "?"} – ${ls.dateRangeEnd ?? "?"}` })), finalitaCopertura: record.traceabilityCoverage };
              const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `logvault-evidence-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg"
            style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
            <Download size={13} /> Esporta evidence
          </button>
        </div>
      </div>

      {/* Config panel (AI severity from original) */}
      <AnimatePresence>
        {showConfig && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <div className="rounded-xl p-4" style={card}>
              <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: T.faint, letterSpacing: "1px" }}>✦ Segnala evento — AI severity (Art. 73)</p>
              <textarea value={eventDesc} onChange={e => { setEventDesc(e.target.value); setSeveritySuggestion(null); }}
                onBlur={e => handleDescriptionBlur(e.target.value)}
                placeholder="Descrivi l'evento anomalo (min 20 caratteri)…" rows={2} style={ta} />
              {loadingSeverity && <p className="text-[11px] mt-1" style={{ color: T.muted }}>Classificazione in corso…</p>}
              {severitySuggestion && (
                <div className="mt-2 rounded-lg p-2.5" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
                  <p className="text-[12px] font-semibold" style={{ color: T.amber }}>✦ Severity: <strong>{severitySuggestion.severity.toUpperCase()}</strong></p>
                  <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>{severitySuggestion.rationale}</p>
                  {severitySuggestion.regulatoryFlag && <p className="text-[11px] mt-0.5" style={{ color: T.red }}>⚠ {severitySuggestion.regulatoryFlag}</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kill switch (right side) + Art. 12(1) triage side by side */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-shrink-0">
          <KillSwitch onActivate={() => setKillActive(true)} />
          {killActive && <p className="text-[10px] mt-1 text-center" style={{ color: T.red }}>Sistema arrestato — logging dell&apos;evento raccomandato</p>}
        </div>

        {/* Art. 12(1) triage */}
        <div className="flex-1 min-w-0 rounded-xl p-4" style={card}>
          <div className="flex items-center gap-2 mb-2">
            <Info size={14} style={{ color: T.blue }} />
            <span className="text-[12px] font-semibold" style={{ color: T.text }}>Triage iniziale — Art. 12(1) [verify against current AI Act text]</span>
          </div>
          <p className="text-[11px] mb-3 leading-relaxed" style={{ color: T.muted }}>
            Il sistema dispone di funzionalità di registrazione automatica degli eventi (log) durante il suo ciclo di vita operativo?
          </p>
          <div className="flex gap-2 flex-wrap">
            {([
              { v: "yes" as const, l: "Sì — il sistema genera log automatici" },
              { v: "no" as const, l: "No — il sistema non dispone di logging" },
            ]).map(opt => (
              <button key={opt.v} onClick={() => patchRecord({ loggingCapabilityConfirmed: opt.v })}
                className="text-[12px] px-3 py-2 rounded-lg border"
                style={{
                  borderColor: record.loggingCapabilityConfirmed === opt.v ? T.blue : T.border,
                  background: record.loggingCapabilityConfirmed === opt.v ? T.blueBg : "transparent",
                  color: record.loggingCapabilityConfirmed === opt.v ? T.blue : T.muted,
                  fontWeight: record.loggingCapabilityConfirmed === opt.v ? 600 : 400,
                  cursor: "pointer",
                }}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* "No logging" guide */}
      {record.loggingCapabilityConfirmed === "no" && (
        <div className="rounded-xl p-4 mb-6" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
          <p className="text-[12px] font-semibold mb-2" style={{ color: T.amber }}>
            ⚠ Il sistema non dispone di logging — art. 12(1) [verify against current AI Act text] richiede registrazione automatica
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: T.text }}>
            Richiedere al provider del sistema AI di implementare funzionalità di logging automatico degli eventi. I sistemi ad alto rischio sono obbligati a mantenere log che consentano alle autorità competenti di verificare la conformità dopo la messa in servizio.
          </p>
          <p className="text-[11px] mt-2" style={{ color: T.muted }}>
            Riferimento: Art. 12(1), Art. 79(1) [verify against current AI Act text] — Segnalare al provider e documentare la richiesta in Risk Manager.
          </p>
        </div>
      )}

      {/* Main content — show only if logging confirmed */}
      {record.loggingCapabilityConfirmed === "yes" && (
        <>
          {/* Privacy notice */}
          <div className="flex items-start gap-2 rounded-lg p-3 mb-5 text-[11px]" style={{ background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
            <Shield size={12} className="mt-0.5 flex-shrink-0" style={{ color: T.blue }} />
            <span style={{ color: T.muted }}>
              <strong style={{ color: T.blue }}>Privacy log:</strong> LogVault verifica la struttura dei tuoi log rispetto agli obblighi dell&apos;Art. 12. Non sostituisce il sistema di conservazione log del titolare — l&apos;obbligo di conservazione (Art. 26(6) [verify against current AI Act text]) resta in capo al deployer/provider. I dati grezzi non vengono persistiti: solo metadati aggregati (campi, conteggi, intervallo temporale) sono salvati.
            </span>
          </div>

          {/* ── Import section ─────────────────────────────────────────────── */}
          <section className="mb-6">
            <h2 className="text-[13px] font-semibold mb-3" style={{ color: T.text }}>Importa log reali</h2>

            {/* Existing log sets */}
            {record.importedLogSets.length > 0 && (
              <div className="space-y-2 mb-3">
                {record.importedLogSets.map(ls => (
                  <LogSetCard key={ls.id} logSet={ls} onRemove={() => removeLogSet(ls.id)} />
                ))}
              </div>
            )}

            {/* Upload warnings */}
            {uploadWarnings.length > 0 && (
              <div className="rounded-lg p-3 mb-3" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
                {uploadWarnings.map((w, i) => <p key={i} className="text-[11px]" style={{ color: T.amber }}>⚠ {w}</p>)}
              </div>
            )}

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileImport(f); }}
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer"
              style={{ borderColor: T.border, background: T.bg }}>
              {uploading ? <Loader2 size={20} className="animate-spin mb-2" style={{ color: T.blue }} /> : <Upload size={20} className="mb-2" style={{ color: T.muted }} />}
              <p className="text-[12px] font-medium" style={{ color: T.text }}>{uploading ? "Analisi in corso..." : "Trascina un file o clicca per selezionare"}</p>
              <p className="text-[11px]" style={{ color: T.muted }}>Formati: .json, .ndjson, .csv — max 25 MB</p>
              <p className="text-[11px] mt-1" style={{ color: T.faint }}>I dati grezzi non vengono salvati — solo statistiche aggregate</p>
              <input ref={fileInputRef} type="file" accept=".json,.ndjson,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileImport(f); e.currentTarget.value = ""; }} />
            </div>

            {/* Summary stats */}
            {record.importedLogSets.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  { label: "Set di log", value: record.importedLogSets.length },
                  { label: "Voci totali", value: record.importedLogSets.reduce((s, l) => s + l.entryCount, 0).toLocaleString() },
                  { label: "Campi rilevati", value: allDetectedFields.length },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-3" style={card}>
                    <div className="text-lg font-semibold" style={{ color: T.text }}>{s.value}</div>
                    <div className="text-[10px]" style={{ color: T.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Traceability purposes (Art. 12(2)(a)-(c)) ─────────────────── */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h2 className="text-[13px] font-semibold" style={{ color: T.text }}>
                  Finalità di tracciabilità — Art. 12(2)(a)-(c) [verify against current AI Act text]
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>{covered}/3 finalità valutate</p>
              </div>
              <button onClick={runAiAnalysis} disabled={analyzing}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg"
                style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer", opacity: analyzing ? 0.7 : 1 }}>
                {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Analisi AI copertura
              </button>
            </div>

            <div className="space-y-2">
              {TRACEABILITY_PURPOSES.map(def => (
                <PurposeCard
                  key={def.id}
                  def={def}
                  rec={record.traceabilityCoverage.find(c => c.purposeId === def.id)}
                  pendingProposal={aiProposals[def.id] ?? null}
                  onUpdate={updatePurpose}
                  onAcceptAi={acceptPurposeAi}
                  allDetectedFields={allDetectedFields}
                />
              ))}
            </div>

            {/* AI safe state suggestion */}
            {aiSafeStateSuggestion && (
              <div className="mt-3 rounded-lg p-3" style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}` }}>
                <p className="text-[11px] font-semibold mb-1" style={{ color: T.violet }}>✦ AI — verifica e conferma (Art. 14(4)(e) [verify against current AI Act text])</p>
                <p className="text-[11px] leading-relaxed" style={{ color: T.text }}>{aiSafeStateSuggestion}</p>
                <button onClick={() => setAiSafeStateSuggestion(null)} className="text-[10px] mt-1" style={{ color: T.muted, background: "none", border: "none", cursor: "pointer" }}>Chiudi</button>
              </div>
            )}
          </section>

          {/* ── Art. 12(3) biometric module (conditional) ─────────────────── */}
          {biometricApplicable !== "no" && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: T.border }} />
                <span className="text-[11px] font-semibold uppercase tracking-wide px-2" style={{ color: T.violet }}>Modulo condizionale — Sistemi di identificazione biometrica</span>
                <div className="flex-1 h-px" style={{ background: T.border }} />
              </div>

              {biometricApplicable === "unspecified" && (
                <div className="rounded-xl p-4 mb-4" style={card}>
                  <p className="text-[12px] font-semibold mb-1" style={{ color: T.text }}>Applicabilità Art. 12(3) — sistemi di identificazione biometrica [verify against current AI Act text]</p>
                  <p className="text-[11px] mb-3" style={{ color: T.muted }}>
                    Il sistema è classificato in Annex III punto 1(a) (sistemi di identificazione biometrica remota)?
                    Se già valutato in Oversight, il valore viene ereditato automaticamente.
                  </p>
                  <div className="flex gap-2">
                    {([{ v: "yes" as const, l: "Sì — sistema biometrico Annex III 1(a)" }, { v: "no" as const, l: "No — non applicabile" }]).map(opt => (
                      <button key={opt.v} onClick={() => patchRecord({ biometricLogging: { ...record.biometricLogging, applicable: opt.v } })}
                        className="text-[12px] px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: T.border, background: "transparent", color: T.muted, cursor: "pointer" }}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {biometricApplicable === "yes" && (
                <div className="rounded-xl border-2 p-4 mb-6" style={{ background: T.card, borderColor: T.violet }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={15} style={{ color: T.violet }} />
                    <span className="font-semibold text-sm" style={{ color: T.text }}>Requisiti minimi di log — Art. 12(3) [verify against current AI Act text]</span>
                  </div>

                  {totalBiometricUncovered > 0 && (
                    <div className="rounded-lg p-3 mb-3" style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
                      <p className="text-[12px] font-semibold" style={{ color: T.red }}>
                        I log attualmente importati non soddisfano {totalBiometricUncovered}/4 requisiti minimi dell&apos;Art. 12(3) [verify against current AI Act text] per i sistemi di identificazione biometrica
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: T.muted }}>
                        Intervenire sul sistema di logging del provider per aggiungere i campi mancanti.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {BIOMETRIC_LOG_REQUIREMENTS.map(def => (
                      <BiometricCard
                        key={def.id}
                        def={def}
                        rec={record.biometricLogging.requirementCoverage.find(r => r.requirementId === def.id)}
                        pendingProposal={aiProposals[def.id] ?? null}
                        onUpdate={updateBiometric}
                        onAcceptAi={acceptBiometricAi}
                        allDetectedFields={allDetectedFields}
                        verifierRoles={verifierRoles.length > 0 ? verifierRoles : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Retention notes ────────────────────────────────────────────── */}
          <section className="mb-6 rounded-xl p-4" style={card}>
            <h2 className="text-[12px] font-semibold mb-1" style={{ color: T.text }}>
              Politica di conservazione — Art. 26(6) [verify against current AI Act text]
            </h2>
            <p className="text-[11px] mb-3" style={{ color: T.muted }}>
              Documenta la politica di conservazione dei log adottata dal deployer/provider (durata, sistema utilizzato).
              L&apos;obbligo di conservazione resta in capo al deployer — questo campo è solo documentazione.
            </p>
            <textarea rows={3} value={record.retentionNotes ?? ""}
              onChange={e => patchRecord({ retentionNotes: e.target.value })}
              placeholder="es. 'Log conservati per 24 mesi in sistema X con accesso ristretto ai ruoli Y e Z. Backup giornaliero su storage cifrato.'"
              style={ta} />
            <div className="mt-2">
              <Link href="/dashboard/tools/deployer-dashboard" className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: T.blue }}>
                <ExternalLink size={11} /> Deployer Dashboard — obbligo log_retention (Art. 26(6))
              </Link>
            </div>
          </section>

          {/* Save */}
          <div className="flex justify-end">
            <button onClick={saveToDossier} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium"
              style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
              <CheckCircle size={14} /> Salva nel dossier
            </button>
          </div>
        </>
      )}

      {/* ── Operational Event Log (always visible) ─────────────────────────── */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[13px] font-semibold" style={{ color: T.text }}>
              Registro eventi operativi
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>
              Art. 12 — Log immutabili con hash integrità SHA-256 · {events.length} eventi
            </p>
          </div>
          <button
            onClick={handleAnalyzeDrift}
            disabled={analyzingDrift || events.length === 0}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg"
            style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}`, color: T.violet, cursor: events.length === 0 ? "not-allowed" : "pointer", opacity: events.length === 0 ? 0.5 : 1 }}>
            {analyzingDrift ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            ✦ Analisi drift
          </button>
        </div>

        {/* Drift banner */}
        {driftAnalysis && (
          <div className="rounded-xl p-4 mb-4" style={{
            background: driftAnalysis.driftDetected ? T.amberBg : T.greenBg,
            border: `1px solid ${driftAnalysis.driftDetected ? T.amberBdr : T.greenBdr}`,
          }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold mb-1" style={{ color: driftAnalysis.driftDetected ? T.amber : T.green }}>
                  ✦ AI {driftAnalysis.driftDetected ? "— Drift rilevato" : "— Nessun drift rilevato"} [verify against current AI Act text]
                </p>
                <p className="text-[11px]" style={{ color: T.text }}>{driftAnalysis.summary}</p>
                {driftAnalysis.signals.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {driftAnalysis.signals.map((s, i) => (
                      <p key={i} className="text-[10px]" style={{ color: T.muted }}>
                        · {s.pattern} ({s.count}×) — {s.severity}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-[11px] mt-2 font-medium" style={{ color: T.text }}>{driftAnalysis.suggestedAction}</p>
                {driftAnalysis.draftIncidentReason && (
                  <Link
                    href={`/dashboard/post-market?tab=incidents&draft=${encodeURIComponent(driftAnalysis.draftIncidentReason)}`}
                    className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold"
                    style={{ color: T.amber }}>
                    <ExternalLink size={11} /> Apri bozza incidente in Post-Market
                  </Link>
                )}
              </div>
              <button onClick={() => setDriftAnalysis(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                <X size={13} style={{ color: T.muted }} />
              </button>
            </div>
          </div>
        )}

        {/* Add event form */}
        <div className="rounded-xl p-4 mb-4" style={card}>
          <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: T.faint, letterSpacing: "1px" }}>
            <Plus size={10} style={{ display: "inline", marginRight: 4 }} />
            Registra nuovo evento
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] block mb-1" style={{ color: T.muted }}>Categoria</label>
              <select
                value={newEventCategory}
                onChange={e => setNewEventCategory(e.target.value as LogEventCategory)}
                style={{ ...inp, fontSize: 11 }}>
                {CAT_LABELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: T.muted }}>Severità</label>
              <select
                value={newEventSeverity}
                onChange={e => setNewEventSeverity(e.target.value as LogEventSeverity)}
                style={{ ...inp, fontSize: 11 }}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critico</option>
              </select>
            </div>
          </div>
          <textarea
            value={newEventDesc}
            onChange={e => setNewEventDesc(e.target.value)}
            placeholder="Descrizione dell'evento (es. 'Operatore ha effettuato override decisione ID-442')…"
            rows={2}
            style={{ ...ta, marginBottom: 6 }} />
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newEventOperator}
              onChange={e => setNewEventOperator(e.target.value)}
              placeholder="Operatore (opzionale)"
              style={{ ...inp, flex: 1 }} />
            <button
              onClick={handleAddEvent}
              disabled={addingEvent || !newEventDesc.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-medium"
              style={{ background: T.text, color: "#fff", border: "none", cursor: !newEventDesc.trim() ? "not-allowed" : "pointer", opacity: !newEventDesc.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}>
              {addingEvent ? <Loader2 size={11} className="animate-spin" /> : <Hash size={11} />}
              Registra + hash
            </button>
          </div>
        </div>

        {/* Virtual event grid */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}`, background: T.card }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: T.border }}>
            <p className="text-[11px] font-semibold" style={{ color: T.muted }}>
              {events.length} eventi · immutabili · SHA-256
            </p>
          </div>
          <div className="p-3">
            <VirtualLogGrid events={events} height={320} />
          </div>
        </div>
      </section>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg"
            style={{ background: toast.type === "error" ? "rgba(220,38,38,0.95)" : T.text, color: "#fff" }}>
            {toast.type === "error" ? "⚠" : "✓"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
