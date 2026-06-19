"use client";
import React, { useState, useCallback, useEffect, useRef, CSSProperties } from "react";
import Link from "next/link";
import {
  Database, Upload, CheckCircle2, Clock, Minus, AlertTriangle,
  Sparkles, Loader2, Info, X, ExternalLink, Check, ChevronDown,
  FileText, AlertCircle, Shield,
} from "lucide-react";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import {
  DATA_GOVERNANCE_PRACTICES,
  SPECIAL_CATEGORIES_MODULE,
  MAX_CSV_SIZE_BYTES,
} from "@/lib/data-audit/data-governance-practices";
import {
  loadDataAuditRecord,
  saveDataAuditRecord,
  countDocumented,
  type DataAuditRecord,
  type DatasetProfile,
  type DatasetRole,
  type GovernancePracticeRecord,
  type PracticeStatus,
} from "@/lib/data-audit/data-audit-types";
import { profileDataset } from "@/lib/data-audit/csv-profiler";
import {
  draftGovernancePracticeDocumentation,
  analyzeBiasIndicators,
} from "@/app/actions/dataAuditActions";

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

// ─── Dataset upload component ─────────────────────────────────────────────────

interface DatasetUploadProps {
  role: DatasetRole;
  roleLabel: string;
  optional: boolean;
  profile: DatasetProfile | null;
  onProfile: (p: DatasetProfile) => void;
  onRemove: () => void;
}

function DatasetUpload({ role, roleLabel, optional, profile, onProfile, onRemove }: DatasetUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError(null);
    if (!file.name.endsWith(".csv")) { setError("Solo file .csv"); return; }
    if (file.size > MAX_CSV_SIZE_BYTES) { setError(`File troppo grande (max ${MAX_CSV_SIZE_BYTES / 1024 / 1024} MB)`); return; }
    setParsing(true);
    try {
      const text = await file.text();
      const p = profileDataset(crypto.randomUUID(), role, file.name, text);
      // text is processed and immediately discarded — only profile (stats) is kept
      onProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore parsing CSV");
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  if (profile) {
    const sensitiveCount = profile.columns.filter(c => c.flaggedAsSensitive).length;
    const highMissing = profile.columns.filter(c => c.missingPercentage > 20);
    return (
      <div className="rounded-xl p-4" style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} style={{ color: T.green }} />
              <span className="text-[12px] font-semibold truncate" style={{ color: T.green }}>{profile.fileName}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: T.muted }}>
              <span>{profile.rowCount.toLocaleString()} righe</span>
              <span>{profile.columnCount} colonne</span>
              <span>{profile.overallMissingPercentage}% missing</span>
              {sensitiveCount > 0 && (
                <span className="font-semibold" style={{ color: T.amber }}>
                  ⚠ {sensitiveCount} colonne sensibili rilevate
                </span>
              )}
              {highMissing.length > 0 && (
                <span className="font-semibold" style={{ color: T.red }}>
                  {highMissing.length} colonne con &gt;20% valori mancanti
                </span>
              )}
            </div>
          </div>
          <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            <X size={14} style={{ color: T.muted }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Privacy notice — sempre visibile, come da constraint */}
      <div className="flex items-start gap-1.5 mb-2 text-[11px]" style={{ color: T.muted }}>
        <Shield size={11} className="mt-0.5 flex-shrink-0" style={{ color: T.blue }} />
        <span>I tuoi dati non vengono salvati: calcoliamo solo statistiche aggregate, il file viene scartato dopo l&apos;analisi.</span>
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer transition-colors"
        style={{ borderColor: dragging ? T.blue : T.border, background: dragging ? T.blueBg : T.bg }}
      >
        {parsing ? (
          <Loader2 size={20} className="animate-spin mb-2" style={{ color: T.blue }} />
        ) : (
          <Upload size={20} className="mb-2" style={{ color: T.muted }} />
        )}
        <p className="text-[12px] font-medium" style={{ color: T.text }}>
          {parsing ? "Analisi in corso..." : `Dataset ${roleLabel}`}
          {optional && <span className="ml-1 text-[10px]" style={{ color: T.muted }}>(non obbligatorio)</span>}
        </p>
        <p className="text-[11px]" style={{ color: T.muted }}>
          {parsing ? "Profiling colonne..." : "Trascina un .csv o clicca — max 25 MB"}
        </p>
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
      </div>
      {error && <p className="text-[11px] mt-1" style={{ color: T.red }}>{error}</p>}
    </div>
  );
}

// ─── Column profile table ─────────────────────────────────────────────────────

function ColumnTable({ profile, onConfirmSensitive }: { profile: DatasetProfile; onConfirmSensitive: (colName: string, confirmed: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const flagged = profile.columns.filter(c => c.flaggedAsSensitive);

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: T.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none" }} />
        {open ? "Nascondi" : "Mostra"} profilo colonne ({profile.columnCount})
        {flagged.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: T.amberBg, color: T.amber }}>⚠ {flagged.length} sensibili</span>}
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: T.border }}>
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                {["Colonna", "Tipo", "Missing %", "Valori unici", "Min/Max o top valori", "Sensibile?"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: T.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.columns.map((col, i) => (
                <tr key={col.name} style={{ borderTop: i > 0 ? `1px solid ${T.border}` : "none", background: col.flaggedAsSensitive && !col.sensitiveFlagConfirmed ? T.amberBg : "transparent" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: T.text, maxWidth: 140 }}>
                    <span className="block truncate">{col.name}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: T.bg, color: T.muted }}>{col.inferredType}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span style={{ color: col.missingPercentage > 20 ? T.red : col.missingPercentage > 5 ? T.amber : T.green, fontWeight: col.missingPercentage > 20 ? 600 : 400 }}>
                      {col.missingPercentage}%
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: T.muted }}>{col.uniqueValueCount ?? "—"}</td>
                  <td className="px-3 py-2" style={{ color: T.muted, maxWidth: 200 }}>
                    {col.numericStats
                      ? `${col.numericStats.min} – ${col.numericStats.max}`
                      : col.categoricalDistribution
                      ? col.categoricalDistribution.slice(0, 3).map(d => `${d.value}(${d.percentage}%)`).join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {col.flaggedAsSensitive ? (
                      col.sensitiveFlagConfirmed ? (
                        <span className="text-[10px] font-semibold" style={{ color: T.amber }}>✓ Confermata</span>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-semibold" style={{ color: T.violet }}>✦ AI ({col.sensitiveCategoryGuess})</span>
                          <button onClick={() => onConfirmSensitive(col.name, true)}
                            className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBdr}`, cursor: "pointer" }}>
                            Conferma
                          </button>
                          <button onClick={() => onConfirmSensitive(col.name, false)}
                            className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: T.bg, color: T.muted, border: `1px solid ${T.border}`, cursor: "pointer" }}>
                            No
                          </button>
                        </div>
                      )
                    ) : (
                      <span style={{ color: T.faint }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Governance practice card ─────────────────────────────────────────────────

interface PracticeCardProps {
  def: typeof DATA_GOVERNANCE_PRACTICES[number];
  rec: GovernancePracticeRecord | undefined;
  pending: string | null;
  onUpdate: (id: string, patch: Partial<GovernancePracticeRecord>) => void;
  onAcceptAi: (id: string) => void;
  onDraft: (id: string) => void;
  drafting: boolean;
  computedSummary?: React.ReactNode;
}

function PracticeCard({ def, rec, pending, onUpdate, onAcceptAi, onDraft, drafting, computedSummary }: PracticeCardProps) {
  const [open, setOpen] = useState(false);
  const status = rec?.status ?? "not_documented";
  const statusMap = {
    not_documented: { label: "Non documentato", color: T.red },
    in_progress:    { label: "In corso",         color: T.amber },
    documented:     { label: "Documentato",       color: T.green },
    not_applicable: { label: "N/A",               color: T.muted },
  };
  const s = statusMap[status];

  return (
    <div className="rounded-xl border" style={{ background: T.card, borderColor: status === "documented" ? "#86efac" : T.border }}>
      <button className="w-full flex items-start gap-3 p-4 text-left" onClick={() => setOpen(v => !v)}>
        <div className="mt-0.5">
          {status === "documented" ? <CheckCircle2 size={15} style={{ color: T.green }} /> :
           status === "in_progress" ? <Clock size={15} style={{ color: T.amber }} /> :
           status === "not_applicable" ? <Minus size={15} style={{ color: T.faint }} /> :
           <Minus size={15} style={{ color: T.faint }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: T.blueBg, color: T.blue }}>{def.reference.split(" ")[0]} {def.reference.split(" ")[1]}</span>
            <span className="text-[12px] font-semibold" style={{ color: T.text }}>{def.label}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: s.color, background: `${s.color}10` }}>{s.label}</span>
            {pending && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: T.violetBg, color: T.violet }}>✦ AI</span>}
            {def.source !== "manual" && <span className="text-[10px] px-1 rounded" style={{ background: T.bg, color: T.muted }}>calcolato</span>}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: T.faint }}>{def.reference}</p>
        </div>
        <span className="text-[10px] flex-shrink-0" style={{ color: T.faint }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "#f3f4f6" }}>
          {/* Computed summary (stats-based, no AI badge needed) */}
          {computedSummary && (
            <div className="mt-3 rounded-lg p-3 mb-3" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: T.muted }}>
                Riepilogo statistico automatico
              </p>
              {computedSummary}
            </div>
          )}

          {/* AI pending */}
          {pending && (
            <div className="mt-3 rounded-lg p-3 mb-3" style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}` }}>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: T.violet }}>✦ AI — verifica e conferma</p>
              <p className="text-[12px] whitespace-pre-wrap leading-relaxed" style={{ color: T.text }}>{pending}</p>
              <button onClick={() => onAcceptAi(def.id)}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded"
                style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer" }}>
                <Check size={11} /> Accetta e applica
              </button>
            </div>
          )}

          {/* Documentation textarea */}
          <div className="mt-3 mb-3">
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: T.muted }}>Documentazione</label>
            <textarea rows={4} value={rec?.documentation ?? ""}
              onChange={e => onUpdate(def.id, { documentation: e.target.value })}
              placeholder={def.computedHint ?? "Documenta questa pratica..."}
              style={ta} />
          </div>

          {/* Status + AI draft */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["not_documented", "in_progress", "documented", "not_applicable"] as PracticeStatus[]).map(s => {
              const labels = { not_documented: "Non doc.", in_progress: "In corso", documented: "Documentato", not_applicable: "N/A" };
              const active = (rec?.status ?? "not_documented") === s;
              return (
                <button key={s} onClick={() => onUpdate(def.id, { status: s })}
                  className="text-[11px] px-2.5 py-1 rounded-lg border"
                  style={{ borderColor: active ? T.blue : T.border, background: active ? T.blueBg : "transparent", color: active ? T.blue : T.muted, fontWeight: active ? 600 : 400 }}>
                  {labels[s]}
                </button>
              );
            })}
            <button onClick={() => onDraft(def.id)} disabled={drafting}
              className="ml-auto flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg"
              style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer", opacity: drafting ? 0.7 : 1 }}>
              {drafting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Bozza AI
            </button>
          </div>

          {/* Linked tool */}
          {def.linkedToolPath && (
            <Link href={def.linkedToolPath} className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium" style={{ color: T.blue }}>
              <ExternalLink size={11} /> {def.linkedToolLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DataAuditPage() {
  const [record, setRecord] = useState<DataAuditRecord>(() => loadDataAuditRecord());
  const [toast, setToast] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(() => readFromStorage<{ completedAt?: string }>("dataAudit")?.completedAt ?? null);

  // AI copilot state
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<Record<string, string>>({});
  const [biasAnalyzing, setBiasAnalyzing] = useState(false);
  const [biasAnalyses, setBiasAnalyses] = useState<Array<{ columnName: string; analysis: string }>>([]);
  const [biasAnalysisAccepted, setBiasAnalysisAccepted] = useState(false);

  const cls = typeof window !== "undefined" ? readFromStorage<ClassifierResult>("classifier") : null;
  const systemName = cls?.systemName ?? "Sistema AI";
  const systemDescription = cls?.systemDescription ?? "";
  const riskTier = cls?.riskLevel ?? "n.d.";

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  function patchRecord(patch: Partial<DataAuditRecord>) {
    setRecord(prev => { const next = { ...prev, ...patch, updatedAt: new Date().toISOString() }; saveDataAuditRecord(next); return next; });
  }

  // Dataset operations
  function upsertDataset(profile: DatasetProfile) {
    const datasets = record.datasets.filter(d => d.role !== profile.role);
    patchRecord({ datasets: [...datasets, profile] });
    showToast(`Dataset ${profile.role} caricato — ${profile.rowCount.toLocaleString()} righe, ${profile.columnCount} colonne`);
  }

  function removeDataset(role: DatasetRole) {
    patchRecord({ datasets: record.datasets.filter(d => d.role !== role) });
  }

  function confirmSensitiveColumn(datasetId: string, colName: string, confirmed: boolean) {
    const datasets = record.datasets.map(ds => {
      if (ds.id !== datasetId) return ds;
      const columns = ds.columns.map(col => {
        if (col.name !== colName) return col;
        return { ...col, sensitiveFlagConfirmed: confirmed, flaggedAsSensitive: confirmed ? true : false };
      });
      return { ...ds, columns };
    });

    // Recompute special categories applicability
    const anyConfirmed = datasets.some(ds => ds.columns.some(c => c.sensitiveFlagConfirmed));
    const specialCategories = { ...record.specialCategories, applicable: anyConfirmed ? "yes" as const : record.specialCategories.applicable };
    patchRecord({ datasets, specialCategories });
  }

  // Governance practice operations
  function getPracticeRec(id: string): GovernancePracticeRecord | undefined {
    return record.governancePractices.find(p => p.practiceId === id);
  }

  function updatePractice(id: string, patch: Partial<GovernancePracticeRecord>) {
    const existing = record.governancePractices.find(p => p.practiceId === id);
    const updated: GovernancePracticeRecord = { practiceId: id, status: "not_documented", aiConfirmed: false, ...existing, ...patch };
    const governancePractices = record.governancePractices.some(p => p.practiceId === id)
      ? record.governancePractices.map(p => p.practiceId === id ? updated : p)
      : [...record.governancePractices, updated];
    patchRecord({ governancePractices });
  }

  function acceptDraft(id: string) {
    const text = pendingDrafts[id];
    if (!text) return;
    updatePractice(id, { documentation: text, aiConfirmed: true, status: "in_progress" });
    setPendingDrafts(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function draftPractice(id: string) {
    setDraftingId(id);
    try {
      const result = await draftGovernancePracticeDocumentation({
        practiceId: id,
        systemName,
        systemDescription,
        riskTier,
        datasetSummaries: record.datasets.map(d => ({
          role: d.role, fileName: d.fileName, rowCount: d.rowCount, columnCount: d.columnCount, overallMissingPercentage: d.overallMissingPercentage,
        })),
      });
      setPendingDrafts(prev => ({ ...prev, [id]: result.documentation }));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Errore AI");
    } finally {
      setDraftingId(null);
    }
  }

  async function runBiasAnalysis() {
    setBiasAnalyzing(true);
    try {
      const confirmedSensitive = record.datasets.flatMap(ds =>
        ds.columns
          .filter(c => c.sensitiveFlagConfirmed)
          .map(c => ({
            name: c.name,
            datasetRole: ds.role,
            distribution: c.categoricalDistribution ?? [],
            numericStats: c.numericStats,
          }))
      );
      if (confirmedSensitive.length === 0) { showToast("Nessuna colonna sensibile confermata"); setBiasAnalyzing(false); return; }
      const result = await analyzeBiasIndicators({ systemName, intendedPurpose: systemDescription, sensitiveColumns: confirmedSensitive });
      setBiasAnalyses(result.analyses);
      setBiasAnalysisAccepted(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Errore analisi bias");
    } finally {
      setBiasAnalyzing(false);
    }
  }

  function saveToDossier() {
    const now = new Date().toISOString();
    const documented = countDocumented(record);
    writeToStorage("dataAudit", {
      datasets: record.datasets.map(d => ({
        name: d.fileName, source: d.role, size: `${d.rowCount} righe`,
        biasChecked: record.specialCategories.applicable === "yes",
        qualityScore: Math.round(100 - d.overallMissingPercentage),
        personalData: record.specialCategories.applicable === "yes",
        issues: d.columns.filter(c => c.missingPercentage > 20).map(c => `${c.name}: ${c.missingPercentage}% mancanti`),
      })),
      overallQuality: documented >= 8 ? "pass" : documented >= 5 ? "review" : "fail",
      completedAt: now,
    });
    appendEvidence("decision", { type: "Data Audit Art. 10 — record salvato", documented, datasets: record.datasets.length, savedAt: now }, "dataAudit");
    setSavedAt(now);
    showToast("Qualità Dati salvato nel dossier");
  }

  // Computed summaries for "computed" source practices
  function computedSummaryFor(id: string): React.ReactNode | undefined {
    const datasets = record.datasets;
    if (datasets.length === 0) return undefined;

    if (id === "availability_assessment" || id === "quality_criteria") {
      return (
        <div className="space-y-1 text-[11px]" style={{ color: T.text }}>
          {datasets.map(d => (
            <div key={d.id}>
              <span className="font-semibold">{d.role} — {d.fileName}:</span>{" "}
              {d.rowCount.toLocaleString()} righe, {d.columnCount} colonne,{" "}
              {d.overallMissingPercentage}% missing medio
              {d.overallMissingPercentage > 20 && <span style={{ color: T.red }}> ⚠ qualità bassa</span>}
              {d.overallMissingPercentage <= 5 && <span style={{ color: T.green }}> ✓ qualità alta</span>}
            </div>
          ))}
        </div>
      );
    }
    if (id === "data_gaps") {
      const highMissing = datasets.flatMap(d =>
        d.columns.filter(c => c.missingPercentage > 20).map(c => ({ ds: d.fileName, col: c.name, pct: c.missingPercentage }))
      );
      if (highMissing.length === 0) return <p className="text-[11px]" style={{ color: T.green }}>Nessuna colonna con più del 20% di valori mancanti.</p>;
      return (
        <ul className="space-y-0.5 text-[11px]" style={{ color: T.text }}>
          {highMissing.map((h, i) => <li key={i}>• <strong>{h.col}</strong> ({h.ds}): <span style={{ color: T.red }}>{h.pct}% mancanti</span></li>)}
        </ul>
      );
    }
    if (id === "bias_examination") {
      const confirmed = datasets.flatMap(d => d.columns.filter(c => c.sensitiveFlagConfirmed).map(c => ({ ds: d.fileName, col: c.name })));
      if (confirmed.length === 0) return <p className="text-[11px]" style={{ color: T.muted }}>Nessuna colonna sensibile confermata. Carica un dataset e conferma le colonne sensibili.</p>;
      return (
        <div>
          <p className="text-[11px] mb-1" style={{ color: T.text }}>Colonne sensibili confermate:</p>
          <ul className="space-y-0.5 text-[11px]" style={{ color: T.muted }}>
            {confirmed.map((c, i) => <li key={i}>• <strong>{c.col}</strong> ({c.ds})</li>)}
          </ul>
          {biasAnalyses.length > 0 && !biasAnalysisAccepted && (
            <div className="mt-2 rounded-lg p-2.5" style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}` }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: T.violet }}>✦ AI — verifica e conferma</p>
              {biasAnalyses.map((a, i) => (
                <div key={i} className="mb-2">
                  <p className="text-[11px] font-semibold" style={{ color: T.text }}>{a.columnName}</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>{a.analysis}</p>
                </div>
              ))}
              <button onClick={() => { setBiasAnalysisAccepted(true); updatePractice("bias_examination", { documentation: biasAnalyses.map(a => `${a.columnName}: ${a.analysis}`).join("\n\n"), aiConfirmed: true }); }}
                className="text-[11px] font-semibold px-2 py-1 rounded flex items-center gap-1"
                style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer" }}>
                <Check size={11} /> Accetta analisi AI
              </button>
            </div>
          )}
        </div>
      );
    }
    return undefined;
  }

  const documented = countDocumented(record);
  const total = DATA_GOVERNANCE_PRACTICES.length;
  const pct = Math.round((documented / total) * 100);

  // Determine which roles are required
  const isOther = record.developmentApproach === "other_technique";
  const ROLES: Array<{ role: DatasetRole; label: string; optional: boolean }> = [
    { role: "training",   label: "Training",   optional: isOther },
    { role: "validation", label: "Validazione", optional: isOther },
    { role: "testing",    label: "Test",        optional: false   },
  ];

  const anyConfirmedSensitive = record.datasets.some(d => d.columns.some(c => c.sensitiveFlagConfirmed));
  const showSpecialCategories = record.specialCategories.applicable === "yes" || anyConfirmedSensitive;

  return (
    <div className="w-full" style={FONT}>
      <SystemSelector checkProhibited={false} />

      {/* Dossier banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-4 text-[12px]" style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}>
          <span style={{ color: T.green }}>✓ Salvato nel dossier · {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium" style={{ color: T.green }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-4 text-[12px]" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <span style={{ color: T.muted }}>Salva Qualità Dati nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1" style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>Salva</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Database size={20} style={{ color: T.blue }} />
          <h1 className="text-xl font-bold" style={{ color: T.text }}>Qualità Dati</h1>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: T.blueBg, color: T.blue }}>Art. 10</span>
        </div>
        <p className="text-[12px]" style={{ color: T.muted }}>
          Requisiti di qualità, governance e provenienza dei dati di training, validazione e test per sistemi AI ad alto rischio.
        </p>
        {cls && (
          <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: T.muted }}>
            <span>Sistema: <strong style={{ color: T.text }}>{cls.systemName}</strong></span>
            <span>Tier: <strong style={{ color: T.text }}>{cls.riskLevel}</strong></span>
          </div>
        )}
      </div>

      {/* Art. 10(6) triage */}
      <div className="rounded-xl p-4 mb-5" style={{ ...card }}>
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} style={{ color: T.blue }} />
          <span className="text-[12px] font-semibold" style={{ color: T.text }}>Approccio di sviluppo — Art. 10(6)</span>
        </div>
        <p className="text-[11px] mb-3" style={{ color: T.muted }}>
          Il sistema è stato sviluppato tramite addestramento di modelli (es. machine learning), o tramite altre tecniche (es. sistemi a regole)?
          Se "altre tecniche", solo il dataset di test è obbligatorio.
        </p>
        <div className="flex gap-2 flex-wrap">
          {([
            { v: "trained_model", l: "Addestramento modelli (ML)" },
            { v: "other_technique", l: "Altre tecniche (regole, logica)" },
          ] as const).map(opt => (
            <button key={opt.v}
              onClick={() => patchRecord({ developmentApproach: opt.v })}
              className="text-[12px] px-3 py-1.5 rounded-lg border"
              style={{
                borderColor: record.developmentApproach === opt.v ? T.blue : T.border,
                background: record.developmentApproach === opt.v ? T.blueBg : "transparent",
                color: record.developmentApproach === opt.v ? T.blue : T.muted,
                fontWeight: record.developmentApproach === opt.v ? 600 : 400,
                cursor: "pointer",
              }}>
              {opt.l}
            </button>
          ))}
          {record.developmentApproach !== "unspecified" && (
            <button onClick={() => patchRecord({ developmentApproach: "unspecified" })}
              className="text-[11px] px-2 py-1 rounded" style={{ color: T.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Modifica
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl font-bold" style={{ color: pct === 100 ? T.green : T.text }}>{documented}/{total}</span>
        <div className="flex-1">
          <div className="text-[11px] font-medium mb-1" style={{ color: T.muted }}>pratiche Art. 10 documentate</div>
          <div className="h-2 rounded-full" style={{ background: T.border }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? T.green : T.blue }} />
          </div>
        </div>
        <span className="text-[11px]" style={{ color: T.muted }}>{pct}%</span>
      </div>

      {/* ── Dataset upload panels ── */}
      <section className="mb-6">
        <h2 className="text-[13px] font-semibold mb-3" style={{ color: T.text }}>Dataset</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLES.map(({ role, label, optional }) => {
            const profile = record.datasets.find(d => d.role === role) ?? null;
            return (
              <div key={role}>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: T.muted }}>
                  {label}
                  {optional && <span className="ml-1 normal-case" style={{ color: T.faint }}>(non obbligatorio)</span>}
                </p>
                <DatasetUpload
                  role={role} roleLabel={label} optional={optional}
                  profile={profile}
                  onProfile={upsertDataset}
                  onRemove={() => removeDataset(role)}
                />
                {profile && (
                  <ColumnTable
                    profile={profile}
                    onConfirmSensitive={(colName, confirmed) => confirmSensitiveColumn(profile.id, colName, confirmed)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bias analysis button */}
        {anyConfirmedSensitive && (
          <div className="mt-4 flex items-center gap-3">
            <button onClick={runBiasAnalysis} disabled={biasAnalyzing}
              className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
              style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer", opacity: biasAnalyzing ? 0.7 : 1 }}>
              {biasAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Analisi bias AI su colonne sensibili
            </button>
            <span className="text-[11px]" style={{ color: T.muted }}>Art. 10(2)(f) — risultato marcato ✦ AI, richiede accettazione</span>
          </div>
        )}
      </section>

      {/* ── 10 Governance practice cards ── */}
      <section className="mb-6">
        <h2 className="text-[13px] font-semibold mb-3" style={{ color: T.text }}>
          Pratiche di governance — Art. 10(2)-(4)
        </h2>
        <div className="space-y-2">
          {DATA_GOVERNANCE_PRACTICES.map(def => (
            <PracticeCard
              key={def.id}
              def={def}
              rec={getPracticeRec(def.id)}
              pending={pendingDrafts[def.id] ?? null}
              onUpdate={updatePractice}
              onAcceptAi={acceptDraft}
              onDraft={draftPractice}
              drafting={draftingId === def.id}
              computedSummary={computedSummaryFor(def.id)}
            />
          ))}
        </div>
      </section>

      {/* ── Art. 10(5) special categories (conditional) ── */}
      {showSpecialCategories && (
        <>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: T.border }} />
            <span className="text-[11px] font-semibold uppercase tracking-wide px-2" style={{ color: T.violet }}>
              Modulo condizionale — Categorie particolari
            </span>
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>
          <div className="rounded-xl border-2 p-4 mb-6" style={{ background: T.card, borderColor: T.violet }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} style={{ color: T.violet }} />
              <span className="font-semibold text-sm" style={{ color: T.text }}>{SPECIAL_CATEGORIES_MODULE.label}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: T.violetBg, color: T.violet }}>{SPECIAL_CATEGORIES_MODULE.primaryReference}</span>
            </div>
            <p className="text-[12px] mb-4 leading-relaxed" style={{ color: T.muted }}>{SPECIAL_CATEGORIES_MODULE.description}</p>

            {/* Confirmed sensitive columns */}
            {anyConfirmedSensitive && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold mb-1" style={{ color: T.text }}>Colonne confermate come sensibili:</p>
                <ul className="text-[11px] space-y-0.5" style={{ color: T.muted }}>
                  {record.datasets.flatMap(d => d.columns.filter(c => c.sensitiveFlagConfirmed).map(c => (
                    <li key={`${d.id}-${c.name}`}>• <strong>{c.name}</strong> — {d.fileName} ({d.role})</li>
                  )))}
                </ul>
              </div>
            )}

            {/* Legal basis */}
            <div className="mb-3">
              <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: T.muted }}>
                Base giuridica e garanzie adottate — Art. 10(5)
              </label>
              <textarea rows={3} value={record.specialCategories.legalBasisDocumentation ?? ""}
                onChange={e => patchRecord({ specialCategories: { ...record.specialCategories, legalBasisDocumentation: e.target.value } })}
                placeholder="Descrivi la base giuridica ex Art. 9 GDPR, le misure di pseudonimizzazione adottate, e le garanzie per il trattamento..."
                style={ta} />
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {(["not_documented", "in_progress", "documented"] as PracticeStatus[]).map(s => {
                const labels = { not_documented: "Non documentato", in_progress: "In corso", documented: "Documentato", not_applicable: "N/A" };
                const active = record.specialCategories.status === s;
                return (
                  <button key={s} onClick={() => patchRecord({ specialCategories: { ...record.specialCategories, status: s } })}
                    className="text-[11px] px-2.5 py-1 rounded-lg border"
                    style={{ borderColor: active ? T.violet : T.border, background: active ? T.violetBg : "transparent", color: active ? T.violet : T.muted, fontWeight: active ? 600 : 400, cursor: "pointer" }}>
                    {labels[s]}
                  </button>
                );
              })}
            </div>

            {/* Cross-links to DPIA and FRIA */}
            <div className="flex gap-3 flex-wrap">
              <Link href="/dashboard/tools/dpia" className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: T.blue }}>
                <ExternalLink size={12} /> DPIA — Art. 35 GDPR
              </Link>
              <Link href="/dashboard/tools/fria" className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: T.blue }}>
                <ExternalLink size={12} /> FRIA — Art. 27 AI Act
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Sanctions note */}
      <div className="flex items-start gap-2 p-3 rounded-lg mb-4 text-xs" style={{ background: "#fef9c3", border: "1px solid #fde047", color: "#713f12" }}>
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          <strong>Sanzioni Art. 99–101:</strong> Mancata conformità ai requisiti Art. 10 sui dati può comportare sanzioni fino a 15 milioni € o 3% del fatturato mondiale.
        </span>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={saveToDossier}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium"
          style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Salva nel dossier
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg"
          style={{ background: T.text, color: "#fff" }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
