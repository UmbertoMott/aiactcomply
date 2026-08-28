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
  type FairnessReport,
  type RepresentativenessCheck,
} from "@/lib/data-audit/data-audit-types";
import { profileDatasetDetailed, computeDatasetFingerprint, qualityScorecard, MAX_FILE_BYTES } from "@/lib/data-audit/csv-profiler";
import type { Row } from "@/lib/data-audit/fairness";
import { useRouter } from "next/navigation";
import { ToolPhaseBar, PhaseHeading, NextPhaseCta, useActivePhase, type ToolPhase, type PhaseStatus } from "@/components/compliance/ToolPhaseBar";
import { SectionEmptyState } from "@/components/compliance/SectionEmptyState";
import {
  QualityScorecard, FairnessPanel, RepresentativenessPanel, exportDataGovernanceJSON,
} from "./DataAuditPanels";
import {
  draftGovernancePracticeDocumentation,
  analyzeBiasIndicators,
} from "@/app/actions/dataAuditActions";
import { useT, useLocale } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.22)", border: "rgba(0,0,0,0.08)",
  card: "#fff", bg: "#f9f9fb",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.18)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.07)", amberBdr: "rgba(202,138,4,0.22)",
  green: "#15803d", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.18)",
  blue: "#0D1016", blueBg: "rgba(0,0,0,0.04)", blueBdr: "rgba(0,0,0,0.12)",
  violet: "#0D1016", violetBg: "rgba(0,0,0,0.04)", violetBdr: "rgba(0,0,0,0.12)",
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
  onProfile: (p: DatasetProfile, rows: Row[]) => void;
  onRemove: () => void;
}

function DatasetUpload({ role, roleLabel, optional, profile, onProfile, onRemove, t }: DatasetUploadProps & { t: TFn }) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError(null); setWarn(null);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".tsv")) { setError(t("err_csvTsv")); return; }
    if (file.size > MAX_FILE_BYTES) { setError(`${t("err_tooLarge")} (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`); return; }
    setParsing(true);
    try {
      const text = await file.text();
      const { profile: p, rows, parseWarnings } = profileDatasetDetailed(crypto.randomUUID(), role, file.name, text);
      p.fingerprint = await computeDatasetFingerprint(p);
      // il testo grezzo è elaborato in memoria e scartato; solo il profilo (stats) è persistito.
      const msgs: string[] = [];
      if (parseWarnings.sampled) msgs.push(`${t("warn_sampledPre")} ${parseWarnings.totalRows.toLocaleString()} ${t("warn_sampledPost")}`);
      if (parseWarnings.droppedRowCount > 0) msgs.push(`${parseWarnings.droppedRowCount} ${t("warn_droppedRows")}`);
      if (parseWarnings.duplicateColumns.length) msgs.push(`${t("warn_dupCols")} ${parseWarnings.duplicateColumns.join(", ")}`);
      setWarn(msgs.length ? msgs.join(" · ") : null);
      onProfile(p, rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("err_parse"));
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
              <span>{profile.rowCount.toLocaleString()} {t("rowsWord")}</span>
              <span>{profile.columnCount} {t("columnsWord")}</span>
              <span>{profile.overallMissingPercentage}% missing</span>
              {sensitiveCount > 0 && (
                <span className="font-semibold" style={{ color: T.amber }}>
                  ⚠ {sensitiveCount} {t("sensitiveColsDetected")}
                </span>
              )}
              {highMissing.length > 0 && (
                <span className="font-semibold" style={{ color: T.red }}>
                  {highMissing.length} {t("colsHighMissing")}
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
        <span>{t("privacyNotice")}</span>
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
          {parsing ? t("analyzing") : `Dataset ${roleLabel}`}
          {optional && <span className="ml-1 text-[10px]" style={{ color: T.muted }}>{t("notMandatory")}</span>}
        </p>
        <p className="text-[11px]" style={{ color: T.muted }}>
          {parsing ? t("profilingColumns") : t("dropHint")}
        </p>
        <input ref={inputRef} type="file" accept=".csv,.tsv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
      </div>
      {error && <p className="text-[11px] mt-1" style={{ color: T.red }}>{error}</p>}
      {warn && <p className="text-[11px] mt-1" style={{ color: T.amber }}>{warn}</p>}
    </div>
  );
}

// ─── Column profile table ─────────────────────────────────────────────────────

function ColumnTable({ profile, onConfirmSensitive, t }: { profile: DatasetProfile; onConfirmSensitive: (colName: string, confirmed: boolean) => void; t: TFn }) {
  const [open, setOpen] = useState(false);
  const flagged = profile.columns.filter(c => c.flaggedAsSensitive);

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: T.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none" }} />
        {open ? t("hide") : t("show")} {t("columnProfile")} ({profile.columnCount})
        {flagged.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: T.amberBg, color: T.amber }}>⚠ {flagged.length} {t("sensitiveShort")}</span>}
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: T.border }}>
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                {[t("th_column"), t("th_type"), "Missing %", t("th_uniqueValues"), t("th_minMax"), t("th_sensitive")].map(h => (
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
                        <span className="text-[10px] font-semibold" style={{ color: T.amber }}>✓ {t("confirmed")}</span>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-semibold" style={{ color: T.violet }}>✦ AI ({col.sensitiveCategoryGuess})</span>
                          <button onClick={() => onConfirmSensitive(col.name, true)}
                            className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBdr}`, cursor: "pointer" }}>
                            {t("confirm")}
                          </button>
                          <button onClick={() => onConfirmSensitive(col.name, false)}
                            className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: T.bg, color: T.muted, border: `1px solid ${T.border}`, cursor: "pointer" }}>
                            {t("no")}
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

function PracticeCard({ def, rec, pending, onUpdate, onAcceptAi, onDraft, drafting, computedSummary, t }: PracticeCardProps & { t: TFn }) {
  const [open, setOpen] = useState(false);
  const status = rec?.status ?? "not_documented";
  const statusMap = {
    not_documented: { label: t("status_notDocumented"), color: T.red },
    in_progress:    { label: t("status_inProgress"),      color: T.amber },
    documented:     { label: t("status_documented"),      color: T.green },
    not_applicable: { label: t("status_na"),              color: T.muted },
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
            {def.source !== "manual" && <span className="text-[10px] px-1 rounded" style={{ background: T.bg, color: T.muted }}>{t("computed")}</span>}
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
                {t("autoStatSummary")}
              </p>
              {computedSummary}
            </div>
          )}

          {/* AI pending */}
          {pending && (
            <div className="mt-3 rounded-lg p-3 mb-3" style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}` }}>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: T.violet }}>✦ {t("aiVerify")}</p>
              <p className="text-[12px] whitespace-pre-wrap leading-relaxed" style={{ color: T.text }}>{pending}</p>
              <button onClick={() => onAcceptAi(def.id)}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded"
                style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer" }}>
                <Check size={11} /> {t("acceptApply")}
              </button>
            </div>
          )}

          {/* Documentation textarea */}
          <div className="mt-3 mb-3">
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: T.muted }}>{t("documentation")}</label>
            <textarea rows={4} value={rec?.documentation ?? ""}
              onChange={e => onUpdate(def.id, { documentation: e.target.value })}
              placeholder={def.computedHint ?? t("documentPracticePh")}
              style={ta} />
          </div>

          {/* Status + AI draft */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["not_documented", "in_progress", "documented", "not_applicable"] as PracticeStatus[]).map(s => {
              const labels = { not_documented: t("status_notDocShort"), in_progress: t("status_inProgress"), documented: t("status_documented"), not_applicable: t("status_na") };
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
              {t("aiDraft")}
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
  const t = useT("toolDataAudit");
  const locale = useLocale();
  const loc = locale === "it" ? "it-IT" : "en-GB";
  const [record, setRecord] = useState<DataAuditRecord>(() => loadDataAuditRecord());
  // Righe grezze in memoria (per fairness/rappresentatività) — MAI persistite né inviate.
  const [rowsById, setRowsById] = useState<Record<string, Row[]>>({});
  const router = useRouter();

  function saveFairnessReport(r: FairnessReport) {
    const others = record.fairnessReports.filter(x => !(x.datasetId === r.datasetId && x.protectedColumn === r.protectedColumn));
    patchRecord({ fairnessReports: [...others, r] });
  }
  function saveRepCheck(c: RepresentativenessCheck) {
    const others = record.representativenessChecks.filter(x => !(x.datasetId === c.datasetId && x.column === c.column));
    patchRecord({ representativenessChecks: [...others, c] });
  }

  function sendToDocuGen() {
    const now = new Date().toISOString();
    const documented = countDocumented(record);
    const anyFairFail = record.fairnessReports.some(f => !f.fourFifthsPass || f.riskLevel === "high" || f.riskLevel === "critical");
    writeToStorage("dataAudit", {
      datasets: record.datasets.map(d => {
        const s = qualityScorecard(d);
        const frs = record.fairnessReports.filter(f => f.datasetId === d.id);
        return {
          name: d.fileName, source: d.role, size: `${d.rowCount.toLocaleString()} righe`,
          biasChecked: frs.length > 0,
          qualityScore: Math.round(s.completeness),
          personalData: record.specialCategories.applicable === "yes",
          issues: [
            ...d.columns.filter(c => c.missingPercentage > 20).map(c => `${c.name}: ${c.missingPercentage}% mancanti`),
            ...frs.map(f => `Fairness ${f.protectedColumn}: DI ${f.disparateImpactRatio}, SPD ${f.statisticalParityDiff}${f.fourFifthsPass ? "" : " — regola 4/5 FAIL"}`),
          ],
        };
      }),
      overallQuality: anyFairFail ? "fail" : documented >= 8 ? "pass" : "review",
      completedAt: now,
      usesSpecialCategoriesForBias: record.specialCategories.applicable === "yes",
    });
    showToast(t("toast_sentDocuGen"));
    router.push("/dashboard/tools/docugen");
  }
  const [toast, setToast] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(() => readFromStorage<{ completedAt?: string }>("dataAudit")?.completedAt ?? null);

  // AI copilot state
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<Record<string, string>>({});
  const [biasAnalyzing, setBiasAnalyzing] = useState(false);
  const [biasAnalyses, setBiasAnalyses] = useState<Array<{ columnName: string; analysis: string }>>([]);
  const [biasAnalysisAccepted, setBiasAnalysisAccepted] = useState(false);
  const [sanctionsBannerDismissed, setSanctionsBannerDismissed] = useState(false);

  const cls = typeof window !== "undefined" ? readFromStorage<ClassifierResult>("classifier") : null;
  const systemName = cls?.systemName ?? "Sistema AI";
  const systemDescription = cls?.systemDescription ?? "";
  const riskTier = cls?.riskLevel ?? "n.d.";

  const phases: ToolPhase[] = [
    { id: "carica",   label: t("phase_carica"),   sublabel: "Dataset",                anchor: "fase-carica" },
    { id: "qualita",  label: t("phase_qualita"),  sublabel: t("phase_qualita_sub"),   anchor: "fase-qualita" },
    { id: "fairness", label: t("phase_fairness"), sublabel: t("phase_fairness_sub"),  anchor: "fase-fairness" },
    { id: "evidenza", label: t("phase_evidenza"), sublabel: t("phase_evidenza_sub"),  anchor: "fase-export" },
  ];

  // ── Stato reale per fase (la ✓ riflette il lavoro fatto, non lo scroll) ──
  const requiredRoles: DatasetRole[] = record.developmentApproach === "other_technique"
    ? ["testing"] : ["training", "validation", "testing"];
  const datasetsLoaded = record.datasets.length > 0;
  const caricaDone = requiredRoles.every(r => record.datasets.some(d => d.role === r));
  const fairnessDone = record.fairnessReports.length > 0 || record.representativenessChecks.length > 0;
  const documentedNow = countDocumented(record);
  const totalPractices = DATA_GOVERNANCE_PRACTICES.length;
  const evidenzaDone = documentedNow >= totalPractices;

  const phaseStatus: PhaseStatus[] = [
    caricaDone ? "done" : datasetsLoaded ? "active" : "todo",
    datasetsLoaded ? "done" : "todo",
    fairnessDone ? "done" : datasetsLoaded ? "active" : "todo",
    evidenzaDone ? "done" : documentedNow > 0 ? "active" : "todo",
  ];
  const phasesDone = phaseStatus.filter(s => s === "done").length;
  const overallPct = Math.round(
    (phaseStatus.reduce((acc, s) => acc + (s === "done" ? 1 : s === "active" ? 0.5 : 0), 0) / phases.length) * 100
  );
  const phaseIdx = phaseStatus.findIndex(s => s !== "done") === -1 ? phases.length - 1 : phaseStatus.findIndex(s => s !== "done");

  // ── Scroll-spy robusto (hook condiviso): evidenzia la fase in viewport ──
  const activePhase = useActivePhase(phases.map(p => p.anchor));

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  function patchRecord(patch: Partial<DataAuditRecord>) {
    setRecord(prev => { const next = { ...prev, ...patch, updatedAt: new Date().toISOString() }; saveDataAuditRecord(next); return next; });
  }

  // Dataset operations
  function upsertDataset(profile: DatasetProfile, rows: Row[]) {
    const prev = record.datasets.find(d => d.role === profile.role);
    setRowsById(m => { const next = { ...m, [profile.id]: rows }; if (prev && prev.id !== profile.id) delete next[prev.id]; return next; });
    const datasets = record.datasets.filter(d => d.role !== profile.role);
    patchRecord({ datasets: [...datasets, profile] });
    const changed = prev?.fingerprint && profile.fingerprint && prev.fingerprint !== profile.fingerprint;
    showToast(changed
      ? `Dataset ${profile.role} ${t("toast_datasetChanged")} (${prev!.fingerprint!.slice(0, 8)}… → ${profile.fingerprint!.slice(0, 8)}…): ${t("toast_repeatAudit")}`
      : `Dataset ${profile.role} ${t("toast_datasetLoaded")} — ${profile.rowCount.toLocaleString()} ${t("rowsWord")}, ${profile.columnCount} ${t("columnsWord")}`);
  }

  function removeDataset(role: DatasetRole) {
    const prev = record.datasets.find(d => d.role === role);
    if (prev) setRowsById(m => { const next = { ...m }; delete next[prev.id]; return next; });
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
      showToast(e instanceof Error ? e.message : t("aiError"));
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
      if (confirmedSensitive.length === 0) { showToast(t("toast_noSensitiveConfirmed")); setBiasAnalyzing(false); return; }
      const result = await analyzeBiasIndicators({ systemName, intendedPurpose: systemDescription, sensitiveColumns: confirmedSensitive });
      setBiasAnalyses(result.analyses);
      setBiasAnalysisAccepted(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("toast_biasError"));
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
    showToast(t("toast_savedDossier"));
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
              {d.overallMissingPercentage}% {t("avgMissing")}
              {d.overallMissingPercentage > 20 && <span style={{ color: T.red }}> ⚠ {t("lowQuality")}</span>}
              {d.overallMissingPercentage <= 5 && <span style={{ color: T.green }}> ✓ {t("highQuality")}</span>}
            </div>
          ))}
        </div>
      );
    }
    if (id === "data_gaps") {
      const highMissing = datasets.flatMap(d =>
        d.columns.filter(c => c.missingPercentage > 20).map(c => ({ ds: d.fileName, col: c.name, pct: c.missingPercentage }))
      );
      if (highMissing.length === 0) return <p className="text-[11px]" style={{ color: T.green }}>{t("noHighMissingCols")}</p>;
      return (
        <ul className="space-y-0.5 text-[11px]" style={{ color: T.text }}>
          {highMissing.map((h, i) => <li key={i}>• <strong>{h.col}</strong> ({h.ds}): <span style={{ color: T.red }}>{h.pct}% {t("missingWord")}</span></li>)}
        </ul>
      );
    }
    if (id === "bias_examination") {
      const confirmed = datasets.flatMap(d => d.columns.filter(c => c.sensitiveFlagConfirmed).map(c => ({ ds: d.fileName, col: c.name })));
      if (confirmed.length === 0) return <p className="text-[11px]" style={{ color: T.muted }}>{t("noSensitiveConfirmedHint")}</p>;
      return (
        <div>
          <p className="text-[11px] mb-1" style={{ color: T.text }}>{t("confirmedSensitiveCols")}</p>
          <ul className="space-y-0.5 text-[11px]" style={{ color: T.muted }}>
            {confirmed.map((c, i) => <li key={i}>• <strong>{c.col}</strong> ({c.ds})</li>)}
          </ul>
          {biasAnalyses.length > 0 && !biasAnalysisAccepted && (
            <div className="mt-2 rounded-lg p-2.5" style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}` }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: T.violet }}>✦ {t("aiVerify")}</p>
              {biasAnalyses.map((a, i) => (
                <div key={i} className="mb-2">
                  <p className="text-[11px] font-semibold" style={{ color: T.text }}>{a.columnName}</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>{a.analysis}</p>
                </div>
              ))}
              <button onClick={() => { setBiasAnalysisAccepted(true); updatePractice("bias_examination", { documentation: biasAnalyses.map(a => `${a.columnName}: ${a.analysis}`).join("\n\n"), aiConfirmed: true }); }}
                className="text-[11px] font-semibold px-2 py-1 rounded flex items-center gap-1"
                style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer" }}>
                <Check size={11} /> {t("acceptAiAnalysis")}
              </button>
            </div>
          )}
        </div>
      );
    }
    return undefined;
  }

  // Determine which roles are required
  const isOther = record.developmentApproach === "other_technique";
  const ROLES: Array<{ role: DatasetRole; label: string; optional: boolean }> = [
    { role: "training",   label: t("role_training"),   optional: isOther },
    { role: "validation", label: t("role_validation"), optional: isOther },
    { role: "testing",    label: t("role_testing"),    optional: false   },
  ];

  const anyConfirmedSensitive = record.datasets.some(d => d.columns.some(c => c.sensitiveFlagConfirmed));
  const showSpecialCategories = record.specialCategories.applicable === "yes" || anyConfirmedSensitive;

  return (
    <div className="w-full" style={FONT}>
      <SystemSelector checkProhibited={false} />

      {/* Dossier banner */}
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-4 text-[12px]" style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}>
          <span style={{ color: T.green }}>✓ {t("savedDossier")} · {new Date(savedAt).toLocaleDateString(loc)}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium" style={{ color: T.green }}>{t("seeDossier")}</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-4 text-[12px]" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <span style={{ color: T.muted }}>{t("saveHint")}</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1" style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>{t("save")}</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Database size={20} style={{ color: T.blue }} />
          <h1 className="text-xl font-bold" style={{ color: T.text }}>{t("title")}</h1>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: T.blueBg, color: T.blue }}>Art. 10</span>
        </div>
        <p className="text-[12px]" style={{ color: T.muted }}>
          {t("subtitle")}
        </p>
        {cls && (
          <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: T.muted }}>
            <span>{t("systemWord")} <strong style={{ color: T.text }}>{cls.systemName}</strong></span>
            <span>{t("tierWord")} <strong style={{ color: T.text }}>{cls.riskLevel}</strong></span>
          </div>
        )}
      </div>

      {/* Art. 10(6) triage */}
      <div className="rounded-xl p-4 mb-5" style={{ ...card }}>
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} style={{ color: T.blue }} />
          <span className="text-[12px] font-semibold" style={{ color: T.text }}>{t("devApproachTitle")}</span>
        </div>
        <p className="text-[11px] mb-3" style={{ color: T.muted }}>
          {t("devApproachDesc")}
        </p>
        <div className="flex gap-2 flex-wrap">
          {([
            { v: "trained_model", l: t("devApproach_trained") },
            { v: "other_technique", l: t("devApproach_other") },
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
              {t("edit")}
            </button>
          )}
        </div>
      </div>

      {/* ── Scaletta guidata — stati reali per fase, scroll-spy, avanzamento persistente ── */}
      <ToolPhaseBar
        phases={phases}
        currentIdx={phaseIdx}
        status={phaseStatus}
        activeIdx={activePhase}
        progressPct={overallPct}
        meta={`${phasesDone}/${phases.length} ${t("phasesWord")} · ${documentedNow}/${totalPractices} ${t("practicesWord")}`}
      />

      {/* ── Dataset upload panels ── */}
      <section id="fase-carica" style={{ scrollMarginTop: 72 }} className="mb-6">
        <PhaseHeading n={1} title={t("ph1_title")} done={caricaDone}
          sub={caricaDone ? t("ph1_subDone") : t("ph1_sub")} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLES.map(({ role, label, optional }) => {
            const profile = record.datasets.find(d => d.role === role) ?? null;
            return (
              <div key={role}>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: T.muted }}>
                  {label}
                  {optional && <span className="ml-1 normal-case" style={{ color: T.faint }}>{t("notMandatory")}</span>}
                </p>
                <DatasetUpload
                  role={role} roleLabel={label} optional={optional}
                  profile={profile}
                  onProfile={upsertDataset}
                  onRemove={() => removeDataset(role)}
                  t={t}
                />
                {profile && (
                  <ColumnTable
                    profile={profile}
                    onConfirmSensitive={(colName, confirmed) => confirmSensitiveColumn(profile.id, colName, confirmed)}
                    t={t}
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
              {t("biasAnalysisBtn")}
            </button>
            <span className="text-[11px]" style={{ color: T.muted }}>{t("biasAnalysisNote")}</span>
          </div>
        )}
        {caricaDone && <NextPhaseCta label={t("cta_toQualita")} anchor="fase-qualita" />}
      </section>

      {/* ── Data Quality Scorecard · Fairness · Rappresentatività ── */}
      <div id="fase-qualita" style={{ scrollMarginTop: 72 }} className="mb-6">
        <PhaseHeading n={2} title={t("ph2_title")} done={datasetsLoaded}
          sub={t("ph2_sub")} />
        {datasetsLoaded ? (
          <>
            <QualityScorecard datasets={record.datasets} t={t} />
            <NextPhaseCta label={t("cta_toFairness")} anchor="fase-fairness" />
          </>
        ) : (
          <SectionEmptyState message={t("empty_quality")} />
        )}
      </div>
      <div id="fase-fairness" style={{ scrollMarginTop: 72 }} className="mb-6">
        <PhaseHeading n={3} title={t("ph3_title")} done={fairnessDone}
          sub={t("ph3_sub")} />
        {datasetsLoaded ? (
          <>
            <FairnessPanel datasets={record.datasets} rowsById={rowsById}
              systemName={systemName} intendedPurpose={systemDescription} onReport={saveFairnessReport} t={t} />
            <RepresentativenessPanel datasets={record.datasets} rowsById={rowsById} onCheck={saveRepCheck} t={t} />
            {fairnessDone && <NextPhaseCta label={t("cta_toEvidenza")} anchor="fase-export" />}
          </>
        ) : (
          <SectionEmptyState message={t("empty_fairness")} />
        )}
      </div>

      {/* ── 10 Governance practice cards ── */}
      <section id="fase-export" style={{ scrollMarginTop: 72 }} className="mb-6">
        <PhaseHeading n={4} title={t("ph4_title")} done={evidenzaDone}
          sub={t("ph4_sub")} />
        {/* Avanzamento pratiche — contestuale alla fase, non più in cima alla pagina */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-lg font-bold" style={{ color: evidenzaDone ? T.green : T.text }}>{documentedNow}/{totalPractices}</span>
          <div className="flex-1">
            <div className="text-[11px] font-medium mb-1" style={{ color: T.muted }}>{t("practicesDocumented")}</div>
            <div className="h-1.5 rounded-full" style={{ background: T.border }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.round((documentedNow / totalPractices) * 100)}%`, background: evidenzaDone ? T.green : T.blue }} />
            </div>
          </div>
        </div>
        <h2 className="text-[13px] font-semibold mb-3" style={{ color: T.text }}>
          {t("governancePractices")}
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
              t={t}
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
              {t("conditionalModule")}
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
                <p className="text-[11px] font-semibold mb-1" style={{ color: T.text }}>{t("colsConfirmedSensitive")}</p>
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
                {t("legalBasisLabel")}
              </label>
              <textarea rows={3} value={record.specialCategories.legalBasisDocumentation ?? ""}
                onChange={e => patchRecord({ specialCategories: { ...record.specialCategories, legalBasisDocumentation: e.target.value } })}
                placeholder={t("legalBasisPh")}
                style={ta} />
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {(["not_documented", "in_progress", "documented"] as PracticeStatus[]).map(s => {
                const labels = { not_documented: t("status_notDocumented"), in_progress: t("status_inProgress"), documented: t("status_documented"), not_applicable: t("status_na") };
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
      {!sanctionsBannerDismissed && (
        <div className="flex items-start gap-2 p-3 rounded-lg mb-4 text-xs" style={{ background: "#fef9c3", border: "1px solid #fde047", color: "#713f12" }}>
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: t("sanctions") }} />
          <button
            onClick={() => setSanctionsBannerDismissed(true)}
            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 2, color: "#713f12", opacity: 0.6, lineHeight: 1, display: "flex", alignItems: "center" }}
            aria-label={t("close")}
          >
            <X size={14} />
          </button>
        </div>
      )}


      {/* ── Export Data Governance Statement (Art. 11 / Allegato IV) ── */}
      <section className="mb-6">
        <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>{t("evidenceStatement")}</h2>
        <p className="text-[11px] mb-3" style={{ color: T.muted }}>{t("evidenceStatementDesc")}</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportDataGovernanceJSON(record)}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
            <FileText size={13} /> {t("exportJson")}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: "#fff", color: T.text, border: `1px solid ${T.border}`, cursor: "pointer" }}>
            <FileText size={13} /> {t("printPdf")}
          </button>
          <button onClick={sendToDocuGen} disabled={record.datasets.length === 0}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: "#fff", color: T.text, border: `1px solid ${T.border}`, cursor: "pointer", opacity: record.datasets.length === 0 ? 0.5 : 1 }}>
            <ExternalLink size={13} /> {t("sendToDocuGen")}
          </button>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={saveToDossier}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium"
          style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> {t("saveToDossier")}
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
